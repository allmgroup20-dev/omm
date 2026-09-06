"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatNumber } from "@/i18n/dict";

export default function MatrixPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<{ dates: string[]; members: { memberId: string; fullName: string }[]; matrix: Record<string, Record<string, number>>; memberTotals: Record<string, number>; totalMealsScaled: number } | null>(null);

  async function load() {
    const res = await fetch(`/api/messes/${id}/meals/matrix?year=${year}&month=${month}`);
    const j = await res.json();
    if (res.ok) setData(j);
  }
  useEffect(() => { load(); }, [id, year, month]);

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}/meals`} className="text-sm text-zinc-500">← {t("meals.dailyTitle")}</Link>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-bold">{t("meals.matrixTitle")}</h1>
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 border rounded-full px-3 py-1.5 text-sm" aria-label={t("meals.year")} />
        <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-20 border rounded-full px-3 py-1.5 text-sm" aria-label={t("meals.month")} />
        <button onClick={load} className="px-4 py-1.5 border rounded-full text-sm">{t("common.load")}</button>
      </div>
      {!data ? (
        <div className="bg-white border rounded-xl p-6 text-sm">{t("common.loading")}</div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-50">
                  <th className="text-left p-2 sticky left-0 bg-zinc-50">{t("meals.memberCol")}</th>
                  {data.dates.map((d) => (
                    <th key={d} className="p-2 text-center font-mono">{formatNumber(Number(d.slice(8, 10)), locale)}</th>
                  ))}
                  <th className="p-2 text-center font-bold">{t("meals.totalCol")}</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.memberId} className="border-t">
                    <td className="p-2 font-medium sticky left-0 bg-white">{m.fullName}</td>
                    {data.dates.map((d) => (
                      <td key={d} className="p-2 text-center">{data.matrix[m.memberId]?.[d] ? formatNumber(data.matrix[m.memberId][d] / 100, locale) : "-"}</td>
                    ))}
                    <td className="p-2 text-center font-bold">{formatNumber((data.memberTotals[m.memberId] || 0) / 100, locale)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-900 text-white font-bold">
                  <td className="p-2">{t("meals.totalCol")}</td>
                  {data.dates.map((d) => {
                    const dayTotal = Object.values(data.matrix).reduce((a, map) => a + (map[d] || 0), 0);
                    return <td key={d} className="p-2 text-center">{dayTotal ? formatNumber(dayTotal / 100, locale) : "-"}</td>;
                  })}
                  <td className="p-2 text-center">{formatNumber(data.totalMealsScaled / 100, locale)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="p-3 text-xs text-zinc-500">{t("meals.singleSource")}</p>
        </div>
      )}
    </div>
  );
}
