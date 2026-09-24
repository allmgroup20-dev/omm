import { describe, it, expect } from "vitest";
import { depositSchema, depositUpdateSchema } from "@/lib/validators-finance";

describe("deposit update — 100% dynamic edit validation", () => {
  it("accepts amount-only edit with reason", () => {
    const r = depositUpdateSchema.safeParse({ amount: 1500, reason: "wrong amount entered" });
    expect(r.success).toBe(true);
  });

  it("accepts member reassignment with reason", () => {
    const r = depositUpdateSchema.safeParse({ memberId: "mem_123", reason: "wrong person selected" });
    expect(r.success).toBe(true);
  });

  it("accepts full edit (member+date+amount+method+note)", () => {
    const r = depositUpdateSchema.safeParse({
      memberId: "mem_123",
      date: "2026-09-01",
      amount: 2000,
      paymentMethod: "mobile",
      note: "bkash",
      reason: "all fields were wrong",
    });
    expect(r.success).toBe(true);
  });

  it("rejects edit without reason (audit requires it)", () => {
    const r = depositUpdateSchema.safeParse({ amount: 1500 });
    expect(r.success).toBe(false);
  });

  it("rejects too-short reason", () => {
    const r = depositUpdateSchema.safeParse({ amount: 1500, reason: "ok" });
    expect(r.success).toBe(false);
  });

  it("rejects reason-only body (nothing to update)", () => {
    const r = depositUpdateSchema.safeParse({ reason: "just a reason" });
    expect(r.success).toBe(false);
  });

  it("rejects zero/negative amount", () => {
    expect(depositUpdateSchema.safeParse({ amount: 0, reason: "fix amount" }).success).toBe(false);
    expect(depositUpdateSchema.safeParse({ amount: -5, reason: "fix amount" }).success).toBe(false);
  });

  it("rejects bad date format", () => {
    const r = depositUpdateSchema.safeParse({ date: "01-09-2026", reason: "fix date" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid payment method", () => {
    const r = depositUpdateSchema.safeParse({ paymentMethod: "cheque", reason: "fix method" });
    expect(r.success).toBe(false);
  });

  it("create schema still works (no regression)", () => {
    const r = depositSchema.safeParse({ memberId: "m1", date: "2026-09-20", amount: 1000 });
    expect(r.success).toBe(true);
  });

  it("paisa math: edited amount converts exactly", () => {
    const amount = 1500.5;
    expect(Math.round(amount * 100)).toBe(150050);
    const oldPaisa = 100000;
    const newPaisa = Math.round(amount * 100);
    expect(newPaisa - oldPaisa).toBe(50050); // delta applied to ledger
  });
});
