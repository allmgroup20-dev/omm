"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Drawer } from "@/components/ui/drawers";
import { classifyDashboardViewer, formatPaisaBnCompact, formatNumBn } from "@/lib/money";import { useLocale } from "@/i18n/provider";
import { groupEntriesByDate, formatMarketQty, formatDayBn, type MarketDrawerEntry } from "@/lib/market-view";
import { pickValidShareToken, shareUrl, dataUrlToBlob, TRANSPARENT_PNG } from "@/lib/share";
import type { Insight } from "@/lib/dashboard";

type Stats = {
  activeMembers: number;
  todayMeals: number;
  todayMarketPaisa: number;
  todayOtherPaisa: number;
  todayTotalPaisa: number;
  mealRatePaisa: number;
  monthMarketPaisa: number;
  monthMarketCount: number;
  monthOtherPaisa: number;
  monthTotalPaisa: number;
  monthDepositPaisa: number;
  totalDuePaisa: number;
  totalAdvancePaisa: number;
  cashInHandPaisa: number;
};

type BalanceMember = { memberId: string; userId: string | null; displayName: string; totalMeals: number; mealCostPaisa: number; depositPaisa: number; balancePaisa: number; openingPaisa: number; dueCollectedPaisa: number; dueRemainingPaisa: number; status: string };

function fmt(n: number) { return formatPaisaBnCompact(n); } // single money standard: Bengali, compact, proper minus

function statusPill(status: string) {
  return `inline-flex text-[11px] font-medium rounded-full px-2.5 py-1 ${status === "due" ? "bg-red-50 text-red-700 border border-red-200" : status === "advance" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-zinc-100 text-zinc-700 border"}`;
}

function statusLabel(status: string) {
  return status === "due" ? "বকেয়া" : status === "advance" ? "অগ্রিম" : "settled";
}

function balanceColor(v: number) {
  return v < 0 ? "text-red-600" : v > 0 ? "text-emerald-700" : "text-zinc-500";
}

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

