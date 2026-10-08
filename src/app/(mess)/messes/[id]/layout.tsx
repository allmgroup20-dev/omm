import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messes, messMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import NotificationBell from "@/app/(dashboard)/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getServerDict } from "@/i18n/server";
import { DashboardMobileNav } from "@/components/mobile-nav";
import { MobileActionBar } from "@/components/mobile-action-bar";

export default async function MessLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  const { t } = await getServerDict();
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) notFound();
  const mess = await db.select().from(messes).where(eq(messes.id, id)).limit(1);
  if (!mess[0]) notFound();
  const m = mess[0];

  return (
    <div className="min-h-screen bg-zinc-50 overflow-x-hidden">
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2 relative">
          <Link href={`/messes/${id}`} className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white grid place-items-center font-bold text-sm shrink-0">OM</div>
            <span className="font-bold text-sm sm:text-base">{m.name}</span>
            <span className="text-xs text-zinc-500 hidden sm:inline truncate">{m.code}</span>
          </Link>
          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-2 text-sm">
            <Link href={`/messes/${id}`} className="px-3 py-2 rounded-full border hover:bg-zinc-50 whitespace-nowrap min-h-[44px] inline-flex items-center">{t("nav.overview")}</Link>
            <Link href={`/messes/${id}/market/entries`} className="px-3 py-2 rounded-full border hover:bg-zinc-50 whitespace-nowrap min-h-[44px] inline-flex items-center">{t("nav.market")}</Link>
            <Link href={`/messes/${id}/finance/dues`} className="px-3 py-2 rounded-full border hover:bg-zinc-50 whitespace-nowrap min-h-[44px] inline-flex items-center">{t("nav.money")}</Link>
            <Link href={`/messes/${id}/members`} className="px-3 py-2 rounded-full border hover:bg-zinc-50 whitespace-nowrap min-h-[44px] inline-flex items-center">{t("nav.members")}</Link>
            <Link href={`/messes/${id}/settlements`} className="px-3 py-2 rounded-full border hover:bg-zinc-50 whitespace-nowrap min-h-[44px] inline-flex items-center">{t("nav.settlements")}</Link>
            <NotificationBell />
            <ThemeToggle />
            <LocaleSwitcher />
            <span className="text-zinc-600 hidden xl:inline truncate max-w-[120px]">{user.fullName}</span>
            <form action="/api/auth/logout" method="post">
              <button className="border rounded-full px-4 py-2 min-h-[44px]">{t("nav.logout")}</button>
            </form>
          </nav>
          {/* Mobile: visible controls + hamburger */}
          <div className="flex lg:hidden items-center gap-1.5">
            <NotificationBell />
            <ThemeToggle />
            <LocaleSwitcher />
            <DashboardMobileNav userName={user.fullName} messName={m.name} messId={m.id} />
          </div>
        </div>
      </header>
      <ToastProvider>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 lg:pb-6">{children}</div>
      </ToastProvider>
      <MobileActionBar />
    </div>
  );
}