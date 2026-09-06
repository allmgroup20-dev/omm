import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { marketEntries, marketEntryItems, marketEntryPurchasers, messMembers, vendors, auditLogs } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || (!["manager", "assistant_manager"].includes(access[0].role) && !access[0].isPrimaryManager)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const entryIds: string[] = body?.entryIds;
  if (!Array.isArray(entryIds) || entryIds.length < 2 || entryIds.length > 10) return NextResponse.json({ error: "Select 2-10 entries to merge" }, { status: 400 });

  const entries = await db.select().from(marketEntries).where(and(eq(marketEntries.messId, id), inArray(marketEntries.id, entryIds)));
  if (entries.length !== entryIds.length) return NextResponse.json({ error: "Some entries not found" }, { status: 404 });
  for (const e of entries) if (e.status !== "active") return NextResponse.json({ error: `Entry ${e.id} not active` }, { status: 400 });

  // collect items and purchasers
  const allItems: typeof marketEntryItems.$inferSelect[] = [];
  const purchaserSet = new Set<string>();
  let totalPaisa = 0;
  let transportPaisa = 0;
  let discountPaisa = 0;
  const vendorIds = new Set<string | null>();
  const classifications = new Set<string>();
  let notesCombined = "";
  let date = body?.date as string | undefined;
  if (!date) date = entries.sort((a, b) => a.date.localeCompare(b.date))[entries.length - 1].date;

  for (const e of entries) {
    const items = await db.select().from(marketEntryItems).where(eq(marketEntryItems.entryId, e.id));
    allItems.push(...items);
    totalPaisa += e.totalPaisa;
    transportPaisa += (e as unknown as { transportPaisa: number }).transportPaisa || 0;
    discountPaisa += e.discountPaisa;
    vendorIds.add(e.vendorId);
    classifications.add(e.classification);
    if (e.notes) notesCombined += (notesCombined ? "\n---\n" : "") + e.notes;
    const purchasers = await db.select().from(marketEntryPurchasers).where(eq(marketEntryPurchasers.entryId, e.id));
    if (purchasers.length) purchasers.forEach((p) => purchaserSet.add(p.memberId));
    else if (e.purchasedBy) purchaserSet.add(e.purchasedBy);
  }

  const purchaserIds = [...purchaserSet];
  if (purchaserIds.length === 0) return NextResponse.json({ error: "No purchasers found" }, { status: 400 });

  const finalPaisa = Math.max(0, totalPaisa + transportPaisa - discountPaisa);
  const newEntryId = nanoid();
  const now = new Date().toISOString();
  const chosenVendorId = vendorIds.size === 1 ? [...vendorIds][0] : null;
  const chosenClassification = classifications.size === 1 ? [...classifications][0] : "food";

  await db.insert(marketEntries).values({
    id: newEntryId,
    messId: id,
    date: date!,
    purchasedBy: purchaserIds[0] || null,
    vendorId: chosenVendorId as string | null,
    paymentMethod: entries[0].paymentMethod || "cash",
    totalPaisa,
    transportPaisa,
    discountPaisa,
    finalPaisa,
    classification: chosenClassification as string,
    notes: notesCombined || null,
    clientRefId: `merge-${entryIds.sort().join("-")}-${Date.now()}`,
    status: "active",
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  } as never);

  for (const pid of purchaserIds) {
    await db.insert(marketEntryPurchasers).values({ entryId: newEntryId, memberId: pid, createdAt: now });
  }

  for (const it of allItems) {
    await db.insert(marketEntryItems).values({
      id: nanoid(),
      entryId: newEntryId,
      productId: it.productId,
      productNameSnapshot: it.productNameSnapshot,
      categoryNameSnapshot: it.categoryNameSnapshot,
      quantityScaled: it.quantityScaled,
      unit: it.unit,
      unitPricePaisa: it.unitPricePaisa,
      totalPaisa: it.totalPaisa,
    } as never);
  }

  // hard delete originals — fully vanish as requested (not just void)
  for (const e of entries) {
    await db.delete(marketEntryItems).where(eq(marketEntryItems.entryId, e.id));
    await db.delete(marketEntryPurchasers).where(eq(marketEntryPurchasers.entryId, e.id));
    await db.delete(marketEntries).where(eq(marketEntries.id, e.id));
    if (e.vendorId) {
      const v = await db.select().from(vendors).where(eq(vendors.id, e.vendorId)).limit(1);
      if (v[0]) await db.update(vendors).set({ totalPurchasesPaisa: Math.max(0, v[0].totalPurchasesPaisa - e.finalPaisa), updatedAt: now } as never).where(eq(vendors.id, e.vendorId));
    }
    await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "delete", entityType: "market_entry", entityId: e.id, beforeJson: JSON.stringify(e), createdAt: now });
  }
  if (chosenVendorId) {
    const v = await db.select().from(vendors).where(eq(vendors.id, chosenVendorId)).limit(1);
    if (v[0]) await db.update(vendors).set({ totalPurchasesPaisa: v[0].totalPurchasesPaisa + finalPaisa, updatedAt: now } as never).where(eq(vendors.id, chosenVendorId));
  }

  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "merge", entityType: "market_entry", entityId: newEntryId, afterJson: JSON.stringify({ mergedIds: entryIds, purchaserIds, totalPaisa, transportPaisa, finalPaisa }), createdAt: now });

  const entry = await db.select().from(marketEntries).where(eq(marketEntries.id, newEntryId)).limit(1);
  const items = await db.select().from(marketEntryItems).where(eq(marketEntryItems.entryId, newEntryId));
  return NextResponse.json({ ok: true, entry: entry[0], items, mergedIds: entryIds });
}
