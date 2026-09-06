"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatDateBD } from "@/i18n/dict";

type Entry = { id: string; date: string; purchasedBy: string | null; purchaserName: string | null; vendorId: string | null; classification: string; paymentMethod: string; totalPaisa: number; transportPaisa: number; discountPaisa: number; finalPaisa: number; status: string; items: { productNameSnapshot: string; quantityScaled: number; unit: string; totalPaisa: number }[] };

export default function EntriesPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [msg, setMsg] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterPurchaser, setFilterPurchaser] = useState("");
  const [members, setMembers] = useState<{ id: string; displayName: string }[]>([]);

  async function load() {
    const qs = new URLSearchParams({ limit: "100" });
    if (filterDate) qs.set("date", filterDate);
    if (filterPurchaser) qs.set("purchasedBy", filterPurchaser);
    const res = await fetch(`/api/messes/${id}/market/entries?${qs.toString()}`);
    const data = await res.json();
    if (res.ok) setEntries(data.entries);
    else setMsg(data.error || "Load failed");
  }
  useEffect(() => { load(); }, [id, filterDate, filterPurchaser]);
  useEffect(() => {
    fetch(`/api/messes/${id}/members`).then((r) => r.json()).then((d) => {
      if (d.members) setMembers(d.members.filter((m: { status: string }) => m.status === "active").map((m: { id: string; fullName: string; displayName: string }) => ({ id: m.id, displayName: m.fullName || m.displayName })));
    });
  }, [id]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link href={`/messes/${id}/market`} className="text-sm text-zinc-500">← {t("market.hub")}</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">বাজার এন্ট্রি — কোথায় সংরক্ষণ</h1>
        <Link href={`/messes/${id}/market/add`} className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm">+ নতুন</Link>
      </div>
      <p className="text-xs text-zinc-500">প্রতিটি এন্ট্রি `marketEntries` + `marketEntryItems` এ সংরক্ষণ — `finalPaisa` ড্যাশবোর্ড/সেটেলমেন্টে যায়, ভবিষ্যতে Edit/Void করা যায় — তারিখ অনুযায়ী কে করেছে দেখতে ফিল্টার করুন</p>
      <div className="bg-white border rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div><label className="text-xs">তারিখ (DD-MM-YYYY)</label><input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" /><div className="text-[11px] text-zinc-500 mt-1">{filterDate ? formatDateBD(filterDate, locale) : ""}</div></div>
        <div><label className="text-xs">কে বাজার করেছে</label><select value={filterPurchaser} onChange={(e) => setFilterPurchaser(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="">— সবাই —</option>{members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}</select></div>
        <button onClick={() => { setFilterDate(""); setFilterPurchaser(""); }} className="px-4 py-2 border rounded-full text-sm">Clear</button>
      </div>
      {filterDate && entries.length > 0 && (
        <div className="rounded-xl border bg-amber-50 p-3 text-sm">
          {filterDate} ({formatDateBD(filterDate, locale)}) — এই দিনে <b>{entries.length}</b> এন্ট্রি — {(() => {
            const byPurchaser: Record<string, number> = {};
            for (const e of entries) {
              const key = e.purchaserName || "অজানা";
              byPurchaser[key] = (byPurchaser[key] || 0) + 1;
            }
            const parts = Object.entries(byPurchaser).map(([name, cnt]) => `${name} (${cnt})`);
            const allOne = entries.length === 1 ? " — সব বাজার একজনে করেছে" : entries.length > 1 && Object.keys(byPurchaser).length === 1 ? " — সব বাজার একজনে করেছে" : "";
            return parts.join(", ") + allOne;
          })()}
        </div>
      )}
      {msg && <div className="rounded-xl border p-3 text-sm bg-white">{msg}</div>}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="text-left p-3">তারিখ (DD-MM-YYYY)</th>
                <th className="text-left p-3">কে করেছে</th>
                <th className="text-left p-3">শ্রেণি</th>
                <th className="text-left p-3">আইটেম</th>
                <th className="text-right p-3">মোট</th>
                <th className="text-right p-3">গাড়ি ভাড়া</th>
                <th className="text-right p-3">সর্বমোট</th>
                <th className="text-center p-3">অবস্থা</th>
                <th className="p-3">কাজ</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-zinc-50">
                  <td className="p-3 font-mono text-xs" title={e.date}>{formatDateBD(e.date, locale)}</td>
                  <td className="p-3 text-xs font-medium">{e.purchaserName || "—"}</td>
                  <td className="p-3 text-xs">{e.classification}</td>
                  <td className="p-3 text-xs">{e.items?.length || 0} • {e.items?.slice(0, 2).map((it) => it.productNameSnapshot).join(", ")}{e.items && e.items.length > 2 ? "…" : ""} {e.transportPaisa ? " + গাড়ি" : ""}</td>
                  <td className="p-3 text-right text-xs">{formatCurrency(e.totalPaisa, locale)}</td>
                  <td className="p-3 text-right text-xs">{formatCurrency(e.transportPaisa || 0, locale)}</td>
                  <td className="p-3 text-right font-semibold text-xs">{formatCurrency(e.finalPaisa, locale)}</td>
                  <td className="p-3 text-center"><span className={`text-xs rounded-full px-2 py-0.5 ${e.status === "active" ? "bg-green-100" : "bg-zinc-200"}`}>{e.status}</span></td>
                  <td className="p-3"><Link href={`/messes/${id}/market/entries/${e.id}`} className="text-xs border rounded-full px-3 py-1 hover:bg-white">দেখুন/Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && <div className="p-8 text-center text-sm text-zinc-500">এখনো এন্ট্রি নেই — Add থেকে সংরক্ষণ করুন, এখানে কতটুকু/কোথায় দেখাবে</div>}
        </div>
      </div>
    </div>
  );
}
