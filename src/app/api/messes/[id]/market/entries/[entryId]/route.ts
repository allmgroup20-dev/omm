import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { marketEntries, marketEntryItems, marketEntryPurchasers, messMembers, vendors, auditLogs, users } from "@/db/schema";
import { marketEntryUpdateSchema, calcItemTotal, toScaledMarket } from "@/lib/validators-market";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { id, entryId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entry = await db.select().from(marketEntries).where(and(eq(marketEntries.id, entryId), eq(marketEntries.messId, id))).limit(1);
  if (!entry[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const items = await db.select().from(marketEntryItems).where(eq(marketEntryItems.entryId, entryId));
  const audits = await db.select().from(auditLogs).where(and(eq(auditLogs.entityType, "market_entry"), eq(auditLogs.entityId, entryId)));
  const purchaserRows = await db.select().from(marketEntryPurchasers).where(eq(marketEntryPurchasers.entryId, entryId));
  const purchaserIds: string[] = purchaserRows.length ? purchaserRows.map((r) => r.memberId) : entry[0].purchasedBy ? [entry[0].purchasedBy] : [];
  const purchaserNames: string[] = [];
  for (const pid of purchaserIds) {
    const mem = await db.select().from(messMembers).where(eq(messMembers.id, pid)).limit(1);
    if (mem[0]) {
      if (mem[0].userId) {
        const u = await db.select().from(users).where(eq(users.id, mem[0].userId)).limit(1);
        purchaserNames.push(u[0]?.fullName || mem[0].displayName || "সদস্য");
      } else purchaserNames.push(mem[0].displayName || "সদস্য");
    }
  }
  return NextResponse.json({ entry: { ...entry[0], purchaserName: purchaserNames[0] || null, purchaserNames, purchaserIds }, items, audits });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { id, entryId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await db.select().from(marketEntries).where(and(eq(marketEntries.id, entryId), eq(marketEntries.messId, id))).limit(1);
  if (!existing[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing[0].status !== "active") return NextResponse.json({ error: "Only active entries can be edited" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = marketEntryUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const before = existing[0];
  const now = new Date().toISOString();

  // header updates
  const headerUpdates: Record<string, unknown> = { updatedAt: now };
  if (data.date !== undefined) headerUpdates.date = data.date;
  if (data.vendorId !== undefined) {
    if (data.vendorId) {
      const v = await db.select().from(vendors).where(and(eq(vendors.id, data.vendorId), eq(vendors.messId, id))).limit(1);
      if (!v[0]) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    headerUpdates.vendorId = data.vendorId;
  }
  if (data.purchasedBy !== undefined) {
    const pids = data.purchasedBy as unknown as string[];
    for (const pid of pids) {
      const mem = await db.select().from(messMembers).where(and(eq(messMembers.id, pid), eq(messMembers.messId, id))).limit(1);
      if (!mem[0]) return NextResponse.json({ error: `Purchaser not in mess: ${pid}` }, { status: 400 });
    }
    headerUpdates.purchasedBy = pids[0] || null;
    // junction will be updated after header
  }
  if (data.paymentMethod !== undefined) headerUpdates.paymentMethod = data.paymentMethod;
  if (data.classification !== undefined) headerUpdates.classification = data.classification;
  if (data.notes !== undefined) headerUpdates.notes = data.notes?.trim() || null;
  if (data.referenceNumber !== undefined) headerUpdates.referenceNumber = data.referenceNumber?.trim() || null;
  if (data.transport !== undefined) headerUpdates.transportPaisa = Math.round(data.transport * 100);

  // if items provided, recalc totals
  let newTotalPaisa = before.totalPaisa;
  let newTransportPaisa = (before as unknown as { transportPaisa: number }).transportPaisa ?? 0;
  if (data.transport !== undefined) newTransportPaisa = Math.round(data.transport * 100);
  let newDiscountPaisa = before.discountPaisa;
  let newFinalPaisa = before.finalPaisa;
  let itemRows: typeof marketEntryItems.$inferInsert[] | null = null;

  if (data.items) {
    let totalPaisa = 0;
    const rows: typeof marketEntryItems.$inferInsert[] = [];
    for (const it of data.items) {
      let total: number;
      let unitPricePaisa: number;
      if (it.total != null) {
        total = Math.round(it.total * 100);
        const qty = it.quantity || 1;
        unitPricePaisa = qty > 0 ? Math.round(total / qty) : Math.round((it.unitPrice || 0) * 100);
      } else {
        const up = it.unitPrice ?? 0;
        unitPricePaisa = Math.round(up * 100);
        total = calcItemTotal(it.quantity, up);
      }
      totalPaisa += total;
      rows.push({
        id: (it as { id?: string }).id || nanoid(),
        entryId,
        productId: it.productId || null,
        productNameSnapshot: it.productName,
        categoryNameSnapshot: it.categoryName || null,
        quantityScaled: toScaledMarket(it.quantity),
        unit: it.unit,
        unitPricePaisa,
        totalPaisa: total,
      });
    }
    newTotalPaisa = totalPaisa;
    if (data.discount !== undefined) newDiscountPaisa = Math.round(data.discount * 100);
    if (data.transport !== undefined) newTransportPaisa = Math.round(data.transport * 100);
    newFinalPaisa = Math.max(0, newTotalPaisa + newTransportPaisa - newDiscountPaisa);
    headerUpdates.totalPaisa = newTotalPaisa;
    headerUpdates.transportPaisa = newTransportPaisa;
    headerUpdates.discountPaisa = newDiscountPaisa;
    headerUpdates.finalPaisa = newFinalPaisa;
    itemRows = rows;
  } else if (data.discount !== undefined || data.transport !== undefined) {
    if (data.discount !== undefined) newDiscountPaisa = Math.round(data.discount * 100);
    if (data.transport !== undefined) newTransportPaisa = Math.round(data.transport * 100);
    newFinalPaisa = Math.max(0, newTotalPaisa + newTransportPaisa - newDiscountPaisa);
    headerUpdates.transportPaisa = newTransportPaisa;
    headerUpdates.discountPaisa = newDiscountPaisa;
    headerUpdates.finalPaisa = newFinalPaisa;
  }

  // vendor delta
  const oldFinal = before.finalPaisa;
  const oldVendorId = before.vendorId;
  const newVendorId = (headerUpdates.vendorId as string | null) ?? oldVendorId;
  const delta = newFinalPaisa - oldFinal;

  if (Object.keys(headerUpdates).length > 1 || itemRows) {
    await db.update(marketEntries).set(headerUpdates as never).where(eq(marketEntries.id, entryId));
    if (data.purchasedBy !== undefined) {
      const pids = data.purchasedBy as unknown as string[];
      await db.delete(marketEntryPurchasers).where(eq(marketEntryPurchasers.entryId, entryId));
      for (const pid of pids) await db.insert(marketEntryPurchasers).values({ entryId, memberId: pid, createdAt: now });
    }
    if (itemRows) {
      await db.delete(marketEntryItems).where(eq(marketEntryItems.entryId, entryId));
      for (const r of itemRows) await db.insert(marketEntryItems).values(r as never);
    }
    // adjust vendor totals
    if (oldVendorId && oldVendorId !== newVendorId) {
      const vOld = await db.select().from(vendors).where(eq(vendors.id, oldVendorId)).limit(1);
      if (vOld[0]) await db.update(vendors).set({ totalPurchasesPaisa: vOld[0].totalPurchasesPaisa - oldFinal, updatedAt: now } as never).where(eq(vendors.id, oldVendorId));
      if (newVendorId) {
        const vNew = await db.select().from(vendors).where(eq(vendors.id, newVendorId)).limit(1);
        if (vNew[0]) await db.update(vendors).set({ totalPurchasesPaisa: vNew[0].totalPurchasesPaisa + newFinalPaisa, updatedAt: now } as never).where(eq(vendors.id, newVendorId));
      }
    } else if (newVendorId && delta !== 0) {
      const v = await db.select().from(vendors).where(eq(vendors.id, newVendorId)).limit(1);
      if (v[0]) await db.update(vendors).set({ totalPurchasesPaisa: v[0].totalPurchasesPaisa + delta, updatedAt: now } as never).where(eq(vendors.id, newVendorId));
    }

    await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "update", entityType: "market_entry", entityId: entryId, beforeJson: JSON.stringify(before), afterJson: JSON.stringify({ ...headerUpdates, items: itemRows?.length }), createdAt: now });
  }

  const entry = await db.select().from(marketEntries).where(eq(marketEntries.id, entryId)).limit(1);
  const items = await db.select().from(marketEntryItems).where(eq(marketEntryItems.entryId, entryId));
  return NextResponse.json({ ok: true, entry: entry[0], items });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { id, entryId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Only manager/assistant can void" }, { status: 403 });

  const entry = await db.select().from(marketEntries).where(and(eq(marketEntries.id, entryId), eq(marketEntries.messId, id))).limit(1);
  if (!entry[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (entry[0].status !== "active") return NextResponse.json({ error: "Already voided" }, { status: 400 });

  const now = new Date().toISOString();
  await db.update(marketEntries).set({ status: "voided", updatedAt: now } as never).where(eq(marketEntries.id, entryId));
  if (entry[0].vendorId) {
    const v = await db.select().from(vendors).where(eq(vendors.id, entry[0].vendorId)).limit(1);
    if (v[0]) await db.update(vendors).set({ totalPurchasesPaisa: Math.max(0, v[0].totalPurchasesPaisa - entry[0].finalPaisa), updatedAt: now } as never).where(eq(vendors.id, entry[0].vendorId));
  }
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "void", entityType: "market_entry", entityId: entryId, beforeJson: JSON.stringify(entry[0]), createdAt: now });
  return NextResponse.json({ ok: true });
}
