import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messes, messMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { getServerDict } from "@/i18n/server";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { t } = await getServerDict();
  const db = await getRequestDb();
  const rows = await db.select({ mess: messes, member: messMembers }).from(messMembers).innerJoin(messes, eq(messMembers.messId, messes.id)).where(eq(messMembers.userId, user.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t("dashboard.title")}</h1>
        <div className="flex gap-2 flex-wrap">
          <Link href="/join" className="px-5 py-3 rounded-full border bg-white text-sm min-h-[44px] inline-flex items-center justify-center">{t("dashboard.joinWithCode")}</Link>
          <Link href="/messes/new" className="px-5 py-3 rounded-full bg-zinc-900 text-white text-sm min-h-[44px] inline-flex items-center justify-center">{t("dashboard.newMess")}</Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <p className="font-medium">{t("dashboard.noMess")}</p>
          <p className="text-sm text-zinc-500 mt-1">{t("dashboard.noMessDesc")}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/messes/new" className="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm">{t("dashboard.createMess")}</Link>
            <Link href="/join" className="px-5 py-2 rounded-full border bg-white text-sm">{t("dashboard.join")}</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => (
            <Link key={r.mess.id} href={`/messes/${r.mess.id}`} className="rounded-2xl border bg-white p-4 sm:p-5 hover:shadow-sm transition">
              <div className="flex items-center justify-between">
                <span className="text-xs border rounded-full px-2 py-1 bg-zinc-50">{r.mess.code}</span>
                <span className={`text-xs rounded-full px-2 py-1 ${r.member.role === "manager" ? "bg-zinc-900 text-white" : r.member.role === "assistant_manager" ? "bg-amber-100" : "bg-zinc-100"}`}>{r.member.role}</span>
              </div>
              <div className="font-semibold mt-3">{r.mess.name}</div>
              <div className="text-xs text-zinc-500 mt-1">{[r.mess.district, r.mess.area].filter(Boolean).join(", ") || r.mess.address || t("common.noData")} • {r.mess.startDate}</div>
              <div className="text-xs text-zinc-600 mt-2">{t("dashboard.role")}: {t(`roles.${r.member.role}`)} • {t("common.status")}: {t(`status.${r.member.status}`)}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="rounded-2xl border bg-white p-5">
        <div className="text-sm font-semibold">{t("dashboard.account")}</div>
        <div className="text-xs text-zinc-500 mt-1">{user.fullName} • {user.email} • {user.phone || t("profile.noPhone")}</div>
      </div>
    </div>
  );
}
