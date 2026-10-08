"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { useMyRole } from "@/hooks/useMyRole";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";

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
  const { t } = useLocale();
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
  const [joinRequests, setJoinRequests] = useState<{ id: string; userId: string; status: string; requestedAt: string }[]>([]);
  const { role: myRole, isPrimary } = useMyRole(id);
  const privileged = myRole === "manager" || isPrimary;
  const [confirmState, setConfirmState] = useState<null | { kind: "status"; memberId: string; status: string } | { kind: "link"; userId: string } | { kind: "unlink"; member: Member }>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  async function loadJoinRequests() {
    const res = await fetch(`/api/messes/${id}/join-requests`).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      setJoinRequests(data.requests || []);
    }
  }

  async function handleJoinRequest(reqId: string, action: "approve" | "reject") {
    const res = await fetch(`/api/messes/${id}/join-requests/${reqId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(action === "approve" ? "Approved" : "Rejected");
      load();
      loadJoinRequests();
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/messes/${id}/members`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(data.members);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.loadFail"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    loadJoinRequests();
  }, [id]);

  async function updateRole(memberId: string, role: string) {
    const res = await fetch(`/api/messes/${id}/members/${memberId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else load();
  }
  function askStatus(memberId: string, status: string) {
    setConfirmState({ kind: "status", memberId, status });
  }
  async function doStatus(monthEnd: boolean) {
    const target = confirmState;
    if (!target || target.kind !== "status") return;
    const body: Record<string, string> = { status: target.status };
    if (target.status === "left" && monthEnd) {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      body.leftAt = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    }
    setConfirmBusy(true);
    const res = await fetch(`/api/messes/${id}/members/${target.memberId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setConfirmBusy(false);
    if (!res.ok) setMsg(data.error);
    else {
      setConfirmState(null);
      load();
    }
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
      setMsg(t("members.addedMsg"));
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : t("errors.saveFail"));
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
      setMsg(err instanceof Error ? err.message : t("errors.loadFail"));
    } finally {
      setSearching(false);
    }
  }

  async function linkAccount(userId: string) {
    if (!linkFor) return;
    setConfirmState({ kind: "link", userId });
  }

  async function confirmLink() {
    const target = confirmState;
    if (!target || target.kind !== "link" || !linkFor) return;
    setConfirmBusy(true);
    try {
      const res = await fetch(`/api/messes/${id}/members/${linkFor.id}/link`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: target.userId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLinkFor(null);
      setSearch("");
      setFound([]);
      setMsg(t("members.linkedMsg"));
      setConfirmState(null);
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : t("errors.saveFail"));
    } finally {
      setConfirmBusy(false);
    }
  }

  async function unlinkAccount(m: Member) {
    setConfirmState({ kind: "unlink", member: m });
  }

  async function confirmUnlink() {
    const target = confirmState;
    if (!target || target.kind !== "unlink") return;
    setConfirmBusy(true);
    try {
      const res = await fetch(`/api/messes/${id}/members/${target.member.id}/unlink`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(t("members.unlinkedMsg"));
      setConfirmState(null);
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : t("errors.saveFail"));
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">{t("members.backOverview")}</Link>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold">{t("members.title")}</h1>
        <div className="flex gap-2">
          {privileged && <button onClick={() => setShowAdd((v) => !v)} className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm min-h-[44px]">{t("members.addMember")}</button>}
          {privileged && <Link href={`/messes/${id}/invitations`} className="px-4 py-2 rounded-full border bg-white text-sm min-h-[44px] inline-flex items-center">{t("members.invite")}</Link>}
        </div>
      </div>
      {msg && <div className="rounded-xl border bg-white p-3 text-sm">{msg}</div>}

      {showAdd && (
        <form onSubmit={quickAdd} className="bg-white border rounded-2xl p-4 flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("members.addPh")} className="flex-1 border rounded-full px-4 py-2 text-sm" minLength={2} maxLength={80} required />
          <button disabled={adding} className="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm disabled:opacity-50">{adding ? "..." : t("members.addBtn")}</button>
        </form>
      )}

      {linkFor && (
        <div className="bg-white border rounded-2xl p-4 space-y-3">
          <div className="font-medium text-sm">"{linkFor.displayName}" — {t("members.linkBtn")}</div>
          <div className="flex gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("members.linkSearchPh")} className="flex-1 border rounded-full px-4 py-2 text-sm" />
            <button onClick={searchUsers} disabled={searching} className="px-4 py-2 rounded-full border text-sm disabled:opacity-50">{t("members.linkSearchBtn")}</button>
            <button onClick={() => { setLinkFor(null); setFound([]); setSearch(""); }} className="px-4 py-2 rounded-full border text-sm">{t("members.linkCancel")}</button>
          </div>
          {found.map((u) => (
            <div key={u.id} className="flex items-center justify-between border rounded-xl px-3 py-2">
              <div className="text-sm"><b>{u.fullName}</b> <span className="text-xs text-zinc-500">{u.email}{u.phone ? ` • ${u.phone}` : ""}</span></div>
              <button onClick={() => linkAccount(u.id)} className="text-xs bg-zinc-900 text-white rounded-full px-3 py-1.5">{t("members.linkConfirm")}</button>
            </div>
          ))}
          {search && !searching && found.length === 0 && <div className="text-xs text-zinc-500">{t("members.foundNone")}</div>}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border bg-white p-6 text-center text-sm">{t("common.loading")}</div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="text-left p-3">{t("members.nameCol")}</th>
                  <th className="text-left p-3">{t("members.emailCol")}</th>
                  <th className="text-left p-3">{t("members.roleCol")}</th>
                  <th className="text-left p-3">{t("members.statusCol")}</th>
                  <th className="text-left p-3">{t("members.joinedCol")}</th>
                  <th className="text-right p-3">{t("members.actionCol")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3 font-medium">
                      {m.fullName} {m.isPrimaryManager && <span className="text-xs bg-zinc-900 text-white rounded-full px-2 py-0.5">Primary</span>}
                      {m.isPlaceholder && <span className="ml-1 text-xs bg-amber-100 rounded-full px-2 py-0.5">{t("members.noAccountBadge")}</span>}
                    </td>
                    <td className="p-3 text-xs">{m.email || "—"}</td>
                    <td className="p-3">
                      {privileged ? (
                        <select value={m.role} onChange={(e) => updateRole(m.id, e.target.value)} className="border rounded-full px-2 py-1 text-xs">
                          <option value="member">{t("roles.member")}</option>
                          <option value="assistant_manager">{t("roles.assistant_manager")}</option>
                          <option value="manager">{t("roles.manager")}</option>
                        </select>
                      ) : (
                        <span className="text-xs">{t(`roles.${m.role}`)}</span>
                      )}
                    </td>
                    <td className="p-3"><span className={`text-xs rounded-full px-2 py-1 ${m.status === "active" ? "bg-emerald-100" : m.status === "left" ? "bg-zinc-200" : "bg-amber-100"}`}>{t(`status.${m.status}`)}</span></td>
                    <td className="p-3 text-xs">{m.joinedAt.slice(0, 10)}</td>
                    <td className="p-3 text-right flex gap-1 justify-end flex-wrap">
                      {privileged && (
                        <>
                          {m.isPlaceholder ? (
                            <button onClick={() => setLinkFor(m)} className="text-xs border rounded-full px-3 py-1 bg-amber-50 min-h-[36px]">{t("members.linkBtn")}</button>
                          ) : m.claimedAt ? (
                            <button onClick={() => unlinkAccount(m)} className="text-xs border rounded-full px-3 py-1 min-h-[36px]">{t("members.unlinkBtn")}</button>
                          ) : null}
                          <button onClick={() => askStatus(m.id, m.status === "active" ? "left" : "active")} className="text-xs border rounded-full px-3 py-1 hover:bg-zinc-50 min-h-[36px]">{m.status === "active" ? t("members.markLeft") : t("members.activate")}</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {members.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">{t("members.noMembers")}</div>}
          <p className="p-3 text-xs text-zinc-500">{t("members.historyNote")}</p>
        </div>
      )}

      {joinRequests.length > 0 && (
        <div className="bg-white border rounded-2xl p-4 space-y-3">
          <div className="font-semibold text-sm">Join Requests — ম্যানেজার Approval (পাবলিক শেয়ার থেকে)</div>
          <div className="space-y-2">
            {joinRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between border rounded-xl px-3 py-2 text-sm">
                <div>
                  <span className="font-mono text-xs">{r.userId.slice(0, 8)}</span> <span className={`text-xs rounded-full px-2 py-0.5 ${r.status === "pending" ? "bg-amber-100" : r.status === "approved" ? "bg-emerald-100" : "bg-zinc-200"}`}>{r.status}</span> <span className="text-xs text-zinc-500">{new Date(r.requestedAt).toLocaleString()}</span>
                </div>
                {r.status === "pending" && privileged && (
                  <div className="flex gap-1">
                    <button onClick={() => handleJoinRequest(r.id, "approve")} className="text-xs bg-zinc-900 text-white rounded-full px-3 py-1 min-h-[36px]">Approve</button>
                    <button onClick={() => handleJoinRequest(r.id, "reject")} className="text-xs border rounded-full px-3 py-1 min-h-[36px]">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <ConfirmSheet
        open={!!confirmState}
        title={
          !confirmState ? "" :
          confirmState.kind === "status"
            ? t("members.statusConfirm")
            : confirmState.kind === "link"
              ? `${t("members.linkBtn")}? ${t("members.linkConfirmMsg")}`
              : `${t("members.unlinkBtn")}?`
        }
        confirmLabel={
          !confirmState ? t("common.confirm") :
          confirmState.kind === "status"
            ? (confirmState.status === "active" ? t("members.activate") : t("members.markLeft"))
            : confirmState.kind === "link" ? t("members.linkConfirm") : t("members.unlinkBtn")
        }
        altLabel={confirmState?.kind === "status" && confirmState.status === "left" ? "মাসান্ত পর্যন্ত রাখুন" : undefined}
        onAlt={confirmState?.kind === "status" && confirmState.status === "left" ? () => doStatus(true) : undefined}
        busy={confirmBusy}
        onConfirm={() => {
          if (!confirmState) return;
          if (confirmState.kind === "status") doStatus(false);
          else if (confirmState.kind === "link") confirmLink();
          else confirmUnlink();
        }}
        onClose={() => !confirmBusy && setConfirmState(null)}
      />
    </div>
  );
}
