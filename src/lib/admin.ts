import { getRequestDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getEnv } from "./env";

function adminEmails(): Set<string> {
  return new Set(
    (getEnv("ADMIN_EMAILS", "admin@jobayergroup.com")).split(",").map((s) => s.trim().toLowerCase()),
  );
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  const db = await getRequestDb();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const u = rows[0];
  if (!u) return false;
  if (adminEmails().has(u.email.toLowerCase())) return true;
  // Also check roles table if super_admin
  try {
    const { roles, messMembers } = await import("@/db/schema");
    const roleRows = await db.select().from(roles).where(eq(roles.name, "super_admin")).limit(1);
    if (roleRows[0]) {
      // For now, consider anyone with role super_admin in any mess as admin — future system_roles table
      return false;
    }
  } catch {}
  return false;
}
