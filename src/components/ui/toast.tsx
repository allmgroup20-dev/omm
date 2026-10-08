"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { useLocale } from "@/i18n/provider";

type Toast = { id: string; message: string; type?: "success" | "error" | "info" };
const Ctx = createContext<{ push: (msg: string, type?: Toast["type"]) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { t: tr } = useLocale();
  function push(message: string, type: Toast["type"] = "info") {
    const id = Math.random().toString(36).slice(2);
    // Stacking limit: keep max 3, drop oldest; dedupe identical messages.
    setToasts((prev) => [...prev.filter((t) => t.message !== message), { id, message, type }].slice(-3));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }
  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed z-[80] left-4 right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm shadow-lg border ${t.type === "error" ? "bg-red-600 text-white border-red-700" : t.type === "success" ? "bg-emerald-600 text-white border-emerald-700" : "bg-zinc-900 text-white border-zinc-700"}`}>
            <span className="flex-1 min-w-0 break-words">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label={tr("common.dismiss")} className="shrink-0 w-11 h-11 grid place-items-center rounded-full hover:bg-white/10">✕</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("ToastProvider missing");
  return ctx;
}
