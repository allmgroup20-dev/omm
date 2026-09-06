import Link from "next/link";
import { getRequestDb } from "@/db";
import { listings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getServerDict } from "@/i18n/server";
import { formatCurrency, formatNumber, type Locale } from "@/i18n/dict";
import { LocaleSwitcher } from "@/components/locale-switcher";

export const revalidate = 60; // ISR 60s for popular listings

export default async function HomePage() {
  const { t, locale } = await getServerDict();
  let popular: typeof listings.$inferSelect[] = [];
  try {
    const db = await getRequestDb();
    popular = await db.select().from(listings).where(eq(listings.status, "published")).orderBy(desc(listings.publishedAt)).limit(6);
  } catch {}

  const typeName = (code: string) => t(`types.${code}`);
  const year = formatNumber(new Date().getFullYear(), locale as Locale);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white grid place-items-center font-bold">OM</div>
            <div className="hidden sm:block">
              <div className="font-bold leading-none">OMM</div>
              <div className="text-xs text-zinc-500">omm.jobayergroup.com</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1 text-sm overflow-x-auto">
            <Link href="/" className="px-3 py-1.5 rounded-full bg-zinc-900 text-white whitespace-nowrap">{t("nav.home")}</Link>
            <Link href="/s" className="px-3 py-1.5 rounded-full border hover:bg-zinc-50 whitespace-nowrap">{t("nav.findSeat")}</Link>
            <Link href="/s?type=flat" className="px-3 py-1.5 rounded-full border hover:bg-zinc-50 whitespace-nowrap hidden sm:inline">{t("landing.findHome")}</Link>
            <Link href="/dashboard" className="px-3 py-1.5 rounded-full border hover:bg-zinc-50 whitespace-nowrap">{t("nav.mess")}</Link>
            <Link href="/login" className="px-3 py-1.5 rounded-full border hover:bg-zinc-50 whitespace-nowrap">{t("nav.login")}</Link>
            <Link href="/register" className="px-4 py-1.5 rounded-full bg-zinc-900 text-white whitespace-nowrap">{t("nav.register")}</Link>
            <LocaleSwitcher />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 py-10 lg:py-16">
          <div className="rounded-[32px] border bg-white p-6 lg:p-10">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase bg-zinc-900 text-white rounded-full px-3 py-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> {t("landing.badge")}
            </div>
            <h1 className="mt-4 text-3xl lg:text-[42px] font-bold leading-tight tracking-tight">
              {t("landing.title1")}<br />
              <span className="text-zinc-500">{t("landing.title2")}</span>
            </h1>
            <p className="mt-3 text-zinc-600 max-w-2xl">{t("landing.desc")}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard" className="px-6 py-3 rounded-full bg-zinc-900 text-white text-sm font-medium">{t("landing.manageMess")}</Link>
              <Link href="/s" className="px-6 py-3 rounded-full border bg-white text-sm font-medium">{t("landing.findSeat")}</Link>
              <Link href="/s?type=flat" className="px-6 py-3 rounded-full border bg-white text-sm font-medium">{t("landing.findHome")}</Link>
            </div>

            {/* Quick Search */}
            <div className="mt-8 rounded-2xl border bg-zinc-50 p-4">
              <div className="text-xs font-semibold mb-2">{t("landing.quickSearch")}</div>
              <form action="/s" method="get" className="flex flex-col md:flex-row gap-2">
                <select name="type" className="border rounded-full px-4 py-2 text-sm bg-white">
                  <option value="">{t("landing.searchTypeSeat")}</option>
                  <option value="seat">{t("types.seat")}</option>
                  <option value="room">{t("types.room")}</option>
                  <option value="flat">{t("types.flat")}</option>
                </select>
                <input name="district" placeholder={t("landing.locationPh")} className="flex-1 border rounded-full px-4 py-2 text-sm" />
                <input name="rentMax" placeholder={t("landing.budgetPh")} type="number" className="border rounded-full px-4 py-2 text-sm w-32" />
                <button type="submit" className="px-6 py-2 rounded-full bg-zinc-900 text-white text-sm">{t("landing.searchBtn")}</button>
              </form>
              <div className="flex gap-2 mt-2 text-xs text-zinc-500 flex-wrap">
                <span>{t("landing.popular")}</span>
                <Link href="/s?district=ঢাকা&area=মিরপুর" className="underline">মিরপুর</Link>
                <Link href="/s?district=ঢাকা&area=ধানমন্ডি" className="underline">ধানমন্ডি</Link>
                <Link href="/s?district=ঢাকা&area=উত্তরা" className="underline">উত্তরা</Link>
                <Link href="/s?district=চট্টগ্রাম" className="underline">চট্টগ্রাম</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Seats */}
        <section className="max-w-7xl mx-auto px-6 pb-10">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{t("landing.popularSeats")}</h2>
            <Link href="/s" className="text-sm underline">{t("landing.seeAll")}</Link>
          </div>
          {popular.length === 0 ? (
            <div className="mt-4 rounded-2xl border bg-white p-10 text-center">
              <div className="text-sm font-medium">{t("landing.noListings")}</div>
              <div className="text-xs text-zinc-500 mt-1">{t("landing.noListingsDesc")}</div>
              <Link href="/dashboard" className="inline-block mt-3 px-4 py-1.5 border rounded-full text-sm">{t("landing.createListing")}</Link>
            </div>
          ) : (
            <div className="mt-4 grid md:grid-cols-3 gap-4">
              {popular.map((l) => (
                <Link key={l.id} href={`/listings/${l.slug}`} className="rounded-2xl border bg-white overflow-hidden hover:shadow-sm">
                  <div className="h-36 bg-zinc-100 grid place-items-center text-xs text-zinc-400">{t("listing.noPhoto")}</div>
                  <div className="p-4">
                    <div className="font-medium text-sm line-clamp-1">{l.title}</div>
                    <div className="text-xs text-zinc-500 mt-1">{[l.district, l.area].filter(Boolean).join(", ")} • {typeName(l.type)}</div>
                    <div className="font-bold mt-2">{formatCurrency(l.pricePaisa, locale as Locale)} <span className="text-xs font-normal">{t("search.perMonth")}</span></div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* How it works + Features */}
        <section className="bg-white border-y">
          <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border p-5">
              <div className="font-semibold">{t("landing.feat1T")}</div>
              <p className="text-sm text-zinc-600 mt-2">{t("landing.feat1D")}</p>
            </div>
            <div className="rounded-2xl border p-5">
              <div className="font-semibold">{t("landing.feat2T")}</div>
              <p className="text-sm text-zinc-600 mt-2">{t("landing.feat2D")}</p>
            </div>
            <div className="rounded-2xl border p-5">
              <div className="font-semibold">{t("landing.feat3T")}</div>
              <p className="text-sm text-zinc-600 mt-2">{t("landing.feat3D")}</p>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-8">
          <div className="rounded-2xl border bg-zinc-900 text-white p-6 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div>
              <div className="font-bold">{t("landing.ctaTitle")}</div>
              <div className="text-sm text-white/70">{t("landing.ctaDesc")}</div>
            </div>
            <div className="flex gap-2">
              <Link href="/register" className="px-6 py-2 rounded-full bg-white text-zinc-900 text-sm font-medium">{t("landing.ctaCreate")}</Link>
              <Link href="/s" className="px-6 py-2 rounded-full border border-white text-white text-sm">{t("landing.findSeat")}</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-zinc-500 flex flex-col md:flex-row gap-2 justify-between">
          <span>© {year} Jobayer Group — omm.jobayergroup.com</span>
          <span>{t("landing.footerSecure")}</span>
        </div>
      </footer>
    </div>
  );
}
