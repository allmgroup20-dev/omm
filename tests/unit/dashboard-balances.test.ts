import { describe, it, expect } from "vitest";
import { monthlyNetBalance, netBalanceStatus, classifyDashboardViewer, cashInHandPaisa } from "@/lib/money";
import { rawDicts, leafKeys } from "@/i18n/dict";

describe("manager dashboard — monthly net balance (deposit − meal cost)", () => {
  it("advance when deposit exceeds meal cost", () => {
    // জমা ৫০০০, মিল খরচ ৩২০০ → +১৮০০ অগ্রিম
    expect(monthlyNetBalance(500000, 320000)).toBe(180000);
    expect(netBalanceStatus(180000)).toBe("advance");
  });

  it("due when meal cost exceeds deposit", () => {
    // জমা ২০০০, মিল খরচ ৩৫০০ → −১৫০০ বকেয়া
    expect(monthlyNetBalance(200000, 350000)).toBe(-150000);
    expect(netBalanceStatus(-150000)).toBe("due");
  });

  it("settled when exactly equal", () => {
    expect(monthlyNetBalance(300000, 300000)).toBe(0);
    expect(netBalanceStatus(0)).toBe("settled");
  });

  it("zero meals + zero deposit settles (not due)", () => {
    expect(monthlyNetBalance(0, 0)).toBe(0);
    expect(netBalanceStatus(monthlyNetBalance(0, 0))).toBe("settled");
  });

  it("balance never equals raw deposit once meals exist (the reported bug)", () => {
    const deposit = 500000;
    const mealCost = 320000;
    const balance = monthlyNetBalance(deposit, mealCost);
    expect(balance).not.toBe(deposit);
    expect(balance).toBe(deposit - mealCost);
  });

  it("KPI aggregation: due and advance totals from member nets", () => {
    const nets = [180000, -150000, 0, 50000]; // per-member monthly nets
    const totalAdvance = nets.filter((b) => b > 0).reduce((a, b) => a + b, 0);
    const totalDue = nets.filter((b) => b < 0).reduce((a, b) => a + Math.abs(b), 0);
    expect(totalAdvance).toBe(230000);
    expect(totalDue).toBe(150000);
  });
});

describe("manager dashboard — join prompt gating", () => {
  it("guest (no account) sees the prompt", () => {
    expect(classifyDashboardViewer({ hasUser: false, memberOk: false, isGuest: false, hasTarget: false })).toBe("guest");
  });

  it("logged-in member never sees the prompt", () => {
    expect(classifyDashboardViewer({ hasUser: true, memberOk: true, isGuest: false, hasTarget: true })).toBe("member");
  });

  it("logged-in non-member is outsider (inline join only, no nag)", () => {
    // 403 from dashboard/member
    expect(classifyDashboardViewer({ hasUser: true, memberOk: false, isGuest: false, hasTarget: false })).toBe("outsider");
  });

  it("error/edge responses fall back to outsider, never guest, when logged in", () => {
    expect(classifyDashboardViewer({ hasUser: true, memberOk: true, isGuest: false, hasTarget: false })).toBe("outsider");
    expect(classifyDashboardViewer({ hasUser: true, memberOk: true, isGuest: true, hasTarget: false })).toBe("outsider");
  });
});

describe("manager dashboard — cash in hand (lifetime deposits − lifetime spend)", () => {
  it("cash = deposits − market − other", () => {
    // মোট জমা ৫০০০০, বাজার ৩০০০০, অন্যান্য ৫০০০ → ক্যাশ ১৫০০০
    expect(cashInHandPaisa(5000000, 3000000, 500000)).toBe(1500000);
  });

  it("deficit goes negative when spending exceeds deposits", () => {
    expect(cashInHandPaisa(1000000, 900000, 300000)).toBe(-200000);
  });

  it("zero when nothing collected/spent", () => {
    expect(cashInHandPaisa(0, 0, 0)).toBe(0);
  });

  it("cash strip i18n keys exist in bn + en", () => {
    const { bn, en } = rawDicts();
    const bnKeys = new Set(leafKeys(bn));
    const enKeys = new Set(leafKeys(en));
    for (const k of ["dashboard.cashInHand", "dashboard.cashTitle", "dashboard.cashDeposits", "dashboard.cashMarket", "dashboard.cashOther"]) {
      expect(bnKeys.has(k)).toBe(true);
      expect(enKeys.has(k)).toBe(true);
    }
  });
});
