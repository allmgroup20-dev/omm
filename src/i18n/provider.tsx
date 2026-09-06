"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { COOKIE_NAME, defaultLocale, getDict, tx, type Dict, type Locale } from "./dict";

type Ctx = { locale: Locale; dict: Dict; t: (key: string) => string; setLocale: (l: Locale) => void };

const LocaleCtx = createContext<Ctx | null>(null);

function readLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const m = document.cookie.match(/(?:^|; )omm_locale=([^;]+)/);
  if (m && (m[1] === "bn" || m[1] === "en")) return m[1];
  try {
    const ls = localStorage.getItem("omm_locale");
    if (ls === "bn" || ls === "en") return ls;
  } catch {}
  return defaultLocale;
}

export function LocaleProvider({ initial, children }: { initial: Locale; children: ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initial);
  useEffect(() => {
    setLocaleState(readLocale());
  }, []);
  const setLocale = useCallback(
    (l: Locale) => {
      setLocaleState(l);
      try {
        localStorage.setItem("omm_locale", l);
      } catch {}
      document.cookie = `${COOKIE_NAME}=${l}; Path=/; Max-Age=${365 * 24 * 60 * 60}; SameSite=Lax`;
      router.refresh();
    },
    [router],
  );
  const dict = getDict(locale);
  const t = useCallback((key: string) => tx(locale, key), [locale]);
  return <LocaleCtx.Provider value={{ locale, dict, t, setLocale }}>{children}</LocaleCtx.Provider>;
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleCtx);
  if (!ctx) {
    // Fallback when provider is missing (should not happen — layout provides it)
    const dict = getDict(defaultLocale);
    return { locale: defaultLocale, dict, t: (k: string) => tx(defaultLocale, k), setLocale: () => {} };
  }
  return ctx;
}
