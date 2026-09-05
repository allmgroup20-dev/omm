import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { nanoid } from "nanoid";

export type NotificationType =
  | "meal_reminder"
  | "deposit"
  | "due"
  | "settlement"
  | "month_close"
  | "expense_approval"
  | "invitation"
  | "security"
  | "general";

export async function createNotification(params: {
  userId: string;
  messId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
}) {
  const db = getDb();
  const now = new Date().toISOString();
  await db.insert(notifications).values({
    id: nanoid(),
    userId: params.userId,
    messId: params.messId || null,
    type: params.type,
    title: params.title,
    body: params.body || null,
    isRead: false,
    link: params.link || null,
    createdAt: now,
  });
}

export async function notifyMessMembers(
  messId: string,
  type: NotificationType,
  title: string,
  body?: string,
  link?: string,
  excludeUserId?: string,
) {
  const db = getDb();
  const { messMembers } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const members = await db.select().from(messMembers).where(eq(messMembers.messId, messId));
  for (const m of members) {
    if (excludeUserId && m.userId === excludeUserId) continue;
    if (m.status !== "active") continue;
    await createNotification({ userId: m.userId, messId, type, title, body: body || null, link: link || null });
  }
}
