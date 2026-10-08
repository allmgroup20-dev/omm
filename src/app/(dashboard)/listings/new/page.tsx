import Link from "next/link";
import ListingForm from "@/components/listing-form";
import { getServerDict } from "@/i18n/server";

export default async function NewListingPage() {
  const { t } = await getServerDict();
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Link href="/listings" className="text-sm text-zinc-500 min-h-[44px] inline-flex items-center">← {t("listing.myTitle")}</Link>
      <h1 className="text-lg font-bold">{t("listing.newTitle")}</h1>
      <ListingForm />
    </div>
  );
}
