"use client";
import { useEffect, useState } from "react";

export type AddressValue = {
  division: string;
  district: string;
  upazila: string;
  unionName: string;
  area: string;
  address: string; // house/holding/road detail (free text)
  postalCode: string;
};

type Opt = { en: string; bn: string; slug?: string; zip?: string[]; type?: string };

async function fetchLevel(level: string, parent: Record<string, string>): Promise<Opt[]> {
  const qs = new URLSearchParams({ level, ...parent });
  const res = await fetch(`/api/geo?${qs.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data as Opt[];
}

export default function AddressSelect({
  value,
  onChange,
  showUnion = true,
  showDetail = true,
}: {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  showUnion?: boolean;
  showDetail?: boolean;
}) {
  const [divisions, setDivisions] = useState<Opt[]>([]);
  const [districts, setDistricts] = useState<Opt[]>([]);
  const [upazilas, setUpazilas] = useState<Opt[]>([]);
  const [unions, setUnions] = useState<Opt[]>([]);

  useEffect(() => {
    fetchLevel("divisions", {}).then(setDivisions);
  }, []);

  useEffect(() => {
    setDistricts([]);
    if (!value.division) return;
    fetchLevel("districts", { division: value.division }).then(setDistricts);
  }, [value.division]);

  useEffect(() => {
    setUpazilas([]);
    if (!value.district) return;
    fetchLevel("upazilas", { district: value.district }).then(setUpazilas);
  }, [value.district]);

  useEffect(() => {
    setUnions([]);
    if (!value.district || !value.upazila) return;
    fetchLevel("unions", { district: value.district, upazila: value.upazila }).then(setUnions);
  }, [value.district, value.upazila]);

  // Auto-suggest postal code when upazila changes (editable)
  useEffect(() => {
    if (!value.district || !value.upazila || value.postalCode) return;
    fetch(`/api/geo?level=zip&district=${encodeURIComponent(value.district)}&upazila=${encodeURIComponent(value.upazila)}`)
      .then((r) => r.json())
      .then((d) => {
        const zip = (d?.zip as string[])?.[0];
        if (zip) onChange({ ...value, postalCode: zip });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.district, value.upazila]);

  const set = (patch: Partial<AddressValue>) => {
    const next = { ...value, ...patch };
    // Reset children when parent changes
    if (patch.division !== undefined && patch.division !== value.division) {
      next.district = "";
      next.upazila = "";
      next.unionName = "";
      next.postalCode = "";
    }
    if (patch.district !== undefined && patch.district !== value.district) {
      next.upazila = "";
      next.unionName = "";
      next.postalCode = "";
    }
    if (patch.upazila !== undefined && patch.upazila !== value.upazila) {
      next.unionName = "";
      next.postalCode = "";
    }
    onChange(next);
  };

  const sel = "w-full border rounded-xl px-3 py-2.5 text-sm mt-1 bg-white";

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-zinc-50 border px-3 py-2 text-xs">🇧🇩 রাষ্ট্র: <b>বাংলাদেশ</b> (সরকারি তালিকা অনুযায়ী বেছে নিন)</div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-600">বিভাগ *</label>
          <select value={value.division} onChange={(e) => set({ division: e.target.value })} className={sel} required>
            <option value="">— বিভাগ —</option>
            {divisions.map((d) => (
              <option key={d.en} value={d.en}>{d.bn} ({d.en})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-600">জেলা *</label>
          <select value={value.district} onChange={(e) => set({ district: e.target.value })} className={sel} required disabled={!value.division}>
            <option value="">— জেলা —</option>
            {districts.map((d) => (
              <option key={d.en} value={d.en}>{d.bn} ({d.en})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-600">উপজেলা / থানা *</label>
          <select value={value.upazila} onChange={(e) => set({ upazila: e.target.value })} className={sel} required disabled={!value.district}>
            <option value="">— উপজেলা —</option>
            {upazilas.map((d) => (
              <option key={d.en} value={d.en}>{d.bn} ({d.en})</option>
            ))}
          </select>
        </div>
        {showUnion && (
          <div>
            <label className="text-xs text-zinc-600">ইউনিয়ন / পৌরসভা</label>
            <select value={value.unionName} onChange={(e) => set({ unionName: e.target.value })} className={sel} disabled={!value.upazila}>
              <option value="">— ইউনিয়ন (ঐচ্ছিক) —</option>
              {unions.map((d) => (
                <option key={`${d.type}-${d.en}`} value={d.en}>{d.bn} ({d.type === "union" ? "ইউনিয়ন" : d.type === "pourashava" ? "পৌরসভা" : "সিটি"})</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-600">এলাকা / মহল্লা</label>
          <input value={value.area} onChange={(e) => set({ area: e.target.value })} placeholder="যেমন: মিরপুর ১০" className="w-full border rounded-xl px-3 py-2.5 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs text-zinc-600">পোস্টাল কোড</label>
          <input value={value.postalCode} onChange={(e) => set({ postalCode: e.target.value })} placeholder="যেমন: ১২১৬" className="w-full border rounded-xl px-3 py-2.5 text-sm mt-1" />
        </div>
      </div>
      {showDetail && (
        <div>
          <label className="text-xs text-zinc-600">বিস্তারিত ঠিকানা</label>
          <textarea value={value.address} onChange={(e) => set({ address: e.target.value })} placeholder="বাসা/হোল্ডিং, রোড, ল্যান্ডমার্ক — যেমন: বাসা ১২, রোড ৫" className="w-full border rounded-xl px-3 py-2.5 text-sm mt-1" rows={2} />
        </div>
      )}
    </div>
  );
}
