import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import MyListings from "./list";
import { getServerDict } from "@/i18n/server";

export default async function MyListingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/listings");
  const { t } = await getServerDict();
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("listing.myTitle")}</h1>
        <Link href="/listings/new" className="px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm min-h-[44px] inline-flex items-center">{t("listing.newBtn")}</Link>
      </div>
      <MyListings />
    </div>
  );
}
