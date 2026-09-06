"use client";
import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";

export function DashboardMobileNav({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();
  return (
    <>
      <button
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border bg-white hover:bg-zinc-50 text-lg leading-none shrink-0"
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="lg:hidden absolute left-0 right-0 top-full border-b bg-white shadow-lg">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-2 text-sm">
            <Link onClick={() => setOpen(false)} href="/dashboard" className="px-4 py-3 rounded-xl border hover:bg-zinc-50 text-center min-h-[44px] flex items-center justify-center">{t("nav.dashboard")}</Link>
            <Link onClick={() => setOpen(false)} href="/profile" className="px-4 py-3 rounded-xl border hover:bg-zinc-50 text-center min-h-[44px] flex items-center justify-center">{t("nav.profile")}</Link>
            <Link onClick={() => setOpen(false)} href="/messes/new" className="px-4 py-3 rounded-full bg-zinc-900 text-white text-center font-medium min-h-[44px] flex items-center justify-center">{t("nav.newMess")}</Link>
            <div className="flex items-center justify-between gap-2 pt-2 border-t mt-1">
              <span className="text-xs text-zinc-600 truncate flex-1 min-w-0">{userName}</span>
              <form action="/api/auth/logout" method="post">
                <button className="border rounded-full px-4 py-2 text-sm min-h-[44px]">{t("nav.logout")}</button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

export function MarketMobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border bg-white hover:bg-zinc-50 text-lg leading-none shrink-0"
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="sm:hidden absolute left-0 right-0 top-full border-b bg-white shadow-lg">
          <nav className="px-4 py-3 flex flex-col gap-2 text-sm">
            <Link onClick={() => setOpen(false)} href="/" className="px-4 py-3 rounded-full hover:bg-zinc-50 border text-center min-h-[44px] flex items-center justify-center">হোম</Link>
            <Link onClick={() => setOpen(false)} href="/s" className="px-4 py-3 rounded-full border text-center min-h-[44px] flex items-center justify-center">সিট খুঁজুন</Link>
            <Link onClick={() => setOpen(false)} href="/s?type=flat" className="px-4 py-3 rounded-full border text-center min-h-[44px] flex items-center justify-center">ফ্ল্যাট</Link>
            <Link onClick={() => setOpen(false)} href="/dashboard" className="px-4 py-3 rounded-full bg-zinc-900 text-white text-center min-h-[44px] flex items-center justify-center">ড্যাশবোর্ড</Link>
          </nav>
        </div>
      )}
    </>
  );
}

export function HomeMobileNav() {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();
  return (
    <>
      <button
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border bg-white hover:bg-zinc-50 text-lg shrink-0"
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="lg:hidden absolute left-0 right-0 top-full border-b bg-white shadow-lg">
          <nav className="px-4 py-3 flex flex-col gap-2 text-sm">
            <Link onClick={() => setOpen(false)} href="/" className="px-4 py-3 rounded-full bg-zinc-900 text-white text-center min-h-[44px] flex items-center justify-center">{t("nav.home")}</Link>
            <Link onClick={() => setOpen(false)} href="/s" className="px-4 py-3 rounded-full border text-center min-h-[44px] flex items-center justify-center">{t("nav.findSeat")}</Link>
            <Link onClick={() => setOpen(false)} href="/s?type=flat" className="px-4 py-3 rounded-full border text-center min-h-[44px] flex items-center justify-center">{t("landing.findHome")}</Link>
            <Link onClick={() => setOpen(false)} href="/dashboard" className="px-4 py-3 rounded-full border text-center min-h-[44px] flex items-center justify-center">{t("nav.mess")}</Link>
            <Link onClick={() => setOpen(false)} href="/login" className="px-4 py-3 rounded-full border text-center min-h-[44px] flex items-center justify-center">{t("nav.login")}</Link>
            <Link onClick={() => setOpen(false)} href="/register" className="px-4 py-3 rounded-full bg-zinc-900 text-white text-center min-h-[44px] flex items-center justify-center">{t("nav.register")}</Link>
          </nav>
        </div>
      )}
    </>
  );
}
