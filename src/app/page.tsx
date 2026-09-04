import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white grid place-items-center font-bold">OM</div>
            <div>
              <div className="font-bold leading-none">OMM</div>
              <div className="text-xs text-zinc-500">omm.jobayergroup.com</div>
            </div>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-full border hover:bg-zinc-50">
              লগইন
            </Link>
            <Link href="/register" className="text-sm font-medium px-5 py-2 rounded-full bg-zinc-900 text-white hover:bg-black">
              মেস তৈরি করুন
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase bg-white border rounded-full px-3 py-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Production-Ready • Phase 1 Live
            </div>
            <h1 className="mt-4 text-4xl lg:text-[44px] font-bold leading-tight tracking-tight">
              মেসের সব হিসাব
              <br />
              <span className="text-zinc-500">এক জায়গায়, নির্ভুলভাবে</span>
            </h1>
            <p className="mt-4 text-zinc-600 leading-relaxed max-w-xl">
              Our Mess Management (OMM) — সদস্য, মিল, বাজার, খরচ, জমা, বকেয়া, Meal Rate, Ledger, Settlement ও রিপোর্ট — একটিই প্ল্যাটফর্ম। কোনো Excel বা ক্যালকুলেটর লাগবে না।
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="px-6 py-3 rounded-full bg-zinc-900 text-white font-medium hover:bg-black">
                মেস তৈরি করুন →
              </Link>
              <Link href="/join" className="px-6 py-3 rounded-full border bg-white font-medium hover:bg-zinc-50">
                মেসে যোগ দিন
              </Link>
              <Link href="/login" className="px-6 py-3 rounded-full border bg-white font-medium hover:bg-zinc-50">
                লগইন
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
              <span>✓ Multi-Mess</span> <span>•</span> <span>✓ Custom Meal Slots</span> <span>•</span> <span>✓ Audit Log</span> <span>•</span> <span>✓ Paisa-Safe</span>
            </div>
          </div>
          <div className="bg-white border rounded-[28px] p-6 shadow-sm">
            <div className="text-sm font-semibold">কীভাবে কাজ করে</div>
            <ol className="mt-4 space-y-3 text-sm">
              {[
                "Register → Mess তৈরি → Meal Type কনফিগার",
                "সদস্য আমন্ত্রণ (লিংক/কোড/ইমেইল)",
                "প্রতিদিনের মিল + বাজার + খরচ এন্ট্রি",
                "জমা/Deposit ও Ledger স্বয়ংক্রিয়",
                "মাস শেষে Meal Rate → Settlement → Month Close",
              ].map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-zinc-900 text-white grid place-items-center text-xs font-bold shrink-0">{i + 1}</span>
                  <span className="pt-1 text-zinc-700">{t}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                { k: "Meal", v: "০.৫ নির্ভুল" },
                { k: "Finance", v: "পয়সা-safe" },
                { k: "Isolation", v: "Mess-wise" },
              ].map((s) => (
                <div key={s.k} className="rounded-2xl bg-zinc-50 border p-3">
                  <div className="text-xs text-zinc-500">{s.k}</div>
                  <div className="font-semibold text-sm">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white border-y">
          <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-6">
            {[
              { title: "Meal Management", desc: "১/২/৩ বেলা বা Custom slot, Bulk entry, Correction audit, Lock, Leap-year calendar" },
              { title: "Market & Expense", desc: "Category → Product hierarchy, Unit (kg/l/pcs), Vendor, Approval, Receipt R2" },
              { title: "Finance & Ledger", desc: "Deposit, Due/Advance, Member Ledger, Cost allocation, Settlement, Reconciliation" },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border p-5">
                <div className="font-semibold">{f.title}</div>
                <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Status */}
        <section className="max-w-6xl mx-auto px-6 py-10">
          <div className="rounded-2xl border bg-amber-50 p-4 text-sm">
            <span className="font-semibold">Phase 1 — Architecture Ready:</span> Next.js 16 + Drizzle + D1 (local SQLite), Wrangler bindings, Paisa-safe money lib, Calendar (leap-year), Auth scaffolding. Phase 2 (Full DB Schema) পরবর্তী ধাপে।
          </div>
        </section>
      </main>

      <footer className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-zinc-500 flex flex-col md:flex-row gap-2 justify-between">
          <span>© {new Date().getFullYear()} Jobayer Group — omm.jobayergroup.com</span>
          <span>Secure • Audited • Tenant-Isolated</span>
        </div>
      </footer>
    </div>
  );
}
