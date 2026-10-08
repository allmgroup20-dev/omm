import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messes, messMembers, mealTypes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerDict } from "@/i18n/server";

export default async function MessOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t } = await getServerDict();
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) notFound();
  const mess = await db.select().from(messes).where(eq(messes.id, id)).limit(1);
  if (!mess[0]) notFound();
  const m = mess[0];
  const isManager = access[0].role === "manager" || access[0].role === "assistant_manager";
  const memberCount = isManager ? (await db.select({ id: messMembers.id }).from(messMembers).where(eq(messMembers.messId, id))).length : 1;
  const mealTypeCount = isManager ? (await db.select({ id: mealTypes.id }).from(mealTypes).where(eq(mealTypes.messId, id))).length : 1;
  const needsSetup = isManager && (memberCount === 0 || mealTypeCount === 0);

  return (
    <div className="space-y-4">
      <Link href="/dashboard" className="text-sm text-zinc-500 min-h-[44px] inline-flex items-center">{t("mess.backAll")}</Link>
      <div className="rounded-2xl border bg-white p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold truncate">{m.name}</h1>
            <p className="text-xs text-zinc-500">{m.code} • {m.startDate} • {m.timezone}</p>
          </div>
          <span className={`shrink-0 text-xs rounded-full px-3 py-1 ${access[0].role === "manager" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>{t(`roles.${access[0].role}`)}</span>
        </div>
      </div>

      {needsSetup && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6">
          <h3 className="text-sm font-semibold">🧭 {t("mess.setupChecklist")}</h3>
          <ol className="mt-3 space-y-2 text-sm">
            <li>
              <Link href={`/messes/${id}/members`} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 min-h-[48px]">
                <span className="w-6 h-6 grid place-items-center rounded-full bg-zinc-900 text-white text-xs shrink-0">১</span>
                <span className="flex-1">{t("mess.step1Members")}</span>
                <span>{memberCount === 0 ? "⬜" : "✅"}</span>
              </Link>
            </li>
            <li>
              <Link href={`/messes/${id}/settings`} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 min-h-[48px]">
                <span className="w-6 h-6 grid place-items-center rounded-full bg-zinc-900 text-white text-xs shrink-0">২</span>
                <span className="flex-1">{t("mess.step2MealTypes")}</span>
                <span>{mealTypeCount === 0 ? "⬜" : "✅"}</span>
              </Link>
            </li>
            <li>
              <Link href={`/messes/${id}/meals`} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 min-h-[48px]">
                <span className="w-6 h-6 grid place-items-center rounded-full bg-zinc-900 text-white text-xs shrink-0">৩</span>
                <span className="flex-1">{t("mess.step3Meals")}</span>
                <span>→</span>
              </Link>
            </li>
          </ol>
        </div>
      )}

      <div className="rounded-2xl border bg-white p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">{t("mess.dailyTitle")}</h3>
          <span className="text-xs text-zinc-500">{t("mess.dailyNote")}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
          <Link href={`/messes/${id}/meals`} className="rounded-xl border border-zinc-900 bg-zinc-900 text-white p-4 text-center font-medium min-h-[64px] inline-flex items-center justify-center hover:bg-zinc-800">{t("mess.qaMealToday")}</Link>
          <Link href={`/messes/${id}/market/add`} className="rounded-xl border p-4 text-center font-medium min-h-[64px] inline-flex items-center justify-center hover:bg-zinc-50">{t("mess.qaMarket")}</Link>
          <Link href={`/messes/${id}/finance/deposits`} className="rounded-xl border p-4 text-center font-medium min-h-[64px] inline-flex items-center justify-center hover:bg-zinc-50">{t("mess.qaDeposit")}</Link>
          <Link href={`/messes/${id}/finance/dues`} className="rounded-xl border border-red-200 text-red-700 p-4 text-center font-medium min-h-[64px] inline-flex items-center justify-center hover:bg-red-50">{isManager ? t("mess.qaDues") : t("dues.myDue")}</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-4 sm:p-6">
        <h3 className="text-sm font-semibold">{t("mess.weeklyTitle")}</h3>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          <Link href={`/messes/${id}/market/entries`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.qaEntries")}</Link>
          <Link href={`/messes/${id}/settlements`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.qaSettlement")}</Link>
          <Link href={`/messes/${id}/reports`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.qaReports")}</Link>
          <Link href={`/messes/${id}/meals/matrix`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.qaMatrix")}</Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 sm:p-6">
        <h3 className="text-sm font-semibold">{t("mess.setupTitle")}</h3>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          <Link href={`/messes/${id}/members`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.qaMembers")}</Link>
          <Link href={`/messes/${id}/expenses`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.qaExpenses")}</Link>
          {isManager && (
            <>
              <Link href={`/messes/${id}/dashboard`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.qaDashboard")}</Link>
              <Link href={`/messes/${id}/audit-logs`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.qaAudit")}</Link>
              <Link href={`/messes/${id}/settings`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.settings")}</Link>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
