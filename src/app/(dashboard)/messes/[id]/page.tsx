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
          <Link href={`/messes/${id}/members`} className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm">{t("mess.viewMembers")}</Link>
          <Link href={`/messes/${id}/invitations`} className="px-4 py-2 rounded-full border bg-white text-sm">{t("mess.invitations")}</Link>
          <Link href={`/messes/${id}/settings`} className="px-4 py-2 rounded-full border bg-white text-sm">{t("mess.settings")}</Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 sm:p-6">
        <h3 className="text-sm font-semibold">{t("mess.quickActions")}</h3>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
          <Link href={`/messes/${id}/members`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">{t("mess.qaMembers")}</Link>
          <Link href={`/messes/${id}/meals`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">{t("mess.qaMeal")}</Link>
          <Link href={`/messes/${id}/market/add`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">{t("mess.qaMarket")}</Link>
          <Link href={`/messes/${id}/finance/deposits`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">{t("mess.qaDeposit")}</Link>
          <Link href={`/messes/${id}/dashboard`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">{t("mess.qaDashboard")}</Link>
          <Link href={`/messes/${id}/settlements`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">{t("mess.qaSettlement")}</Link>
          <Link href={`/messes/${id}/reports`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">{t("mess.qaReports")}</Link>
          <Link href={`/messes/${id}/calendar`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">{t("mess.qaCalendar")}</Link>
        </div>
      </div>
    </div>
  );
}
