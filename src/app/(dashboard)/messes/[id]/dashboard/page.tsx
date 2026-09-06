"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Drawer } from "@/components/ui/drawers";

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

type BalanceMember = { memberId: string; userId: string | null; displayName: string; totalMeals: number; mealCostPaisa: number; depositPaisa: number; balancePaisa: number; status: string };

function fmt(n: number) { return `৳${(n / 100).toFixed(2)}`; }

function KpiCard({ icon, label, value, sub, onClick, accent }: { icon: string; label: string; value: string; sub: string; onClick: () => void; accent?: string }) {
  return (
    <button onClick={onClick} className={`text-left rounded-2xl border bg-white p-5 hover:shadow-sm hover:border-zinc-300 transition w-full group ${accent || ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] tracking-wide text-zinc-500 flex items-center gap-1.5"><span className="text-[14px]">{icon}</span>{label}</div>
          <div className="text-[22px] font-bold leading-tight mt-1.5 tracking-tight">{value}</div>
          <div className="text-[11px] text-zinc-500 mt-1 leading-snug line-clamp-2">{sub}</div>
        </div>
        <span className="shrink-0 w-7 h-7 rounded-full bg-zinc-900 text-white grid place-items-center text-[11px] group-hover:bg-black transition">→</span>
      </div>
    </button>
  );
}

export default function ManagerDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [ym, setYm] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [shareUrl, setShareUrl] = useState("");
  const [balances, setBalances] = useState<{ members: BalanceMember[]; mealRatePaisa: number; totals: { totalMeals: number; totalMarketPaisa: number; totalOtherPaisa: number } } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [dailyTrend, setDailyTrend] = useState<{ date: string; market: number; other: number; total: number }[]>([]);
  const [memberDash, setMemberDash] = useState<{ todayMeals: number; monthMeals: number; currentBalancePaisa: number; dueAdvance: string } | null>(null);

  // drawer state
  const [drawer, setDrawer] = useState<null | { type: "market" | "meals" | "deposits" | "rate" | "member"; member?: BalanceMember }>(null);
  const [drawerData, setDrawerData] = useState<{ marketEntries?: { date: string; finalPaisa: number; items: { productNameSnapshot: string }[]; purchaserNames: string[] }[]; deposits?: { date: string; amountPaisa: number; memberId: string; displayName?: string }[]; memberMeals?: { date: string; qty: number }[]; loading?: boolean }>({});

  useEffect(() => {
    fetch(`/api/messes/${id}/dashboard?ym=${ym}`).then((r) => r.json()).then((d) => {
      if (!d.error) { setStats(d.stats); setInsights(d.insights || []); setDailyTrend(d.dailyTrend || []); }
    });
    fetch(`/api/messes/${id}/dashboard/member?ym=${ym}`).then((r) => r.json()).then((d) => { if (!d.error) setMemberDash(d); });
    const [y, m] = ym.split("-").map(Number);
    fetch(`/api/messes/${id}/finance/balances?year=${y}&month=${m}`).then((r) => r.json()).then((d) => { if (!d.error) setBalances(d); });
  }, [id, ym]);

  // lazy load drawer data
  useEffect(() => {
    if (!drawer) return;
    const [y, m] = ym.split("-").map(Number);
    if (drawer.type === "market") {
      setDrawerData({ loading: true });
      fetch(`/api/messes/${id}/market/entries?limit=200`).then((r) => r.json()).then((d) => {
        const all = (d.entries || []) as { date: string; finalPaisa: number; items: { productNameSnapshot: string }[]; purchaserNames: string[] }[];
        const filtered = all.filter((e) => e.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date));
        setDrawerData({ marketEntries: filtered });
      });
    } else if (drawer.type === "deposits") {
      setDrawerData({ loading: true });
      fetch(`/api/messes/${id}/deposits?limit=200`).then((r) => r.json()).then(async (d) => {
        const all = (d.deposits || []) as { date: string; amountPaisa: number; memberId: string }[];
        const filtered = all.filter((e) => e.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date));
        // enrich display names from balances
        const nameMap = new Map((balances?.members || []).map((mm) => [mm.memberId, mm.displayName]));
        const enriched = filtered.map((e) => ({ ...e, displayName: nameMap.get(e.memberId) || e.memberId.slice(0, 6) }));
        setDrawerData({ deposits: enriched });
      });
    } else if (drawer.type === "member" && drawer.member) {
      setDrawerData({ loading: true });
      const mid = drawer.member.memberId;
      Promise.all([
        fetch(`/api/messes/${id}/meals?year=${y}&month=${m}`).then((r) => r.json()),
        fetch(`/api/messes/${id}/deposits?memberId=${mid}&limit=100`).then((r) => r.json()),
      ]).then(([mealRes, depRes]) => {
        const meals = (mealRes.meals || []) as { memberId: string; date: string; quantityScaled: number }[];
        const mine = meals.filter((r) => r.memberId === mid);
        const byDate: Record<string, number> = {};
        for (const r of mine) byDate[r.date] = (byDate[r.date] || 0) + r.quantityScaled / 100;
        const memberMeals = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0])).map(([date, qty]) => ({ date, qty }));
        const deps = ((depRes.deposits || []) as { date: string; amountPaisa: number }[]).filter((d) => d.date.startsWith(ym));
        setDrawerData({ memberMeals, deposits: deps.map((d) => ({ ...d, memberId: mid })) as never });
      });
    } else {
      setDrawerData({});
    }
  }, [drawer, ym, id, balances]);

  async function createShare() {
    const res = await fetch(`/api/messes/${id}/share`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setShareUrl(`${window.location.origin}${data.url}`);
  }

  const totalMeals = balances?.totals.totalMeals ?? 0;
  const monthLabel = (() => { const [yy, mm] = ym.split("-"); const d = new Date(Number(yy), Number(mm) - 1, 1); return d.toLocaleDateString("bn-BD", { month: "long", year: "numeric" }); })();

  return (
    <div className="space-y-5 max-w-[1100px] mx-auto">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight">Manager Dashboard</h1>
          <div className="text-xs text-zinc-500 mt-1">চলমান মাস: <span className="font-medium text-zinc-700">{monthLabel} ({ym})</span> • এক নজরে পুরো মাসের সারাংশ — কার্ডে ক্লিক করে বিস্তারিত দেখুন</div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="month" value={ym} onChange={(e) => setYm(e.target.value)} className="border rounded-full px-3.5 py-2 text-sm bg-white" />
          <button onClick={createShare} className="px-4 py-2 border rounded-full text-sm bg-white hover:bg-zinc-50">🔗 Share</button>
          <Link href={`/messes/${id}`} className="px-4 py-2 border rounded-full text-sm bg-white hover:bg-zinc-50">Overview</Link>
          <Link href={`/messes/${id}/analytics`} className="px-4 py-2 rounded-full text-sm bg-zinc-900 text-white">Analytics →</Link>
        </div>
      </div>
      {shareUrl && <div className="rounded-2xl border bg-white p-3 text-sm break-all">Public link: <a href={shareUrl} target="_blank" className="underline">{shareUrl}</a></div>}

      {!stats ? (
        <div className="bg-white border rounded-2xl p-10 text-center text-sm">লোড হচ্ছে...</div>
      ) : (
        <>
          {/* insights — only when has warning, compact amber banner */}
          {insights.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 items-start">
              <span className="text-amber-600 mt-0.5">⚠</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-amber-900">নজর দিন</div>
                <ul className="mt-1 space-y-0.5 text-xs text-amber-800 list-disc pl-4">
                  {insights.map((ins, i) => <li key={i}>{ins}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* HERO 4 KPI — clickable drill-down */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon="🛒" label="মোট বাজার" value={fmt(stats.monthMarketPaisa)} sub={`${monthLabel} • ক্লিক করে কী কী বাজার হয়েছে দেখুন`} onClick={() => setDrawer({ type: "market" })} />
            <KpiCard icon="🍚" label="মোট মিল" value={`${totalMeals} টি`} sub={`${stats.activeMembers} জন • গড় ${(totalMeals && stats.activeMembers) ? (totalMeals / stats.activeMembers).toFixed(1) : "0"} / জন • ক্লিক করে per-member`} onClick={() => setDrawer({ type: "meals" })} />
            <KpiCard icon="⚖️" label="মিল রেট" value={fmt(stats.mealRatePaisa)} sub={`বাজার ${fmt(stats.monthMarketPaisa)} ÷ ${totalMeals} মিল • ক্লিক করে ফর্মুলা`} onClick={() => setDrawer({ type: "rate" })} />
            <KpiCard icon="💰" label="মোট জমা" value={fmt(stats.totalDepositPaisa)} sub={`${balances?.members.filter((m) => m.depositPaisa > 0).length || 0} জন জমা দিয়েছে • ক্লিক করে তালিকা`} onClick={() => setDrawer({ type: "deposits" })} />
          </div>

          {/* secondary strip — muted, not cards */}
          <div className="rounded-2xl border bg-white px-4 py-3 flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <span className="text-zinc-600">অন্যান্য খরচ <b className="text-zinc-900">{fmt(stats.monthOtherPaisa)}</b></span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-600">সর্বমোট খরচ <b className="text-zinc-900">{fmt(stats.monthTotalPaisa)}</b></span>
            <span className="text-zinc-300">•</span>
            <span className="text-emerald-700">অগ্রিম <b>{fmt(stats.totalAdvancePaisa)}</b></span>
            <span className="text-zinc-300">•</span>
            <span className="text-red-600">বকেয়া <b>{fmt(stats.totalDuePaisa)}</b></span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-600">আজ {stats.todayMeals} মিল • আজকের বাজার {fmt(stats.todayMarketPaisa)}</span>
            <span className="ml-auto text-zinc-500 hidden sm:inline">আপনার আজ: {memberDash?.todayMeals ?? 0} মিল • মাস: {memberDash?.monthMeals ?? 0}</span>
          </div>

          {/* Per-member table — main content */}
          <div className="rounded-2xl border bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-sm">👥 সদস্য হিসাব — {ym}</div>
              <div className="text-[11px] text-zinc-500">নামে ক্লিক করলে দৈনিক মিল/জমা দেখাবে • মিল সংখ্যায় ক্লিক করলে মিল তালিকা</div>
            </div>
            <div className="overflow-x-auto mt-4 -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-zinc-500 border-b">
                    <th className="text-left font-medium py-2 px-2">সদস্য</th>
                    <th className="text-center font-medium py-2 px-2">মিল</th>
                    <th className="text-right font-medium py-2 px-2">মিল খরচ</th>
                    <th className="text-right font-medium py-2 px-2">জমা</th>
                    <th className="text-right font-medium py-2 px-2">ব্যালেন্স</th>
                    <th className="text-center font-medium py-2 px-2">অবস্থা</th>
                  </tr>
                </thead>
                <tbody>
                  {(balances?.members || []).map((m) => (
                    <tr key={m.memberId} className="border-b last:border-0 hover:bg-zinc-50/70">
                      <td className="py-3 px-2">
                        <button onClick={() => setDrawer({ type: "member", member: m })} className="flex items-center gap-2.5 text-left group">
                          <span className="w-8 h-8 rounded-full bg-zinc-900 text-white grid place-items-center text-xs font-semibold shrink-0">{m.displayName.trim().charAt(0).toUpperCase()}</span>
                          <span className="font-medium group-hover:underline underline-offset-2 decoration-zinc-300 text-[13px]">{m.displayName}</span>
                        </button>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button onClick={() => setDrawer({ type: "member", member: m })} className="font-semibold hover:underline underline-offset-2">{m.totalMeals}</button>
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-xs">{fmt(m.mealCostPaisa)}</td>
                      <td className="py-3 px-2 text-right font-mono text-xs text-emerald-700">{fmt(m.depositPaisa)}</td>
                      <td className="py-3 px-2 text-right font-mono text-xs font-semibold">{fmt(m.balancePaisa)}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex text-[11px] font-medium rounded-full px-2.5 py-1 ${m.status === "due" ? "bg-red-50 text-red-700 border border-red-200" : m.status === "advance" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-zinc-100 text-zinc-700 border"}`}>
                          {m.status === "due" ? "বকেয়া" : m.status === "advance" ? "অগ্রিম" : "settled"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!balances || balances.members.length === 0) && <div className="p-8 text-center text-xs text-zinc-500">এই মাসে হিসাব নেই — মিল/বাজার/জমা যোগ করুন</div>}
            </div>
            <div className="mt-3 text-[11px] text-zinc-500">💡 Meal Rate = মোট বাজার ÷ মোট মিল। ব্যালেন্স = আগের জের + জমা − মিল খরচ।</div>
          </div>

          {/* single chart + quick actions side-by-side */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">দৈনিক খরচ — {ym}</div>
                <Link href={`/messes/${id}/analytics`} className="text-xs text-zinc-500 hover:text-zinc-700">Analytics →</Link>
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">বারে ক্লিক করলে ঐ দিনের বাজার দেখাবে</div>
              <div className="h-[200px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyTrend} onClick={(e: unknown) => {
                    const ev = e as { activeLabel?: string } | null;
                    if (ev?.activeLabel) { const full = `${ym}-${ev.activeLabel}`; window.location.href = `/messes/${id}/market/entries?date=${full}`; }
                  }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} width={36} />
                    <Tooltip formatter={(value: unknown) => `৳${Number(value ?? 0).toFixed(2)}`} />
                    <Bar dataKey="market" stackId="a" fill="#18181b" name="বাজার" cursor="pointer" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="other" stackId="a" fill="#d4d4d8" name="অন্যান্য" cursor="pointer" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-5 space-y-3">
              <div className="font-semibold text-sm">দ্রুত কাজ</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Link href={`/messes/${id}/meals`} className="border rounded-xl p-3.5 text-center hover:bg-zinc-50 font-medium">+ মিল</Link>
                <Link href={`/messes/${id}/market/add`} className="border rounded-xl p-3.5 text-center hover:bg-zinc-50 font-medium">+ বাজার</Link>
                <Link href={`/messes/${id}/expenses/add`} className="border rounded-xl p-3.5 text-center hover:bg-zinc-50 font-medium">+ খরচ</Link>
                <Link href={`/messes/${id}/finance/deposits`} className="border rounded-xl p-3.5 text-center hover:bg-zinc-50 font-medium">+ জমা</Link>
                <Link href={`/messes/${id}/settlements`} className="border rounded-xl p-3.5 text-center hover:bg-zinc-50">Settlement</Link>
                <Link href={`/messes/${id}/reports`} className="border rounded-xl p-3.5 text-center hover:bg-zinc-50">Reports</Link>
              </div>
              <div className="rounded-xl bg-zinc-50 border px-3 py-2.5 text-xs text-zinc-600">আজ {memberDash?.todayMeals ?? 0} মিল • এই মাস {memberDash?.monthMeals ?? 0} • ব্যালেন্স {fmt(memberDash?.currentBalancePaisa || 0)} <span className="text-zinc-500">({memberDash?.dueAdvance || "—"})</span></div>
              <Link href={`/messes/${id}/members`} className="block text-center text-xs text-zinc-500 hover:text-zinc-700 underline-offset-2 hover:underline">সদস্য ব্যবস্থাপনা →</Link>
            </div>
          </div>
        </>
      )}

      {/* Drawers */}
      <Drawer open={drawer?.type === "market"} onClose={() => setDrawer(null)} title={`মোট বাজার — ${ym}`} subtitle={`${fmt(stats?.monthMarketPaisa || 0)} • ${drawerData.marketEntries?.length ?? 0}টি এন্ট্রি • ক্লিক করলে বিস্তারিত পেজ`}>
        {drawerData.loading ? <div className="text-sm text-zinc-500">লোড হচ্ছে...</div> : (drawerData.marketEntries?.length ? (
          <div className="space-y-3">
            {drawerData.marketEntries.map((e) => (
              <div key={`${e.date}-${e.finalPaisa}`} className="rounded-xl border bg-zinc-50 px-3 py-2.5 flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium">{e.date} • {(e.purchaserNames || []).join(", ") || "—"}</div>
                  <div className="text-xs text-zinc-500 truncate mt-0.5">{(e.items || []).map((it) => it.productNameSnapshot).join(", ") || "—"}</div>
                </div>
                <div className="text-sm font-semibold shrink-0">{fmt(e.finalPaisa)}</div>
              </div>
            ))}
            <Link href={`/messes/${id}/market/entries`} className="block text-center text-sm border rounded-full py-2 hover:bg-zinc-50">সব এন্ট্রি দেখুন →</Link>
          </div>
        ) : <div className="text-sm text-zinc-500">এই মাসে বাজার এন্ট্রি নেই</div>)}
      </Drawer>

      <Drawer open={drawer?.type === "meals"} onClose={() => setDrawer(null)} title={`মোট মিল — ${ym}`} subtitle={`${totalMeals} মিল • ${balances?.members.length || 0} জন • নামে ক্লিক করে দৈনিক হিসাব`}>
        <div className="space-y-2">
          {(balances?.members || []).slice().sort((a, b) => b.totalMeals - a.totalMeals).map((m) => (
            <button key={m.memberId} onClick={() => setDrawer({ type: "member", member: m })} className="w-full flex items-center justify-between rounded-xl border bg-white px-3 py-2.5 hover:bg-zinc-50 text-left">
              <span className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-full bg-zinc-900 text-white grid place-items-center text-xs">{m.displayName.charAt(0).toUpperCase()}</span><span className="text-sm font-medium">{m.displayName}</span></span>
              <span className="text-sm font-bold">{m.totalMeals} মিল</span>
            </button>
          ))}
          {!balances?.members.length && <div className="text-sm text-zinc-500">মিল নেই</div>}
        </div>
      </Drawer>

      <Drawer open={drawer?.type === "deposits"} onClose={() => setDrawer(null)} title={`মোট জমা — ${ym}`} subtitle={`${fmt(stats?.totalDepositPaisa || 0)} (এই মাসে জমা: ${fmt((balances?.members || []).reduce((a, m) => a + m.depositPaisa, 0))})`}>
        {drawerData.loading ? <div className="text-sm text-zinc-500">লোড হচ্ছে...</div> : (drawerData.deposits?.length ? (
          <div className="space-y-2">
            {drawerData.deposits.map((d, i) => (
              <div key={i} className="flex justify-between rounded-xl border bg-emerald-50/60 px-3 py-2">
                <span className="text-sm">{d.displayName} • <span className="text-xs text-zinc-500">{d.date}</span></span>
                <span className="text-sm font-semibold text-emerald-700">{fmt(d.amountPaisa)}</span>
              </div>
            ))}
            <Link href={`/messes/${id}/finance/deposits`} className="block text-center text-sm border rounded-full py-2 hover:bg-zinc-50">জমা পেজ →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {(balances?.members || []).filter((m) => m.depositPaisa > 0).map((m) => (
              <div key={m.memberId} className="flex justify-between rounded-xl border px-3 py-2"><span className="text-sm">{m.displayName}</span><span className="text-sm font-semibold text-emerald-700">{fmt(m.depositPaisa)}</span></div>
            ))}
            {!(balances?.members || []).some((m) => m.depositPaisa > 0) && <div className="text-sm text-zinc-500">এই মাসে জমা নেই</div>}
          </div>
        ))}
      </Drawer>

      <Drawer open={drawer?.type === "rate"} onClose={() => setDrawer(null)} title="মিল রেট — হিসাব" subtitle="খরচ ÷ মিল">
        <div className="rounded-2xl border bg-zinc-50 p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-zinc-600">মোট বাজার</span><b>{fmt(stats?.monthMarketPaisa || 0)}</b></div>
          <div className="flex justify-between"><span className="text-zinc-600">অন্যান্য</span><b>{fmt(stats?.monthOtherPaisa || 0)}</b></div>
          <div className="flex justify-between"><span className="text-zinc-600">সর্বমোট খরচ</span><b>{fmt(stats?.monthTotalPaisa || 0)}</b></div>
          <div className="border-t pt-2 flex justify-between"><span className="text-zinc-600">মোট মিল</span><b>{totalMeals}</b></div>
          <div className="flex justify-between text-emerald-700"><span>মিল রেট</span><b>{fmt(stats?.mealRatePaisa || 0)} = বাজার ÷ মিল</b></div>
          <div className="text-xs text-zinc-500 pt-2">Meal Rate শুধু Food (বাজার) দিয়ে: ৳{( (stats?.monthMarketPaisa || 0)/100).toFixed(2)} ÷ {totalMeals} = {fmt(stats?.mealRatePaisa || 0)} / মিল। অন্যান্য খরচ সমান ভাগে বা settlement এ হিসাব হয়।</div>
        </div>
        <div className="text-xs text-zinc-500">প্রতি সদস্যের মিল খরচ = তার মিল × মিল রেট</div>
      </Drawer>

      <Drawer open={drawer?.type === "member"} onClose={() => setDrawer(null)} title={drawer?.member?.displayName || "সদস্য"} subtitle={`${ym} • ${drawer?.member?.totalMeals ?? 0} মিল • খরচ ${fmt(drawer?.member?.mealCostPaisa || 0)} • জমা ${fmt(drawer?.member?.depositPaisa || 0)}`}>
        {drawerData.loading ? <div className="text-sm text-zinc-500">লোড হচ্ছে...</div> : (
          <div className="space-y-5">
            <div>
              <div className="text-xs font-semibold text-zinc-700 mb-2">দৈনিক মিল (তারিখ অনুযায়ী)</div>
              {drawerData.memberMeals?.length ? (
                <div className="rounded-xl border overflow-hidden">
                  <div className="max-h-[260px] overflow-auto divide-y text-sm">
                    {drawerData.memberMeals.map((r) => (
                      <div key={r.date} className="flex justify-between px-3 py-2"><span className="font-mono text-xs">{r.date}</span><b>{r.qty} মিল</b></div>
                    ))}
                  </div>
                </div>
              ) : <div className="text-xs text-zinc-500 border rounded-xl p-4 text-center">এই মাসে মিল নেই</div>}
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-700 mb-2">জমা (এই মাস)</div>
              {drawerData.deposits?.length ? drawerData.deposits.map((d, i) => (
                <div key={i} className="flex justify-between rounded-xl border bg-emerald-50 px-3 py-2 text-sm mb-2"><span>{d.date}</span><b className="text-emerald-700">{fmt(d.amountPaisa)}</b></div>
              )) : <div className="text-xs text-zinc-500">{fmt(drawer?.member?.depositPaisa || 0)} — বিস্তারিত নেই</div>}
            </div>
            <div className="flex gap-2">
              <Link href={`/messes/${id}/meals?date=${ym}-01`} className="flex-1 text-center border rounded-full py-2 text-sm hover:bg-zinc-50">মিল পেজ</Link>
              <Link href={`/messes/${id}/finance/ledger`} className="flex-1 text-center border rounded-full py-2 text-sm hover:bg-zinc-50">লেজার</Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
