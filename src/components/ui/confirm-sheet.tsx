"use client";
import { useEffect } from "react";

type SheetProps = {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  /** optional third choice, e.g. leave-now vs leave-at-month-end */
  altLabel?: string;
  onAlt?: () => void;
  /** when present, shows a text/number input instead of plain confirm */
  input?: { value: string; onChange: (v: string) => void; placeholder?: string; inputMode?: "text" | "decimal" | "numeric"; required?: boolean };
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Shared bottom-sheet replacing window.confirm/prompt/alert.
 * Mobile-first: slides from bottom, 44px targets, Esc/backdrop close.
 */
export function ConfirmSheet({ open, title, body, confirmLabel, cancelLabel = "বাতিল", danger, busy, altLabel, onAlt, input, onConfirm, onClose }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const invalid = !!input?.required && !input.value.trim();
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-3 max-h-[92vh] overflow-y-auto">
        <div className="font-semibold text-[15px]">{title}</div>
        {body && <p className="text-sm text-zinc-600">{body}</p>}
        {input && (
          <input
            value={input.value}
            onChange={(e) => input.onChange(e.target.value)}
            placeholder={input.placeholder}
            inputMode={input.inputMode || "text"}
            autoFocus
            className="w-full border rounded-xl px-3 py-3 text-base min-h-[48px]"
          />
        )}
        <div className="flex gap-2">
          <button onClick={onClose} disabled={busy} className="flex-1 rounded-full border py-3 text-sm min-h-[48px] disabled:opacity-50">
            {cancelLabel}
          </button>
          {altLabel && onAlt && (
            <button onClick={onAlt} disabled={busy} className="flex-1 rounded-full border border-amber-300 bg-amber-50 py-3 text-sm min-h-[48px] disabled:opacity-50">
              {altLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={busy || invalid}
            className={`flex-1 rounded-full py-3 text-sm font-medium min-h-[48px] disabled:opacity-50 ${danger ? "bg-red-600 text-white" : "bg-zinc-900 text-white"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
