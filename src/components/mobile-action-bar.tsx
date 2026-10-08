"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale } from "@/i18n/provider";
import { useMyRole } from "@/hooks/useMyRole";

/**
 * Sticky bottom bar (mobile only) with the daily tasks.
 * 4th slot is role-aware: managers get Dashboard (daily check),
 * members get Dues (month-end need).
 * Rendered inside the mess layout — mess home cards remain the desktop path.
 */
export function MobileActionBar() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const { canManage } = useMyRole(id || "");
  if (!id) return null;
  const fourth = canManage
    ? { href: `/messes/${id}/dashboard`, label: t("mess.qaDashboard") }
    : { href: `/messes/${id}/finance/dues`, label: t("dues.myDue") };
  const items = [
    { href: `/messes/${id}/meals`, label: t("mess.qaMealToday") },
    { href: `/messes/${id}/market/add`, label: t("mess.qaMarket") },
    { href: `/messes/${id}/finance/deposits`, label: t("mess.qaDeposit") },
    fourth,
  ];
  return (
    <nav aria-label={t("mess.dailyTitle")} className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-white/95 backdrop-blur">
      <div className="grid grid-cols-4 gap-1 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="rounded-xl px-1 py-2.5 text-center text-[11px] font-medium leading-tight hover:bg-zinc-100 min-h-[52px] flex items-center justify-center"
          >
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
