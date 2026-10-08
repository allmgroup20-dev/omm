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
    (async () => {
      const me = await fetch("/api/auth/me", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      const userId = me?.user?.id || null;
      const d = await fetch(`/api/messes/${id}/members`).then((r) => r.json()).catch(() => null);
      if (d?.members) {
        const ms = d.members.map((m: { id: string; fullName: string }) => ({ id: m.id, fullName: m.fullName }));
        setMembers(ms);
        // Default to your own ledger — opening someone else's shows a 403 error.
        const mine = userId ? (d.members as { id: string; userId: string | null }[]).find((m) => m.userId === userId) : undefined;
        if (mine) setSelected(mine.id);
        else if (ms[0]) setSelected(ms[0].id);
      }
    })();
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
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
      <h1 className="text-lg font-bold">{t("finance.ledgerTitle")}</h1>

      <div className="bg-white border rounded-2xl p-4">
        <label className="text-xs font-medium">{t("finance.selectMemberLabel")}</label>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full border rounded-xl px-3 py-3 text-base sm:text-sm mt-1 min-h-[44px]">
          {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
        </select>
      </div>

      {ledger.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border bg-white p-3"><div className="text-xs text-zinc-500">{t("finance.inCol")}</div><div className="font-bold text-emerald-700 tabular-nums">{formatCurrency(ledger.reduce((a, e) => a + (e.creditPaisa || 0), 0), locale)}</div></div>
          <div className="rounded-2xl border bg-white p-3"><div className="text-xs text-zinc-500">{t("finance.outCol")}</div><div className="font-bold text-red-600 tabular-nums">{formatCurrency(ledger.reduce((a, e) => a + (e.debitPaisa || 0), 0), locale)}</div></div>
          <div className="rounded-2xl border bg-white p-3"><div className="text-xs text-zinc-500">{t("finance.remainCol")}</div><div className="font-bold tabular-nums">{formatCurrency(ledger[ledger.length - 1]?.balancePaisa || 0, locale)}</div></div>
        </div>
      )}
      <p className="text-xs text-zinc-500">{t("finance.ledgerLegend")}</p>

      {msg && <div className="rounded-xl bg-red-50 border p-3 text-sm text-red-700">{msg}</div>}

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto hidden md:block">
          <div className="min-w-[600px]">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="text-left p-3">{t("common.date")}</th><th className="text-left p-3">{t("common.description")}</th><th className="text-right p-3">{t("finance.outCol")}</th><th className="text-right p-3">{t("finance.inCol")}</th><th className="text-right p-3">{t("finance.remainCol")}</th></tr></thead>
          <tbody>
            {ledger.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 text-xs">{e.date}</td>
                <td className="p-3 text-xs">{e.description}</td>
                <td className="p-3 text-right text-red-600 tabular-nums">{e.debitPaisa ? formatCurrency(e.debitPaisa, locale) : "—"}</td>
                <td className="p-3 text-right text-emerald-600 tabular-nums">{e.creditPaisa ? formatCurrency(e.creditPaisa, locale) : "—"}</td>
                <td className="p-3 text-right font-bold tabular-nums">{formatCurrency(e.balancePaisa, locale)}</td>
              </tr>
            ))}
            </tbody>
            </table>
          </div>
        </div>
        <div className="md:hidden divide-y">
          {ledger.map((e) => (
            <div key={e.id} className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-500"><span>{e.date}</span><span className="truncate">{e.description}</span></div>
              <div className="flex items-center justify-between">
                {e.creditPaisa ? (
                  <span className="font-bold text-emerald-700 tabular-nums">+ {formatCurrency(e.creditPaisa, locale)}</span>
                ) : (
                  <span className="font-bold text-red-600 tabular-nums">− {formatCurrency(e.debitPaisa, locale)}</span>
                )}
                <span className="text-xs text-zinc-500 tabular-nums">{t("finance.remainCol")}: {formatCurrency(e.balancePaisa, locale)}</span>
              </div>
            </div>
          ))}
        </div>
        {ledger.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">{t("finance.noLedger")}</div>}
      </div>
      <p className="text-xs text-zinc-500">{t("finance.privacyNote")}</p>
    </div>
  );
}
