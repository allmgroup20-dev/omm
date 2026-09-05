import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { marketEntries, marketEntryItems, messMembers, vendors, marketProducts, auditLogs } from "@/db/schema";
import { marketEntrySchema, calcItemTotal, toScaled } from "@/lib/validators-market";
import { and, eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
  const offset = Number(url.searchParams.get("offset") || 0);
  const date = url.searchParams.get("date");

  let rows;
  if (date) {
    rows = await db.select().from(marketEntries).where(and(eq(marketEntries.messId, id), eq(marketEntries.date, date)));
  } else {
    rows = await db.select().from(marketEntries).where(eq(marketEntries.messId, id)).orderBy(desc(marketEntries.createdAt)).limit(limit).offset(offset);
  }
  // fetch items for each entry
  const withItems = await Promise.all(
    rows.map(async (entry) => {
      const items = await db.select().from(marketEntryItems).where(eq(marketEntryItems.entryId, entry.id));
      return { ...entry, items };
    }),
  );
  return NextResponse.json({ entries: withItems, total: rows.length });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = marketEntrySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  // validate purchasedBy if given
  if (data.purchasedBy) {
    const mem = await db.select().from(messMembers).where(and(eq(messMembers.id, data.purchasedBy), eq(messMembers.messId, id))).limit(1);
    if (!mem[0]) return NextResponse.json({ error: "Purchaser not in mess" }, { status: 400 });
  }
  if (data.vendorId) {
    const v = await db.select().from(vendors).where(and(eq(vendors.id, data.vendorId), eq(vendors.messId, id))).limit(1);
    if (!v[0]) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  // calculate totals with backend validation
  let totalPaisa = 0;
  const itemRows: { id: string; productId: string | null; productNameSnapshot: string; categoryNameSnapshot: string | null; quantityScaled: number; unit: string; unitPricePaisa: number; totalPaisa: number }[] = [];

  for (const it of data.items) {
    const unitPricePaisa = Math.round(it.unitPrice * 100);
    const total = calcItemTotal(it.quantity, it.unitPrice); // paisa
    // validate total = qty * unitPrice
    const expected = Math.round(it.quantity * it.unitPrice * 100);
    if (total !== expected) return NextResponse.json({ error: `Item ${it.productName} total mismatch` }, { status: 400 });

    totalPaisa += total;
    // resolve product snapshot if productId given
    let prodName = it.productName;
    let catName = it.categoryName || null;
    if (it.productId) {
      const prod = await db.select().from(marketProducts).where(eq(marketProducts.id, it.productId)).limit(1);
      if (prod[0]) {
        prodName = prod[0].name;
        // catName from product's category if not provided
        // keep as is
      }
    }
    itemRows.push({
      id: nanoid(),
      productId: it.productId || null,
      productNameSnapshot: prodName,
      categoryNameSnapshot: catName,
      quantityScaled: toScaled(it.quantity),
      unit: it.unit,
      unitPricePaisa,
      totalPaisa: total,
    });
  }

  const discountPaisa = Math.round((data.discount || 0) * 100);
  const finalPaisa = Math.max(0, totalPaisa - discountPaisa);

  // idempotency check
  if (data.clientRefId) {
    const existing = await db.select().from(marketEntries).where(eq(marketEntries.clientRefId, data.clientRefId)).limit(1);
    if (existing[0]) return NextResponse.json({ error: "Duplicate entry (clientRefId)" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const entryId = nanoid();
  await db.insert(marketEntries).values({
    id: entryId,
    messId: id,
    date: data.date,
    purchasedBy: data.purchasedBy || null,
    vendorId: data.vendorId || null,
    paymentMethod: data.paymentMethod || "cash",
    totalPaisa,
    discountPaisa,
    finalPaisa,
    classification: data.classification || "food",
    notes: data.notes?.trim() || null,
    receiptUrl: null,
    referenceNumber: data.referenceNumber?.trim() || null,
    clientRefId: data.clientRefId || null,
    status: "active",
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  });

  for (const ir of itemRows) {
    await db.insert(marketEntryItems).values({
      id: ir.id,
      entryId,
      productId: ir.productId,
      productNameSnapshot: ir.productNameSnapshot,
      categoryNameSnapshot: ir.categoryNameSnapshot,
      quantityScaled: ir.quantityScaled,
      unit: ir.unit,
      unitPricePaisa: ir.unitPricePaisa,
      totalPaisa: ir.totalPaisa,
    });
  }

  // update vendor total
  if (data.vendorId) {
    const vRows = await db.select().from(vendors).where(eq(vendors.id, data.vendorId)).limit(1);
    if (vRows[0]) {
      await db.update(vendors).set({ totalPurchasesPaisa: vRows[0].totalPurchasesPaisa + finalPaisa, updatedAt: now }).where(eq(vendors.id, data.vendorId));
    }
  }

  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "create", entityType: "market_entry", entityId: entryId, afterJson: JSON.stringify({ totalPaisa, finalPaisa, items: itemRows.length }), createdAt: now });

  const entry = await db.select().from(marketEntries).where(eq(marketEntries.id, entryId)).limit(1);
  const items = await db.select().from(marketEntryItems).where(eq(marketEntryItems.entryId, entryId));
  return NextResponse.json({ ok: true, entry: entry[0], items });
}
