import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { users, messMembers } from "@/db/schema";
import { eq, like, or } from "drizzle-orm";

// GET /api/users/search?q= — manager/assistant-only minimal user lookup for account linking.
// Returns only non-sensitive fields. Never returns password hashes.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db0 = await getRequestDb();
  const myRoles = await db0.select().from(messMembers).where(eq(messMembers.userId, user.id));
  if (!myRoles.some((m) => m.role === "manager" || m.role === "assistant_manager")) {
    return NextResponse.json({ error: "Forbidden — managers only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json({ users: [] });
  if (q.length > 80) return NextResponse.json({ error: "Query too long" }, { status: 400 });

  const db = db0;
  const pattern = `%${q.toLowerCase()}%`;
  const rows = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, profilePhoto: users.profilePhoto, status: users.status })
    .from(users)
    .where(or(like(users.email, pattern), like(users.fullName, pattern), like(users.phone, pattern)))
    .limit(10);

  return NextResponse.json({
    users: rows
      .filter((r) => r.status === "active")
      .map((r) => ({ id: r.id, fullName: r.fullName, email: r.email, phone: r.phone, profilePhoto: r.profilePhoto })),
  });
}
