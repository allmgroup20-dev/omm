import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  const { passwordHash, ...safe } = user as unknown as Record<string, unknown>;
  return NextResponse.json({ user: safe });
}
