import { cookies } from "next/headers";
import { defaultLocale, getDict, locales, type Dict, type Locale } from "./dict";

export async function getServerLocale(): Promise<Locale> {
  try {
    const jar = await cookies();
    const v = jar.get("omm_locale")?.value;
    if ((locales as readonly string[]).includes(v || "")) return v as Locale;
  } catch {
    /* no cookie store (build) */
  }
  return defaultLocale;
}

export async function getServerDict(): Promise<{ locale: Locale; t: (key: string) => string; dict: Dict }> {
  const locale = await getServerLocale();
  const dict = getDict(locale);
  return { locale, dict, t: (key: string) => key.split(".").reduce<unknown>((o, p) => (typeof o === "object" && o !== null ? (o as Record<string, unknown>)[p] : undefined), dict) as string };
}
