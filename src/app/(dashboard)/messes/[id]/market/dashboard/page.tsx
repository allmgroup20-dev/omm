"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Dash = { today: { totalPaisa: number; count: number }; week: { totalPaisa: number }; month: { totalPaisa: number }; avgDailyPaisa: number; highestCategory: [string, number] | null; productSpend: [string, number][]; totalEntries: number };

export default function MarketDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Dash | null>(null);

  useEffect(() => {
    fetch(`/api/messes/${id}/market/dashboard`).then((r) => r.json()).then((d) => { if (!d.error) setData(d); });
  }, [id]);

  if (!data) return <div className="p-6 text-sm">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}/market`} className="text-sm text-zinc-500">← Market Hub</Link>
      <h1 className="text-lg font-bold">Market Dashboard</h1>
      <div className="grid md:grid-cols-4 gap-3">
        <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">আজ</div><div className="font-bold">৳{(data.today.totalPaisa / 100).toFixed(2)}</div><div className="text-xs text-zinc-500">{data.today.count} entries</div></div>
        <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">এই সপ্তাহ</div><div className="font-bold">৳{(data.week.totalPaisa / 100).toFixed(2)}</div></div>
        <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">এই মাস</div><div className="font-bold">৳{(data.month.totalPaisa / 100).toFixed(2)}</div></div>
        <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-zinc-500">গড় দৈনিক</div><div className="font-bold">৳{(data.avgDailyPaisa / 100).toFixed(2)}</div></div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold text-sm">Highest Category</div>
          <div className="mt-2 text-sm">{data.highestCategory ? `${data.highestCategory[0]} — ৳${(data.highestCategory[1] / 100).toFixed(2)}` : "—"}</div>
          <div className="text-xs text-zinc-500 mt-1">মোট {data.totalEntries} purchases</div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold text-sm">Top Products</div>
          <ul className="mt-2 text-sm space-y-1">
            {data.productSpend.map(([name, paisa]) => (
              <li key={name} className="flex justify-between"><span>{name}</span><span>৳{(paisa / 100).toFixed(2)}</span></li>
            ))}
            {data.productSpend.length === 0 && <li className="text-zinc-500">No data</li>}
          </ul>
        </div>
      </div>
      <Link href={`/messes/${id}/market/add`} className="inline-block px-5 py-2 rounded-full bg-zinc-900 text-white text-sm">+ নতুন বাজার</Link>
    </div>
  );
}
