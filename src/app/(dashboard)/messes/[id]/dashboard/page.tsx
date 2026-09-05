"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

type Stats = {
  activeMembers: number;
  todayMeals: number;
  todayMarketPaisa: number;
  todayOtherPaisa: number;
  todayTotalPaisa: number;
  mealRatePaisa: number;
  monthMarketPaisa: number;
  monthOtherPaisa: number;
  monthTotalPaisa: number;
  totalDepositPaisa: number;
  totalDuePaisa: number;
  totalAdvancePaisa: number;
};

export default function ManagerDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [dailyTrend, setDailyTrend] = useState<{ date: string; market: number; other: number; total: number }[]>([]);
  const [memberDash, setMemberDash] = useState<{ todayMeals: number; monthMeals: number; mealRateBDT: number; currentBalancePaisa: number; dueAdvance: string } | null>(null);
  const [analytics, setAnalytics] = useState<{ monthlyTrend: { ym: string; market: number; other: number; total: number }[]; categorySpend: { name: string; value: number }[]; memberMealComp: { memberId: string; meals: number }[] } | null>(null);

  useEffect(() => {
    fetch(`/api/messes/${id}/dashboard`).then((r) => r.json()).then((d) => {
      if (!d.error) {
        setStats(d.stats);
        setInsights(d.insights || []);
        setDailyTrend(d.dailyTrend || []);
      }
    });
    fetch(`/api/messes/${id}/dashboard/member`).then((r) => r.json()).then((d) => { if (!d.error) setMemberDash(d); });
    fetch(`/api/messes/${id}/analytics`).then((r) => r.json()).then((d) => { if (!d.error) setAnalytics(d); });
  }, [id]);

  const COLORS = ["#18181b", "#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Manager Dashboard</h1>
        <div className="flex gap-2">
          <Link href={`/messes/${id}/analytics`} className="px-4 py-1.5 border rounded-full text-sm">Analytics →</Link>
          <Link href={`/messes/${id}`} className="px-4 py-1.5 border rounded-full text-sm">Overview</Link>
        </div>
      </div>

      {!stats ? (
        <div className="bg-white border rounded-2xl p-10 text-center text-sm">লোড হচ্ছে...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">Active Members</div><div className="text-xl font-bold">{stats.activeMembers}</div></div>
            <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">Today Meals</div><div className="text-xl font-bold">{stats.todayMeals}</div></div>
            <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">Today Market</div><div className="text-sm font-bold">৳{(stats.todayMarketPaisa / 100).toFixed(2)}</div></div>
            <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">Today Other</div><div className="text-sm font-bold">৳{(stats.todayOtherPaisa / 100).toFixed(2)}</div></div>
            <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">Meal Rate</div><div className="text-sm font-bold">৳{(stats.mealRatePaisa / 100).toFixed(2)}</div></div>
            <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">Month Expense</div><div className="text-sm font-bold">৳{(stats.monthTotalPaisa / 100).toFixed(2)}</div></div>
            <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">Total Deposit</div><div className="text-sm font-bold text-emerald-700">৳{(stats.totalDepositPaisa / 100).toFixed(2)}</div></div>
            <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">Total Due</div><div className="text-sm font-bold text-red-600">৳{(stats.totalDuePaisa / 100).toFixed(2)}</div></div>
            <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">Total Advance</div><div className="text-sm font-bold text-emerald-600">৳{(stats.totalAdvancePaisa / 100).toFixed(2)}</div></div>
            <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">Your Today</div><div className="text-sm font-bold">{memberDash?.todayMeals ?? 0} meals</div></div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="font-semibold text-sm">💡 Intelligent Insights</div>
            {insights.length ? (
              <ul className="mt-2 space-y-1 text-sm list-disc pl-5">
                {insights.map((ins, i) => (
                  <li key={i}>{ins}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500 mt-2">সব ঠিক আছে — কোনো সতর্কতা নেই।</p>
            )}
            <p className="text-xs text-zinc-500 mt-2">Data-driven, fabricated নয় — প্রতিটি insight সরাসরি DB থেকে গণনা।</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border bg-white p-5">
              <div className="font-semibold text-sm">Daily Expense Trend (7 days)</div>
              <div className="h-[220px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyTrend}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="market" stackId="a" fill="#18181b" name="Market" />
                    <Bar dataKey="other" stackId="a" fill="#a1a1aa" name="Other" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-5">
              <div className="font-semibold text-sm">Monthly Trend (12 months)</div>
              <div className="h-[220px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.monthlyTrend || []}>
                    <XAxis dataKey="ym" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#18181b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border bg-white p-5">
              <div className="font-semibold text-sm">Category Spending</div>
              <div className="h-[200px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics?.categorySpend || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                      {(analytics?.categorySpend || []).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-5">
              <div className="font-semibold text-sm">Member Meal Comparison</div>
              <div className="h-[200px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.memberMealComp?.slice(0, 8) || []}>
                    <XAxis dataKey="memberId" tick={{ fontSize: 8 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="meals" fill="#18181b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-5 space-y-3">
              <div className="font-semibold text-sm">Quick Actions</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Link href={`/messes/${id}/meals`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">+ Meal</Link>
                <Link href={`/messes/${id}/market/add`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">+ Market</Link>
                <Link href={`/messes/${id}/expenses/add`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">+ Expense</Link>
                <Link href={`/messes/${id}/finance/deposits`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">+ Deposit</Link>
                <Link href={`/messes/${id}/settlements`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">Settlement</Link>
                <Link href={`/messes/${id}/reports`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">Reports</Link>
              </div>
              <div className="text-xs text-zinc-500">আপনার আজকের মিল: {memberDash?.todayMeals ?? 0} • মাস: {memberDash?.monthMeals ?? 0} • Balance: ৳{((memberDash?.currentBalancePaisa || 0) / 100).toFixed(2)} ({memberDash?.dueAdvance})</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
