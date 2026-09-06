import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { marketEntries, marketEntryItems, marketEntryPurchasers, messMembers, vendors, marketProducts, auditLogs, users } from "@/db/schema";
import { marketEntrySchema, calcItemTotal, toScaledMarket } from "@/lib/validators-market";
import { and, eq, desc, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getRequestDb();
  const user = await getCurrentUser();
  // public GET for dashboard share — allow unauthenticated, but still verify mess exists for private
  if (user) {
    const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
    // don't block public
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
  const offset = Number(url.searchParams.get("offset") || 0);
  const date = url.searchParams.get("date");
  const purchasedByQ = url.searchParams.get("purchasedBy");

  let rows;
  if (purchasedByQ) {
    // find entryIds via junction + legacy purchasedBy
    const viaJunction = await db.select({ entryId: marketEntryPurchasers.entryId }).from(marketEntryPurchasers).where(eq(marketEntryPurchasers.memberId, purchasedByQ));
    const viaLegacy = await db.select({ id: marketEntries.id }).from(marketEntries).where(and(eq(marketEntries.messId, id), eq(marketEntries.purchasedBy, purchasedByQ)));
    const idSet = new Set<string>([...viaJunction.map((r) => r.entryId), ...viaLegacy.map((r) => r.id)]);
    const ids = [...idSet];
    if (ids.length === 0) return NextResponse.json({ entries: [], total: 0 });
    const conds: ReturnType<typeof eq>[] = [eq(marketEntries.messId, id) as never, inArray(marketEntries.id, ids) as never];
    if (date) conds.push(eq(marketEntries.date, date) as never);
    rows = await db.select().from(marketEntries).where(and(...conds)).orderBy(desc(marketEntries.createdAt)).limit(limit).offset(offset);
    if (date) rows = rows.filter((r) => r.date === date);
  } else if (date) {
    rows = await db.select().from(marketEntries).where(and(eq(marketEntries.messId, id), eq(marketEntries.date, date)));
  } else {
    rows = await db.select().from(marketEntries).where(eq(marketEntries.messId, id)).orderBy(desc(marketEntries.createdAt)).limit(limit).offset(offset);
  }
  // fetch items + purchaser display names (multi) for each entry
  const withItems = await Promise.all(
    rows.map(async (entry) => {
      const items = await db.select().from(marketEntryItems).where(eq(marketEntryItems.entryId, entry.id));
      const purchaserRows = await db.select().from(marketEntryPurchasers).where(eq(marketEntryPurchasers.entryId, entry.id));
      const purchaserIds: string[] = purchaserRows.length ? purchaserRows.map((r) => r.memberId) : entry.purchasedBy ? [entry.purchasedBy] : [];
      const purchaserNames: string[] = [];
      let purchaserIsPlaceholder = false;
      for (const pid of purchaserIds) {
        const mem = await db.select().from(messMembers).where(eq(messMembers.id, pid)).limit(1);
        if (mem[0]) {
          let name: string | null = null;
          if (mem[0].userId) {
            const u = await db.select().from(users).where(eq(users.id, mem[0].userId)).limit(1);
            name = u[0]?.fullName || mem[0].displayName || "সদস্য";
          } else {
            name = mem[0].displayName || "সদস্য";
            purchaserIsPlaceholder = true;
          }
          if (name) purchaserNames.push(name);
        }
      }
      const purchaserName = purchaserNames[0] || null;
      return { ...entry, items, purchaserName, purchaserNames, purchaserIds, purchaserIsPlaceholder };
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
  // validate purchasedBy (1..10 members)
  const pids = (data.purchasedBy as unknown as string[]) || [];
  for (const pid of pids) {
    const mem = await db.select().from(messMembers).where(and(eq(messMembers.id, pid), eq(messMembers.messId, id))).limit(1);
    if (!mem[0]) return NextResponse.json({ error: `Purchaser not in mess: ${pid}` }, { status: 400 });
  }
  if (data.vendorId) {
    const v = await db.select().from(vendors).where(and(eq(vendors.id, data.vendorId), eq(vendors.messId, id))).limit(1);
    if (!v[0]) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  // calculate totals with backend validation
  let totalPaisa = 0;
  const itemRows: { id: string; productId: string | null; productNameSnapshot: string; categoryNameSnapshot: string | null; quantityScaled: number; unit: string; unitPricePaisa: number; totalPaisa: number }[] = [];

  for (const it of data.items) {
    // exact total wins when pasted (e.g. 42.560kg = 2460) — no toFixed(2) drift to 56/57
    let total: number;
    let unitPricePaisa: number;
    if (it.total != null) {
      total = Math.round(it.total * 100);
      // derive unitPrice paisa from exact total/qty when total given
      const qty = it.quantity || 1;
      unitPricePaisa = qty > 0 ? Math.round((total / qty)) : Math.round((it.unitPrice || 0) * 100);
    } else {
      const up = it.unitPrice ?? 0;
      unitPricePaisa = Math.round(up * 100);
      total = calcItemTotal(it.quantity, up); // paisa
    }

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
      quantityScaled: toScaledMarket(it.quantity),
      unit: it.unit,
      unitPricePaisa,
      totalPaisa: total,
    });
  }

  const transportPaisa = Math.round((data.transport || 0) * 100);
  const discountPaisa = Math.round((data.discount || 0) * 100);
  const finalPaisa = Math.max(0, totalPaisa + transportPaisa - discountPaisa);

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
    purchasedBy: pids[0] || null,
    vendorId: data.vendorId || null,
    paymentMethod: data.paymentMethod || "cash",
    totalPaisa,
    transportPaisa,
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
  for (const pid of pids) {
    await db.insert(marketEntryPurchasers).values({ entryId, memberId: pid, createdAt: now });
  }

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

  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "create", entityType: "market_entry", entityId: entryId, afterJson: JSON.stringify({ totalPaisa, transportPaisa, finalPaisa, items: itemRows.length }), createdAt: now });

  const entry = await db.select().from(marketEntries).where(eq(marketEntries.id, entryId)).limit(1);
  const items = await db.select().from(marketEntryItems).where(eq(marketEntryItems.entryId, entryId));
  return NextResponse.json({ ok: true, entry: entry[0], items });
}
