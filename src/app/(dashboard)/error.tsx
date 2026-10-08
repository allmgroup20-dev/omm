"use client";
import { useLocale } from "@/i18n/provider";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useLocale();
  return (
    <div role="alert" className="rounded-2xl border bg-red-50 border-red-200 p-6 text-center">
      <div className="text-2xl mb-1" aria-hidden="true">⚠️</div>
      <div className="font-semibold text-sm text-red-700">{t("errors.crashed")}</div>
      <div className="text-xs text-red-600 mt-1">{error.message}</div>
      <button onClick={() => reset()} className="mt-3 px-5 py-2.5 border rounded-full text-sm bg-white min-h-[44px]">{t("common.retry")}</button>
    </div>
  );
}
