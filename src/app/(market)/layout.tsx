import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white grid place-items-center font-bold text-sm">OM</div>
            <span className="font-bold hidden sm:inline">OMM</span>
            <span className="text-xs text-zinc-500 hidden md:inline">মেস • সিট • প্রপার্টি</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm overflow-x-auto">
            <Link href="/" className="px-3 py-1.5 rounded-full hover:bg-zinc-50 whitespace-nowrap">হোম</Link>
            <Link href="/s" className="px-3 py-1.5 rounded-full border whitespace-nowrap">সিট খুঁজুন</Link>
            <Link href="/s?type=flat" className="px-3 py-1.5 rounded-full border whitespace-nowrap">ফ্ল্যাট</Link>
            <LocaleSwitcher />
            <Link href="/dashboard" className="px-3 py-1.5 rounded-full bg-zinc-900 text-white whitespace-nowrap">ড্যাশবোর্ড</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
      <footer className="border-t bg-white mt-10">
        <div className="max-w-7xl mx-auto px-6 py-6 text-xs text-zinc-500 flex flex-wrap gap-4 justify-between">
          <span>© {new Date().getFullYear()} OMM — omm.jobayergroup.com • Bangladesh-first</span>
          <span>সিট • রুম • ফ্ল্যাট • মেস • হোস্টেল</span>
        </div>
      </footer>
    </div>
  );
}
