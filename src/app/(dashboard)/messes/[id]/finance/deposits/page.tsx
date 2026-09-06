"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency } from "@/i18n/dict";

type Member = { id: string; fullName: string };
type Deposit = { id: string; memberId: string; date: string; amountPaisa: number; paymentMethod: string; status: string; note: string | null };

export default function DepositsPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const [members, setMembers] = useState<Member[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [form, setForm] = useState({ memberId: "", date: new Date().toISOString().slice(0, 10), amount: "", paymentMethod: "cash", note: "" });
  const [msg, setMsg] = useState("");

  async function load() {
    const [mRes, dRes] = await Promise.all([fetch(`/api/messes/${id}/members`), fetch(`/api/messes/${id}/deposits`)]);
    const mData = await mRes.json();
    const dData = await dRes.json();
    if (mRes.ok) setMembers(mData.members.map((m: { id: string; fullName: string }) => ({ id: m.id, fullName: m.fullName })));
    if (dRes.ok) setDeposits(dData.deposits);
  }
  useEffect(() => { load(); }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch(`/api/messes/${id}/deposits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: form.memberId, date: form.date, amount: parseFloat(form.amount) || 0, paymentMethod: form.paymentMethod, note: form.note, clientRefId: `dep-${Date.now()}` }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || t("errors.saveFail"));
    else {
      setMsg(`${t("common.success")} — ${t("finance.balanceCol")}: ${formatCurrency(data.balancePaisa, locale)}`);
      setForm({ ...form, amount: "", note: "" });
      load();
    }
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link href={`/messes/${id}/finance`} className="text-sm text-zinc-500">← {t("finance.hub")}</Link>
      <h1 className="text-lg font-bold">{t("finance.depositTitle")}</h1>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{msg}</div>}
      <form onSubmit={submit} className="bg-white border rounded-2xl p-5 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <div><label className="text-xs">{t("finance.memberLabel")} *</label><select value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" required><option value="">{t("finance.selectMember")}</option>{members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</select></div>
          <div><label className="text-xs">{t("common.date")}</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" required /></div>
          <div><label className="text-xs">{t("finance.amountLabel")} *</label><input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" required /></div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="text-xs">{t("finance.paymentLabel")}</label><select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="cash">{t("market.payCash")}</option><option value="bank">{t("market.payBank")}</option><option value="mobile">{t("market.payMobile")}</option><option value="other">{t("market.payOther")}</option></select></div>
          <div><label className="text-xs">{t("finance.noteLabel")}</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" placeholder={t("finance.notePh")} /></div>
        </div>
        <button className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm">{t("finance.addBtn")}</button>
      </form>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="text-left p-3">{t("common.date")}</th><th className="text-left p-3">{t("finance.memberLabel")}</th><th className="text-right p-3">{t("finance.amountCol")}</th><th className="text-center p-3">{t("finance.methodCol")}</th><th className="text-center p-3">{t("common.status")}</th></tr></thead>
          <tbody>
            {deposits.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-3 text-xs">{d.date}</td>
                <td className="p-3 text-xs">{members.find((m) => m.id === d.memberId)?.fullName || d.memberId.slice(0, 6)}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(d.amountPaisa, locale)}</td>
                <td className="p-3 text-center text-xs">{{ cash: t("market.payCash"), bank: t("market.payBank"), mobile: t("market.payMobile"), other: t("market.payOther") }[d.paymentMethod] || d.paymentMethod}</td>
                <td className="p-3 text-center"><span className={`text-xs rounded-full px-2 py-1 ${d.status === "active" ? "bg-emerald-100" : "bg-zinc-200"}`}>{t(`status.${d.status}`)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {deposits.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">{t("finance.noDeposits")}</div>}
      </div>
    </div>
  );
}
