import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { vendors, messMembers, auditLogs } from "@/db/schema";
import { vendorSchema } from "@/lib/validators-market";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(vendors).where(eq(vendors.messId, id));
  return NextResponse.json({ vendors: rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = vendorSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const now = new Date().toISOString();
  const vid = nanoid();
  await db.insert(vendors).values({
    id: vid,
    messId: id,
    name: parsed.data.name.trim(),
    phone: parsed.data.phone?.trim() || null,
    address: parsed.data.address?.trim() || null,
    category: parsed.data.category?.trim() || null,
    notes: parsed.data.notes?.trim() || null,
    totalPurchasesPaisa: 0,
    outstandingPaisa: 0,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(auditLogs).values({ id: nanoid(), messId: id, actorId: user.id, action: "create", entityType: "vendor", entityId: vid, afterJson: JSON.stringify({ name: parsed.data.name }), createdAt: now });
  const row = await db.select().from(vendors).where(eq(vendors.id, vid)).limit(1);
  return NextResponse.json({ ok: true, vendor: row[0] });
}
