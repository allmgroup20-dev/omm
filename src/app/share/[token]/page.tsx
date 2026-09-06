"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/i18n/dict";

type ShareData = {
  mess: { id: string; name: string; code: string };
  ym: string;
  stats: { activeMembers: number; totalMeals: number; totalMarketPaisa: number; totalOtherPaisa: number; mealRatePaisa: number };
  membersFinance: { memberId: string; fullName: string; totalMeals: number; mealCostPaisa: number; depositPaisa: number; balancePaisa: number; status: string }[];
};

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
    const messId = data.mess.id;
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
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-zinc-500">মোট খরচ (বাজার+অন্যান্য)</div><div className="text-lg font-bold">{formatCurrency(data.stats.totalMarketPaisa + (data.stats.totalOtherPaisa || 0), "bn")}</div></div>
        <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-zinc-500">অন্যান্য খরচ</div><div className="text-lg font-bold">{formatCurrency(data.stats.totalOtherPaisa || 0, "bn")}</div></div>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <div className="font-semibold text-sm">প্রতি সদস্য — {data.ym} (নাম A-Z, মিল, খরচ, জমা, পাবে/দেবে)</div>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50"><tr><th className="text-left p-2">নাম</th><th className="p-2">মিল</th><th className="p-2 text-right">মিল খরচ</th><th className="p-2 text-right">জমা</th><th className="p-2 text-right">ব্যালেন্স</th><th className="p-2 text-center">অবস্থা</th></tr></thead>
            <tbody>
              {data.membersFinance.map((m) => (
                <tr key={m.memberId} className="border-t">
                  <td className="p-2 font-medium">{m.fullName}</td>
                  <td className="p-2 text-center">{m.totalMeals}</td>
                  <td className="p-2 text-right">{formatCurrency(m.mealCostPaisa, "bn")}</td>
                  <td className="p-2 text-right text-emerald-700">{formatCurrency(m.depositPaisa, "bn")}</td>
                  <td className={`p-2 text-right font-semibold ${m.status === "due" ? "text-red-600" : m.status === "advance" ? "text-emerald-600" : ""}`}>{formatCurrency(m.balancePaisa, "bn")}</td>
                  <td className="p-2 text-center"><span className={`rounded-full px-2 py-0.5 ${m.status === "due" ? "bg-red-100" : m.status === "advance" ? "bg-emerald-100" : "bg-zinc-100"}`}>{m.status === "due" ? "দেবে" : m.status === "advance" ? "পাবে" : "সমান"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
