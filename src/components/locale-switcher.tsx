"use client";
import { useLocale } from "@/i18n/provider";

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="flex items-center border rounded-full overflow-hidden text-xs" role="group" aria-label="Language">
      <button
        onClick={() => setLocale("bn")}
        className={`px-3 py-1.5 ${locale === "bn" ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"}`}
        aria-pressed={locale === "bn"}
      >
        বাং
      </button>
      <button
        onClick={() => setLocale("en")}
        className={`px-3 py-1.5 ${locale === "en" ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"}`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}
