"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Member = {
  id: string;
  userId: string | null;
  displayName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  isPrimaryManager: boolean;
  status: string;
  isPlaceholder: boolean;
  claimedAt: string | null;
  joinedAt: string;
};

type FoundUser = { id: string; fullName: string; email: string; phone: string | null };

export default function MembersPage() {
  const { id } = useParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [linkFor, setLinkFor] = useState<Member | null>(null);
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<FoundUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState("");

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

  async function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setMsg("");
    try {
      const res = await fetch(`/api/messes/${id}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: newName.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewName("");
      setShowAdd(false);
      setMsg("সদস্য যোগ হয়েছে — অ্যাকাউন্ট ছাড়াই। পরে অ্যাকাউন্ট যুক্ত করা যাবে।");
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setAdding(false);
    }
  }

  async function searchUsers() {
    if (search.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(search.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFound(data.users);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function linkAccount(userId: string) {
    if (!linkFor) return;
    if (!confirm(`"${linkFor.displayName}" → এই অ্যাকাউন্টের সাথে যুক্ত করবেন? আগের সব হিসাব একই থাকবে।`)) return;
    try {
      const res = await fetch(`/api/messes/${id}/members/${linkFor.id}/link`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLinkFor(null);
      setSearch("");
      setFound([]);
      setMsg("অ্যাকাউন্ট যুক্ত হয়েছে — আগের হিসাব অক্ষত আছে।");
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function unlinkAccount(m: Member) {
    if (!confirm(`"${m.displayName}" থেকে অ্যাকাউন্ট সরাবেন? হিসাব মুছবে না।`)) return;
    try {
      const res = await fetch(`/api/messes/${id}/members/${m.id}/unlink`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Manager correction" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg("অ্যাকাউন্ট সরানো হয়েছে।");
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← Overview</Link>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold">সদস্য ব্যবস্থাপনা</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd((v) => !v)} className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm">+ সদস্য যোগ</button>
          <Link href={`/messes/${id}/invitations`} className="px-4 py-2 rounded-full border bg-white text-sm">+ আমন্ত্রণ</Link>
        </div>
      </div>
      {msg && <div className="rounded-xl border bg-white p-3 text-sm">{msg}</div>}

      {showAdd && (
        <form onSubmit={quickAdd} className="bg-white border rounded-2xl p-4 flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="সদস্যের নাম লিখুন (অ্যাকাউন্ট ছাড়াই যোগ হবে)" className="flex-1 border rounded-full px-4 py-2 text-sm" minLength={2} maxLength={80} required />
          <button disabled={adding} className="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm disabled:opacity-50">{adding ? "..." : "যোগ করুন"}</button>
        </form>
      )}

      {linkFor && (
        <div className="bg-white border rounded-2xl p-4 space-y-3">
          <div className="font-medium text-sm">"{linkFor.displayName}" → অ্যাকাউন্ট যুক্ত করুন</div>
          <div className="flex gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ইমেইল/নাম/ফোন দিয়ে খুঁজুন (কমপক্ষে ২ অক্ষর)" className="flex-1 border rounded-full px-4 py-2 text-sm" />
            <button onClick={searchUsers} disabled={searching} className="px-4 py-2 rounded-full border text-sm disabled:opacity-50">খুঁজুন</button>
            <button onClick={() => { setLinkFor(null); setFound([]); setSearch(""); }} className="px-4 py-2 rounded-full border text-sm">বাতিল</button>
          </div>
          {found.map((u) => (
            <div key={u.id} className="flex items-center justify-between border rounded-xl px-3 py-2">
              <div className="text-sm"><b>{u.fullName}</b> <span className="text-xs text-zinc-500">{u.email}{u.phone ? ` • ${u.phone}` : ""}</span></div>
              <button onClick={() => linkAccount(u.id)} className="text-xs bg-zinc-900 text-white rounded-full px-3 py-1.5">যুক্ত করুন</button>
            </div>
          ))}
          {search && !searching && found.length === 0 && <div className="text-xs text-zinc-500">কিছু পাওয়া যায়নি — ওই ব্যক্তিকে আগে রেজিস্টার করতে বলুন।</div>}
        </div>
      )}

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
                    <td className="p-3 font-medium">
                      {m.fullName} {m.isPrimaryManager && <span className="text-xs bg-zinc-900 text-white rounded-full px-2 py-0.5">Primary</span>}
                      {m.isPlaceholder && <span className="ml-1 text-xs bg-amber-100 rounded-full px-2 py-0.5">অ্যাকাউন্ট নেই</span>}
                    </td>
                    <td className="p-3 text-xs">{m.email || "—"}</td>
                    <td className="p-3">
                      <select value={m.role} onChange={(e) => updateRole(m.id, e.target.value)} className="border rounded-full px-2 py-1 text-xs">
                        <option value="member">member</option>
                        <option value="assistant_manager">assistant_manager</option>
                        <option value="manager">manager</option>
                      </select>
                    </td>
                    <td className="p-3"><span className={`text-xs rounded-full px-2 py-1 ${m.status === "active" ? "bg-emerald-100" : m.status === "left" ? "bg-zinc-200" : "bg-amber-100"}`}>{m.status}</span></td>
                    <td className="p-3 text-xs">{m.joinedAt.slice(0, 10)}</td>
                    <td className="p-3 text-right flex gap-1 justify-end flex-wrap">
                      {m.isPlaceholder ? (
                        <button onClick={() => setLinkFor(m)} className="text-xs border rounded-full px-3 py-1 bg-amber-50">অ্যাকাউন্ট যুক্ত</button>
                      ) : m.claimedAt ? (
                        <button onClick={() => unlinkAccount(m)} className="text-xs border rounded-full px-3 py-1">আনলিংক</button>
                      ) : null}
                      <button onClick={() => updateStatus(m.id, m.status === "active" ? "left" : "active")} className="text-xs border rounded-full px-3 py-1 hover:bg-zinc-50">{m.status === "active" ? "Mark Left" : "Activate"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {members.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">কোনো সদস্য নেই</div>}
          <p className="p-3 text-xs text-zinc-500">Historical records preserved — Left/Archived members never hard-deleted. Placeholder-দের মিল/জমা হিসাব অ্যাকাউন্ট যুক্ত হলেও একই থাকে।</p>
        </div>
      )}
    </div>
  );
}
