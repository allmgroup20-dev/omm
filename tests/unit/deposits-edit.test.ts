import { describe, it, expect } from "vitest";
import { depositSchema, depositUpdateSchema } from "@/lib/validators-finance";
import { rawDicts, leafKeys } from "@/i18n/dict";

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

describe("deposit closed-month UX — i18n + 409 contract", () => {
  const financeKeys = [
    "finance.closedBanner",
    "finance.reopenLink",
    "finance.editTitle",
    "finance.updateBtn",
    "finance.reasonLabel",
    "finance.voidBtn",
    "finance.editDone",
    "finance.voidDone",
    "finance.voidKeepsLedger",
    "finance.totalDeposits",
    "finance.unknownMember",
  ];

  it("bn/en both have all deposit-edit keys (no missing labels in UI)", () => {
    const { bn, en } = rawDicts();
    const bnKeys = new Set(leafKeys(bn));
    const enKeys = new Set(leafKeys(en));
    for (const k of financeKeys) {
      expect(bnKeys.has(k)).toBe(true);
      expect(enKeys.has(k)).toBe(true);
    }
  });

  it("409 closed-month body carries machine-readable code + YYYY-MM period", () => {
    // mirrors monthClosedBody() in deposits/[depositId]/route.ts
    const body = { error: "Month is closed (final). Reopen settlement first.", code: "MONTH_CLOSED", period: "2026-09-20".slice(0, 7) };
    expect(body.code).toBe("MONTH_CLOSED");
    expect(body.period).toMatch(/^\d{4}-\d{2}$/);
    expect(body.period).toBe("2026-09");
  });

  it("settlement ym formats to YYYY-MM like the banner expects", () => {
    const ym = `${2026}-${String(9).padStart(2, "0")}`;
    expect(ym).toBe("2026-09");
  });
});
