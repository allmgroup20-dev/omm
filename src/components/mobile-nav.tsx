"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/i18n/provider";

export function DashboardMobileNav({ userName, messName, messId }: { userName: string; messName?: string; messId?: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();
  const pathname = usePathname();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open ]);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  const linkCls = (href: string) =>
    `px-4 py-3 rounded-xl border text-left min-h-[44px] flex items-center ${pathname === href ? "bg-zinc-900 text-white border-zinc-900 font-medium" : "hover:bg-zinc-50"}`;
  return (
    <>
      <button
        aria-label={t("common.actions")}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-full border bg-white hover:bg-zinc-50 text-lg leading-none shrink-0"
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      {open && (
        <div className="lg:hidden absolute left-0 right-0 top-full z-50 border-b bg-white shadow-lg max-h-[75dvh] overflow-y-auto overscroll-contain">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-2 text-sm">
            {messName && messId && (
              <div className="px-4 py-2 border-b border-zinc-100">
                <div className="text-xs text-zinc-500 mb-1">{t("nav.currentMess")}</div>
                <div className="font-medium truncate">{messName}</div>
              </div>
            )}
            <div className="px-4 pt-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{t("nav.myMesses")}</div>
            <Link onClick={() => setOpen(false)} href="/dashboard" className={linkCls("/dashboard")}>{t("nav.myMesses")}</Link>
            {messId && (
              <>
                <div className="px-4 pt-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{messName || t("nav.overview")}</div>
                <Link onClick={() => setOpen(false)} href={`/messes/${messId}`} className={linkCls(`/messes/${messId}`)}>{t("nav.overview")}</Link>
                <Link onClick={() => setOpen(false)} href={`/messes/${messId}/meals`} className={linkCls(`/messes/${messId}/meals`)}>{t("nav.todayMeals")}</Link>
                <Link onClick={() => setOpen(false)} href={`/messes/${messId}/market/entries`} className={linkCls(`/messes/${messId}/market/entries`)}>{t("nav.market")}</Link>
                <Link onClick={() => setOpen(false)} href={`/messes/${messId}/finance/dues`} className={linkCls(`/messes/${messId}/finance/dues`)}>{t("nav.money")}</Link>
                <Link onClick={() => setOpen(false)} href={`/messes/${messId}/members`} className={linkCls(`/messes/${messId}/members`)}>{t("nav.members")}</Link>
                <Link onClick={() => setOpen(false)} href={`/messes/${messId}/settlements`} className={linkCls(`/messes/${messId}/settlements`)}>{t("nav.settlements")}</Link>
              </>
            )}
            <div className="px-4 pt-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{t("nav.profile")}</div>
            <Link onClick={() => setOpen(false)} href="/profile" className={linkCls("/profile")}>{t("nav.profile")}</Link>
            <Link onClick={() => setOpen(false)} href="/notifications" className={linkCls("/notifications")}>{t("nav.notifications")}</Link>
            <Link onClick={() => setOpen(false)} href="/messes/new" className="px-4 py-3 rounded-full border text-left min-h-[44px] flex items-center">{t("nav.newMess")}</Link>
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
          <nav className="px-4 py-3 flex flex-col gap-2 text-sm">
            <Link onClick={() => setOpen(false)} href="/" className="px-4 py-3 rounded-full hover:bg-zinc-50 border text-center min-h-[44px] flex items-center justify-center">{t("nav.home")}</Link>
            <Link onClick={() => setOpen(false)} href="/s" className="px-4 py-3 rounded-full border text-center min-h-[44px] flex items-center justify-center">{t("nav.findSeat")}</Link>
            <Link onClick={() => setOpen(false)} href="/s?type=flat" className="px-4 py-3 rounded-full border text-center min-h-[44px] flex items-center justify-center">{t("landing.findHome")}</Link>
            <Link onClick={() => setOpen(false)} href="/dashboard" className="px-4 py-3 rounded-full bg-zinc-900 text-white text-center min-h-[44px] flex items-center justify-center">{t("nav.mess")}</Link>
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
