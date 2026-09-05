import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Profile & Account</h1>

      <div className="bg-white border rounded-2xl p-6 flex gap-4 items-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 text-white grid place-items-center text-xl font-bold">{user.fullName.slice(0, 2).toUpperCase()}</div>
        <div>
          <div className="font-bold">{user.fullName}</div>
          <div className="text-sm text-zinc-500">{user.email} • {user.phone || "No phone"}</div>
          <div className="text-xs text-zinc-500 mt-1">ID: {user.id.slice(0, 8)} • Status: {user.status} • Verified: {user.emailVerified ? "Yes" : "Pending"}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white border rounded-2xl p-5">
          <div className="font-semibold text-sm">Security</div>
          <div className="mt-3 space-y-2 text-sm">
            <Link href="/profile/change-password" className="block border rounded-xl px-3 py-2 hover:bg-zinc-50">Change Password →</Link>
            <form action="/api/auth/logout-all" method="post">
              <button formAction="/api/auth/logout-all" className="w-full text-left border rounded-xl px-3 py-2 hover:bg-zinc-50">Logout from all devices</button>
            </form>
          </div>
        </div>
        <div className="bg-white border rounded-2xl p-5">
          <div className="font-semibold text-sm">Preferences</div>
          <div className="mt-3 text-sm text-zinc-600">Notification preferences (meal_reminder, deposit, due, settlement, approval, invitation, security) — configurable per user (coming soon: toggle per type).</div>
          <div className="mt-2 text-xs text-zinc-500">Current: all enabled (default).</div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <div className="font-semibold text-sm">Active Sessions</div>
        <p className="text-sm text-zinc-500 mt-1">Current session: {new Date().toLocaleString()} — IP tracked via loginHistory. Suspicious login detection architecture-ready (will flag new IP/device).</p>
      </div>
    </div>
  );
}
