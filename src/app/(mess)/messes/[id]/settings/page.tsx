import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messes, messMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SettingsForm from "./form";
import { getServerDict } from "@/i18n/server";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t } = await getServerDict();
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) notFound();
  const mess = await db.select().from(messes).where(eq(messes.id, id)).limit(1);
  if (!mess[0]) notFound();
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
      <h1 className="text-lg font-bold">{t("settings.title")}</h1>
      <SettingsForm mess={mess[0]} role={access[0].role} />
      {(access[0].role === "manager" || access[0].role === "assistant_manager") && (
        <Link href={`/messes/${id}/meal-types`} className="block rounded-2xl border bg-white p-4 hover:shadow-sm">
          <div className="font-semibold text-sm">{t("meals.typesTitle")}</div>
          <div className="text-xs text-zinc-500 mt-1">{t("meals.typeHint")}</div>
        </Link>
      )}
    </div>
  );
}
