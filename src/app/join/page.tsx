"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";

function JoinInner() {
  const router = useRouter();
  const { t } = useLocale();
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
      setMsg(t("join.success"));
      router.push(`/messes/${data.messId}`);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-zinc-50 p-6">
      <div className="w-full max-w-md bg-white border rounded-2xl p-4 sm:p-6">
        <h1 className="text-xl font-bold text-center">{t("join.title")}</h1>
        <p className="text-sm text-zinc-500 text-center mt-1">{t("join.desc")}</p>
        {error && <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
        {msg && <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{msg}</div>}
        <div className="mt-4 flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("join.codePh")} aria-label={t("join.codePh")} className="flex-1 border rounded-full px-4 py-3 text-base sm:text-sm min-h-[48px]" />
          <button onClick={lookup} className="px-5 py-3 border rounded-full text-sm min-h-[48px]">{t("join.lookup")}</button>
        </div>
        {preview && (
          <div className="mt-4 rounded-xl bg-zinc-50 border p-4 text-sm">
            <div>{t("nav.mess")}: <b>{preview.mess.name}</b> ({preview.mess.code})</div>
            <div>{t("members.roleCol")}: {t(`roles.${preview.invitation.role}`)}</div>
            <button onClick={accept} className="mt-3 w-full rounded-full bg-zinc-900 text-white py-3 text-sm min-h-[48px]">{t("join.joinBtn")}</button>
          </div>
        )}
        <p className="mt-4 text-center text-sm"><Link href="/dashboard" className="underline">{t("join.dashboard")}</Link> • <Link href="/" className="underline">{t("join.home")}</Link></p>
      </div>
    </div>
  );
}

function JoinFallback() {
  const { t } = useLocale();
  return <div className="p-6 text-sm text-zinc-500 animate-pulse">{t("common.loading")}</div>;
}

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinFallback />}>
      <JoinInner />
    </Suspense>
  );
}
