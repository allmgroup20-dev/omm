import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messes, messMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await getRequestDb();
  const rows = await db.select({ mess: messes, member: messMembers }).from(messMembers).innerJoin(messes, eq(messMembers.messId, messes.id)).where(eq(messMembers.userId, user.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">আপনার মেসসমূহ</h1>
        <div className="flex gap-2">
          <Link href="/join" className="px-4 py-2 rounded-full border bg-white text-sm">কোড দিয়ে যোগ দিন</Link>
          <Link href="/messes/new" className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm">+ নতুন মেস</Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <p className="font-medium">কোনো মেস নেই</p>
          <p className="text-sm text-zinc-500 mt-1">নতুন মেস তৈরি করুন বা আমন্ত্রণ কোড দিয়ে যোগ দিন।</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/messes/new" className="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm">মেস তৈরি করুন</Link>
            <Link href="/join" className="px-5 py-2 rounded-full border bg-white text-sm">যোগ দিন</Link>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => (
            <Link key={r.mess.id} href={`/messes/${r.mess.id}`} className="rounded-2xl border bg-white p-5 hover:shadow-sm transition">
              <div className="flex items-center justify-between">
                <span className="text-xs border rounded-full px-2 py-1 bg-zinc-50">{r.mess.code}</span>
                <span className={`text-xs rounded-full px-2 py-1 ${r.member.role === "manager" ? "bg-zinc-900 text-white" : r.member.role === "assistant_manager" ? "bg-amber-100" : "bg-zinc-100"}`}>{r.member.role}</span>
              </div>
              <div className="font-semibold mt-3">{r.mess.name}</div>
              <div className="text-xs text-zinc-500 mt-1">{r.mess.address || "ঠিকানা নেই"} • {r.mess.startDate}</div>
              <div className="text-xs text-zinc-600 mt-2">Role: {r.member.role} • Status: {r.member.status}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="rounded-2xl border bg-white p-5">
        <div className="text-sm font-semibold">অ্যাকাউন্ট</div>
        <div className="text-xs text-zinc-500 mt-1">{user.fullName} • {user.email} • {user.phone || "ফোন নেই"}</div>
      </div>
    </div>
  );
}
