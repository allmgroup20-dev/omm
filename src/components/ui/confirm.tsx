"use client";
import { useState } from "react";

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<{ title: string; description?: string; confirmText?: string; onConfirm: () => void } | null>(null);

  function confirm(o: { title: string; description?: string; confirmText?: string; onConfirm: () => void }) {
    setOpts(o);
    setOpen(true);
  }

  function ConfirmDialog() {
    if (!open || !opts) return null;
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
          <div className="font-semibold">{opts.title}</div>
          {opts.description && <div className="text-sm text-zinc-600 mt-1">{opts.description}</div>}
          <div className="flex gap-2 justify-end mt-4">
            <button onClick={() => setOpen(false)} className="px-4 py-2 border rounded-full text-sm">Cancel</button>
            <button onClick={() => { opts.onConfirm(); setOpen(false); }} className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm">{opts.confirmText || "Confirm"}</button>
          </div>
        </div>
      </div>
    );
  }

  return { confirm, ConfirmDialog };
}
