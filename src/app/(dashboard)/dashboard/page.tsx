import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white grid place-items-center font-bold text-sm">OM</div>
            <span className="font-bold">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-600">{user.fullName} ({user.email})</span>
            <form action="/api/auth/logout" method="post">
              <button formAction="/api/auth/logout" className="text-sm border rounded-full px-4 py-1.5">Logout</button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="font-semibold">স্বাগতম, {user.fullName}!</h2>
          <p className="text-sm text-zinc-600 mt-2">আপনি সফলভাবে লগইন করেছেন। Phase 3 Auth verified. পরবর্তী ধাপে Mess তৈরি ও মেম্বার ম্যানেজমেন্ট আসবে।</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-zinc-50 border p-4 text-center"><div className="text-xs text-zinc-500">Status</div><div className="font-semibold text-sm">{user.status}</div></div>
            <div className="rounded-xl bg-zinc-50 border p-4 text-center"><div className="text-xs text-zinc-500">Email Verified</div><div className="font-semibold text-sm">{user.emailVerified ? "Yes" : "Pending"}</div></div>
            <div className="rounded-xl bg-zinc-50 border p-4 text-center"><div className="text-xs text-zinc-500">User ID</div><div className="font-mono text-xs truncate">{user.id}</div></div>
          </div>
          <div className="mt-6">
            <Link href="/" className="text-sm underline">← হোম</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
