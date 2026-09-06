"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency } from "@/i18n/dict";

type Vendor = { id: string; name: string; phone: string | null; address: string | null; totalPurchasesPaisa: number };

export default function VendorsPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch(`/api/messes/${id}/market/vendors`);
    const data = await res.json();
    if (res.ok) setVendors(data.vendors);
  }
  useEffect(() => { load(); }, [id]);

  async function add() {
    const res = await fetch(`/api/messes/${id}/market/vendors`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`${t("common.success")} — ${data.vendor.name}`);
      setName("");
      setPhone("");
      load();
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href={`/messes/${id}/market`} className="text-sm text-zinc-500">← {t("market.hub")}</Link>
      <h1 className="text-lg font-bold">{t("market.vendorTitle")}</h1>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white">{msg}</div>}
      <div className="bg-white border rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("market.shopNamePh")} className="flex-1 border rounded-full px-4 py-2 text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("market.phonePh")} className="w-32 border rounded-full px-4 py-2 text-sm" />
          <button onClick={add} className="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm">{t("common.add")}</button>
        </div>
        <div className="space-y-1">
          {vendors.map((v) => (
            <div key={v.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
              <span><b>{v.name}</b> <span className="text-xs text-zinc-500">{v.phone || ""}</span></span>
              <span className="text-xs">{formatCurrency(v.totalPurchasesPaisa, locale)}</span>
            </div>
          ))}
          {vendors.length === 0 && <div className="text-center text-sm text-zinc-500 py-4">{t("market.noVendors")}</div>}
        </div>
      </div>
    </div>
  );
}
