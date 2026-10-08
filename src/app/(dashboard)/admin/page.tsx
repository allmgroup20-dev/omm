import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isSuperAdmin } from "@/lib/admin";
import { getServerDict } from "@/i18n/server";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await isSuperAdmin(user.id))) redirect("/dashboard");
  const { t } = await getServerDict();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("admin.title")}</h1>
      <div className="grid md:grid-cols-3 gap-3">
        <Link href="/admin/listings?status=pending" className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">{t("admin.pendingListings")}</div>
          <div className="text-xs text-zinc-500 mt-1">{t("admin.pendingDesc")}</div>
        </Link>
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold">{t("admin.system")}</div>
          <div className="text-xs text-zinc-500 mt-1">{t("admin.systemDesc")}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold">{t("admin.audit")}</div>
          <div className="text-xs text-zinc-500 mt-1">{t("mess.qaAudit")}</div>
        </div>
      </div>
      <p className="text-xs text-zinc-500">{t("admin.adminNote")}</p>
    </div>
  );
}
