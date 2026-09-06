import Link from "next/link";
import { getServerDict } from "@/i18n/server";

export default async function FinanceHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getServerDict();
  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
      <h1 className="text-lg font-bold">{t("finance.hub")}</h1>
      <div className="grid md:grid-cols-3 gap-3">
        <Link href={`/messes/${id}/finance/deposits`} className="rounded-2xl border bg-zinc-900 text-white p-5">
          <div className="font-semibold">{t("finance.deposits")}</div><div className="text-xs text-white/70 mt-1">{t("finance.depositsDesc")}</div>
        </Link>
        <Link href={`/messes/${id}/finance/ledger`} className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">{t("finance.ledger")}</div><div className="text-xs text-zinc-500 mt-1">{t("finance.ledgerDesc")}</div>
        </Link>
        <Link href={`/messes/${id}/finance/balances`} className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">{t("finance.balances")}</div><div className="text-xs text-zinc-500 mt-1">{t("finance.balancesDesc")}</div>
        </Link>
      </div>
      <p className="text-xs text-zinc-500">{t("finance.hubNote")}</p>
    </div>
  );
}
