import Link from "next/link";

export default async function MarketHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← Overview</Link>
      <h1 className="text-lg font-bold">Market Hub</h1>
      <div className="grid md:grid-cols-3 gap-3">
        <Link href={`/messes/${id}/market/dashboard`} className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">📊 Dashboard</div><div className="text-xs text-zinc-500 mt-1">আজ/সপ্তাহ/মাস, category/product wise</div>
        </Link>
        <Link href={`/messes/${id}/market/add`} className="rounded-2xl border bg-zinc-900 text-white p-5">
          <div className="font-semibold">+ বাজার এন্ট্রি</div><div className="text-xs text-white/70 mt-1">তারিখ, vendor, product × qty</div>
        </Link>
        <Link href={`/messes/${id}/market/categories`} className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">🗂 Categories</div><div className="text-xs text-zinc-500 mt-1">Hierarchical (চাল→ডাল→মাছ...)</div>
        </Link>
        <Link href={`/messes/${id}/market/products`} className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">📦 Products</div><div className="text-xs text-zinc-500 mt-1">ইলিশ, রুই, আলু, তেল...</div>
        </Link>
        <Link href={`/messes/${id}/market/vendors`} className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">🏪 Vendors</div><div className="text-xs text-zinc-500 mt-1">Shop-wise report</div>
        </Link>
      </div>
      <div className="rounded-2xl border bg-white p-4 text-sm text-zinc-600">Inventory/Stock & Waste architecture-ready — Phase 6 includes market core; stock tracking next phase if needed.</div>
    </div>
  );
}
