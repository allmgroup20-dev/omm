"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      router.push("/dashboard");
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
          <h1 className="mt-3 text-xl font-bold">অ্যাকাউন্ট তৈরি করুন</h1>
          <p className="text-sm text-zinc-500">OMM — Our Mess Management</p>
        </div>
        {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</div>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input placeholder="পূর্ণ নাম *" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" required />
          <input type="email" placeholder="ইমেইল *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" required />
          <input placeholder="মোবাইল (ঐচ্ছিক)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
          <input type="password" placeholder="পাসওয়ার্ড *" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" required />
          <input type="password" placeholder="পাসওয়ার্ড নিশ্চিত *" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" required />
          <p className="text-xs text-zinc-500">কমপক্ষে ৮ অক্ষর, বড়/ছোট হাতের অক্ষর ও সংখ্যা থাকতে হবে।</p>
          <button disabled={loading} className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm font-medium hover:bg-black disabled:opacity-50">{loading ? "তৈরি হচ্ছে..." : "অ্যাকাউন্ট তৈরি"}</button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-600">
          ইতিমধ্যে অ্যাকাউন্ট আছে? <Link href="/login" className="font-medium text-zinc-900 underline">লগইন</Link>
        </p>
        <p className="mt-2 text-center">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-900">← হোমে ফিরুন</Link>
        </p>
      </div>
    </div>
  );
}
