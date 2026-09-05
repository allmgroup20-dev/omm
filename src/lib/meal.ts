import { getRequestDb } from "@/db";
import { messes, mealTypes, messMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function getMessWithAccess(messId: string, userId: string) {
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, messId), eq(messMembers.userId, userId))).limit(1);
  if (!access[0]) throw new Error("Forbidden");
  const mess = await db.select().from(messes).where(eq(messes.id, messId)).limit(1);
  if (!mess[0]) throw new Error("Mess not found");
  const types = await db.select().from(mealTypes).where(eq(mealTypes.messId, messId));
  return { mess: mess[0], member: access[0], mealTypes: types.filter((t) => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder) };
}

export function toScaled(q: number): number {
  return Math.round(q * 100);
}
export function fromScaled(s: number): number {
  return s / 100;
}

export function checkPrecision(quantity: number, precision: number): boolean {
  const scaled = toScaled(quantity);
  return scaled % precision === 0;
}
