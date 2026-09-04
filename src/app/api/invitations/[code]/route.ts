import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { invitations, messes } from "@/db/schema";
import { eq, or } from "drizzle-orm";

// GET /api/invitations/:code  (code or linkToken)
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const db = getDb();
  const rows = await db
    .select()
    .from(invitations)
    .where(or(eq(invitations.code, code), eq(invitations.linkToken, code)))
    .limit(1);
  if (!rows[0]) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  if (rows[0].status !== "active") return NextResponse.json({ error: `Invitation ${rows[0].status}` }, { status: 400 });
  const mess = await db.select().from(messes).where(eq(messes.id, rows[0].messId)).limit(1);
  return NextResponse.json({ invitation: rows[0], mess: mess[0] || null });
}
