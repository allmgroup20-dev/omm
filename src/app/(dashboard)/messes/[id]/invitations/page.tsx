"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Inv = { id: string; code: string; linkToken: string; role: string; status: string; createdAt: string; email: string | null };

export default function InvitationsPage() {
  const { id } = useParams<{ id: string }>();
  const [invites, setInvites] = useState<Inv[]>([]);
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch(`/api/messes/${id}/invitations`);
    const data = await res.json();
    if (res.ok) setInvites(data.invitations);
  }
  useEffect(() => {
    load();
  }, [id]);

  async function create() {
    setLoading(true);
    setMsg("");
    const res = await fetch(`/api/messes/${id}/invitations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(`কোড: ${data.invitation.code} | লিংক: ${window.location.origin}/join?token=${data.invitation.linkToken}`);
      load();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← Overview</Link>
      <h1 className="text-lg font-bold">আমন্ত্রণ ব্যবস্থাপনা</h1>
      <div className="bg-white border rounded-2xl p-5">
        <div className="flex gap-2 items-center">
          <select value={role} onChange={(e) => setRole(e.target.value)} className="border rounded-full px-3 py-2 text-sm">
            <option value="member">member</option>
            <option value="assistant_manager">assistant_manager</option>
            <option value="manager">manager</option>
          </select>
          <button onClick={create} disabled={loading} className="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm disabled:opacity-50">Generate Invite</button>
        </div>
        {msg && <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm break-all">{msg}</div>}
        <p className="text-xs text-zinc-500 mt-2">Invite code (8 chars) + Link token (24 chars) — Email/Mobile invite architecture-ready. Copy link to share.</p>
      </div>
      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr><th className="text-left p-3">Code</th><th className="text-left p-3">Role</th><th className="text-left p-3">Status</th><th className="text-left p-3">Created</th><th className="text-left p-3">Link</th></tr>
          </thead>
          <tbody>
            {invites.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="p-3 font-mono text-xs">{inv.code}</td>
                <td className="p-3 text-xs">{inv.role}</td>
                <td className="p-3 text-xs">{inv.status}</td>
                <td className="p-3 text-xs">{inv.createdAt.slice(0, 10)}</td>
                <td className="p-3 text-xs break-all">/join?token={inv.linkToken}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {invites.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">কোনো আমন্ত্রণ নেই</div>}
      </div>
    </div>
  );
}
