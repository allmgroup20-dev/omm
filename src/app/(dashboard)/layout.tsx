import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import NotificationBell from "./notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getServerDict } from "@/i18n/server";
import { DashboardMobileNav } from "@/components/mobile-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  const { t } = await getServerDict();

  return (
    <div className="min-h-screen bg-zinc-50 overflow-x-hidden">
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2 relative">
          <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white grid place-items-center font-bold text-sm shrink-0">OM</div>
            <span className="font-bold text-sm sm:text-base">OMM</span>
            <span className="text-xs text-zinc-500 hidden sm:inline truncate">omm.jobayergroup.com</span>
          </Link>
          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="px-3 py-2 rounded-full border hover:bg-zinc-50 whitespace-nowrap min-h-[44px] inline-flex items-center">{t("nav.dashboard")}</Link>
            <Link href="/profile" className="px-3 py-2 rounded-full border hover:bg-zinc-50 whitespace-nowrap min-h-[44px] inline-flex items-center">{t("nav.profile")}</Link>
            <NotificationBell />
            <ThemeToggle />
            <LocaleSwitcher />
            <Link href="/messes/new" className="px-4 py-2 rounded-full bg-zinc-900 text-white whitespace-nowrap min-h-[44px] inline-flex items-center">{t("nav.newMess")}</Link>
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
            <DashboardMobileNav userName={user.fullName} />
          </div>
        </div>
      </header>
      <ToastProvider>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">{children}</div>
      </ToastProvider>
    </div>
  );
}
