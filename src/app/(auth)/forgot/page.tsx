"use client";
import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";

export default function ForgotPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(data.message);
      if (data.resetToken) setToken(data.resetToken);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-zinc-50 p-6">
      <div className="w-full max-w-md bg-white border rounded-[24px] p-8 shadow-sm">
        <h1 className="text-xl font-bold text-center">{t("auth.forgotTitle")}</h1>
        <p className="text-sm text-zinc-500 text-center mt-1">{t("auth.forgotDesc")}</p>
        {msg && <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3">{msg}</div>}
        {token && <div className="mt-2 rounded-xl bg-zinc-900 text-white text-xs p-3 break-all">Token: {token}</div>}
        {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</div>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input type="email" placeholder={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" required />
          <button className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm font-medium">{t("auth.sendLink")}</button>
        </form>
        <p className="mt-4 text-center text-sm"><Link href="/login" className="underline">{t("auth.backToLogin")}</Link></p>
      </div>
    </div>
  );
}
