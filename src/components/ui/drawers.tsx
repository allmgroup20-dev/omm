"use client";
import { useEffect } from "react";
import { useLocale } from "@/i18n/provider";

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div data-share-ignore="true" className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div className="relative w-[92%] max-w-[560px] h-full bg-white rounded-l-2xl shadow-xl flex flex-col animate-[slideIn_0.22s_ease]">
        <div className="shrink-0 border-b px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-[15px] leading-tight">{title}</div>
            {subtitle && <div className="text-xs text-zinc-500 mt-1">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="shrink-0 w-11 h-11 grid place-items-center rounded-full border bg-white hover:bg-zinc-50 text-zinc-600" aria-label={t("common.dismiss")}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
}
