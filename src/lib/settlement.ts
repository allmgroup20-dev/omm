import { getRequestDb } from "@/db";
import { messes, messMembers, mealRecords, marketEntries, expenses, deposits, ledgerEntries, monthlySettlements, memberSettlements } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { calcMealRate } from "./money";

export type CostingModel = "food_only" | "food_plus_expenses" | "custom";
export type Allocation = "equal" | "meal_proportional" | "member_specific" | "custom";

export async function computeSettlement(messId: string, year: number, month: number) {
  const db = await getRequestDb();
  const messRows = await db.select().from(messes).where(eq(messes.id, messId)).limit(1);
  if (!messRows[0]) throw new Error("Mess not found");
  const mess = messRows[0];
  const costingModel = mess.mealCostingModel as CostingModel;
  const allocation = mess.costAllocation as Allocation;

  const mm = String(month).padStart(2, "0");
  const prefix = `${year}-${mm}-`;
  const daysInMonth = new Date(year, month, 0).getDate();

  // fetch
  const members = await db.select().from(messMembers).where(eq(messMembers.messId, messId));
  const activeMembers = members.filter((m) => m.status === "active" || m.status === "left" || m.status === "archived"); // historical

  const marketRows = await db.select().from(marketEntries).where(eq(marketEntries.messId, messId));
  const expRows = await db.select().from(expenses).where(eq(expenses.messId, messId));
  const mealRows = await db.select().from(mealRecords).where(eq(mealRecords.messId, messId));
  const depositRows = await db.select().from(deposits).where(eq(deposits.messId, messId));
  const ledgerRows = await db.select().from(ledgerEntries).where(eq(ledgerEntries.messId, messId));

  const monthMarkets = marketRows.filter((r) => r.date.startsWith(prefix) && r.status === "active");
  const monthExpenses = expRows.filter((r) => r.date.startsWith(prefix) && r.status === "approved");
  const monthMeals = mealRows.filter((r) => r.date.startsWith(prefix));

  const totalMarketPaisa = monthMarkets.reduce((a, r) => a + r.finalPaisa, 0);
  const totalOtherPaisa = monthExpenses.reduce((a, r) => a + r.amountPaisa, 0);
  let totalFoodCostPaisa = totalMarketPaisa;
  if (costingModel === "food_plus_expenses") totalFoodCostPaisa = totalMarketPaisa + totalOtherPaisa;
  // custom: same as food_only for now

  const totalMealsScaled = monthMeals.reduce((a, r) => a + r.quantityScaled, 0);
  const mealRatePaisa = calcMealRate(totalFoodCostPaisa, totalMealsScaled);

  // member breakdown
  const byMember: Record<string, { mealsScaled: number; mealCostPaisa: number; depositPaisa: number; previousBalance: number }> = {};
  for (const m of activeMembers) {
    const mealsScaled = monthMeals.filter((r) => r.memberId === m.id).reduce((a, r) => a + r.quantityScaled, 0);
    const mealCostPaisa = totalMealsScaled > 0 ? Math.round((mealsScaled * mealRatePaisa) / 100) : 0;
    const depositPaisa = depositRows.filter((d) => d.memberId === m.id && d.date.startsWith(prefix) && d.status === "active").reduce((a, d) => a + d.amountPaisa, 0);

    // previous balance: from last settlement or ledger
    // look for previous settlement
    const prevSettlements = await db.select().from(monthlySettlements).where(eq(monthlySettlements.messId, messId));
    // find previous month settlement
    let prevBalance = 0;
    const sortedPrev = prevSettlements.filter((s) => s.year < year || (s.year === year && s.month < month)).sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));
    if (sortedPrev.length) {
      const last = sortedPrev[sortedPrev.length - 1];
      const memSett = await db.select().from(memberSettlements).where(eq(memberSettlements.settlementId, last.id));
      const found = memSett.find((ms) => ms.memberId === m.id);
      if (found) prevBalance = found.closingBalancePaisa;
    } else {
      // No previous settlement: use ledger balance before month (credits - meal costs not yet accounted)
      // For simplicity, use ledger current balance minus month deposits + month mealCost? But for first month, 0
      prevBalance = 0;
    }

    byMember[m.id] = { mealsScaled, mealCostPaisa, depositPaisa, previousBalance: prevBalance };
  }

  // allocated other expenses
  const allocatedExpenseMap: Record<string, number> = {};
  if (allocation === "equal") {
    const per = activeMembers.length ? Math.round(totalOtherPaisa / activeMembers.length) : 0;
    let remainder = totalOtherPaisa - per * activeMembers.length;
    for (const m of activeMembers) {
      let amt = per;
      if (remainder > 0) { amt += 1; remainder -= 1; }
      else if (remainder < 0) { amt -= 1; remainder += 1; }
      allocatedExpenseMap[m.id] = amt;
    }
  } else if (allocation === "meal_proportional") {
    for (const m of activeMembers) {
      const scaled = byMember[m.id].mealsScaled;
      const amt = totalMealsScaled > 0 ? Math.round((scaled * totalOtherPaisa) / totalMealsScaled) : 0;
      allocatedExpenseMap[m.id] = amt;
    }
    // adjust rounding diff
    const sum = Object.values(allocatedExpenseMap).reduce((a, b) => a + b, 0);
    const diff = totalOtherPaisa - sum;
    if (diff !== 0 && activeMembers.length) {
      const first = activeMembers[0].id;
      allocatedExpenseMap[first] += diff;
    }
  } else {
    // member_specific / custom -> equal for now
    const per = activeMembers.length ? Math.round(totalOtherPaisa / activeMembers.length) : 0;
    for (const m of activeMembers) allocatedExpenseMap[m.id] = per;
  }

  // closing balances
  const closingMap: Record<string, { closing: number; status: string; totalPayable: number }> = {};
  for (const m of activeMembers) {
    const { mealsScaled, mealCostPaisa, depositPaisa, previousBalance } = byMember[m.id];
    const allocated = allocatedExpenseMap[m.id] || 0;
    // Formula: PreviousBalance + Deposits - MealCost - AllocatedExpense = ClosingBalance
    // Positive = advance, Negative = due
    const closing = previousBalance + depositPaisa - mealCostPaisa - allocated;
    let status: string;
    if (closing > 0) status = "advance";
    else if (closing < 0) status = "due";
    else status = "settled";
    const totalPayable = mealCostPaisa + allocated;
    closingMap[m.id] = { closing, status, totalPayable };
  }

  return {
    mess,
    year,
    month,
    daysInMonth,
    totalMarketPaisa,
    totalOtherPaisa,
    totalFoodCostPaisa,
    totalMealsScaled,
    mealRatePaisa,
    members: activeMembers,
    byMember,
    allocatedExpenseMap,
    closingMap,
    monthMarkets,
    monthExpenses,
    monthMeals,
  };
}
