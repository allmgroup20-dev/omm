"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ dailyTrend: { date: string; market: number; other: number }[]; monthlyTrend: { ym: string; market: number; other: number; meals: number }[]; categorySpend: { name: string; value: number }[]; depositTrend: { ym: string; amount: number }[]; marketVsOther: { market: number; other: number } } | null>(null);

  useEffect(() => {
    fetch(`/api/messes/${id}/analytics`).then((r) => r.json()).then((d) => { if (!d.error) setData(d); });
  }, [id]);

  if (!data) return <div className="p-6 text-sm">লোড...</div>;

  const COLORS = ["#18181b", "#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7", "#52525b", "#3f3f46"];

  return (
    <div className="space-y-6">
      <Link href={`/messes/${id}/dashboard`} className="text-sm text-zinc-500">← Dashboard</Link>
      <h1 className="text-xl font-bold">Analytics</h1>

      <div className="rounded-2xl border bg-white p-5">
        <div className="font-semibold text-sm">Daily Expense Trend (30 days)</div>
        <div className="h-[240px] mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.dailyTrend}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="market" stackId="a" fill="#18181b" name="Market" />
              <Bar dataKey="other" stackId="a" fill="#a1a1aa" name="Other" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <div className="font-semibold text-sm">Monthly Trend (12 months) — Expense + Meals</div>
        <div className="h-[240px] mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.monthlyTrend}>
              <XAxis dataKey="ym" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="market" stroke="#18181b" name="Market" />
              <Line yAxisId="left" type="monotone" dataKey="other" stroke="#a1a1aa" name="Other" />
              <Line yAxisId="right" type="monotone" dataKey="meals" stroke="#22c55e" name="Meals" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold text-sm">Category Spending</div>
          <div className="h-[260px] mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.categorySpend} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {data.categorySpend.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold text-sm">Market vs Other</div>
          <div className="h-[260px] mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ name: "Market", value: data.marketVsOther.market }, { name: "Other", value: data.marketVsOther.other }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  <Cell fill="#18181b" />
                  <Cell fill="#a1a1aa" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-zinc-500 mt-2">Market: ৳{data.marketVsOther.market.toFixed(2)} • Other: ৳{data.marketVsOther.other.toFixed(2)}</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <div className="font-semibold text-sm">Deposit Trend (12 months)</div>
        <div className="h-[200px] mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.depositTrend}>
              <XAxis dataKey="ym" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="amount" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
