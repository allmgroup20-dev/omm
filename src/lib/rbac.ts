import { getDb } from "@/db";
import { messMembers, messes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type Role = "super_admin" | "manager" | "assistant_manager" | "member";

export const PERMISSIONS = [
  "member.manage",
  "meal.manage",
  "market.manage",
  "expense.manage",
  "deposit.manage",
  "reports.view",
  "settings.manage",
  "finance.manage",
  "user.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export async function getUserMessRole(userId: string, messId: string): Promise<Role | null> {
  const db = getDb();
  const row = await db
    .select({ role: messMembers.role })
    .from(messMembers)
    .where(and(eq(messMembers.userId, userId), eq(messMembers.messId, messId)))
    .limit(1);
  return (row[0]?.role as Role) ?? null;
}

export async function hasMessAccess(userId: string, messId: string): Promise<boolean> {
  const role = await getUserMessRole(userId, messId);
  return role !== null;
}

export async function requireMessAccess(userId: string, messId: string): Promise<void> {
  const ok = await hasMessAccess(userId, messId);
  if (!ok) throw new Error("Forbidden: no access to this mess");
}

export function hasPermission(role: Role, permission: Permission): boolean {
  // manager has all; assistant has limited; member read-only
  if (role === "manager" || role === "super_admin") return true;
  if (role === "assistant_manager") {
    // assistant cannot manage settings/finance/user.manage by default
    const denied: Permission[] = ["settings.manage", "finance.manage", "user.manage"];
    return !denied.includes(permission);
  }
  // member: only view reports if needed
  return permission === "reports.view";
}
