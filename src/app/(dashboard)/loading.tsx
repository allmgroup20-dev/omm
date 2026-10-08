import { getServerDict } from "@/i18n/server";

export default async function Loading() {
  const { t } = await getServerDict();
  return <div className="rounded-2xl border bg-white p-10 text-center text-sm text-zinc-500 animate-pulse">{t("common.loading")}</div>;
}
