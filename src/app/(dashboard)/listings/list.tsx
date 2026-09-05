"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type L = { id: string; slug: string; title: string; district: string | null; area: string | null; pricePaisa: number; status: string; type: string };

const STATUS_BN: Record<string, string> = { draft: "খসড়া", pending: "যাচাইাধীন", published: "প্রকাশিত", paused: "বিরত", rented: "ভাড়া হয়েছে", expired: "মেয়াদোত্তীর্ণ", rejected: "বাতিল", archived: "আর্কাইভ" };

export default function MyListings() {
  const [listings, setListings] = useState<L[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/listings?mine=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.listings) setListings(d.listings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="rounded-2xl border bg-white p-10 text-center text-sm animate-pulse">লোড হচ্ছে...</div>;
  if (!listings.length)
    return (
      <div className="rounded-2xl border bg-white p-10 text-center">
        <div className="font-medium text-sm">কোনো লিস্টিং নেই</div>
        <div className="text-xs text-zinc-500 mt-1">প্রথম লিস্টিং তৈরি করুন — ঠিকানা সরকারি তালিকা থেকে বেছে নিন।</div>
        <Link href="/listings/new" className="inline-block mt-3 px-5 py-2 rounded-full bg-zinc-900 text-white text-sm">+ তৈরি করুন</Link>
      </div>
    );

  return (
    <div className="space-y-2">
      {listings.map((l) => (
        <div key={l.id} className="rounded-2xl border bg-white p-4 flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-sm">{l.title}</div>
            <div className="text-xs text-zinc-500 mt-1">{[l.district, l.area].filter(Boolean).join(", ")} • ৳{(l.pricePaisa / 100).toLocaleString("bn-BD")} • <span className="border rounded-full px-2 py-0.5">{STATUS_BN[l.status] || l.status}</span></div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/listings/${l.slug}`} className="text-xs border rounded-full px-3 py-1.5">দেখুন</Link>
            <Link href={`/listings/${l.slug}/edit`} className="text-xs border rounded-full px-3 py-1.5 bg-zinc-50">এডিট</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
