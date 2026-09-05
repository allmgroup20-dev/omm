import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import { users, messes, messMembers, mealRecords, mealTypes, deposits, ledgerEntries } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { memberDisplayName, normalizeMemberName } from "@/lib/mess";
import { nanoid } from "nanoid";

describe("integration — placeholder members + account linking", () => {
  it("display name falls back to placeholder name", () => {
    expect(memberDisplayName({ displayName: "করিম" }, null)).toBe("করিম");
    expect(memberDisplayName({ displayName: "করিম" }, { fullName: "Karim Uddin" })).toBe("Karim Uddin");
    expect(memberDisplayName({ displayName: null }, null)).toBe("সদস্য");
  });

  it("normalizeMemberName is case-insensitive", () => {
    expect(normalizeMemberName("  Karim   Uddin ")).toBe(normalizeMemberName("karim uddin"));
  });

  it("placeholder flow: create → meals/deposits → register → link → history preserved", async () => {
    const db = getDb();
    const now = new Date().toISOString();
    const hash = await hashPassword("StrongPass1");
    const stamp = Date.now();

    // manager + mess
    const managerId = nanoid();
    await db.insert(users).values({ id: managerId, email: `mgr_${stamp}@test.com`, passwordHash: hash, fullName: "Manager", createdAt: now, updatedAt: now });
    const messId = nanoid();
    await db.insert(messes).values({ id: messId, name: "Placeholder Mess", code: `OMM-${nanoid(6).toUpperCase()}`, startDate: "2026-09-01", createdAt: now, updatedAt: now });
    await db.insert(messMembers).values({ id: nanoid(), messId, userId: managerId, role: "manager", joinedAt: now, createdAt: now, updatedAt: now });

    // 1. manager creates placeholder by name only
    const placeholderId = nanoid();
    await db.insert(messMembers).values({ id: placeholderId, messId, userId: null, displayName: "রহিম উদ্দিন", role: "member", status: "active", joinedAt: now, createdAt: now, updatedAt: now });

    // 2. multiple NULL userIds allowed (SQLite UNIQUE treats NULLs as distinct)
    const placeholder2 = nanoid();
    await db.insert(messMembers).values({ id: placeholder2, messId, userId: null, displayName: "সালমা", role: "member", status: "active", joinedAt: now, createdAt: now, updatedAt: now });

    // 3. meal + deposit recorded on placeholder memberId
    const mtId = nanoid();
    await db.insert(mealTypes).values({ id: mtId, messId, name: "Lunch", slug: "lunch", createdAt: now });
    await db.insert(mealRecords).values({ id: nanoid(), messId, memberId: placeholderId, date: "2026-09-05", mealTypeId: mtId, quantityScaled: 100, createdAt: now, updatedAt: now });
    await db.insert(deposits).values({ id: nanoid(), messId, memberId: placeholderId, date: "2026-09-05", amountPaisa: 500000, status: "active", createdAt: now, updatedAt: now });
    await db.insert(ledgerEntries).values({ id: nanoid(), messId, memberId: placeholderId, date: "2026-09-05", type: "deposit", description: "Deposit", debitPaisa: 0, creditPaisa: 500000, balancePaisa: 500000, createdAt: now });

    // 4. person registers later
    const newUserId = nanoid();
    await db.insert(users).values({ id: newUserId, email: `rahim_${stamp}@test.com`, passwordHash: hash, fullName: "Rahim Uddin", createdAt: now, updatedAt: now });

    // 5. manager links placeholder → account
    await db.update(messMembers).set({ userId: newUserId, claimedAt: now, claimedBy: managerId, updatedAt: now }).where(eq(messMembers.id, placeholderId));

    // 6. history still under the SAME memberId
    const meals = await db.select().from(mealRecords).where(and(eq(mealRecords.messId, messId), eq(mealRecords.memberId, placeholderId)));
    const deps = await db.select().from(deposits).where(and(eq(deposits.messId, messId), eq(deposits.memberId, placeholderId)));
    expect(meals.length).toBe(1);
    expect(deps.length).toBe(1);

    // 7. leftJoin resolves linked name
    const joined = await db.select({ member: messMembers, user: users }).from(messMembers).leftJoin(users, eq(messMembers.userId, users.id)).where(eq(messMembers.id, placeholderId));
    expect(joined[0].user?.fullName).toBe("Rahim Uddin");
    expect(memberDisplayName(joined[0].member, joined[0].user ? { fullName: joined[0].user.fullName } : null)).toBe("Rahim Uddin");

    // 8. unlink restores placeholder (history still intact)
    await db.update(messMembers).set({ userId: null, claimedAt: null, claimedBy: null, updatedAt: now }).where(eq(messMembers.id, placeholderId));
    const afterUnlink = await db.select().from(messMembers).where(eq(messMembers.id, placeholderId)).limit(1);
    expect(afterUnlink[0].userId).toBeNull();
    const mealsAfter = await db.select().from(mealRecords).where(eq(mealRecords.memberId, placeholderId));
    expect(mealsAfter.length).toBe(1);

    // cleanup (FK order: children first)
    await db.delete(ledgerEntries).where(eq(ledgerEntries.messId, messId));
    await db.delete(deposits).where(eq(deposits.messId, messId));
    await db.delete(mealRecords).where(eq(mealRecords.messId, messId));
    await db.delete(mealTypes).where(eq(mealTypes.messId, messId));
    await db.delete(messMembers).where(eq(messMembers.messId, messId));
    await db.delete(messes).where(eq(messes.id, messId));
    await db.delete(users).where(eq(users.id, managerId));
    await db.delete(users).where(eq(users.id, newUserId));
  });
});
