import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isSuperAdmin } from "@/lib/admin";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await isSuperAdmin(user.id))) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Admin — Moderation</h1>
      <div className="grid md:grid-cols-3 gap-3">
        <Link href="/admin/listings?status=pending" className="rounded-2xl border bg-white p-5 hover:shadow-sm">
          <div className="font-semibold">Pending Listings</div>
          <div className="text-xs text-zinc-500 mt-1">Approve / Reject queue</div>
        </Link>
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold">System</div>
          <div className="text-xs text-zinc-500 mt-1">Users, Messes, Reports — least privilege</div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold">Audit</div>
          <Link href="/admin/audit" className="text-xs underline">View audit logs</Link>
        </div>
      </div>
      <p className="text-xs text-zinc-500">Admin sees only moderation queue, not private financial data unnecessarily.</p>
    </div>
  );
}
