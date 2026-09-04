import Link from "next/link";

export default async function FinanceHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← Overview</Link>
      <h1 className="text-lg font-bold">Finance Hub</h1>
      <div className="grid md:grid-cols-3 gap-3">
        <Link href={`/messes/${id}/finance/deposits`} className="rounded-2xl border bg-zinc-900 text-white p-5">
          <div className="font-semibold">💰 Deposits</div><div className="text-xs text-white/70 mt-1">টাকা জমা, payment method, receipt</div>
        </Link>
        <Link href={`/messes/${id}/finance/ledger`} className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">📒 Member Ledger</div><div className="text-xs text-zinc-500 mt-1">Debit/Credit/Balance per member</div>
        </Link>
        <Link href={`/messes/${id}/finance/balances`} className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">⚖️ Due / Advance</div><div className="text-xs text-zinc-500 mt-1">Monthly balances, meal cost</div>
        </Link>
      </div>
      <p className="text-xs text-zinc-500">All amounts paisa-safe (BDT×100). No silent overwrite — void/reversal with audit.</p>
    </div>
  );
}
