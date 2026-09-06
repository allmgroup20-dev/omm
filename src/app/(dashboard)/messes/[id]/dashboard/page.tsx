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
  const [ym, setYm] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [shareUrl, setShareUrl] = useState("");
  const [balances, setBalances] = useState<{ members: { memberId: string; totalMeals: number; mealCostPaisa: number; depositPaisa: number; balancePaisa: number; status: string }[]; mealRatePaisa: number } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [dailyTrend, setDailyTrend] = useState<{ date: string; market: number; other: number; total: number }[]>([]);
  const [memberDash, setMemberDash] = useState<{ todayMeals: number; monthMeals: number; mealRateBDT: number; currentBalancePaisa: number; dueAdvance: string } | null>(null);
  const [analytics, setAnalytics] = useState<{ monthlyTrend: { ym: string; market: number; other: number; total: number }[]; categorySpend: { name: string; value: number }[]; memberMealComp: { memberId: string; meals: number }[] } | null>(null);

  useEffect(() => {
    const date = `${ym}-01`;
    fetch(`/api/messes/${id}/dashboard?date=${date}`).then((r) => r.json()).then((d) => {
      if (!d.error) {
        setStats(d.stats);
        setInsights(d.insights || []);
        setDailyTrend(d.dailyTrend || []);
      }
    });
    fetch(`/api/messes/${id}/dashboard/member`).then((r) => r.json()).then((d) => { if (!d.error) setMemberDash(d); });
    fetch(`/api/messes/${id}/analytics?year=${ym.split("-")[0]}&month=${ym.split("-")[1]}`).then((r) => r.json()).then((d) => { if (!d.error) setAnalytics(d); });
    const [y, m] = ym.split("-").map(Number);
    fetch(`/api/messes/${id}/finance/balances?year=${y}&month=${m}`).then((r) => r.json()).then((d) => { if (!d.error) setBalances(d); });
  }, [id, ym]);

  async function createShare() {
    const res = await fetch(`/api/messes/${id}/share`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setShareUrl(`${window.location.origin}${data.url}`);
  }

  const COLORS = ["#18181b", "#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Manager Dashboard</h1>
          <div className="text-xs text-zinc-500 mt-1">চলমান মাস: {ym} • মাস অনুযায়ী সব হিসাব • Main + সাব-ড্যাশবোর্ড</div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="month" value={ym} onChange={(e) => setYm(e.target.value)} className="border rounded-full px-3 py-1.5 text-sm" />
          <button onClick={createShare} className="px-4 py-1.5 border rounded-full text-sm bg-white">🔗 Share (public)</button>
          <Link href={`/messes/${id}/analytics`} className="px-4 py-1.5 border rounded-full text-sm">Analytics →</Link>
          <Link href={`/messes/${id}`} className="px-4 py-1.5 border rounded-full text-sm">Overview</Link>
        </div>
      </div>
      {shareUrl && <div className="rounded-xl border bg-white p-3 text-sm break-all">Public link: <a href={shareUrl} target="_blank" className="underline">{shareUrl}</a> — যে কেউ দেখতে পারবে, প্রতি 30s এ অ্যাকাউন্ট প্রম্পট</div>}

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
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500">মোট বাজার খরচ ({ym})</span><span className="font-bold">৳{(stats.monthMarketPaisa / 100 || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-zinc-500">Meal Rate ({ym}) — খরচ/মিল</span><span className="font-bold text-emerald-700">৳{(stats.mealRatePaisa / 100 || 0).toFixed(2)}</span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">বাজার ৳{(stats.monthMarketPaisa / 100).toFixed(2)} + অন্যান্য ৳{(stats.monthOtherPaisa / 100).toFixed(2)} = সর্বমোট ৳{(stats.monthTotalPaisa / 100).toFixed(2)}</div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="font-semibold text-sm">👥 Per-Member — {ym} (কে কত মিল, জমা, খরচ, পাবে/দেবে)</div>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50"><tr><th className="text-left p-2">সদস্য</th><th className="p-2">মিল</th><th className="p-2">মিল খরচ</th><th className="p-2">জমা</th><th className="p-2">ব্যালেন্স</th><th className="p-2">অবস্থা</th></tr></thead>
                <tbody>
                  {(balances?.members || []).map((m) => (
                    <tr key={m.memberId} className="border-t">
                      <td className="p-2 font-mono">{m.memberId.slice(0, 6)}</td>
                      <td className="p-2 text-center">{m.totalMeals}</td>
                      <td className="p-2 text-right">৳{(m.mealCostPaisa / 100).toFixed(2)}</td>
                      <td className="p-2 text-right text-emerald-700">৳{(m.depositPaisa / 100).toFixed(2)}</td>
                      <td className="p-2 text-right font-semibold">৳{(m.balancePaisa / 100).toFixed(2)}</td>
                      <td className="p-2 text-center"><span className={`rounded-full px-2 py-0.5 ${m.status === "due" ? "bg-red-100" : m.status === "advance" ? "bg-emerald-100" : "bg-zinc-100"}`}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!balances || balances.members.length === 0) && <div className="p-4 text-center text-xs text-zinc-500">এই মাসে হিসাব নেই — মিল/বাজার/জমা যোগ করুন</div>}
            </div>
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
