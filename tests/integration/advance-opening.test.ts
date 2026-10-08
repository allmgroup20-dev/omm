import { describe, it, expect } from "vitest";
import { getDb } from "@/db";
import { messes, messMembers, deposits, monthlySettlements, memberSettlements, settlementAdjustments, users, expenses } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { getPreviousBalance, regenerateSettlement } from "@/lib/settlement";
import { nanoid } from "nanoid";

/**
 * Advance/due opening chain across months (DB-backed):
 * Sept closing → Oct opening, carry/refund dispositions, regen absorption.
 */
describe("integration — advance opening chain", () => {
  async function seedMess() {
    const db = getDb();
    const now = new Date().toISOString();
    const stamp = Date.now();
    const managerId = nanoid();
    await db.insert(users).values({
      id: managerId,
      email: `mgr_open_${stamp}@test.com`,
      passwordHash: await hashPassword("StrongPass1"),
      fullName: "Manager",
      createdAt: now,
      updatedAt: now,
    });
    const messId = nanoid();
    await db.insert(messes).values({
      id: messId,
      name: `Opening Mess ${stamp}`,
      code: `OMM-${nanoid(6).toUpperCase()}`,
      startDate: "2026-09-01",
      createdAt: now,
      updatedAt: now,
    });
    const memberId = nanoid();
    await db.insert(messMembers).values({
      id: memberId,
      messId,
      status: "active",
      joinedAt: "2026-09-01T00:00:00.000Z",
      createdAt: now,
      updatedAt: now,
    });
    return { db, messId, memberId, managerId, now };
  }

  async function seedSeptClosing(db: ReturnType<typeof getDb>, messId: string, memberId: string, closing: number, now: string) {
    const settId = nanoid();
    await db.insert(monthlySettlements).values({ id: settId, messId, year: 2026, month: 9, status: "draft", createdAt: now, updatedAt: now });
    await db.insert(memberSettlements).values({
      id: nanoid(),
      settlementId: settId,
      memberId,
      closingBalancePaisa: closing,
      status: closing > 0 ? "advance" : closing < 0 ? "due" : "settled",
      createdAt: now,
    });
    return settId;
  }

  it("no prior settlement → opening 0", async () => {
    const { messId, memberId } = await seedMess();
    expect(await getPreviousBalance(messId, memberId, 2026, 10)).toBe(0);
  });

  it("untouched advance carries in full", async () => {
    const { messId, memberId, now } = await seedMess();
    await seedSeptClosing(await getDb(), messId, memberId, 10000, now);
    expect(await getPreviousBalance(messId, memberId, 2026, 10)).toBe(10000);
  });

  it("refund zeroes the opening (latest wins)", async () => {
    const { db, messId, memberId, now } = await seedMess();
    const settId = await seedSeptClosing(db, messId, memberId, 10000, now);
    await db.insert(settlementAdjustments).values({
      id: nanoid(), settlementId: settId, memberId, amountPaisa: -10000,
      kind: "refund", reason: "cash back", createdAt: now,
    });
    expect(await getPreviousBalance(messId, memberId, 2026, 10)).toBe(0);
  });

  it("due carries as negative opening", async () => {
    const { messId, memberId, now } = await seedMess();
    await seedSeptClosing(await getDb(), messId, memberId, -20000, now);
    expect(await getPreviousBalance(messId, memberId, 2026, 10)).toBe(-20000);
  });

  it("regenerate absorbs a collected deposit (the double-collect fix)", async () => {
    const { db, messId, memberId, managerId, now } = await seedMess();
    // September: 20000 approved expense, 1 member → closing −20000 (due)
    await db.insert(expenses).values({
      id: nanoid(), messId, date: "2026-09-10", amountPaisa: 20000,
      status: "approved", createdAt: now, updatedAt: now,
    });
    await seedSeptClosing(db, messId, memberId, -20000, now);
    expect(await getPreviousBalance(messId, memberId, 2026, 10)).toBe(-20000);
    // manager collects 20000 due → September-dated deposit (like collect endpoint)
    await db.insert(deposits).values({
      id: nanoid(), messId, memberId, date: "2026-09-30", amountPaisa: 20000,
      status: "active", createdAt: now, updatedAt: now,
    });
    const { settlementId, laterSettlements } = await regenerateSettlement(messId, 2026, 9, managerId, "test collect");
    expect(laterSettlements).toEqual([]);
    const mine = (await db.select().from(memberSettlements).where(eq(memberSettlements.settlementId, settlementId))).find((r) => r.memberId === memberId);
    expect(mine?.closingBalancePaisa).toBe(0);
    expect(mine?.status).toBe("settled");
    // October opening follows: due gone, nothing left to collect
    expect(await getPreviousBalance(messId, memberId, 2026, 10)).toBe(0);
  });
});
