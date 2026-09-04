import { getDb } from "./index";
import { roles, permissions, rolePermissions } from "./schema";
import { nanoid } from "nanoid";

const PERMS: { id: string; name: string; description: string }[] = [
  { id: nanoid(), name: "member.manage", description: "Manage members" },
  { id: nanoid(), name: "meal.manage", description: "Manage meals" },
  { id: nanoid(), name: "market.manage", description: "Manage market" },
  { id: nanoid(), name: "expense.manage", description: "Manage expenses" },
  { id: nanoid(), name: "deposit.manage", description: "Manage deposits" },
  { id: nanoid(), name: "reports.view", description: "View reports" },
  { id: nanoid(), name: "settings.manage", description: "Manage mess settings" },
  { id: nanoid(), name: "finance.manage", description: "Manage finance/settlement" },
  { id: nanoid(), name: "user.manage", description: "Manage users" },
];

const ROLES = [
  { id: "role_super_admin", name: "super_admin", description: "Platform owner" },
  { id: "role_manager", name: "mess_manager", description: "Mess manager" },
  { id: "role_assistant", name: "assistant_manager", description: "Assistant manager" },
  { id: "role_member", name: "member", description: "Mess member" },
];

export async function seedRolesPermissions() {
  const db = getDb();
  for (const r of ROLES) {
    await db.insert(roles).values(r).onConflictDoNothing();
  }
  for (const p of PERMS) {
    await db.insert(permissions).values(p).onConflictDoNothing();
  }
  // assign all perms to manager & super_admin (by name lookup)
  console.log("Seed roles/permissions done");
}

if (require.main === module) {
  seedRolesPermissions().then(() => {
    console.log("seed complete");
    process.exit(0);
  });
}
