"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type Toast = { id: string; message: string; type?: "success" | "error" | "info" };
const Ctx = createContext<{ push: (msg: string, type?: Toast["type"]) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  function push(message: string, type: Toast["type"] = "info") {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-2 rounded-full text-sm shadow-lg border ${t.type === "error" ? "bg-red-600 text-white" : t.type === "success" ? "bg-emerald-600 text-white" : "bg-zinc-900 text-white"}`}>{t.message}</div>
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
