"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency } from "@/i18n/dict";
import { useMyRole } from "@/hooks/useMyRole";

type DueMember = {
  memberId: string;
  displayName: string;
  mealCostPaisa: number;
  depositPaisa: number;
  balancePaisa: number;
  openingPaisa: number;
  dueCollectedPaisa: number;
  dueRemainingPaisa: number;
  newDepositPaisa: number;
  dueSourceYm: string | null;
  status: string;
};

/**
 * Dues center — the ONE place for due collection.
 * Lists only members with remaining dues + a single "বকেয়া জমা" action each.
 * Split rule: due part → source month-end, excess → today (automatic).
 */
export default function DuesPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [members, setMembers] = useState<DueMember[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const { canManage } = useMyRole(id);

  async function load() {
    const [bRes, mRes] = await Promise.all([
      fetch(`/api/messes/${id}/finance/balances?year=${year}&month=${month}`),
      fetch(`/api/messes/${id}/members`),
    ]);
    const bData = await bRes.json().catch(() => ({}));
    const mData = await mRes.json().catch(() => ({}));
    if (bRes.ok) {
      const map: Record<string, string> = {};
      for (const m of (mData.members || []) as { id: string; fullName: string }[]) map[m.id] = m.fullName;
      setNames(map);
      setMembers(((bData.members || []) as DueMember[]).filter((m) => (m.dueRemainingPaisa || 0) > 0));
    }
  }
  useEffect(() => { load(); }, [id]);

  async function collectDue(m: DueMember) {
    if (!m.dueSourceYm) {
      setMsg("উৎস মাস পাওয়া যায়নি — সেটেলমেন্ট তৈরি আছে কিনা দেখুন");
      return;
    }
    const raw = window.prompt(`কত টাকা পেলেন? (${m.dueSourceYm}-এর বকেয়া ৳${((m.dueRemainingPaisa || 0) / 100).toFixed(2)} — আজকের তারিখে নেওয়া হবে)`);
    if (!raw) return;
    const amount = parseFloat(raw);
    if (!amount || amount <= 0) {
      setMsg("সঠিক টাকা লিখুন");
      return;
    }
    setBusyId(m.memberId);
    setMsg("");
    const res = await fetch(`/api/messes/${id}/deposits/collect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: m.memberId, amount, sourceYm: m.dueSourceYm }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) setMsg(data.error || t("errors.saveFail"));
    else {
      setMsg(`আদায় হয়েছে — ${m.dueSourceYm}-এ ${formatCurrency(data.split.toSourcePaisa, locale)} + এই মাসে ${formatCurrency(data.split.toCurrentPaisa, locale)}`);
      load();
    }
  }

  const totalDue = members.reduce((a, m) => a + (m.dueRemainingPaisa || 0), 0);
  const totalCollected = members.reduce((a, m) => a + (m.dueCollectedPaisa || 0), 0);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link href={`/messes/${id}/finance`} className="text-sm text-zinc-500">← {t("finance.hub")}</Link>
      <h1 className="text-lg font-bold">🔴 বকেয়া আদায়</h1>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{msg}</div>}
      <div className="flex gap-2 items-center flex-wrap">
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="flex-1 sm:flex-none sm:w-24 border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px] bg-white" aria-label={t("reports.year")} />
        <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} className="flex-1 sm:flex-none sm:w-20 border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px] bg-white" aria-label={t("reports.month")} />
        <button onClick={load} className="px-6 py-3 border rounded-full text-sm min-h-[44px] bg-white">{t("common.load")}</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">বাকি বকেয়া</div><div className="text-xl font-bold text-red-600">{formatCurrency(totalDue, locale)}</div></div>
        <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">এ মাসে আদায়</div><div className="text-xl font-bold text-emerald-700">{formatCurrency(totalCollected, locale)}</div></div>
      </div>
      <p className="text-xs text-zinc-500">নিয়ম: বকেয়া অংশ গত মাসের শেষ তারিখে + বাড়তি স্বয়ংক্রিয়ভাবে এই মাসে জমা হয়।</p>

      {members.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-sm text-zinc-500">🎉 কোনো বকেয়া নেই — সব হিসাব পরিষ্কার</div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.memberId} className="rounded-2xl border bg-white px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate min-w-0">{names[m.memberId] || m.displayName}</span>
                <span className="text-[11px] rounded-full px-2 py-0.5 bg-red-100 text-red-700 shrink-0">{m.dueSourceYm} বকেয়া</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-zinc-600">
                <span>মিল খরচ {formatCurrency(m.mealCostPaisa, locale)} • জমা {formatCurrency(m.depositPaisa, locale)}</span>
                <b className="text-red-600 shrink-0">বাকি {formatCurrency(m.dueRemainingPaisa, locale)}</b>
              </div>
              {(m.dueCollectedPaisa || 0) > 0 && (
                <div className="text-[11px] text-emerald-700">এ মাসে আদায় {formatCurrency(m.dueCollectedPaisa, locale)}</div>
              )}
              {canManage ? (
                <button onClick={() => collectDue(m)} disabled={busyId === m.memberId} className="w-full rounded-full bg-zinc-900 text-white py-2.5 text-sm min-h-[44px] disabled:opacity-50">
                  {busyId === m.memberId ? "নেওয়া হচ্ছে..." : "বকেয়া জমা"}
                </button>
              ) : (
                <div className="text-[11px] text-zinc-400 text-center">শুধু ম্যানেজার আদায় করতে পারে</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
