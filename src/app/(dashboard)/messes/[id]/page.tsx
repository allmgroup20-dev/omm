import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messes, messMembers, mealTypes, invitations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function MessOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await getRequestDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) notFound();
  const mess = await db.select().from(messes).where(eq(messes.id, id)).limit(1);
  if (!mess[0]) notFound();
  const m = mess[0];
  const members = await db.select().from(messMembers).where(eq(messMembers.messId, id));
  const meals = await db.select().from(mealTypes).where(eq(mealTypes.messId, id));
  const invites = await db.select().from(invitations).where(eq(invitations.messId, id));

  return (
    <div className="space-y-4">
      <Link href="/dashboard" className="text-sm text-zinc-500">← সব মেস</Link>
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{m.name}</h1>
            <p className="text-xs text-zinc-500">{m.code} • {m.startDate} • {m.timezone}</p>
            <p className="text-sm text-zinc-600 mt-2">{m.description || "কোনো বিবরণ নেই"}</p>
          </div>
          <span className={`text-xs rounded-full px-3 py-1 ${access[0].role === "manager" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>{access[0].role}</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-zinc-50 border p-3"><div className="text-xs text-zinc-500">সদস্য</div><div className="font-bold">{members.length}</div></div>
          <div className="rounded-xl bg-zinc-50 border p-3"><div className="text-xs text-zinc-500">Meal Types</div><div className="font-bold">{meals.map((x) => x.name).join(", ")}</div></div>
          <div className="rounded-xl bg-zinc-50 border p-3"><div className="text-xs text-zinc-500">Invites</div><div className="font-bold">{invites.filter((x) => x.status === "active").length}</div></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/messes/${id}/members`} className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm">সদস্য দেখুন</Link>
          <Link href={`/messes/${id}/invitations`} className="px-4 py-2 rounded-full border bg-white text-sm">আমন্ত্রণ</Link>
          <Link href={`/messes/${id}/settings`} className="px-4 py-2 rounded-full border bg-white text-sm">সেটিংস</Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold">Meal Calendar</h2>
        <p className="text-xs text-zinc-500 mt-1">প্রতিটি মেসের মিল কাঠামো স্বাধীন — {meals.length} বেলা, precision {m.defaultMealPrecision === 50 ? "0.5" : "1"}</p>
        <div className="mt-3 flex gap-2 flex-wrap">
          {meals.map((mt) => (
            <span key={mt.id} className="border rounded-full px-3 py-1 text-xs bg-zinc-50">{mt.name}</span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <h3 className="text-sm font-semibold">Quick Actions</h3>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <Link href={`/messes/${id}/members`} className="border rounded-xl p-3 text-center hover:bg-zinc-50">+ সদস্য/আমন্ত্রণ</Link>
          <span className="border rounded-xl p-3 text-center text-zinc-400">+ মিল (Phase 5)</span>
          <span className="border rounded-xl p-3 text-center text-zinc-400">+ বাজার (Phase 6)</span>
          <span className="border rounded-xl p-3 text-center text-zinc-400">+ জমা (Phase 8)</span>
        </div>
      </div>
    </div>
  );
}
