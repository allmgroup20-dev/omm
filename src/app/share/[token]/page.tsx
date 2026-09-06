"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/i18n/dict";

type ShareData = { mess: { name: string; code: string }; ym: string; stats: { activeMembers: number; totalMeals: number; totalMarketPaisa: number; mealRatePaisa: number; byMember: { memberId: string; meals: number }[] } };

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [data, setData] = useState<ShareData | null>(null);
  const [err, setErr] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");
  const [user, setUser] = useState<{ id: string } | null>(null);

  async function load() {
    const res = await fetch(`/api/share/${token}`);
    const j = await res.json();
    if (!res.ok) setErr(j.error);
    else setData(j);
  }
  async function checkUser() {
    const res = await fetch("/api/auth/me").catch(() => null);
    if (res && res.ok) {
      const j = await res.json();
      setUser(j.user || null);
    } else setUser(null);
  }

  useEffect(() => {
    load();
    checkUser();
  }, [token]);

  useEffect(() => {
    let t: NodeJS.Timeout;
    let interval: NodeJS.Timeout;
    // show prompt every 30s if not member
    interval = setInterval(async () => {
      await checkUser();
      setShowPrompt(true);
    }, 30000);
    // first prompt after 30s
    t = setTimeout(() => setShowPrompt(true), 30000);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, []);

  async function requestJoin() {
    if (!data) return;
    if (!user) {
      router.push(`/login?next=/share/${token}`);
      return;
    }
    // need messId — fetch via share data includes mess.id? Use data.mess.id via API? For now fetch via /api/share
    // we stored mess.id in data? Actually API returns mess.id, but we typed only name/code — extend
    const messId = (data as unknown as { mess: { id: string } }).mess?.id;
    if (!messId) {
      setJoinMsg("Mess not found");
      return;
    }
    const res = await fetch(`/api/messes/${messId}/join-requests`, { method: "POST" });
    const j = await res.json();
    if (!res.ok) setJoinMsg(j.error);
    else {
      setJoinMsg("Request sent — manager will approve");
      setShowPrompt(false);
    }
  }

  if (err) return <div className="max-w-2xl mx-auto p-6 text-sm text-red-600">{err} — <Link href="/" className="underline">Home</Link></div>;
  if (!data) return <div className="max-w-2xl mx-auto p-6 text-sm">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <Link href="/" className="text-sm text-zinc-500">← Home</Link>
      <h1 className="text-xl font-bold">{data.mess.name} — {data.mess.code}</h1>
      <div className="text-xs text-zinc-500">চলমান মাস: {data.ym} • পাবলিক ড্যাশবোর্ড (read-only)</div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-zinc-500">সদস্য</div><div className="text-lg font-bold">{data.stats.activeMembers}</div></div>
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-zinc-500">মোট মিল ({data.ym})</div><div className="text-lg font-bold">{data.stats.totalMeals}</div></div>
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-zinc-500">মিল রেট</div><div className="text-lg font-bold">{formatCurrency(data.stats.mealRatePaisa, "bn")}</div></div>
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-zinc-500">বাজার খরচ</div><div className="text-lg font-bold">{formatCurrency(data.stats.totalMarketPaisa, "bn")}</div></div>
        <div className="bg-white border rounded-2xl p-4 md:col-span-2"><div className="text-xs text-zinc-500">প্রতি সদস্য মিল</div><div className="text-xs mt-1 space-y-1">{data.stats.byMember.slice(0, 10).map((m) => <div key={m.memberId} className="flex justify-between"><span>{m.memberId.slice(0, 6)}</span><span>{m.meals}</span></div>)}</div></div>
      </div>

      {showPrompt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
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
    </div>
  );
}
