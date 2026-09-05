"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AddressSelect, { type AddressValue } from "@/components/address-select";

type Mess = { id: string; name: string; description: string | null; address: string | null; division: string | null; district: string | null; upazila: string | null; unionName: string | null; area: string | null; postalCode: string | null; contactInfo: string | null; timezone: string; costAllocation: string; mealCostingModel: string; expenseApprovalThresholdPaisa: number };

export default function SettingsForm({ mess, role }: { mess: Mess; role: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: mess.name,
    description: mess.description || "",
    contactInfo: mess.contactInfo || "",
    timezone: mess.timezone,
    costAllocation: mess.costAllocation,
    mealCostingModel: mess.mealCostingModel,
    threshold: String(mess.expenseApprovalThresholdPaisa / 100),
  });
  const [geo, setGeo] = useState<AddressValue>({
    division: mess.division || "",
    district: mess.district || "",
    upazila: mess.upazila || "",
    unionName: mess.unionName || "",
    area: mess.area || "",
    address: mess.address || "",
    postalCode: mess.postalCode || "",
  });
  const [msg, setMsg] = useState("");
  const isManager = role === "manager";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch(`/api/messes/${mess.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        address: geo.address,
        division: geo.division,
        district: geo.district,
        upazila: geo.upazila,
        unionName: geo.unionName,
        area: geo.area,
        postalCode: geo.postalCode,
        contactInfo: form.contactInfo,
        timezone: form.timezone,
        costAllocation: form.costAllocation,
        mealCostingModel: form.mealCostingModel,
        expenseApprovalThreshold: Number(form.threshold),
      }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Failed");
    else {
      setMsg("আপডেট সফল");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="bg-white border rounded-2xl p-6 space-y-4">
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="নাম" className="w-full border rounded-xl px-4 py-3 text-sm" />
      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="বিবরণ" className="w-full border rounded-xl px-4 py-3 text-sm" rows={2} />
      <div className="rounded-xl border p-4 bg-zinc-50/50">
        <div className="text-xs font-semibold mb-2">মেসের ঠিকানা</div>
        <AddressSelect value={geo} onChange={setGeo} />
      </div>
      <input value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} placeholder="যোগাযোগ" className="w-full border rounded-xl px-4 py-3 text-sm" />
      <input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="Timezone" className="w-full border rounded-xl px-4 py-3 text-sm" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-600">Cost Allocation {isManager ? "" : "(manager only)"}</label>
          <select value={form.costAllocation} onChange={(e) => setForm({ ...form, costAllocation: e.target.value })} disabled={!isManager} className="w-full border rounded-xl px-3 py-3 text-sm mt-1 disabled:bg-zinc-100">
            <option value="equal">equal</option>
            <option value="meal_proportional">meal_proportional</option>
            <option value="member_specific">member_specific</option>
            <option value="custom">custom</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-600">Costing Model {isManager ? "" : "(manager only)"}</label>
          <select value={form.mealCostingModel} onChange={(e) => setForm({ ...form, mealCostingModel: e.target.value })} disabled={!isManager} className="w-full border rounded-xl px-3 py-3 text-sm mt-1 disabled:bg-zinc-100">
            <option value="food_only">food_only</option>
            <option value="food_plus_expenses">food_plus_expenses</option>
            <option value="custom">custom</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-600">Expense Approval Threshold (BDT) {isManager ? "" : "(manager only)"}</label>
        <input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} disabled={!isManager} className="w-full border rounded-xl px-4 py-3 text-sm mt-1 disabled:bg-zinc-100" />
      </div>
      {msg && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm">{msg}</div>}
      <button className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm">Save</button>
      {!isManager && <p className="text-xs text-zinc-500 text-center">Manager ছাড়া কিছু সেটিংস পরিবর্তন করা যাবে না</p>}
    </form>
  );
}
