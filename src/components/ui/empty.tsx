"use client";
import { useLocale } from "@/i18n/provider";

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-6 sm:p-10 text-center">
      {icon && <div className="text-3xl mb-2" aria-hidden="true">{icon}</div>}
      <div className="font-semibold text-[15px]">{title}</div>
      {description && <div className="text-sm text-zinc-500 mt-1">{description}</div>}
      {action && <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">{action}</div>}
    </div>
  );
}
export function LoadingState({ text }: { text?: string }) {
  const { t } = useLocale();
  return <div role="status" className="rounded-2xl border bg-white p-6 sm:p-10 text-center text-sm text-zinc-500 animate-pulse">{text ?? t("common.loading")}</div>;
}
export function ErrorState({ error, retry }: { error: string; retry?: () => void }) {
  const { t } = useLocale();
  return (
    <div role="alert" className="rounded-2xl border bg-red-50 border-red-200 p-6 text-center">
      <div className="text-2xl mb-1" aria-hidden="true">⚠️</div>
      <div className="text-sm text-red-700">{error}</div>
      {retry && <button onClick={retry} className="mt-3 px-5 py-2.5 border rounded-full text-sm bg-white min-h-[44px]">{t("common.retry")}</button>}
    </div>
  );
}
