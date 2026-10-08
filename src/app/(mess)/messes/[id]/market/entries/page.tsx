"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { formatCurrency, formatDateBD } from "@/i18n/dict";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";

type Entry = { id: string; date: string; purchasedBy: string | null; purchaserName: string | null; purchaserNames?: string[]; purchaserIds?: string[]; vendorId: string | null; classification: string; paymentMethod: string; totalPaisa: number; transportPaisa: number; discountPaisa: number; finalPaisa: number; status: string; items: { productNameSnapshot: string; quantityScaled: number; unit: string; totalPaisa: number }[] };

export default function EntriesPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [msg, setMsg] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterPurchaser, setFilterPurchaser] = useState("");
  const [members, setMembers] = useState<{ id: string; displayName: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmState, setConfirmState] = useState<null | { kind: "merge"; count: number } | { kind: "deleteOne"; entryId: string } | { kind: "deleteSelected"; count: number }>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

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

  function toggle(id2: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id2)) n.delete(id2);
      else n.add(id2);
      return n;
    });
  }
  function toggleAll() {
    if (selected.size === entries.length) setSelected(new Set());
    else setSelected(new Set(entries.map((e) => e.id)));
  }
  async function mergeSelected() {
    if (selected.size < 2) return;
    setConfirmState({ kind: "merge", count: selected.size });
  }

  async function deleteOne(entryId: string) {
    setConfirmState({ kind: "deleteOne", entryId });
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    setConfirmState({ kind: "deleteSelected", count: selected.size });
  }

  async function confirmAction() {
    const target = confirmState;
    if (!target) return;
    setConfirmBusy(true);
    let res: Response;
    let data: Record<string, unknown> = {};
    if (target.kind === "merge") {
      res = await fetch(`/api/messes/${id}/market/entries/merge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryIds: [...selected] }) });
      data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(`Merged → ${(data.entry as { id: string })?.id?.slice(0, 8)} (${(data.mergedIds as string[])?.length || 0} → 1)`);
        setSelected(new Set());
        load();
      }
    } else if (target.kind === "deleteOne") {
      res = await fetch(`/api/messes/${id}/market/entries/${target.entryId}`, { method: "DELETE" });
      data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg("মুছে ফেলা হয়েছে");
        load();
      } else {
        setMsg(`${data.error || "Delete failed"} — আপনার role ${data.role ? data.role : ""} হলে Members → role manager করুন`);
      }
    } else if (target.kind === "deleteSelected") {
      let ok = 0;
      let fail = 0;
      let lastErr = "";
      let resForDeleteSelected: Response | undefined;
      for (const eid of [...selected]) {
        const resDel = await fetch(`/api/messes/${id}/market/entries/${eid}`, { method: "DELETE" });
        data = await resDel.json().catch(() => ({}));
        if (resDel.ok) ok++; else { fail++; lastErr = String(data.error || "Failed"); }
        if (!resForDeleteSelected) resForDeleteSelected = resDel;
      }
      setMsg(fail > 0 ? `মুছেছে ${ok}, ব্যর্থ ${fail} (${lastErr})` : `${ok}টি মুছে ফেলা হয়েছে`);
      if (ok > 0) load();
    }
    setConfirmBusy(false);
    let shouldClose = false;
    if (target.kind === "merge") {
      shouldClose = true;
    } else if (target.kind === "deleteOne") {
      shouldClose = true;
    } else if (target.kind === "deleteSelected") {
      shouldClose = true;
    }
    if (shouldClose) setConfirmState(null);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">বাজার এন্ট্রি</h1>
        <Link href={`/messes/${id}/market/add`} className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm min-h-[44px] inline-flex items-center">+ নতুন</Link>
      </div>
      <p className="text-xs text-zinc-500">তারিখ বা কে বাজার করেছে — ফিল্টার করে যাচাই করুন</p>
      <div className="bg-white border rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div><label className="text-xs">তারিখ (DD-MM-YYYY)</label><input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" /><div className="text-[11px] text-zinc-500 mt-1">{filterDate ? formatDateBD(filterDate, locale) : ""}</div></div>
        <div><label className="text-xs">কে বাজার করেছে</label><select value={filterPurchaser} onChange={(e) => setFilterPurchaser(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="">— সবাই —</option>{members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}</select></div>
        <button onClick={() => { setFilterDate(""); setFilterPurchaser(""); }} className="px-4 py-2 border rounded-full text-sm min-h-[44px]">ফিল্টার মুছুন</button>
        {selected.size >= 2 && <button onClick={mergeSelected} className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm min-h-[44px]">Merge ({selected.size}) → একটিতে</button>}
        {selected.size > 0 && <button onClick={deleteSelected} className="px-4 py-2 rounded-full bg-red-600 text-white text-sm min-h-[44px]">মুছুন ({selected.size})</button>}
        {selected.size > 0 && <button onClick={() => setSelected(new Set())} className="px-4 py-2 border rounded-full text-sm min-h-[44px]">নির্বাচন বাদ</button>}
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
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="p-3"><input type="checkbox" checked={entries.length > 0 && selected.size === entries.length} onChange={toggleAll} className="w-6 h-6 rounded accent-zinc-900" /></th>
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
              {entries.map((e) => {
                const names = (e.purchaserNames && e.purchaserNames.length ? e.purchaserNames : e.purchaserName ? [e.purchaserName] : []) as string[];
                return (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-zinc-50">
                    <td className="p-3"><input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} className="w-6 h-6 rounded accent-zinc-900" /></td>
                    <td className="p-3 font-mono text-xs" title={e.date}>{formatDateBD(e.date, locale)}</td>
                    <td className="p-3 text-xs font-medium">{names.length ? names.join(", ") : "—"}</td>
                    <td className="p-3 text-xs">{e.classification === "food" ? t("market.classFood") : e.classification === "shared" ? t("market.classShared") : t("market.classNonFood")}</td>
                    <td className="p-3 text-xs">{e.items?.length || 0} • {e.items?.slice(0, 2).map((it) => it.productNameSnapshot).join(", ")}{e.items && e.items.length > 2 ? "…" : ""} {e.transportPaisa ? " + গাড়ি" : ""}</td>
                    <td className="p-3 text-right text-xs">{formatCurrency(e.totalPaisa, locale)}</td>
                    <td className="p-3 text-right text-xs">{formatCurrency(e.transportPaisa || 0, locale)}</td>
                    <td className="p-3 text-right font-semibold text-xs">{formatCurrency(e.finalPaisa, locale)}</td>
                  <td className="p-3 text-center"><span className={`text-xs rounded-full px-2 py-0.5 ${e.status === "active" ? "bg-green-100" : "bg-zinc-200"}`}>{e.status === "active" ? t("status.active") : t("status.voided")}</span></td>
                  <td className="p-3 flex gap-1"><Link href={`/messes/${id}/market/entries/${e.id}`} className="text-xs border rounded-full px-4 py-2.5 hover:bg-white min-h-[44px] inline-flex items-center">দেখুন</Link><button onClick={() => deleteOne(e.id)} title="স্থায়ীভাবে মুছুন" aria-label="স্থায়ীভাবে মুছুন" className="text-xs border rounded-full px-4 py-2.5 hover:bg-red-50 text-red-600 min-h-[44px]">✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y">
          {entries.map((e) => {
            const names = (e.purchaserNames && e.purchaserNames.length ? e.purchaserNames : e.purchaserName ? [e.purchaserName] : []) as string[];
            return (
              <div key={e.id} className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} className="w-6 h-6 rounded accent-zinc-900 shrink-0" aria-label={formatDateBD(e.date, locale)} />
                  <span className="font-mono text-xs">{formatDateBD(e.date, locale)}</span>
                  <span className={`ml-auto text-xs rounded-full px-2 py-0.5 ${e.status === "active" ? "bg-green-100" : "bg-zinc-200"}`}>{e.status === "active" ? t("status.active") : t("status.voided")}</span>
                </div>
                <div className="text-xs font-medium">{names.length ? names.join(", ") : "—"}</div>
                <div className="text-xs text-zinc-500">{e.items?.length || 0} • {e.items?.slice(0, 2).map((it) => it.productNameSnapshot).join(", ")}{e.items && e.items.length > 2 ? "…" : ""}{e.transportPaisa ? " + গাড়ি" : ""}</div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm tabular-nums">{formatCurrency(e.finalPaisa, locale)}</span>
                  <span className="flex gap-2">
                    <Link href={`/messes/${id}/market/entries/${e.id}`} className="text-xs border rounded-full px-4 py-2.5 hover:bg-white min-h-[44px] inline-flex items-center">দেখুন</Link>
                    <button onClick={() => deleteOne(e.id)} title="স্থায়ীভাবে মুছুন" aria-label="স্থায়ীভাবে মুছুন" className="text-xs border rounded-full px-4 py-2.5 hover:bg-red-50 text-red-600 min-h-[44px] min-w-[44px]">✕</button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
          {entries.length === 0 && (
            <div className="p-8 text-center text-sm text-zinc-500 space-y-3">
              <div>এখনো এন্ট্রি নেই</div>
              <Link href={`/messes/${id}/market/add`} className="inline-flex items-center px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm min-h-[48px]">+ নতুন বাজার যোগ</Link>
            </div>
          )}
        </div>
      <ConfirmSheet
        open={!!confirmState}
        title={
          !confirmState ? "" :
          confirmState.kind === "merge"
            ? `${confirmState.count}টি এন্ট্রি একটিতে মার্জ করবেন? আইটেম + গাড়ি ভাড়া যোগ হবে, পুরনোগুলো বাদ যাবে`
            : confirmState.kind === "deleteOne"
              ? "এই এন্ট্রি স্থায়ীভাবে মুছবেন? মোট ও বিক্রেতার হিসাব থেকে বাদ যাবে।"
              : `${confirmState.count}টি এন্ট্রি একসাথে স্থায়ীভাবে মুছবেন?`
        }
        confirmLabel={
          !confirmState ? t("common.confirm") :
          confirmState.kind === "merge" ? "মার্জ করুন" : "স্থায়ীভাবে মুছুন"
        }
        danger={confirmState?.kind !== "merge"}
        busy={confirmBusy}
        onConfirm={confirmAction}
        onClose={() => !confirmBusy && setConfirmState(null)}
      />
    </div>
  );
}
