import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messMembers, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db
    .select({ member: messMembers, user: users })
    .from(messMembers)
    .innerJoin(users, eq(messMembers.userId, users.id))
    .where(eq(messMembers.messId, id));

  return NextResponse.json({
    members: rows.map((r) => ({
      id: r.member.id,
      userId: r.user.id,
      fullName: r.user.fullName,
      email: r.user.email,
      phone: r.user.phone,
      profilePhoto: r.user.profilePhoto,
      role: r.member.role,
      isPrimaryManager: r.member.isPrimaryManager,
      status: r.member.status,
      joinedAt: r.member.joinedAt,
      leftAt: r.member.leftAt,
    })),
  });
}
