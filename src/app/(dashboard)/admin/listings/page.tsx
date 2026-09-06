"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Listing = { id: string; slug: string; title: string; district: string | null; area: string | null; pricePaisa: number; status: string; createdAt: string };

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [status, setStatus] = useState("pending");

  async function load() {
    const res = await fetch(`/api/admin/listings?status=${status}`);
    const data = await res.json();
    if (res.ok) setListings(data.listings);
    else alert(data.error);
  }
  useEffect(() => { load(); }, [status]);

  async function moderate(id: string, action: string) {
    const reason = action === "reject" ? prompt("Reason?") || "" : "";
    const res = await fetch(`/api/admin/listings/${id}/moderate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    else load();
  }

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-zinc-500">← Admin</Link>
      <h1 className="text-lg font-bold">Moderation Queue</h1>
      <div className="flex gap-2 flex-wrap">
        {["pending", "published", "rejected", "archived"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-4 py-2 rounded-full border text-sm min-h-[44px] ${status === s ? "bg-zinc-900 text-white border-zinc-900" : "bg-white"}`}>{s}</button>
        ))}
      </div>
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="text-left p-3">Title</th><th className="text-left p-3">Location</th><th className="text-right p-3">Price</th><th className="text-center p-3">Status</th><th className="text-right p-3">Actions</th></tr></thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3"><Link href={`/listings/${l.slug}`} className="underline">{l.title}</Link></td>
                <td className="p-3 text-xs">{[l.district, l.area].filter(Boolean).join(", ")}</td>
                <td className="p-3 text-right">৳{(l.pricePaisa / 100).toLocaleString("bn-BD")}</td>
                <td className="p-3 text-center"><span className="text-xs border rounded-full px-2 py-0.5">{l.status}</span></td>
                <td className="p-3 text-right flex gap-1 justify-end">
                  {status === "pending" && (
                    <>
                      <button onClick={() => moderate(l.id, "approve")} className="text-xs border rounded-full px-3 py-2 bg-emerald-50 min-h-[36px]">Approve</button>
                      <button onClick={() => moderate(l.id, "reject")} className="text-xs border rounded-full px-3 py-2 bg-red-50 min-h-[36px]">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            </tbody>
            </table>
          </div>
        </div>
        {listings.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">No {status} listings</div>}
      </div>
    </div>
  );
}
