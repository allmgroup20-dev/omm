import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LocaleProvider } from "@/i18n/provider";
import { getServerLocale } from "@/i18n/server";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#18181b",
};

export const metadata: Metadata = {
  title: "OMM — Our Mess Management | omm.jobayergroup.com",
  description:
    "Production-grade Mess Management Platform — Meal, Market, Expense, Deposit, Ledger, Settlement & Reports. Built for omm.jobayergroup.com",
  openGraph: {
    title: "OMM — Our Mess Management",
    description: "Mess + Member + Market + Meal + Finance — এক জায়গায় সম্পূর্ণ মেস ব্যবস্থাপনা",
    type: "website",
  },
  robots: { index: false, follow: false }, // private app
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  return (
    <html lang={locale === "bn" ? "bn" : "en"} className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <LocaleProvider initial={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
