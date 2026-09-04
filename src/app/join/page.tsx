"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function JoinInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const tokenFromUrl = sp.get("token") || "";
  const [code, setCode] = useState(tokenFromUrl);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ mess: { name: string; code: string }; invitation: { role: string } } | null>(null);

  async function lookup() {
    setError("");
    setMsg("");
    setPreview(null);
    if (!code.trim()) return;
    const res = await fetch(`/api/invitations/${code.trim()}`);
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else setPreview({ mess: data.mess, invitation: data.invitation });
  }

  async function accept() {
    setError("");
    setMsg("");
    const res = await fetch(`/api/invitations/${code.trim()}/accept`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else {
      setMsg("সফলভাবে যোগ দিয়েছেন!");
      router.push(`/messes/${data.messId}`);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-zinc-50 p-6">
      <div className="w-full max-w-md bg-white border rounded-2xl p-6">
        <h1 className="text-xl font-bold text-center">মেসে যোগ দিন</h1>
        <p className="text-sm text-zinc-500 text-center mt-1">আমন্ত্রণ কোড বা লিংক টোকেন দিন</p>
        {error && <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
        {msg && <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{msg}</div>}
        <div className="mt-4 flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="কোড বা টোকেন" className="flex-1 border rounded-full px-4 py-3 text-sm" />
          <button onClick={lookup} className="px-4 py-2 border rounded-full text-sm">Lookup</button>
        </div>
        {preview && (
          <div className="mt-4 rounded-xl bg-zinc-50 border p-4 text-sm">
            <div>মেস: <b>{preview.mess.name}</b> ({preview.mess.code})</div>
            <div>Role: {preview.invitation.role}</div>
            <button onClick={accept} className="mt-3 w-full rounded-full bg-zinc-900 text-white py-2 text-sm">Join Mess</button>
          </div>
        )}
        <p className="mt-4 text-center text-sm"><Link href="/dashboard" className="underline">Dashboard</Link> • <Link href="/" className="underline">Home</Link></p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="p-6">লোড...</div>}>
      <JoinInner />
    </Suspense>
  );
}
