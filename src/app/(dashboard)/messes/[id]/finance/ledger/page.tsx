"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency } from "@/i18n/dict";

type Member = { id: string; fullName: string };
type Entry = { id: string; date: string; type: string; description: string; debitPaisa: number; creditPaisa: number; balancePaisa: number };

export default function LedgerPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState("");
  const [ledger, setLedger] = useState<Entry[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/messes/${id}/members`).then((r) => r.json()).then((d) => {
      if (d.members) {
        const ms = d.members.map((m: { id: string; fullName: string }) => ({ id: m.id, fullName: m.fullName }));
        setMembers(ms);
        if (ms[0]) setSelected(ms[0].id);
      }
    });
  }, [id]);

  async function load(memberId: string) {
    if (!memberId) return;
    const res = await fetch(`/api/messes/${id}/ledger?memberId=${memberId}`);
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setLedger(data.ledger);
      setMsg("");
    }
  }
  useEffect(() => { if (selected) load(selected); }, [selected, id]);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link href={`/messes/${id}/finance`} className="text-sm text-zinc-500">← {t("finance.hub")}</Link>
      <h1 className="text-lg font-bold">{t("finance.ledgerTitle")}</h1>

      <div className="bg-white border rounded-2xl p-4">
        <label className="text-xs font-medium">{t("finance.selectMemberLabel")}</label>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full border rounded-xl px-3 py-3 text-base sm:text-sm mt-1 min-h-[44px]">
          {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
        </select>
      </div>

      {msg && <div className="rounded-xl bg-red-50 border p-3 text-sm text-red-700">{msg}</div>}

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="text-left p-3">{t("common.date")}</th><th className="text-left p-3">{t("common.description")}</th><th className="text-right p-3">{t("finance.debitCol")}</th><th className="text-right p-3">{t("finance.creditCol")}</th><th className="text-right p-3">{t("finance.balanceCol")}</th></tr></thead>
          <tbody>
            {ledger.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 text-xs">{e.date}</td>
                <td className="p-3 text-xs">{e.description}</td>
                <td className="p-3 text-right text-red-600">{e.debitPaisa ? formatCurrency(e.debitPaisa, locale) : "—"}</td>
                <td className="p-3 text-right text-emerald-600">{e.creditPaisa ? formatCurrency(e.creditPaisa, locale) : "—"}</td>
                <td className="p-3 text-right font-bold">{formatCurrency(e.balancePaisa, locale)}</td>
              </tr>
            ))}
            </tbody>
            </table>
          </div>
        </div>
        {ledger.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">{t("finance.noLedger")}</div>}
      </div>
      <p className="text-xs text-zinc-500">{t("finance.privacyNote")}</p>
    </div>
  );
}
