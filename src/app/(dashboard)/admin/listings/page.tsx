"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { useLocale } from "@/i18n/provider";
import { formatCurrency } from "@/i18n/dict";

type Listing = { id: string; slug: string; title: string; district: string | null; area: string | null; pricePaisa: number; status: string; createdAt: string };

export default function AdminListingsPage() {
  const { t, locale } = useLocale();
  const [listings, setListings] = useState<Listing[]>([]);
  const [status, setStatus] = useState("pending");
  const [msg, setMsg] = useState("");
  const [moderateTarget, setModerateTarget] = useState<null | { id: string; action: "approve" | "reject"; reason: string }>(null);
  const [moderateBusy, setModerateBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/listings?status=${status}`);
    const data = await res.json();
    if (res.ok) setListings(data.listings);
    else setMsg(data.error);
  }
  useEffect(() => { load(); }, [status]);

  function askModerate(id: string, action: "approve" | "reject") {
    setModerateTarget({ id, action, reason: "" });
  }

  async function confirmModerate() {
    const target = moderateTarget;
    if (!target) return;
    setModerateBusy(true);
    const res = await fetch(`/api/admin/listings/${target.id}/moderate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: target.action, reason: target.reason }) });
    const data = await res.json();
    setModerateBusy(false);
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(target.action === "approve" ? t("admin.approvedMsg") : t("admin.rejectedMsg"));
      setModerateTarget(null);
      load();
    }
  }

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-zinc-500 min-h-[44px] inline-flex items-center">{t("admin.backAdmin")}</Link>
      <h1 className="text-lg font-bold">{t("admin.queueTitle")}</h1>
      <div className="flex gap-2 flex-wrap">
        {["pending", "published", "rejected", "archived"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-4 py-2 rounded-full border text-sm min-h-[44px] ${status === s ? "bg-zinc-900 text-white border-zinc-900" : "bg-white"}`}>{t(`listing.st_${s}` as never) === `listing.st_${s}` ? s : t(`listing.st_${s}` as never)}</button>
        ))}
      </div>
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="text-left p-3">{t("admin.titleCol")}</th><th className="text-left p-3">{t("admin.locationCol")}</th><th className="text-right p-3">{t("admin.priceCol")}</th><th className="text-center p-3">{t("common.status")}</th><th className="text-right p-3">{t("admin.actionsCol")}</th></tr></thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3"><Link href={`/listings/${l.slug}`} className="underline">{l.title}</Link></td>
                <td className="p-3 text-xs">{[l.district, l.area].filter(Boolean).join(", ")}</td>
                <td className="p-3 text-right tabular-nums">{formatCurrency(l.pricePaisa, locale)}</td>
                <td className="p-3 text-center"><span className="text-xs border rounded-full px-2 py-0.5">{t(`listing.st_${l.status}` as never) === `listing.st_${l.status}` ? l.status : t(`listing.st_${l.status}` as never)}</span></td>
                <td className="p-3 text-right flex gap-1 justify-end">
                  {status === "pending" && (
                    <>
                      <button onClick={() => askModerate(l.id, "approve")} className="text-xs border rounded-full px-4 py-2.5 bg-emerald-50 min-h-[44px]">{t("admin.approve")}</button>
                      <button onClick={() => askModerate(l.id, "reject")} className="text-xs border rounded-full px-4 py-2.5 bg-red-50 min-h-[44px]">{t("admin.reject")}</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            </tbody>
            </table>
          </div>
        </div>
        {listings.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">{t("admin.noListings")}</div>}
      </div>
      {msg && <div className="rounded-xl border p-3 text-sm bg-white">{msg}</div>}
      <ConfirmSheet
        open={!!moderateTarget}
        title={moderateTarget?.action === "approve" ? t("admin.approveTitle") : t("admin.rejectTitle")}
        confirmLabel={moderateTarget?.action === "approve" ? t("admin.approve") : t("admin.reject")}
        danger={moderateTarget?.action === "reject"}
        busy={moderateBusy}
        input={moderateTarget?.action === "reject" ? { value: moderateTarget.reason, onChange: (v) => setModerateTarget(t => t ? { ...t, reason: v } : null), placeholder: t("admin.rejectReasonPh") } : undefined}
        onConfirm={confirmModerate}
        onClose={() => !moderateBusy && setModerateTarget(null)}
      />
    </div>
  );
}
