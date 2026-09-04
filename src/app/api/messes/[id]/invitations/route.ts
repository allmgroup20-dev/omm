import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { invitations, messMembers } from "@/db/schema";
import { createInvitationSchema } from "@/lib/validators-mess";
import { generateInviteCode, generateLinkToken } from "@/lib/mess";
import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(invitations).where(eq(invitations.messId, id));
  return NextResponse.json({ invitations: rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0] || !["manager", "assistant_manager"].includes(access[0].role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createInvitationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const now = new Date().toISOString();
  const code = generateInviteCode();
  const linkToken = generateLinkToken();
  const invId = nanoid();
  await db.insert(invitations).values({
    id: invId,
    messId: id,
    code,
    linkToken,
    email: parsed.data.email?.trim() || null,
    phone: parsed.data.phone?.trim() || null,
    role: parsed.data.role || "member",
    createdBy: user.id,
    expiresAt: parsed.data.expiresAt || null,
    status: "active",
    createdAt: now,
  });
  const inviteLink = `/join?token=${linkToken}`;
  const inviteCode = code;
  return NextResponse.json({ ok: true, invitation: { id: invId, code: inviteCode, linkToken, inviteLink } });
}
