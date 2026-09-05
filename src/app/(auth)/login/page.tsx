"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleButton, OrDivider } from "@/components/google-button";

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";
  const urlError = sp.get("error") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-zinc-50 p-6">
      <div className="w-full max-w-md bg-white border rounded-[24px] p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-900 text-white grid place-items-center font-bold">OM</div>
          <h1 className="mt-3 text-xl font-bold">লগইন করুন</h1>
          <p className="text-sm text-zinc-500">omm.jobayergroup.com</p>
        </div>
        {(error || urlError) && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error || urlError}</div>}
        <div className="mt-6">
          <GoogleButton text="Google দিয়ে চালিয়ে যান" />
        </div>
        <div className="mt-4">
          <OrDivider />
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <input type="email" placeholder="ইমেইল" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" required />
          <input type="password" placeholder="পাসওয়ার্ড" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" required />
          <button disabled={loading} className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm font-medium hover:bg-black disabled:opacity-50">{loading ? "যাচাই হচ্ছে..." : "লগইন"}</button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link href="/forgot" className="text-zinc-600 hover:text-zinc-900">পাসওয়ার্ড ভুলে গেছেন?</Link>
          <Link href="/register" className="font-medium text-zinc-900 underline">রেজিস্টার</Link>
        </div>
        <p className="mt-4 text-center">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-900">← হোমে ফিরুন</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center bg-zinc-50 p-6">লোড হচ্ছে...</div>}>
      <LoginInner />
    </Suspense>
  );
}
