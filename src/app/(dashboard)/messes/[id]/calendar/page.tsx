"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function CalendarPage() {
  const { id } = useParams<{ id: string }>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<{ days: number; mealTypes: { id: string; name: string }[]; matrix: Record<string, Record<string, Record<string, number>>>; dailyTotals: Record<string, number> } | null>(null);

  async function load() {
    const res = await fetch(`/api/messes/${id}/meals/month?year=${year}&month=${month}`);
    const j = await res.json();
    if (res.ok) setData({ days: j.days, mealTypes: j.mealTypes, matrix: j.matrix, dailyTotals: j.dailyTotals });
  }
  useEffect(() => { load(); }, [id, year, month]);

  if (!data) return <div className="p-6 text-sm">লোড...</div>;

  const dates: string[] = [];
  for (let d = 1; d <= data.days; d++) dates.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← Overview</Link>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold">Calendar — {year}-{String(month).padStart(2, "0")}</h1>
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 border rounded-full px-3 py-1.5 text-sm" />
        <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-20 border rounded-full px-3 py-1.5 text-sm" />
        <button onClick={load} className="px-4 py-1.5 border rounded-full text-sm">Go</button>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <div className="grid grid-cols-7 gap-1 text-xs">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center font-semibold p-2 bg-zinc-50 rounded-lg">{d}</div>
          ))}
          {dates.map((date) => {
            const total = data.dailyTotals[date] || 0;
            const isToday = date === new Date().toISOString().slice(0, 10);
            return (
              <div key={date} className={`border rounded-xl p-2 min-h-[80px] ${isToday ? "bg-amber-50 border-amber-200" : "bg-white"} ${total ? "" : "opacity-60"}`}>
                <div className="font-mono text-xs">{date.slice(8, 10)}</div>
                <div className="text-xs mt-1">Meals: {total / 100 || 0}</div>
                <div className="text-[10px] text-zinc-500 mt-1">{data.mealTypes.map((mt) => mt.name.slice(0, 3)).join(" ")}</div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-zinc-500 mt-3">Each date shows total meals; special days (holiday/guest/party) will be overlayed here (future). Leap year handled: Feb {year} has {data.days === 29 ? "29 days ✓" : data.days === 28 ? "28 days" : data.days + " days"}.</p>
      </div>

      <div className="flex gap-2">
        <Link href={`/messes/${id}/meals?date=${new Date().toISOString().slice(0, 10)}`} className="px-4 py-2 border rounded-full text-sm">Today Meals</Link>
        <Link href={`/messes/${id}/meals/matrix`} className="px-4 py-2 border rounded-full text-sm">Matrix</Link>
      </div>
    </div>
  );
}
