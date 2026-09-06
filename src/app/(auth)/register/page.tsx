"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TurnstileWidget } from "@/components/turnstile";
import { GoogleButton, OrDivider } from "@/components/google-button";
import { useLocale } from "@/i18n/provider";

export default function RegisterPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirmPassword: "", honeypot: "" });
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  const [turnstileToken, setTurnstileToken] = useState("");

  function getCsrfToken() {
    if (typeof document === "undefined") return "";
    const m = document.cookie.match(/(?:^|; )omm_csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
        body: JSON.stringify({ ...form, turnstileToken }),
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
    <div className="min-h-screen grid place-items-center bg-zinc-50 p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border rounded-[24px] p-6 sm:p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-900 text-white grid place-items-center font-bold">OM</div>
          <h1 className="mt-3 text-xl font-bold">{t("auth.registerTitle")}</h1>
          <p className="text-sm text-zinc-500">{t("auth.tagline")}</p>
        </div>
        {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</div>}
        <div className="mt-6">
          <GoogleButton text={t("auth.googleRegister")} />
        </div>
        <div className="mt-4">
          <OrDivider text={t("auth.orEmail")} />
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <input placeholder={`${t("auth.fullName")} *`} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-zinc-900 min-h-[44px]" required />
          <input type="email" placeholder={`${t("auth.email")} *`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-zinc-900 min-h-[44px]" required />
          <input placeholder={t("auth.phoneOptional")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-zinc-900 min-h-[44px]" />
          <input type="password" placeholder={`${t("auth.password")} *`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-zinc-900 min-h-[44px]" required />
          <input type="password" placeholder={`${t("auth.confirmPassword")} *`} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-zinc-900 min-h-[44px]" required />
          <input type="text" name="website" value={form.honeypot} onChange={(e) => setForm({ ...form, honeypot: e.target.value })} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          {turnstileSiteKey ? <TurnstileWidget siteKey={turnstileSiteKey} onVerify={setTurnstileToken} /> : null}
          <p className="text-xs text-zinc-500">{t("auth.passwordHint")}</p>
          <button disabled={loading} className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm font-medium hover:bg-black disabled:opacity-50">{loading ? t("auth.creating") : t("auth.registerBtn")}</button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-600">
          {t("auth.hasAccount")} <Link href="/login" className="font-medium text-zinc-900 underline">{t("auth.loginBtn")}</Link>
        </p>
        <p className="mt-2 text-center">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-900">← হোমে ফিরুন</Link>
        </p>
      </div>
    </div>
  );
}
