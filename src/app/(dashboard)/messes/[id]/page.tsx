import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messes, messMembers } from "@/db/schema";
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

  return (
    <div className="space-y-4">
      <Link href="/dashboard" className="text-sm text-zinc-500">{t("mess.backAll")}</Link>
      <div className="rounded-2xl border bg-white p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{m.name}</h1>
            <p className="text-xs text-zinc-500">{m.code} • {m.startDate} • {m.timezone}</p>
          </div>
          <span className={`text-xs rounded-full px-3 py-1 ${access[0].role === "manager" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>{t(`roles.${access[0].role}`)}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/messes/${id}/invitations`} className="px-4 py-2 rounded-full border bg-white text-sm min-h-[44px] inline-flex items-center">{t("mess.invitations")}</Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">{t("mess.dailyTitle")}</h3>
          <span className="text-xs text-zinc-500">{t("mess.dailyNote")}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <Link href={`/messes/${id}/meals`} className="rounded-xl border border-zinc-900 bg-zinc-900 text-white p-4 text-center font-medium min-h-[64px] inline-flex items-center justify-center hover:bg-zinc-800">{t("mess.qaMealToday")}</Link>
          <Link href={`/messes/${id}/market/add`} className="rounded-xl border p-4 text-center font-medium min-h-[64px] inline-flex items-center justify-center hover:bg-zinc-50">{t("mess.qaMarket")}</Link>
          <Link href={`/messes/${id}/finance/deposits`} className="rounded-xl border p-4 text-center font-medium min-h-[64px] inline-flex items-center justify-center hover:bg-zinc-50">{t("mess.qaDeposit")}</Link>
          <Link href={`/messes/${id}/finance/dues`} className="rounded-xl border border-red-200 text-red-700 p-4 text-center font-medium min-h-[64px] inline-flex items-center justify-center hover:bg-red-50">{t("mess.qaDues")}</Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 sm:p-6">
        <h3 className="text-sm font-semibold">{t("mess.weeklyTitle")}</h3>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          <Link href={`/messes/${id}/market/entries`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.qaEntries")}</Link>
          <Link href={`/messes/${id}/finance/ledger`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.qaLedger")}</Link>
          <Link href={`/messes/${id}/finance/balances`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.qaBalances")}</Link>
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
          <Link href={`/messes/${id}/calendar`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.qaCalendar")}</Link>
          <Link href={`/messes/${id}/dashboard`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.qaDashboard")}</Link>
          <Link href={`/messes/${id}/finance`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("nav.finance")}</Link>
          <Link href={`/messes/${id}/settings`} className="border rounded-xl p-3 text-center hover:bg-zinc-50 min-h-[48px] inline-flex items-center justify-center">{t("mess.settings")}</Link>
        </div>
      </div>
    </div>
  );
}
