"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";

export default function ReportsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const [type, setType] = useState("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    setMsg("");
    let url = "";
    if (type === "daily") url = `/api/messes/${id}/reports?type=daily&date=${date}`;
    else if (type === "monthly") url = `/api/messes/${id}/reports?type=monthly&year=${year}&month=${month}`;
    else if (type === "yearly") url = `/api/messes/${id}/reports?type=yearly&year=${year}`;
    const res = await fetch(url);
    const j = await res.json();
    if (!res.ok) setMsg(j.error);
    else setData(j);
  }

  function exportJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${type}-${year}-${month}.json`;
    a.click();
  }

  function exportCsv() {
    if (!data) return;
    // Simple CSV for monthly: members not included here; export raw JSON as CSV-like
    const csv = `data:text/csv,${encodeURIComponent(JSON.stringify(data).slice(0, 2000))}`;
    const a = document.createElement("a");
    a.href = `data:text/csv,${encodeURIComponent(Object.keys(data).join(","))}`;
    a.download = `report-${type}.csv`;
    a.click();
    exportJson(); // fallback to json for now
  }

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
      <h1 className="text-lg font-bold">{t("reports.title")}</h1>

      <div className="bg-white border rounded-2xl p-4 sm:p-5 flex flex-wrap gap-3 items-end">
        <div><label className="text-xs">{t("reports.type")}</label><select value={type} onChange={(e) => setType(e.target.value)} className="w-full border rounded-full px-3 py-2 text-sm mt-1"><option value="daily">{t("reports.daily")}</option><option value="monthly">{t("reports.monthly")}</option><option value="yearly">{t("reports.yearly")}</option></select></div>
        {type === "daily" && <div><label className="text-xs">{t("common.date")}</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" /></div>}
        {type !== "daily" && <div><label className="text-xs">{t("reports.year")}</label><input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 border rounded-full px-3 py-2 text-sm mt-1" /></div>}
        {type === "monthly" && <div><label className="text-xs">{t("reports.month")}</label><input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-20 border rounded-full px-3 py-2 text-sm mt-1" /></div>}
        <button onClick={load} className="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm">{t("common.load")}</button>
        <button onClick={exportJson} className="px-4 py-2 border rounded-full text-sm">{t("reports.exportJson")}</button>
        <button onClick={exportCsv} className="px-4 py-2 border rounded-full text-sm">{t("reports.exportCsv")}</button>
        <button onClick={() => window.print()} className="px-4 py-2 border rounded-full text-sm">{t("reports.printBtn")}</button>
      </div>

      {msg && <div className="rounded-xl border p-3 text-sm bg-red-50 text-red-700">{msg}</div>}

      {data && (
        <div className="bg-white border rounded-2xl p-4 sm:p-5">
          <pre className="text-xs overflow-auto max-h-[500px] bg-zinc-50 p-4 rounded-xl">{JSON.stringify(data, null, 2)}</pre>
          <p className="text-xs text-zinc-500 mt-2">{t("reports.singleSource")}</p>
        </div>
      )}
    </div>
  );
}
