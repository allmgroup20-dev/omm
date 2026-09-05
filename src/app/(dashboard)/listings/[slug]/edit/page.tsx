"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ListingForm from "@/components/listing-form";

export default function EditListingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [initial, setInitial] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/listings/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else if (d.listing) {
          const l = d.listing;
          setInitial({
            title: l.title,
            description: l.description || "",
            type: l.type,
            price: String(l.pricePaisa / 100),
            deposit: String((l.depositPaisa || 0) / 100),
            furnished: !!l.furnished,
            bachelorAllowed: !!l.bachelorAllowed,
            familyAllowed: !!l.familyAllowed,
            genderPreference: l.genderPreference || "any",
            availableFrom: l.availableFrom || "",
            totalSeats: l.totalSeats ? String(l.totalSeats) : "",
            geo: {
              division: l.division || "",
              district: l.district || "",
              upazila: l.upazila || "",
              unionName: l.unionName || "",
              area: l.area || "",
              address: l.address || "",
              postalCode: l.postalCode || "",
            },
          });
        }
      })
      .catch(() => setError("Load failed"));
  }, [slug]);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Link href="/listings" className="text-sm text-zinc-500">← আমার লিস্টিং</Link>
      <h1 className="text-lg font-bold">লিস্টিং এডিট</h1>
      {error && <div className="rounded-xl bg-red-50 border p-3 text-sm text-red-700">{error}</div>}
      {!initial && !error && <div className="rounded-2xl border bg-white p-10 text-center text-sm animate-pulse">লোড হচ্ছে...</div>}
      {initial && <ListingForm initial={initial as never} slug={slug} />}
    </div>
  );
}