export default function PublicDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const [ym, setYm] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [membership, setMembership] = useState<"unknown" | "guest" | "member" | "outsider">("unknown");
  const [showPrompt, setShowPrompt] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");
  const [balances, setBalances] = useState<{ members: BalanceMember[]; mealRatePaisa: number; totals: { totalMeals: number; totalMarketPaisa: number; totalOtherPaisa: number } } | null>(null);
  const [messName, setMessName] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [memberDash, setMemberDash] = useState<{ todayMeals: number; monthMeals: number; currentBalancePaisa: number; dueAdvance: string } | null>(null);
  const [drawer, setDrawer] = useState<null | { type: "market" | "meals" | "deposits" | "rate" | "member" | "cash" | "share"; member?: BalanceMember }>(null);
  const [drawerData, setDrawerData] = useState<{ marketEntries?: MarketDrawerEntry[]; vendorMap?: Record<string, string>; deposits?: { date: string; amountPaisa: number; memberId: string; forMonth?: string | null; displayName?: string }[]; memberMeals?: { date: string; qty: number }[]; loading?: boolean }>({});
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [shareTokens, setShareTokens] = useState<{ token: string; expiresAt: string | null; createdAt: string }[]>([]);
  const [shareMsg, setShareMsg] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  function toggleDate(ds: string) {
    setExpandedDates((prev) => (prev.includes(ds) ? prev.filter((d) => d !== ds) : [...prev, ds]));
  }

  async function checkUser() {
    const r = await fetch("/api/auth/me").catch(() => null);
    let u: { id: string } | null = null;
    if (r && r.ok) {
      const j = await r.json();
      u = j.user || null;
    }
    setUser(u);
    return u;
  }

  // Classify viewer: guest (no account) | member (in this mess) | outsider (logged in, not a member).
  // Join nag prompt is ONLY for guests — members/outsiders are never nagged.
  async function classifyViewer(u: { id: string } | null) {
    if (!u) { setMembership("guest"); return; }
    const mr = await fetch(`/api/messes/${id}/dashboard/member?ym=${ym}`).catch(() => null);
    if (!mr || !mr.ok) { setMembership("outsider"); return; }
    const d = await mr.json().catch(() => ({}));
    setMembership(classifyDashboardViewer({
      hasUser: true,
      memberOk: true,
      isGuest: !!d.guest,
      hasTarget: !!d.targetMemberId && !d.error,
    }));
    if (!d.error && !d.guest && d.targetMemberId) setMemberDash(d);
  }

  useEffect(() => {
    fetch(`/api/messes/${id}/dashboard?ym=${ym}`).then((r) => r.json()).then((d) => { if (!d.error) { setStats(d.stats); setInsights(d.insights || []); if (d.messName) setMessName(d.messName); } });
    fetch(`/api/messes/${id}/dashboard/member?ym=${ym}`).then((r) => r.json()).then((d) => { if (!d.error && !d.guest) setMemberDash(d); });
    const [y, m] = ym.split("-").map(Number);
    fetch(`/api/messes/${id}/finance/balances?year=${y}&month=${m}`).then((r) => r.json()).then((d) => { if (!d.error) setBalances(d); });
  }, [id, ym]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await checkUser();
      if (!cancelled) classifyViewer(u);
    })();
    const t = setTimeout(() => setShowPrompt(true), 30000);
    const iv = setInterval(async () => {
      const u = await checkUser();
      if (!cancelled) classifyViewer(u);
      setShowPrompt(true);
    }, 30000);
    return () => { cancelled = true; clearTimeout(t); clearInterval(iv); };
  }, [id, ym]);

  async function requestJoin() {
    if (!user) { router.push(`/login?next=/messes/${id}/dashboard`); return; }
    const res = await fetch(`/api/messes/${id}/join-requests`, { method: "POST" });
    const j = await res.json();
    if (!res.ok) setJoinMsg(j.error);
    else { setJoinMsg("Request sent — manager will approve"); setTimeout(() => setShowPrompt(false), 2000); }
  }

  async function shareLink() {
    setShareBusy(true);
    setShareMsg("");
    try {
      let token: string | null = null;
      const listed = await fetch(`/api/messes/${id}/share`).then((r) => r.json().catch(() => ({})));
      if (Array.isArray(listed.tokens)) {
        token = pickValidShareToken(listed.tokens);
        setShareTokens(listed.tokens);
      }
      if (!token) {
        const created = await fetch(`/api/messes/${id}/share`, { method: "POST" }).then((r) => r.json().catch(() => ({})));
        if (created.token) {
          token = created.token as string;
          setShareTokens((prev) => [{ token: token as string, expiresAt: null, createdAt: new Date().toISOString() }, ...prev]);
        } else throw new Error(created.error || "শেয়ার লিংক বানানো যায়নি");
      }
      const url = shareUrl(window.location.origin, token);
      if (navigator.share) {
        await navigator.share({ title: `Manager Dashboard — ${ym}`, url });
        setShareMsg("শেয়ার করা হয়েছে");
      } else {
        await navigator.clipboard.writeText(url);
        setShareMsg(`লিংক কপি হয়েছে: ${url}`);
      }
    } catch (e) {
      setShareMsg(e instanceof Error ? e.message : "শেয়ার ব্যর্থ — আবার চেষ্টা করুন");
    } finally {
      setShareBusy(false);
    }
  }

  async function loadShareTokens() {
    const d = await fetch(`/api/messes/${id}/share`).then((r) => r.json().catch(() => ({})));
    if (Array.isArray(d.tokens)) setShareTokens(d.tokens);
  }

  async function copyShareLink(token: string) {
    const url = shareUrl(window.location.origin, token);
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg(`লিংক কপি হয়েছে: ${url}`);
    } catch {
      setShareMsg(url);
    }
  }

  async function revokeShareLink(token: string) {
    if (!window.confirm("এই শেয়ার লিংকটি বাতিল করবেন?")) return;
    setShareMsg("");
    const res = await fetch(`/api/messes/${id}/share?token=${encodeURIComponent(token)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setShareMsg(data.error || "বাতিল ব্যর্থ");
    else {
      setShareMsg("লিংক বাতিল হয়েছে");
      setShareTokens((prev) => prev.filter((t) => t.token !== token));
    }
  }

  async function shareShot() {
    const node = contentRef.current;
    if (!node) return;
    setShareBusy(true);
    setShareMsg("");
    try {
      let toPng: (node: HTMLElement, options?: Record<string, unknown>) => Promise<string>;
      try {
        ({ toPng } = await import("html-to-image"));
      } catch {
        throw new Error("লাইব্রেরি লোড হয়নি — নেট চেক করে আবার চেষ্টা করুন");
      }
      const opts = {
        cacheBust: true,
        imagePlaceholder: TRANSPARENT_PNG,
        filter: (n: unknown) => !(n instanceof HTMLElement && (n as HTMLElement).dataset.shareIgnore === "true"),
      };
      let dataUrl: string;
      try {
        dataUrl = await toPng(node, { ...opts, pixelRatio: 2 });
      } catch {
        // low-memory phones: retry at 1x before giving up
        dataUrl = await toPng(node, { ...opts, pixelRatio: 1 });
      }
      const blob = dataUrlToBlob(dataUrl);
      const file = new File([blob], `mess-dashboard-${ym}.png`, { type: blob.type || "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Manager Dashboard — ${ym}` });
          setShareMsg("স্ক্রিনশট শেয়ার করা হয়েছে");
        } catch (e) {
          // user dismissed the share sheet — not an error
          if (e instanceof Error && e.name !== "AbortError") throw e;
          setShareMsg("");
        }
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `mess-dashboard-${ym}.png`;
        a.click();
        setShareMsg("ছবি ডাউনলোড হয়েছে — গ্যালারি থেকে শেয়ার করুন");
      }
    } catch (e) {
      setShareMsg(e instanceof Error ? e.message : "ছবি তৈরি হয়নি — আবার চেষ্টা করুন");
    } finally {
      setShareBusy(false);
    }
  }

  useEffect(() => {
    if (!drawer) return;
    const [y, m] = ym.split("-").map(Number);
    if (drawer.type === "market") {
      setDrawerData({ loading: true });
      Promise.all([
        fetch(`/api/messes/${id}/market/entries?limit=200`).then((r) => r.json()).catch(() => ({})),
        fetch(`/api/messes/${id}/market/vendors`).then((r) => r.json()).catch(() => ({})),
      ]).then(([ed, vd]) => {
        const all = (ed.entries || []) as MarketDrawerEntry[];
        const filtered = all.filter((e) => e.date.startsWith(ym) && (!e.status || e.status === "active")).sort((a, b) => b.date.localeCompare(a.date));
        const vendorMap: Record<string, string> = {};
        for (const v of (vd.vendors || []) as { id: string; name: string }[]) vendorMap[v.id] = v.name;
        setDrawerData({ marketEntries: filtered, vendorMap });
        // latest date expanded by default
        if (filtered.length) setExpandedDates([filtered[0].date]);
      });
    } else if (drawer.type === "deposits") {
      setDrawerData({ loading: true });
      fetch(`/api/messes/${id}/deposits?limit=200`).then((r) => r.json()).then(async (d) => {
        const all = (d.deposits || []) as { date: string; amountPaisa: number; memberId: string }[];
        const filtered = all.filter((e) => e.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date));
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
        const deps = ((depRes.deposits || []) as { date: string; amountPaisa: number; forMonth?: string | null }[]).filter((d) => d.date.startsWith(ym));
        setDrawerData({ memberMeals, deposits: deps.map((d) => ({ ...d, memberId: mid })) as never });
      });
    } else setDrawerData({});
  }, [drawer, ym, id, balances]);

  const totalMeals = balances?.totals.totalMeals ?? 0;
  const monthLabel = (() => { const [yy, mm] = ym.split("-"); const d = new Date(Number(yy), Number(mm) - 1, 1); return d.toLocaleDateString("bn-BD", { month: "long", year: "numeric" }); })();
  const monthShort = (() => { const [yy, mm] = ym.split("-"); return new Date(Number(yy), Number(mm) - 1, 1).toLocaleDateString("bn-BD", { month: "long" }); })();
  const avgMeals = totalMeals && stats?.activeMembers ? totalMeals / stats.activeMembers : 0;
  const depositCount = balances?.members.filter((m) => m.depositPaisa > 0).length || 0;

  return (
    <div ref={contentRef} className="space-y-4 sm:space-y-5 max-w-[1100px] mx-auto p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold tracking-tight flex items-center gap-2">
              <span className="grid place-items-center w-9 h-9 rounded-2xl bg-zinc-900 text-white text-[18px] shrink-0">🏠</span>
              <span className="truncate">{messName || "ড্যাশবোর্ড"}</span>
            </h1>
            {stats && <div className="text-[11px] text-zinc-400 mt-1.5">{formatNumBn(stats.activeMembers, 0)} জন সদস্য • স্বচ্ছ হিসাব, প্রতিদিন আপডেট</div>}
          </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="month" value={ym} onChange={(e) => setYm(e.target.value)} className="border rounded-full px-3.5 py-2 text-sm bg-white max-w-full" />
          <Link href={`/messes/${id}`} className="px-4 py-2 border rounded-full text-sm bg-white hover:bg-zinc-50 min-h-[44px] inline-flex items-center">Overview</Link>
          {membership === "outsider" && (
            <button onClick={requestJoin} className="px-4 py-2 rounded-full text-sm bg-zinc-900 text-white min-h-[44px]">Join Request পাঠান</button>
          )}
          {membership === "member" && (
            <>
              <button onClick={() => { setDrawer({ type: "share" }); loadShareTokens(); }} disabled={shareBusy} className="px-4 py-2 border rounded-full text-sm bg-white hover:bg-zinc-50 min-h-[44px] disabled:opacity-50">🔗 শেয়ার লিংক</button>
              <button onClick={shareShot} disabled={shareBusy} className="px-4 py-2 rounded-full text-sm bg-zinc-900 text-white min-h-[44px] disabled:opacity-50">{shareBusy ? "তৈরি হচ্ছে..." : "📸 শেয়ার স্ক্রিনশট"}</button>
            </>
          )}
        </div>
      </div>
      {shareMsg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{shareMsg}</div>}
      {membership === "outsider" && joinMsg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{joinMsg}</div>}

      {!stats ? (
        <div className="space-y-3" aria-busy="true" aria-label="লোড হচ্ছে">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="rounded-2xl border bg-white p-5 animate-pulse"><div className="h-3 w-20 rounded bg-zinc-200" /><div className="h-7 w-28 rounded bg-zinc-200 mt-2" /><div className="h-3 w-32 rounded bg-zinc-100 mt-2" /></div>)}
          </div>
          <div className="rounded-2xl border bg-white p-5 animate-pulse"><div className="h-4 w-40 rounded bg-zinc-200" /><div className="h-24 rounded bg-zinc-100 mt-3" /></div>
        </div>
      ) : (
        <>
          {insights.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 items-start">
              <span className="text-amber-600 mt-0.5">⚠</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-amber-900">নজর দিন</div>
                <ul className="mt-1.5 space-y-1.5 text-xs list-none pl-0">{insights.map((ins, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="shrink-0">{ins.icon}</span>
                    <span className={ins.tone === "bad" ? "text-red-700 font-medium" : ins.tone === "good" ? "text-emerald-800 font-medium" : "text-amber-800"}>{ins.text}</span>
                  </li>
                ))}</ul>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon="🛒" label="মোট বাজার" value={formatPaisaBnCompact(stats.monthMarketPaisa)} sub={`${monthShort} • ${formatNumBn(stats.monthMarketCount, 0)}টি বাজার`} onClick={() => setDrawer({ type: "market" })} />
            <KpiCard icon="🍚" label="মোট মিল" value={`${formatNumBn(totalMeals)}টি`} sub={`${formatNumBn(stats.activeMembers, 0)} জন • জনপ্রতি ${formatNumBn(avgMeals)}`} onClick={() => setDrawer({ type: "meals" })} />
            <KpiCard icon="⚖️" label="মিল রেট" value={formatPaisaBnCompact(stats.mealRatePaisa)} sub="প্রতি মিল" onClick={() => setDrawer({ type: "rate" })} />
            <KpiCard icon="💰" label="মোট জমা" value={formatPaisaBnCompact(stats.monthDepositPaisa)} sub={`${formatNumBn(depositCount, 0)} জনে দিয়েছে`} onClick={() => setDrawer({ type: "deposits" })} />
          </div>
          <div className="text-center text-[11px] text-zinc-400">বিস্তারিত দেখতে কার্ডে ট্যাপ করুন</div>
          <button onClick={() => setDrawer({ type: "cash" })} className="w-full text-left rounded-2xl border bg-white px-4 py-3 flex flex-wrap gap-x-6 gap-y-2 text-xs hover:border-zinc-300 transition">
            <span className={stats.cashInHandPaisa < 0 ? "text-red-600" : "text-emerald-700"}>{stats.cashInHandPaisa < 0 ? <>ঘাটতি <b>{fmt(stats.cashInHandPaisa)}</b> <span className="text-zinc-500 font-normal">— {fmt(stats.totalDuePaisa)} বকেয়া আদায়ে মিটবে</span></> : <>{t("dashboard.cashInHand")} <b>{fmt(stats.cashInHandPaisa)}</b></>}</span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-600">সর্বমোট খরচ <b className="text-zinc-900">{fmt(stats.monthTotalPaisa)}</b></span>
            <span className="text-zinc-300">•</span>
            <span className="text-red-600">বকেয়া <b>{fmt(stats.totalDuePaisa)}</b></span>
            <span className="text-zinc-300">•</span>
            <span className="text-emerald-700">অগ্রিম <b>{fmt(stats.totalAdvancePaisa)}</b></span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-600">অন্যান্য খরচ <b className="text-zinc-900">{fmt(stats.monthOtherPaisa)}</b></span>
          </button>
          <div className="rounded-2xl border bg-white p-3 sm:p-5">
            <div className="font-semibold text-sm">👥 সদস্য হিসাব — {monthLabel}</div>
            {/* Desktop/tablet: full table */}
            <div className="hidden sm:block overflow-x-auto mt-4">
              <table className="w-full text-sm min-w-[560px]">
                <thead><tr className="text-[11px] text-zinc-500 border-b"><th className="text-left font-medium py-2 px-2">সদস্য</th><th className="text-center font-medium py-2 px-2">মিল</th><th className="text-right font-medium py-2 px-2">মিল খরচ</th><th className="text-right font-medium py-2 px-2">জমা</th><th className="text-right font-medium py-2 px-2">ব্যালেন্স</th><th className="text-center font-medium py-2 px-2">অবস্থা</th></tr></thead>
                <tbody>{(balances?.members || []).map((m) => (
                  <tr key={m.memberId} className="border-b last:border-0 hover:bg-zinc-50/70">
                    <td className="py-3 px-2"><button onClick={() => setDrawer({ type: "member", member: m })} className="flex items-center gap-2.5 text-left group min-w-0 min-h-0"><span className="w-8 h-8 rounded-full bg-zinc-900 text-white grid place-items-center text-xs font-semibold shrink-0">{m.displayName.trim().charAt(0).toUpperCase()}</span><span className="font-medium group-hover:underline text-[13px]">{m.displayName}</span></button></td>
                    <td className="py-3 px-2 text-center"><button onClick={() => setDrawer({ type: "member", member: m })} className="font-semibold hover:underline min-w-0 min-h-0">{m.totalMeals}</button></td>
                    <td className="py-3 px-2 text-right font-mono text-xs">{fmt(m.mealCostPaisa)}</td>
                    <td className="py-3 px-2 text-right font-mono text-xs text-emerald-700">{fmt(m.depositPaisa)}</td>
                    <td className={`py-3 px-2 text-right font-mono text-xs font-semibold ${balanceColor(m.balancePaisa)}`}>{fmt(m.balancePaisa)}</td>
                    <td className="py-3 px-2 text-center"><span className={statusPill(m.status)}>{statusLabel(m.status)}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {/* Mobile: compact cards, no sideways scroll */}
            <div className="sm:hidden mt-3 space-y-2">
              {(balances?.members || []).map((m) => (
                <button key={m.memberId} onClick={() => setDrawer({ type: "member", member: m })} className="w-full text-left rounded-xl border bg-white px-3 py-2.5 space-y-1.5 active:bg-zinc-50">
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-zinc-900 text-white grid place-items-center text-xs font-semibold shrink-0">{m.displayName.trim().charAt(0).toUpperCase()}</span>
                      <span className="font-medium text-[13px] truncate">{m.displayName}</span>
                    </span>
                    <span className={`${statusPill(m.status)} shrink-0`}>{statusLabel(m.status)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2 text-xs text-zinc-600">
                    <span className="truncate">{m.totalMeals} মিল • খরচ {fmt(m.mealCostPaisa)}</span>
                    <span className="shrink-0">জমা {fmt(m.depositPaisa)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-zinc-500">ব্যালেন্স</span>
                    <span className={`font-mono font-bold ${balanceColor(m.balancePaisa)}`}>{fmt(m.balancePaisa)}</span>
                  </span>
                </button>
              ))}
            </div>
            {(!balances || balances.members.length === 0) && <div className="p-8 text-center text-xs text-zinc-500">এই মাসে হিসাব নেই — মিল/বাজার/জমা যোগ করুন</div>}
          </div>
        </>
      )}
      {showPrompt && membership === "guest" && (
        <div data-share-ignore="true" className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-3">
            <div className="font-semibold">এই মেসের মেম্বার হতে চান?</div>
            <p className="text-sm text-zinc-600">প্রতি ৩০ সেকেন্ডে অ্যাকাউন্ট খুলতে বলা হচ্ছে — লগইন/রেজিস্টার করলে এই মেসে join request যাবে, ম্যানেজার approve করলে মেম্বার হবেন</p>
            {joinMsg && <div className="rounded-xl border p-2 text-sm bg-zinc-50">{joinMsg}</div>}
            <div className="flex gap-2">
              <button onClick={requestJoin} className="flex-1 rounded-full bg-zinc-900 text-white py-2.5 text-sm">{user ? "Join Request পাঠান" : "লগইন / রেজিস্টার"}</button>
              <button onClick={() => setShowPrompt(false)} className="px-6 rounded-full border text-sm">পরে</button>
            </div>
          </div>
        </div>
      )}
      {membership === "guest" && (
        <div className="rounded-2xl border bg-zinc-900 text-white p-5 text-center space-y-2">
          <div className="font-semibold text-sm">আপনার মেসেও এমন স্বচ্ছ হিসাব চান?</div>
          <div className="text-xs text-zinc-300">মিল, বাজার, জমা, বকেয়া — সব এক জায়গায়, প্রতিদিন আপডেট</div>
          <Link href="/register" className="inline-block rounded-full bg-white text-zinc-900 px-6 py-2.5 text-sm font-medium min-h-[44px]">ফ্রি শুরু করুন →</Link>
        </div>
      )}
      <Drawer open={drawer?.type === "market"} onClose={() => setDrawer(null)} title={`🛒 মোট বাজার — ${ym}`} subtitle={`${fmt(stats?.monthMarketPaisa || 0)} • ${drawerData.marketEntries?.length ?? 0}টি এন্ট্রি`}>
        {drawerData.loading ? <div className="text-sm text-zinc-500">লোড হচ্ছে...</div> : (() => {
          const groups = groupEntriesByDate(drawerData.marketEntries || []);
          const vendorMap = drawerData.vendorMap || {};
          const payBn: Record<string, string> = { cash: "নগদ", bank: "ব্যাংক", mobile: "মোবাইল", other: "অন্যান্য" };
          if (!groups.length) return <div className="text-sm text-zinc-500 text-center py-6">এই মাসে বাজার এন্ট্রি নেই<br /><a href={`/messes/${id}/market/add`} className="inline-block mt-2 text-sm border rounded-full px-4 py-2 hover:bg-zinc-50 min-h-[44px]">+ বাজার যোগ করুন</a></div>;
          return (
            <div className="space-y-2">
              {groups.map((g) => {
                const open = expandedDates.includes(g.date);
                return (
                  <div key={g.date} className="rounded-xl border overflow-hidden">
                    <button onClick={() => toggleDate(g.date)} className="w-full flex items-center justify-between gap-2 bg-zinc-50 px-3 py-2.5 text-left min-h-[44px]">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold truncate">{formatDayBn(g.date)}</span>
                        <span className="block text-[11px] text-zinc-500">{g.count}টি বাজার</span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold">{fmt(g.dayTotalPaisa)}</span>
                        <span className="text-zinc-400 text-xs">{open ? "▼" : "▶"}</span>
                      </span>
                    </button>
                    {open && (
                      <div className="divide-y">
                        {g.entries.map((en) => (
                          <div key={en.id} className="px-3 py-2.5 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-medium truncate">🛒 {(en.purchaserNames || []).join(", ") || "—"}</span>
                              <span className="text-sm font-bold shrink-0">{fmt(en.finalPaisa)}</span>
                            </div>
                            {en.vendorId && vendorMap[en.vendorId] && <div className="text-[11px] text-zinc-500">দোকান: {vendorMap[en.vendorId]}</div>}
                            {(en.items || []).length ? (
                              <div className="space-y-1">
                                {en.items!.map((it) => (
                                  <div key={it.id} className="flex items-baseline justify-between gap-2 text-xs">
                                    <span className="min-w-0 truncate">{it.productNameSnapshot}{it.categoryNameSnapshot ? ` (${it.categoryNameSnapshot})` : ""} <span className="text-zinc-500">• {formatMarketQty(it.quantityScaled)} {it.unit} × {fmt(it.unitPricePaisa)}</span></span>
                                    <b className="shrink-0 font-mono">= {fmt(it.totalPaisa)}</b>
                                  </div>
                                ))}
                              </div>
                            ) : <div className="text-[11px] text-zinc-500">আইটেম নেই</div>}
                            {(!!en.transportPaisa || !!en.discountPaisa || !!en.notes) && (
                              <div className="text-[11px] text-zinc-500 space-y-0.5">
                                {!!en.transportPaisa && <div>+ গাড়ি ভাড়া {fmt(en.transportPaisa)}</div>}
                                {!!en.discountPaisa && <div>− ছাড় {fmt(en.discountPaisa)}</div>}
                                <div>{payBn[en.paymentMethod || "cash"] || en.paymentMethod}{en.notes ? ` • ${en.notes}` : ""}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <a href={`/messes/${id}/market/entries`} className="block text-center text-sm border rounded-full py-2 hover:bg-zinc-50 min-h-[44px] flex items-center justify-center">সব এন্ট্রি দেখুন →</a>
            </div>
          );
        })()}
      </Drawer>
      <Drawer open={drawer?.type === "meals"} onClose={() => setDrawer(null)} title={`🍚 মোট মিল — ${ym}`} subtitle={`${totalMeals} মিল • ${balances?.members.length || 0} জন`}>
        <div className="space-y-2">{(balances?.members || []).slice().sort((a, b) => b.totalMeals - a.totalMeals).map((m) => <button key={m.memberId} onClick={() => setDrawer({ type: "member", member: m })} className="w-full flex items-center justify-between rounded-xl border bg-white px-3 py-2.5 hover:bg-zinc-50 text-left"><span className="flex items-center gap-2.5 min-w-0 flex-1"><span className="w-7 h-7 rounded-full bg-zinc-900 text-white grid place-items-center text-xs shrink-0">{m.displayName.charAt(0).toUpperCase()}</span><span className="text-sm font-medium min-w-0 flex-1 truncate">{m.displayName}</span></span><span className="text-sm font-bold shrink-0">{m.totalMeals} মিল</span></button>)} {!balances?.members.length && <div className="text-sm text-zinc-500 text-center py-4">মিল নেই<br /><a href={`/messes/${id}/meals`} className="inline-block mt-2 text-sm border rounded-full px-4 py-2 hover:bg-zinc-50 min-h-[44px]">+ মিল দিন</a></div>}</div>
      </Drawer>
      <Drawer open={drawer?.type === "deposits"} onClose={() => setDrawer(null)} title={`💰 মোট জমা — ${ym}`} subtitle={`${fmt(stats?.monthDepositPaisa || 0)}`}>
        {drawerData.loading ? <div className="text-sm text-zinc-500">লোড হচ্ছে...</div> : (drawerData.deposits?.length ? <div className="space-y-2">{drawerData.deposits.map((d, i) => <div key={i} className="flex justify-between items-center gap-2 rounded-xl border bg-emerald-50/60 px-3 py-2"><span className="text-sm min-w-0 flex-1 truncate">{d.displayName} • <span className="text-xs text-zinc-500">{d.date}</span></span><span className="text-sm font-semibold text-emerald-700 shrink-0">{fmt(d.amountPaisa)}</span></div>)}<a href={`/messes/${id}/finance/deposits`} className="block text-center text-sm border rounded-full py-2 hover:bg-zinc-50">জমা পেজ →</a></div> : <div className="space-y-2">{(balances?.members || []).filter((m) => m.depositPaisa > 0).map((m) => <div key={m.memberId} className="flex justify-between items-center gap-2 rounded-xl border px-3 py-2"><span className="text-sm min-w-0 flex-1 truncate">{m.displayName}</span><span className="text-sm font-semibold text-emerald-700 shrink-0">{fmt(m.depositPaisa)}</span></div>)}{!(balances?.members || []).some((m) => m.depositPaisa > 0) && <div className="text-sm text-zinc-500">এই মাসে জমা নেই</div>}</div>)}
      </Drawer>
      <Drawer open={drawer?.type === "rate"} onClose={() => setDrawer(null)} title="মিল রেট — হিসাব" subtitle="খরচ ÷ মিল">
        <div className="rounded-2xl border bg-zinc-50 p-4 space-y-3 text-sm">
          <div>
            <div className="text-[11px] font-semibold text-zinc-500 mb-1.5">ধাপ ১ • মোট খরচ</div>
            <div className="flex justify-between"><span className="text-zinc-600">মোট বাজার</span><b>{formatPaisaBnCompact(stats?.monthMarketPaisa || 0)}</b></div>
            {(stats?.monthOtherPaisa || 0) > 0 && <div className="flex justify-between mt-1"><span className="text-zinc-600">+ অন্যান্য</span><b>{formatPaisaBnCompact(stats?.monthOtherPaisa || 0)}</b></div>}
            <div className="border-t mt-2 pt-2 flex justify-between"><span className="text-zinc-600">সর্বমোট</span><b>{formatPaisaBnCompact(stats?.monthTotalPaisa || 0)}</b></div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-zinc-500 mb-1.5">ধাপ ২ • ভাগ</div>
            <div className="flex justify-between"><span className="text-zinc-600">সর্বমোট ÷ মোট মিল</span><b>{formatPaisaBnCompact(stats?.monthTotalPaisa || 0)} ÷ {formatNumBn(totalMeals, 0)} মিল</b></div>
          </div>
          <div className="rounded-xl bg-emerald-600 text-white p-4 text-center">
            <div className="text-[11px] text-emerald-100">মিল রেট</div>
            <div className="text-2xl font-bold mt-0.5">{formatPaisaBnCompact(stats?.mealRatePaisa || 0)}<span className="text-sm font-medium"> /মিল</span></div>
            <div className="text-[11px] text-emerald-100 mt-1">প্রতি ১ মিলে এই খরচ</div>
          </div>
        </div>
      </Drawer>
      <Drawer open={drawer?.type === "share"} onClose={() => setDrawer(null)} title="🔗 শেয়ার লিংক" subtitle="পাবলিক read-only ভিউ • মেয়াদ ৩০ দিন">
        <div className="space-y-2">
          <button onClick={shareLink} disabled={shareBusy} className="w-full rounded-full bg-zinc-900 text-white py-2.5 text-sm min-h-[44px] disabled:opacity-50">{shareBusy ? "তৈরি হচ্ছে..." : "শেয়ার করুন"}</button>
          {shareTokens.length === 0 && <div className="text-xs text-zinc-500 text-center py-3">এখনো কোনো লিংক নেই — উপরে শেয়ার করুন</div>}
          {shareTokens.map((st) => {
            const expired = st.expiresAt ? new Date(st.expiresAt) < new Date() : false;
            return (
              <div key={st.token} className="rounded-xl border px-3 py-2.5 space-y-1.5">
                <div className="font-mono text-xs break-all">/share/{st.token}</div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                  <span>{st.expiresAt ? `মেয়াদ: ${st.expiresAt.slice(0, 10)}` : "মেয়াদ: —"}{expired ? " • মেয়াদোত্তীর্ণ" : ""}</span>
                  <span className="flex gap-1.5 shrink-0">
                    <button onClick={() => copyShareLink(st.token)} className="border rounded-full px-3 py-1.5 min-h-[36px]">কপি</button>
                    <button onClick={() => revokeShareLink(st.token)} className="border rounded-full px-3 py-1.5 min-h-[36px] text-red-600">বাতিল</button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Drawer>
      <Drawer open={drawer?.type === "cash"} onClose={() => setDrawer(null)} title={t("dashboard.cashTitle")} subtitle={`${fmt(stats?.cashInHandPaisa || 0)}`}>
        <div className="rounded-2xl border bg-zinc-50 p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-zinc-600">{t("dashboard.cashDeposits")}</span><b className="text-emerald-700">+ {fmt(stats?.monthDepositPaisa || 0)}</b></div>
          <div className="flex justify-between"><span className="text-zinc-600">{t("dashboard.cashMarket")}</span><b>− {fmt(stats?.monthMarketPaisa || 0)}</b></div>
          <div className="flex justify-between"><span className="text-zinc-600">{t("dashboard.cashOther")}</span><b>− {fmt(stats?.monthOtherPaisa || 0)}</b></div>
          <div className="border-t pt-2 flex justify-between"><span className="font-medium">{t("dashboard.cashInHand")}</span><b className={(stats?.cashInHandPaisa || 0) < 0 ? "text-red-600" : "text-emerald-700"}>{fmt(stats?.cashInHandPaisa || 0)}</b></div>
        </div>
      </Drawer>
      <Drawer open={drawer?.type === "member"} onClose={() => setDrawer(null)} title={drawer?.member?.displayName || "সদস্য"} subtitle={`${monthLabel} • ${drawer?.member?.totalMeals ?? 0} মিল`}>
        {drawerData.loading ? <div className="text-sm text-zinc-500">লোড হচ্ছে...</div> : <div className="space-y-5"><div><div className="text-xs font-semibold text-zinc-700 mb-2">দৈনিক মিল</div>{drawerData.memberMeals?.length ? <div className="rounded-xl border overflow-hidden"><div className="max-h-[260px] overflow-auto divide-y text-sm">{drawerData.memberMeals.map((r) => <div key={r.date} className="flex justify-between px-3 py-2"><span className="font-mono text-xs">{r.date}</span><b>{r.qty} মিল</b></div>)}</div></div> : <div className="text-xs text-zinc-500 border rounded-xl p-4 text-center">এই মাসে মিল নেই</div>}</div><div><div className="text-xs font-semibold text-zinc-700 mb-2">জমা</div>{drawer?.member && (drawer.member.openingPaisa || 0) < 0 && (() => { const total = (drawer.member?.dueCollectedPaisa || 0) + (drawer.member?.dueRemainingPaisa || 0); const pct = total > 0 ? Math.round(((drawer.member?.dueCollectedPaisa || 0) / total) * 100) : 0; return (<div className="rounded-xl border bg-sky-50 px-3 py-2 text-sm mb-2"><div className="flex justify-between text-xs"><span>বকেয়া আদায়</span><b>{fmt(drawer.member?.dueCollectedPaisa || 0)} / {fmt(total)}</b></div><div className="h-1.5 rounded-full bg-zinc-200 mt-1.5"><div className="h-1.5 rounded-full bg-sky-600" style={{ width: `${pct}%` }} /></div></div>); })()}{drawerData.deposits?.length ? drawerData.deposits.map((d, i) => <div key={i} className="flex justify-between rounded-xl border bg-emerald-50 px-3 py-2 text-sm mb-2"><span>{d.date}{d.forMonth && <span className="block text-[11px] text-sky-700">• {d.forMonth} বকেয়া</span>}</span><b className="text-emerald-700">{fmt(d.amountPaisa)}</b></div>) : <div className="text-xs text-zinc-500">{fmt(drawer?.member?.depositPaisa || 0)} — বিস্তারিত নেই</div>}</div></div>}
      </Drawer>
    </div>
  );
}
