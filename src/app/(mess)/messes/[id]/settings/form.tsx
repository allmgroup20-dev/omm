"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AddressSelect, { type AddressValue } from "@/components/address-select";
import { useLocale } from "@/i18n/provider";

type Mess = { id: string; name: string; description: string | null; address: string | null; division: string | null; district: string | null; upazila: string | null; unionName: string | null; area: string | null; postalCode: string | null; contactInfo: string | null; timezone: string; costAllocation: string; mealCostingModel: string; expenseApprovalThresholdPaisa: number };

export default function SettingsForm({ mess, role }: { mess: Mess; role: string }) {
  const { t } = useLocale();
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
    if (!res.ok) setMsg(data.error || t("errors.saveFail"));
    else {
      setMsg(t("settings.updated"));
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="bg-white border rounded-2xl p-4 sm:p-6 space-y-4">
      <div className="space-y-3">
        <div className="text-sm font-semibold">{t("settings.basicSec")}</div>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("settings.namePh")} aria-label={t("settings.namePh")} className="w-full border rounded-xl px-4 py-3 text-base sm:text-sm min-h-[52px]" />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("settings.descPh")} aria-label={t("settings.descPh")} className="w-full border rounded-xl px-4 py-3 text-base sm:text-sm min-h-[52px]" rows={2} />
        <div className="rounded-xl border p-4 bg-zinc-50/50">
          <div className="text-xs font-semibold mb-2">{t("settings.addressTitle")}</div>
          <AddressSelect value={geo} onChange={setGeo} />
        </div>
        <input value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} placeholder={t("settings.contactPh")} aria-label={t("settings.contactPh")} className="w-full border rounded-xl px-4 py-3 text-base sm:text-sm min-h-[52px]" />
        <div>
          <label className="text-xs text-zinc-600">{t("settings.timezone")}</label>
          <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="w-full border rounded-xl px-3 py-3 text-base sm:text-sm mt-1 min-h-[52px] bg-white">
            <option value="Asia/Dhaka">{t("settings.tzDhaka")}</option>
            <option value="UTC">{t("settings.tzUtc")}</option>
          </select>
        </div>
      </div>
      <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div className="text-sm font-semibold">💰 {t("settings.moneySec")} 🔒</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-600">{t("settings.allocation")} {isManager ? "" : t("settings.managerOnly")}</label>
            <select value={form.costAllocation} onChange={(e) => setForm({ ...form, costAllocation: e.target.value })} disabled={!isManager} className="w-full border rounded-xl px-3 py-3 text-base sm:text-sm mt-1 min-h-[52px] bg-white disabled:bg-zinc-100">
              <option value="equal">{t("settings.allocEqual")}</option>
              <option value="meal_proportional">{t("settings.allocMeals")}</option>
              <option value="member_specific">{t("settings.allocMember")}</option>
              <option value="custom">{t("settings.allocCustom")}</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-600">{t("settings.costing")} {isManager ? "" : t("settings.managerOnly")}</label>
            <select value={form.mealCostingModel} onChange={(e) => setForm({ ...form, mealCostingModel: e.target.value })} disabled={!isManager} className="w-full border rounded-xl px-3 py-3 text-base sm:text-sm mt-1 min-h-[52px] bg-white disabled:bg-zinc-100">
              <option value="food_only">{t("settings.costingFood")}</option>
              <option value="food_plus_expenses">{t("settings.costingFoodPlus")}</option>
              <option value="custom">{t("settings.costingCustom")}</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-zinc-500">{t("settings.allocationHint")}</p>
        <div>
          <label className="text-xs text-zinc-600">{t("settings.threshold")} {isManager ? "" : t("settings.managerOnly")}</label>
          <input type="number" min={0} inputMode="numeric" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} disabled={!isManager} className="w-full border rounded-xl px-4 py-3 text-base sm:text-sm mt-1 min-h-[52px] disabled:bg-zinc-100" />
          <p className="text-xs text-zinc-500 mt-1">{t("settings.thresholdHint")}</p>
        </div>
      </div>
      {msg && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm">{msg}</div>}
      <button className="w-full rounded-full bg-zinc-900 text-white py-3 text-sm min-h-[48px]">{t("settings.saveBtn")}</button>
      {!isManager && <p className="text-xs text-zinc-500 text-center">{t("settings.managerNote")}</p>}
    </form>
  );
}
