import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import { users, messes, messMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { nanoid } from "nanoid";

describe("integration — auth & mess", () => {
  it("password hashing and verification", async () => {
    const hash = await hashPassword("StrongPass1");
    expect(await verifyPassword("StrongPass1", hash)).toBe(true);
    expect(await verifyPassword("Wrong", hash)).toBe(false);
  });

  it("mess creation and member isolation (in-memory DB)", async () => {
    const db = getDb();
    const uid1 = nanoid();
    const uid2 = nanoid();
    const mid1 = nanoid();
    const mid2 = nanoid();
    const now = new Date().toISOString();
    const hash = await hashPassword("StrongPass1");

    // create two users
    await db.insert(users).values({ id: uid1, email: `u1_${Date.now()}@test.com`, passwordHash: hash, fullName: "U1", createdAt: now, updatedAt: now });
    await db.insert(users).values({ id: uid2, email: `u2_${Date.now()}@test.com`, passwordHash: hash, fullName: "U2", createdAt: now, updatedAt: now });

    // create mess
    await db.insert(messes).values({ id: mid1, name: "Mess A", code: `OMM-${nanoid(6).toUpperCase()}`, startDate: "2026-09-01", createdAt: now, updatedAt: now });
    await db.insert(messes).values({ id: mid2, name: "Mess B", code: `OMM-${nanoid(6).toUpperCase()}`, startDate: "2026-09-01", createdAt: now, updatedAt: now });

    // add u1 to messA only
    await db.insert(messMembers).values({ id: nanoid(), messId: mid1, userId: uid1, role: "manager", joinedAt: now, createdAt: now, updatedAt: now });

    const accessA = await db.select().from(messMembers).where(eq(messMembers.messId, mid1));
    const accessB = await db.select().from(messMembers).where(eq(messMembers.messId, mid2));
    expect(accessA.length).toBe(1);
    expect(accessB.length).toBe(0);

    // cleanup
    await db.delete(messMembers).where(eq(messMembers.id, accessA[0].id));
    await db.delete(messes).where(eq(messes.id, mid1));
    await db.delete(messes).where(eq(messes.id, mid2));
    await db.delete(users).where(eq(users.id, uid1));
    await db.delete(users).where(eq(users.id, uid2));
  });
});
