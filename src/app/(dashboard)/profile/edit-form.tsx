"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/provider";

type User = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  profilePhoto: string | null;
  emergencyContact: string | null;
  notes: string | null;
  emailVerified: boolean;
  googleSub: string | null;
};

function getCsrfToken() {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|; )omm_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export default function ProfileEditForm({ user }: { user: User }) {
  const { t } = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: user.fullName || "",
    email: user.email || "",
    phone: user.phone || "",
    profilePhoto: user.profilePhoto || "",
    emergencyContact: user.emergencyContact || "",
    notes: user.notes || "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const emailChanged = form.email.toLowerCase().trim() !== user.email.toLowerCase().trim();
  const isGoogleLinked = Boolean(user.googleSub);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.issues || t("errors.saveFail"));
      setMsg({ type: "ok", text: data.message || t("profile.updated") });
      setEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : t("errors.saveFail") });
    } finally {
      setLoading(false);
    }
  }

  function cancel() {
    setForm({
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      profilePhoto: user.profilePhoto || "",
      emergencyContact: user.emergencyContact || "",
      notes: user.notes || "",
    });
    setEditing(false);
    setMsg(null);
  }

  return (
    <div className="bg-white border rounded-2xl p-4 sm:p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">{t("profile.editTitle")}</div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="rounded-full border px-4 py-1.5 text-sm hover:bg-zinc-50">
            {t("common.edit")}
          </button>
        ) : (
          <button onClick={cancel} className="rounded-full border px-4 py-1.5 text-sm hover:bg-zinc-50">
            {t("common.cancel")}
          </button>
        )}
      </div>

      {/* Read-only summary when not editing */}
      {!editing ? (
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="border rounded-xl p-3">
            <div className="text-xs text-zinc-500">{t("auth.fullName")}</div>
            <div className="font-medium mt-0.5">{user.fullName}</div>
          </div>
          <div className="border rounded-xl p-3">
            <div className="text-xs text-zinc-500">{t("auth.email")}</div>
            <div className="font-medium mt-0.5 break-all">{user.email}</div>
            <div className="text-xs mt-1">
              {user.emailVerified ? (
                <span className="text-emerald-600">✓ {t("profile.verifiedYes")}</span>
              ) : (
                <span className="text-amber-600">• {t("profile.verifiedPending")}</span>
              )}
              {isGoogleLinked && <span className="ml-2 text-zinc-500">• Google ✓</span>}
            </div>
          </div>
          <div className="border rounded-xl p-3">
            <div className="text-xs text-zinc-500">{t("common.phone")}</div>
            <div className="font-medium mt-0.5">{user.phone || t("profile.noPhone")}</div>
          </div>
          <div className="border rounded-xl p-3">
            <div className="text-xs text-zinc-500">{t("profile.photoLabel")}</div>
            <div className="font-medium mt-0.5 truncate">{user.profilePhoto || "—"}</div>
          </div>
          <div className="border rounded-xl p-3">
            <div className="text-xs text-zinc-500">{t("profile.emergencyLabel")}</div>
            <div className="font-medium mt-0.5">{user.emergencyContact || "—"}</div>
          </div>
          <div className="border rounded-xl p-3 sm:col-span-2">
            <div className="text-xs text-zinc-500">{t("common.notes")}</div>
            <div className="font-medium mt-0.5 whitespace-pre-wrap">{user.notes || "—"}</div>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-zinc-600">{t("auth.fullName")} *</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
              required
              maxLength={80}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-600">{t("auth.email")} *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
              required
            />
            {emailChanged && (
              <p className="mt-1 text-xs text-amber-600">{t("profile.emailChangeHint")}</p>
            )}
            {isGoogleLinked && emailChanged && (
              <p className="mt-1 text-xs text-emerald-700">{t("profile.googleEmailHint")}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-zinc-600">{t("common.phone")}</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t("auth.phoneOptional")}
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
              maxLength={20}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-600">{t("profile.photoLabel")}</label>
            <input
              value={form.profilePhoto}
              onChange={(e) => setForm({ ...form, profilePhoto: e.target.value })}
              placeholder="https://..."
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
            />
            <p className="mt-1 text-xs text-zinc-500">{t("profile.photoHint")}</p>
          </div>
          <div>
            <label className="text-xs text-zinc-600">{t("profile.emergencyLabel")}</label>
            <input
              value={form.emergencyContact}
              onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
              placeholder={t("profile.emergencyPh")}
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
              maxLength={200}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-600">{t("common.notes")}</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={t("profile.notesPh")}
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
              rows={2}
              maxLength={500}
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm font-medium hover:bg-black disabled:opacity-50"
          >
            {loading ? t("common.save") + "..." : t("common.save")}
          </button>
          <p className="text-xs text-zinc-500 text-center">{t("profile.editNote")}</p>
        </form>
      )}

      {msg && (
        <div className={`rounded-xl border p-3 text-sm ${msg.type === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
