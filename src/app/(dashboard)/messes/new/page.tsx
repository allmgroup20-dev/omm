"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AddressSelect, { type AddressValue } from "@/components/address-select";
import { useLocale } from "@/i18n/provider";

const EMPTY_GEO: AddressValue = { division: "", district: "", upazila: "", unionName: "", area: "", address: "", postalCode: "" };

export default function NewMessPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [geo, setGeo] = useState<AddressValue>(EMPTY_GEO);
  const [form, setForm] = useState({
    name: "",
    description: "",
    contactInfo: "",
    startDate: new Date().toISOString().slice(0, 10),
    mealTypes: "Breakfast,Lunch,Dinner",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const mealTypes = form.mealTypes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name }));
      const res = await fetch("/api/messes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          address: geo.address,
          division: geo.division || undefined,
          district: geo.district || undefined,
          upazila: geo.upazila || undefined,
          unionName: geo.unionName || undefined,
          area: geo.area || undefined,
          postalCode: geo.postalCode || undefined,
          contactInfo: form.contactInfo,
          startDate: form.startDate,
          mealTypes: mealTypes.length ? mealTypes : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data.issues) || "Failed");
      router.push(`/messes/${data.mess.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">← {t("nav.dashboard")}</Link>
      <h1 className="text-xl font-bold mt-2">{t("mess.newTitle")}</h1>
      <p className="text-sm text-zinc-500">{t("mess.newDesc")}</p>
      {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</div>}
      <form onSubmit={submit} className="mt-6 bg-white border rounded-2xl p-4 sm:p-6 space-y-4">
        <input placeholder={`${t("mess.namePh")} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" required />
        <textarea placeholder={t("mess.descPh")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" rows={2} />
        <div className="rounded-xl border p-4 bg-zinc-50/50">
          <div className="text-xs font-semibold mb-2">{t("settings.addressTitle")}</div>
          <AddressSelect value={geo} onChange={setGeo} />
        </div>
        <input placeholder={t("mess.contactPh")} value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" />
        <div>
          <label className="text-xs text-zinc-600">{t("mess.startDate")} *</label>
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm mt-1" required />
        </div>
        <div>
          <label className="text-xs text-zinc-600">{t("mess.mealTypesLabel")}</label>
          <input value={form.mealTypes} onChange={(e) => setForm({ ...form, mealTypes: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm mt-1" placeholder="Breakfast,Lunch,Dinner" />
          <p className="text-xs text-zinc-500 mt-1">{t("mess.mealTypesHint")}</p>
        </div>
        <button disabled={loading} className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm font-medium disabled:opacity-50">{loading ? t("mess.creating") : t("mess.createBtn")}</button>
      </form>
    </div>
  );
}
