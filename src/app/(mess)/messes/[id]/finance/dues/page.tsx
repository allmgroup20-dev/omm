"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatNumber } from "@/i18n/dict";
import { useMyRole } from "@/hooks/useMyRole";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";

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
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  // Default to last month: only past months have collectible dues.
  const [ym, setYm] = useState(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
  const [members, setMembers] = useState<DueMember[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [collectFor, setCollectFor] = useState<DueMember | null>(null);
  const [collectAmt, setCollectAmt] = useState("");
  const { canManage } = useMyRole(id);

  async function load() {
    const [y, m] = ym.split("-").map(Number);
    const [bRes, mRes] = await Promise.all([
      fetch(`/api/messes/${id}/finance/balances?year=${y}&month=${m}`),
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
  useEffect(() => { load(); }, [id, ym]);

  async function confirmCollect() {
    if (!collectFor?.dueSourceYm) return;
    const amount = parseFloat(collectAmt);
    if (!amount || amount <= 0) {
      setMsg(t("dues.invalidAmount"));
      return;
    }
    const m = collectFor;
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
      setMsg(t("dues.collectedMsg").replace("{ym}", m.dueSourceYm || "").replace("{src}", formatCurrency(data.split.toSourcePaisa, locale)).replace("{cur}", formatCurrency(data.split.toCurrentPaisa, locale)));
      setCollectFor(null);
      setCollectAmt("");
      load();
    }
  }

  const totalDue = members.reduce((a, m) => a + (m.dueRemainingPaisa || 0), 0);
  const totalCollected = members.reduce((a, m) => a + (m.dueCollectedPaisa || 0), 0);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
      <h1 className="text-lg font-bold">{t("dues.title")}</h1>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{msg}</div>}
      <div className="flex gap-2 items-center flex-wrap">
        <input type="month" value={ym} onChange={(e) => e.target.value && setYm(e.target.value)} className="border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px] bg-white max-w-full" aria-label={`${t("reports.year")}-${t("reports.month")}`} />
      </div>
      {ym >= currentYm && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {t("dues.currentMonthWarn")} — {t("dues.useDepositInstead")} <Link href={`/messes/${id}/finance/deposits`} className="underline font-medium">{t("mess.qaDeposit")}</Link>।
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border bg-white p-3 sm:p-4"><div className="text-xs text-zinc-500">{t("dues.remainingDue")}</div><div className="text-lg sm:text-xl font-bold text-red-600 tabular-nums">{formatCurrency(totalDue, locale)}</div></div>
        <div className="rounded-2xl border bg-white p-3 sm:p-4"><div className="text-xs text-zinc-500">{t("dues.collectedThisMonth")}</div><div className="text-lg sm:text-xl font-bold text-emerald-700 tabular-nums">{formatCurrency(totalCollected, locale)}</div></div>
        <div className="rounded-2xl border bg-white p-3 sm:p-4"><div className="text-xs text-zinc-500">{t("dues.membersLeft")}</div><div className="text-lg sm:text-xl font-bold tabular-nums">{formatNumber(members.length, locale)} {t("dues.personSuffix")}</div></div>
      </div>
      <details className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
        <summary className="text-xs font-medium text-sky-800 cursor-pointer py-1 min-h-[44px] inline-flex items-center">{t("dues.rule")}</summary>
        <p className="text-xs text-sky-800 pb-2">{t("dues.whatIsDue")} {t("dues.regenHint")}</p>
      </details>

      {members.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-sm text-zinc-500">{t("dues.empty")}</div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.memberId} className="rounded-2xl border bg-white px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate min-w-0">{names[m.memberId] || m.displayName}</span>
                <span className="text-[11px] rounded-full px-2 py-0.5 bg-red-100 text-red-700 shrink-0">{m.dueSourceYm} {t("dues.monthDueSuffix")}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-zinc-600">
                <span>{t("dues.mealCostLabel")} <b className="tabular-nums">{formatCurrency(m.mealCostPaisa, locale)}</b></span>
                <span>{t("dues.depositLabel")} <b className="tabular-nums">{formatCurrency(m.depositPaisa, locale)}</b></span>
                <b className="text-red-600 tabular-nums text-right">{t("dues.remainingLabel")} {formatCurrency(m.dueRemainingPaisa, locale)}</b>
              </div>
              {(m.dueCollectedPaisa || 0) > 0 && (
                <div className="text-[11px] text-emerald-700">{t("dues.collectedLabel")} {formatCurrency(m.dueCollectedPaisa, locale)}</div>
              )}
              {canManage ? (
                <button onClick={() => { setCollectFor(m); setCollectAmt(m.dueRemainingPaisa ? String(m.dueRemainingPaisa / 100) : ""); }} disabled={busyId === m.memberId} className="w-full rounded-full bg-zinc-900 text-white py-2.5 text-sm min-h-[44px] disabled:opacity-50">
                  {busyId === m.memberId ? t("dues.collecting") : t("dues.collectBtn")}
                </button>
              ) : (
                <div className="text-[11px] text-zinc-400 text-center">{t("dues.managerOnly")}</div>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmSheet
        open={!!collectFor}
        title={collectFor ? `${t("dues.sheetTitle")} — ${names[collectFor.memberId] || ""}` : t("dues.sheetTitle")}
        body={collectFor ? t("dues.collectBody").replace("{ym}", collectFor.dueSourceYm || "").replace("{amt}", formatCurrency(collectFor.dueRemainingPaisa || 0, locale)) : undefined}
        confirmLabel={t("dues.collectConfirm")}
        busy={busyId !== null}
        input={{ value: collectAmt, onChange: setCollectAmt, placeholder: t("dues.amountPh"), inputMode: "decimal", required: true }}
        onConfirm={confirmCollect}
        onClose={() => { setCollectFor(null); setCollectAmt(""); }}
      />
    </div>
  );
}
