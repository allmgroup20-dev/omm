export const locales = ["bn-BD", "en-US"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "bn-BD";

export const currencyMap: Record<Locale, string> = {
  "bn-BD": "BDT",
  "en-US": "USD",
};

export const timezones = ["Asia/Dhaka", "Asia/Karachi", "Asia/Dubai", "Asia/Kolkata", "UTC"] as const;

export const messages: Record<Locale, Record<string, string>> = {
  "bn-BD": {
    "nav.home": "হোম",
    "nav.mess": "মেস",
    "nav.search": "সিট খুঁজুন",
    "nav.property": "প্রপার্টি",
    "nav.login": "লগইন",
    "nav.register": "রেজিস্ট্রেশন",
    "nav.dashboard": "ড্যাশবোর্ড",
    "nav.profile": "প্রোফাইল",
    "hero.title": "আপনার মেস, মিল ও খরচ — সব হিসাব এক জায়গায়।",
    "hero.subtitle": "বাসা খুঁজুন, সিট ভাড়া দিন, মেস পরিচালনা করুন — এক প্ল্যাটফর্মে।",
    "search.placeholder": "লোকেশন, বাজেট, সুবিধা...",
    "listing.rent": "ভাড়া",
    "listing.contact": "যোগাযোগ",
  },
  "en-US": {
    "nav.home": "Home",
    "nav.mess": "Mess",
    "nav.search": "Find Seat",
    "nav.property": "Property",
    "nav.login": "Login",
    "nav.register": "Register",
    "nav.dashboard": "Dashboard",
    "nav.profile": "Profile",
    "hero.title": "Your mess, meals & expenses — all in one place.",
    "hero.subtitle": "Find seats, list property, manage mess — one platform.",
    "search.placeholder": "Location, budget, facilities...",
    "listing.rent": "Rent",
    "listing.contact": "Contact",
  },
};

export function t(locale: Locale, key: string): string {
  return messages[locale]?.[key] || key;
}

export function formatCurrency(paisa: number, locale: Locale = defaultLocale): string {
  const currency = currencyMap[locale];
  const amount = paisa / 100;
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

export function formatNumber(num: number, locale: Locale = defaultLocale): string {
  return new Intl.NumberFormat(locale).format(num);
}
