"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";

export default function AddExpensePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const router = useRouter();
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; fullName: string }[]>([]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), categoryId: "", amount: "", paidBy: "", paymentMethod: "cash", description: "", notes: "" });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/messes/${id}/expenses/categories`).then((r) => r.json()).then((d) => { if (d.categories) setCats(d.categories); });
    (async () => {
      const me = await fetch("/api/auth/me", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      const userId = me?.user?.id || null;
      fetch(`/api/messes/${id}/members`).then((r) => r.json()).then((d) => {
        if (d.members) {
          const ms = d.members.map((m: { id: string; fullName: string; userId: string | null }) => ({ id: m.id, fullName: m.fullName }));
          setMembers(ms);
          // Default "paid by" to yourself.
          if (userId && !form.paidBy) {
            const mine = (d.members as { id: string; userId: string | null }[]).find((m) => m.userId === userId);
            if (mine) setForm((f) => ({ ...f, paidBy: mine.id }));
          }
        }
      });
    })();
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/messes/${id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          categoryId: form.categoryId || null,
          amount: parseFloat(form.amount) || 0,
          paidBy: form.paidBy || null,
          paymentMethod: form.paymentMethod,
          description: form.description,
          notes: form.notes,
          clientRefId: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" && data.error ? data.error : t("errors.saveFail"));
      setMsg(data.needsApproval ? t("expenses.pendingMsg") : t("expenses.approvedMsg"));
      setTimeout(() => router.push(`/messes/${id}/expenses`), 800);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : t("errors.saveFail"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href={`/messes/${id}/expenses`} className="text-sm text-zinc-500">← {t("expenses.title")}</Link>
      <h1 className="text-lg font-bold">{t("expenses.addTitle")}</h1>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white">{msg}</div>}
      <form onSubmit={submit} className="bg-white border rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="text-xs font-medium">{t("expenses.dateCol")} *</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border rounded-xl px-4 py-3 text-base sm:text-sm mt-1 min-h-[52px]" required /></div>
          <div><label className="text-xs font-medium">{t("expenses.amountCol")} *</label><input type="number" step="0.01" min="0" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full border rounded-xl px-4 py-3 text-base sm:text-sm mt-1 min-h-[52px]" placeholder={t("expenses.amountPh")} required /></div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="text-xs font-medium">{t("expenses.categoryLabel")}</label><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full border rounded-xl px-4 py-3 text-base sm:text-sm mt-1 min-h-[52px] bg-white"><option value="">— {t("expenses.categoryLabel")} —</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="text-xs font-medium">{t("expenses.paidBy")}</label><select value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })} className="w-full border rounded-xl px-4 py-3 text-base sm:text-sm mt-1 min-h-[52px] bg-white"><option value="">{t("expenses.selectOne")}</option>{members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</select></div>
        </div>
        <div><label className="text-xs font-medium">{t("expenses.paymentMethod")}</label><select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full border rounded-xl px-4 py-3 text-base sm:text-sm mt-1 min-h-[52px] bg-white"><option value="cash">{t("market.payCash")}</option><option value="bank">{t("market.payBank")}</option><option value="mobile">{t("market.payMobile")}</option><option value="other">{t("market.payOther")}</option></select></div>
        <div><label className="text-xs font-medium">{t("expenses.descCol")}</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("expenses.descInputPh")} className="w-full border rounded-xl px-4 py-3 text-base sm:text-sm mt-1 min-h-[52px]" /></div>
        <div><label className="text-xs font-medium">{t("finance.noteLabel")}</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("expenses.notesPh")} className="w-full border rounded-xl px-4 py-3 text-base sm:text-sm mt-1 min-h-[52px]" rows={2} /></div>
        <button disabled={saving} className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm disabled:opacity-50 min-h-[52px]">{saving ? t("common.loading") : t("expenses.addTitle")}</button>
        <p className="text-xs text-zinc-500 text-center">{t("expenses.submitHint")}</p>
      </form>
    </div>
  );
}
