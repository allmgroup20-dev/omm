"use client";
import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";

export default function ChangePasswordPage() {
  const { t } = useLocale();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setOk(false);
    if (!next || next !== again) {
      setMsg(t("auth.mismatch"));
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setMsg(typeof data.error === "string" && data.error ? data.error : t("errors.saveFail"));
    else {
      setOk(true);
      setMsg(t("auth.changedOk"));
      setCurrent("");
      setNext("");
      setAgain("");
    }
  }

  const inputCls = "w-full border rounded-xl px-4 py-3 text-base sm:text-sm mt-1 min-h-[52px]";

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Link href="/profile" className="text-sm text-zinc-500 min-h-[44px] inline-flex items-center">← {t("nav.profile")}</Link>
      <h1 className="text-lg font-bold">{t("auth.changeTitle")}</h1>
      {msg && <div className={`rounded-xl border p-3 text-sm ${ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"}`}>{msg}</div>}
      <form onSubmit={submit} className="bg-white border rounded-2xl p-4 sm:p-6 space-y-3">
        <div>
          <label className="text-xs font-medium">{t("auth.currentPassword")}</label>
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className="text-xs font-medium">{t("auth.newPassword")}</label>
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} required />
          <p className="text-xs text-zinc-500 mt-1">{t("auth.passwordHint")}</p>
        </div>
        <div>
          <label className="text-xs font-medium">{t("auth.confirmPassword")}</label>
          <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={inputCls} required />
        </div>
        <button disabled={busy} className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm disabled:opacity-50 min-h-[52px]">{busy ? t("common.loading") : t("auth.changeBtn")}</button>
      </form>
    </div>
  );
}
