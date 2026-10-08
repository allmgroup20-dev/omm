"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AddressSelect, { type AddressValue } from "./address-select";
import { listingTypes } from "@/lib/validators-listing";
import { useLocale } from "@/i18n/provider";

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
  const { t } = useLocale();
  const [form, setForm] = useState<ListingFormData>({ ...EMPTY_FORM, ...initial, geo: { ...EMPTY_GEO, ...(initial?.geo || {}) } });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<ListingFormData>) => setForm((f) => ({ ...f, ...patch }));
  const inp = "w-full border rounded-xl px-4 py-3 text-base sm:text-sm mt-1 bg-white min-h-[52px]";

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
      if (!res.ok) throw new Error(typeof data.error === "string" && data.error ? data.error : t("errors.saveFail"));
      setMsg(slug ? t("listing.updatedMsg") : t("listing.createdMsg"));
      setTimeout(() => router.push("/listings"), 1000);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : t("errors.saveFail"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {msg && <div className="rounded-xl border p-3 text-sm bg-white break-all">{msg}</div>}

      <div className="bg-white border rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="font-semibold text-sm">{t("listing.basicInfo")}</div>
        <div>
          <label className="text-xs font-medium">{t("listing.titleLabel")} *</label>
          <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder={t("listing.titlePh")} aria-label={t("listing.newTitle")} className={inp} required minLength={5} maxLength={80} />
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium">{t("listing.typeLabel")} *</label>
            <select value={form.type} onChange={(e) => set({ type: e.target.value })} className={inp}>
              {(listingTypes as readonly string[]).map((ty) => (
                <option key={ty} value={ty}>{t(`types.${ty}` as never) === `types.${ty}` ? ty : t(`types.${ty}` as never)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">{t("listing.rentLabel")} *</label>
            <input type="number" min={500} value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="3500" inputMode="numeric" className={inp} required />
          </div>
          <div>
            <label className="text-xs font-medium">{t("listing.depositLabel")}</label>
            <input type="number" min={0} value={form.deposit} onChange={(e) => set({ deposit: e.target.value })} placeholder="0" inputMode="numeric" className={inp} />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium">{t("listing.bedrooms")}</label>
            <input type="number" min={0} value={form.bedrooms} onChange={(e) => set({ bedrooms: e.target.value })} inputMode="numeric" className={inp} />
          </div>
          <div>
            <label className="text-xs font-medium">{t("listing.bathrooms")}</label>
            <input type="number" min={0} value={form.bathrooms} onChange={(e) => set({ bathrooms: e.target.value })} inputMode="numeric" className={inp} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium">{t("listing.details")}</label>
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3} placeholder={t("listing.descPh")} className={inp} />
        </div>
        <div>
          <label className="text-xs font-medium">{t("listing.imageUrlLabel")}</label>
          <input value={form.coverImageUrl} onChange={(e) => set({ coverImageUrl: e.target.value })} placeholder="https://..." inputMode="url" className={inp} />
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="font-semibold text-sm">{t("listing.addressSec")}</div>
        <AddressSelect value={form.geo} onChange={(geo) => set({ geo })} />
      </div>

      <div className="bg-white border rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="font-semibold text-sm">{t("listing.featuresSec")}</div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium">{t("listing.genderLabel")}</label>
            <select value={form.genderPreference} onChange={(e) => set({ genderPreference: e.target.value })} className={inp}>
              <option value="any">{t("listing.genderAny")}</option>
              <option value="male">{t("listing.genderMale")}</option>
              <option value="female">{t("listing.genderFemale")}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">{t("listing.seatsLabel")}</label>
            <input type="number" min={0} value={form.totalSeats} onChange={(e) => set({ totalSeats: e.target.value })} inputMode="numeric" className={inp} />
          </div>
          <div>
            <label className="text-xs font-medium">{t("listing.availableLabel")}</label>
            <input type="date" value={form.availableFrom} onChange={(e) => set({ availableFrom: e.target.value })} className={inp} />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={form.furnished} onChange={(e) => set({ furnished: e.target.checked })} className="w-5 h-5 accent-zinc-900" /> {t("listing.furnished")}</label>
          <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={form.bachelorAllowed} onChange={(e) => set({ bachelorAllowed: e.target.checked })} className="w-5 h-5 accent-zinc-900" /> {t("listing.bachelor")}</label>
          <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={form.familyAllowed} onChange={(e) => set({ familyAllowed: e.target.checked })} className="w-5 h-5 accent-zinc-900" /> {t("listing.family")}</label>
        </div>
      </div>

      <button disabled={saving} className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm font-medium disabled:opacity-50 min-h-[52px]">
        {saving ? t("listing.submitting") : slug ? t("listing.submitEdit") : t("listing.submitNew")}
      </button>
      <p className="text-xs text-zinc-500 text-center">{t("listing.moderationNote")}</p>
    </form>
  );
}
