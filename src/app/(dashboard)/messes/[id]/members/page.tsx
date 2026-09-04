"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Member = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isPrimaryManager: boolean;
  status: string;
  joinedAt: string;
};

export default function MembersPage() {
  const { id } = useParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/messes/${id}/members`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(data.members);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [id]);

  async function updateRole(memberId: string, role: string) {
    const res = await fetch(`/api/messes/${id}/members/${memberId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    else load();
  }
  async function updateStatus(memberId: string, status: string) {
    if (!confirm(`Status → ${status} ?`)) return;
    const res = await fetch(`/api/messes/${id}/members/${memberId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    else load();
  }

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← Overview</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">সদস্য ব্যবস্থাপনা</h1>
        <Link href={`/messes/${id}/invitations`} className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm">+ আমন্ত্রণ</Link>
      </div>
      {loading ? (
        <div className="rounded-xl border bg-white p-6 text-center text-sm">লোড হচ্ছে...</div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="text-left p-3">নাম</th>
                  <th className="text-left p-3">ইমেইল</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Joined</th>
                  <th className="text-right p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3 font-medium">{m.fullName} {m.isPrimaryManager && <span className="text-xs bg-zinc-900 text-white rounded-full px-2 py-0.5">Primary</span>}</td>
                    <td className="p-3 text-xs">{m.email}</td>
                    <td className="p-3">
                      <select value={m.role} onChange={(e) => updateRole(m.id, e.target.value)} className="border rounded-full px-2 py-1 text-xs">
                        <option value="member">member</option>
                        <option value="assistant_manager">assistant_manager</option>
                        <option value="manager">manager</option>
                      </select>
                    </td>
                    <td className="p-3"><span className={`text-xs rounded-full px-2 py-1 ${m.status === "active" ? "bg-emerald-100" : m.status === "left" ? "bg-zinc-200" : "bg-amber-100"}`}>{m.status}</span></td>
                    <td className="p-3 text-xs">{m.joinedAt.slice(0, 10)}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => updateStatus(m.id, m.status === "active" ? "left" : "active")} className="text-xs border rounded-full px-3 py-1 hover:bg-zinc-50">{m.status === "active" ? "Mark Left" : "Activate"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {members.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">কোনো সদস্য নেই</div>}
          <p className="p-3 text-xs text-zinc-500">Historical records preserved — Left/Archived members never hard-deleted.</p>
        </div>
      )}
    </div>
  );
}
