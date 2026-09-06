import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerDict } from "@/i18n/server";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t } = await getServerDict();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">{t("profile.title")}</h1>

      <div className="bg-white border rounded-2xl p-6 flex gap-4 items-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 text-white grid place-items-center text-xl font-bold">{user.fullName.slice(0, 2).toUpperCase()}</div>
        <div>
          <div className="font-bold">{user.fullName}</div>
          <div className="text-sm text-zinc-500">{user.email} • {user.phone || t("profile.noPhone")}</div>
          <div className="text-xs text-zinc-500 mt-1">ID: {user.id.slice(0, 8)} • {t("common.status")}: {t(`status.${user.status}`)} • {t("common.status")}: {user.emailVerified ? t("profile.verifiedYes") : t("profile.verifiedPending")}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white border rounded-2xl p-5">
          <div className="font-semibold text-sm">{t("profile.security")}</div>
          <div className="mt-3 space-y-2 text-sm">
            <Link href="/profile/change-password" className="block border rounded-xl px-3 py-2 hover:bg-zinc-50">{t("profile.changePw")}</Link>
            <form action="/api/auth/logout-all" method="post">
              <button formAction="/api/auth/logout-all" className="w-full text-left border rounded-xl px-3 py-2 hover:bg-zinc-50">{t("profile.logoutAll")}</button>
            </form>
          </div>
        </div>
        <div className="bg-white border rounded-2xl p-5">
          <div className="font-semibold text-sm">{t("profile.prefs")}</div>
          <div className="mt-3 text-sm text-zinc-600">{t("profile.prefsDesc")}</div>
          <div className="mt-2 text-xs text-zinc-500">{t("profile.prefCurrent")}</div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <div className="font-semibold text-sm">{t("profile.sessions")}</div>
        <p className="text-sm text-zinc-500 mt-1">{t("profile.sessionsDesc")}</p>
      </div>
    </div>
  );
}
