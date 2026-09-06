import bn from "./bn.json";
import en from "./en.json";

export const locales = ["bn", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "bn";
export const COOKIE_NAME = "omm_locale";

/** BCP-47 tags for Intl APIs */
export const intlLocale: Record<Locale, string> = { bn: "bn-BD", en: "en-US" };

export type Dict = typeof bn;

const dicts: Record<Locale, Dict> = { bn: bn as Dict, en: en as unknown as Dict };

export function getDict(locale: Locale): Dict {
  return dicts[locale] ?? dicts.bn;
}

function lookup(obj: unknown, parts: string[]): string | null {
  let cur: unknown = obj;
  for (const p of parts) {
    if (typeof cur !== "object" || cur === null || !(p in (cur as Record<string, unknown>))) return null;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : null;
}

/** Translate dot-path key. Falls back to Bangla, then the key itself. */
export function tx(locale: Locale, key: string): string {
  return lookup(dicts[locale], key.split(".")) ?? lookup(dicts.bn, key.split(".")) ?? key;
}

/** Recursively collect all leaf key paths — used by tests to enforce BN/EN parity. */
export function leafKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj === "string") return [prefix];
  if (typeof obj !== "object" || obj === null) return [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    leafKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

export function rawDicts() {
  return { bn: bn as Dict, en: en as unknown as Dict };
}

/** Money: paisa integer → locale string. BN uses Bengali digits, EN uses Western digits. */
export function formatCurrency(paisa: number, locale: Locale = defaultLocale): string {
  const amount = paisa / 100;
  if (locale === "bn") {
    return new Intl.NumberFormat("bn-BD", { style: "currency", currency: "BDT", minimumFractionDigits: 2 }).format(amount);
  }
  const num = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return `৳${num}`;
}

export function formatNumber(num: number, locale: Locale = defaultLocale): string {
  return new Intl.NumberFormat(intlLocale[locale]).format(num);
}

export function formatDate(iso: string, locale: Locale = defaultLocale): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(intlLocale[locale], { year: "numeric", month: "short", day: "numeric" }).format(d);
}

export function formatDateBD(iso: string, locale: Locale = defaultLocale): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = new Intl.NumberFormat(intlLocale[locale], { minimumIntegerDigits: 2 }).format(d.getDate());
  const mm = new Intl.NumberFormat(intlLocale[locale], { minimumIntegerDigits: 2 }).format(d.getMonth() + 1);
  const yyyy = new Intl.NumberFormat(intlLocale[locale]).format(d.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}
