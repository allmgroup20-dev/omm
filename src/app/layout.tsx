import type { Metadata } from "next";
import "./globals.css";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        {children}
      </body>
    </html>
  );
}
