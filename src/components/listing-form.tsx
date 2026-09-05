"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AddressSelect, { type AddressValue } from "./address-select";
import { listingTypes } from "@/lib/validators-listing";

export type ListingFormData = {
  title: string;
  description: string;
  type: string;
  price: string;
  deposit: string;
  bedrooms: string;
  bathrooms: string;
  furnished: boolean;
  bachelorAllowed: boolean;
  familyAllowed: boolean;
  genderPreference: string;
  availableFrom: string;
  totalSeats: string;
  coverImageUrl: string;
  geo: AddressValue;
};

const EMPTY_GEO: AddressValue = { division: "", district: "", upazila: "", unionName: "", area: "", address: "", postalCode: "" };

export const EMPTY_FORM: ListingFormData = {
  title: "",
  description: "",
  type: "seat",
  price: "",
  deposit: "",
  bedrooms: "",
  bathrooms: "",
  furnished: false,
  bachelorAllowed: true,
  familyAllowed: false,
  genderPreference: "any",
  availableFrom: "",
  totalSeats: "",
  coverImageUrl: "",
  geo: EMPTY_GEO,
};

export default function ListingForm({ initial, slug }: { initial?: Partial<ListingFormData & { geo?: Partial<AddressValue> }>; slug?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<ListingFormData>({ ...EMPTY_FORM, ...initial, geo: { ...EMPTY_GEO, ...(initial?.geo || {}) } });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<ListingFormData>) => setForm((f) => ({ ...f, ...patch }));
  const inp = "w-full border rounded-xl px-3 py-2.5 text-sm mt-1 bg-white";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        price: Number(form.price) || 0,
        deposit: Number(form.deposit) || 0,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        furnished: form.furnished,
        bachelorAllowed: form.bachelorAllowed,
        familyAllowed: form.familyAllowed,
        genderPreference: form.genderPreference,
        availableFrom: form.availableFrom || undefined,
        totalSeats: form.totalSeats ? Number(form.totalSeats) : undefined,
        coverImageUrl: form.coverImageUrl || undefined,
        division: form.geo.division,
        district: form.geo.district,
        upazila: form.geo.upazila,
        unionName: form.geo.unionName,
        area: form.geo.area,
        address: form.geo.address,
        postalCode: form.geo.postalCode,
      };
      const url = slug ? `/api/listings/${slug}` : "/api/listings";
      const res = await fetch(url, { method: slug ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg(slug ? "আপডেট হয়েছে! পুনরায় moderation হবে।" : "জমা হয়েছে! Moderation-এর পর প্রকাশিত হবে।");
      setTimeout(() => router.push("/listings"), 1000);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {msg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{msg}</div>}

      <div className="bg-white border rounded-2xl p-5 space-y-3">
        <div className="font-semibold text-sm">মূল তথ্য</div>
        <div>
          <label className="text-xs text-zinc-600">শিরোনাম *</label>
          <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="যেমন: মিরপুর ১০-এ ২ সিট খালি" className={inp} required minLength={5} maxLength={80} />
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-zinc-600">ধরন *</label>
            <select value={form.type} onChange={(e) => set({ type: e.target.value })} className={inp}>
              {(listingTypes as readonly string[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-600">মাসিক ভাড়া (৳) *</label>
            <input type="number" min={500} value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="3500" className={inp} required />
          </div>
          <div>
            <label className="text-xs text-zinc-600">জামানত (৳)</label>
            <input type="number" min={0} value={form.deposit} onChange={(e) => set({ deposit: e.target.value })} placeholder="0" className={inp} />
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-600">বিস্তারিত</label>
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3} placeholder="রুম, খাবার, নিয়মাবলী..." className={inp} />
        </div>
        <div>
          <label className="text-xs text-zinc-600">ছবির লিংক (ঐচ্ছিক)</label>
          <input value={form.coverImageUrl} onChange={(e) => set({ coverImageUrl: e.target.value })} placeholder="https://..." className={inp} />
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5 space-y-3">
        <div className="font-semibold text-sm">ঠিকানা (সরকারি তালিকা)</div>
        <AddressSelect value={form.geo} onChange={(geo) => set({ geo })} />
      </div>

      <div className="bg-white border rounded-2xl p-5 space-y-3">
        <div className="font-semibold text-sm">বৈশিষ্ট্য</div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-zinc-600">লিঙ্গ</label>
            <select value={form.genderPreference} onChange={(e) => set({ genderPreference: e.target.value })} className={inp}>
              <option value="any">যেকেউ</option>
              <option value="male">পুরুষ</option>
              <option value="female">নারী</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-600">খালি সিট</label>
            <input type="number" min={0} value={form.totalSeats} onChange={(e) => set({ totalSeats: e.target.value })} className={inp} />
          </div>
          <div>
            <label className="text-xs text-zinc-600">উপলব্ধ তারিখ</label>
            <input type="date" value={form.availableFrom} onChange={(e) => set({ availableFrom: e.target.value })} className={inp} />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.furnished} onChange={(e) => set({ furnished: e.target.checked })} /> Furnished</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.bachelorAllowed} onChange={(e) => set({ bachelorAllowed: e.target.checked })} /> ব্যাচেলর চলবে</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.familyAllowed} onChange={(e) => set({ familyAllowed: e.target.checked })} /> ফ্যামিলি চলবে</label>
        </div>
      </div>

      <button disabled={saving} className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm font-medium disabled:opacity-50">
        {saving ? "জমা হচ্ছে..." : slug ? "আপডেট করুন" : "লিস্টিং জমা দিন"}
      </button>
      <p className="text-xs text-zinc-500 text-center">জমার পর admin moderation হবে, তারপর প্রকাশিত হবে।</p>
    </form>
  );
}
