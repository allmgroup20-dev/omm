import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import NotificationBell from "./notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getServerDict } from "@/i18n/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  const { t } = await getServerDict();

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white grid place-items-center font-bold text-sm">OM</div>
            <span className="font-bold">OMM</span>
            <span className="text-xs text-zinc-500 hidden sm:inline">omm.jobayergroup.com</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="px-3 py-1.5 rounded-full border hover:bg-zinc-50">{t("nav.dashboard")}</Link>
            <Link href="/profile" className="px-3 py-1.5 rounded-full border hover:bg-zinc-50">{t("nav.profile")}</Link>
            <NotificationBell />
            <ThemeToggle />
            <LocaleSwitcher />
            <Link href="/messes/new" className="px-3 py-1.5 rounded-full bg-zinc-900 text-white">{t("nav.newMess")}</Link>
            <span className="text-zinc-600 hidden md:inline">{user.fullName}</span>
            <form action="/api/auth/logout" method="post">
              <button className="border rounded-full px-3 py-1.5">{t("nav.logout")}</button>
            </form>
          </nav>
        </div>
      </header>
      <ToastProvider>
        <div className="max-w-7xl mx-auto px-6 py-6">{children}</div>
      </ToastProvider>
    </div>
  );
}
