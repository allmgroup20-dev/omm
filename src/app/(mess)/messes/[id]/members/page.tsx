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
  const [showInvite, setShowInvite] = useState(false);
  const [invRole, setInvRole] = useState("member");
  const [invites, setInvites] = useState<{ id: string; code: string; linkToken: string; role: string; status: string; createdAt: string }[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invMsg, setInvMsg] = useState("");
  const [copied, setCopied] = useState("");
  const [joinRequests, setJoinRequests] = useState<{ id: string; userId: string; status: string; requestedAt: string; fullName: string | null; email: string | null; phone: string | null }[]>([]);
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

  async function loadInvites() {
    const res = await fetch(`/api/messes/${id}/invitations`).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      setInvites(data.invitations || []);
    }
  }

  async function createInvite() {
    setInvLoading(true);
    setInvMsg("");
    const res = await fetch(`/api/messes/${id}/invitations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: invRole }) });
    const data = await res.json().catch(() => ({}));
    setInvLoading(false);
    if (!res.ok) setInvMsg(data.error || t("errors.saveFail"));
    else {
      setInvMsg(`${window.location.origin}/join?token=${data.invitation.linkToken}`);
      loadInvites();
    }
  }

  async function copyText(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setMsg(t("errors.saveFail"));
    }
  }

  async function handleJoinRequest(reqId: string, action: "approve" | "reject") {
    const res = await fetch(`/api/messes/${id}/join-requests/${reqId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(action === "approve" ? t("members.approvedMsg") : t("members.rejectedMsg"));
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
          {privileged && <button onClick={() => { setShowInvite((v) => !v); if (!showInvite) loadInvites(); }} className="px-4 py-2 rounded-full border bg-white text-sm min-h-[44px]">{t("members.invite")}</button>}
        </div>
      </div>
      {msg && <div className="rounded-xl border bg-white p-3 text-sm">{msg}</div>}

      {showAdd && (
        <form onSubmit={quickAdd} className="bg-white border rounded-2xl p-4 space-y-2">
          <p className="text-xs text-zinc-500">{t("members.quickAddHelp")}</p>
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("members.addPh")} className="flex-1 border rounded-full px-4 py-2 text-sm min-h-[44px]" minLength={2} maxLength={80} required />
            <button disabled={adding} className="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm disabled:opacity-50 min-h-[44px]">{adding ? "..." : t("members.addBtn")}</button>
          </div>
        </form>
      )}

      {showInvite && privileged && (
        <div className="bg-white border rounded-2xl p-4 space-y-3">
          <div className="font-medium text-sm">{t("invitations.title")}</div>
          <p className="text-xs text-zinc-500">{t("members.inviteHelp")}</p>
          <div className="flex gap-2 items-center flex-wrap">
            <select value={invRole} onChange={(e) => setInvRole(e.target.value)} className="flex-1 sm:flex-none border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]">
              <option value="member">{t("roles.member")}</option>
              <option value="assistant_manager">{t("roles.assistant_manager")}</option>
              <option value="manager">{t("roles.manager")}</option>
            </select>
            <button onClick={createInvite} disabled={invLoading} className="px-6 py-3 rounded-full bg-zinc-900 text-white text-sm disabled:opacity-50 min-h-[44px]">{t("invitations.generate")}</button>
          </div>
          {invMsg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm break-all flex items-center gap-2">
              <span className="flex-1 min-w-0">{invMsg}</span>
              <button onClick={() => copyText(invMsg, "new")} className="shrink-0 px-4 py-2 rounded-full border bg-white text-xs min-h-[44px]">{copied === "new" ? t("common.copied") : t("common.copy")}</button>
            </div>
          )}
          <p className="text-xs text-zinc-500">{t("invitations.note")}</p>
          {invites.length > 0 && (
            <div className="space-y-2">
              {invites.map((inv) => {
                const link = `/join?token=${inv.linkToken}`;
                return (
                  <div key={inv.id} className="flex items-center gap-2 border rounded-xl px-3 py-2 text-sm">
                    <span className="font-mono text-xs">{inv.code}</span>
                    <span className="text-xs text-zinc-500">{t(`roles.${inv.role}`)} • {inv.status}</span>
                    <button onClick={() => copyText(`${window.location.origin}${link}`, inv.id)} className="ml-auto shrink-0 px-4 py-2.5 rounded-full border text-xs min-h-[44px]">{copied === inv.id ? t("common.copied") : t("common.copy")}</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {linkFor && (
        <div className="bg-white border rounded-2xl p-4 space-y-3">
          <div className="font-medium text-sm">"{linkFor.displayName}" — {t("members.linkBtn")}</div>
          <p className="text-xs text-zinc-500">{t("members.linkHelp")}</p>
          <div className="flex gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("members.linkSearchPh")} className="flex-1 border rounded-full px-4 py-2 text-sm" />
            <button onClick={searchUsers} disabled={searching} className="px-4 py-2 rounded-full border text-sm disabled:opacity-50">{t("members.linkSearchBtn")}</button>
            <button onClick={() => { setLinkFor(null); setFound([]); setSearch(""); }} className="px-4 py-2 rounded-full border text-sm">{t("members.linkCancel")}</button>
          </div>
          {found.map((u) => (
            <div key={u.id} className="flex items-center justify-between border rounded-xl px-3 py-2">
              <div className="text-sm"><b>{u.fullName}</b> <span className="text-xs text-zinc-500">{u.email}{u.phone ? ` • ${u.phone}` : ""}</span></div>
              <button onClick={() => linkAccount(u.id)} className="text-xs bg-zinc-900 text-white rounded-full px-4 py-2.5">{t("members.linkConfirm")}</button>
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
            <table className="w-full text-sm hidden md:table">
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
                      {m.fullName} {m.isPrimaryManager && <span className="text-xs bg-zinc-900 text-white rounded-full px-2 py-0.5">{t("members.primaryBadge")}</span>}
                      {m.isPlaceholder && <span className="ml-1 text-xs bg-amber-100 rounded-full px-2 py-0.5">{t("members.noAccountBadge")}</span>}
                    </td>
                    <td className="p-3 text-xs">{m.email || "—"}</td>
                    <td className="p-3">
                      {privileged ? (
                        <select value={m.role} onChange={(e) => updateRole(m.id, e.target.value)} className="border rounded-xl px-3 py-2.5 text-sm min-h-[44px]">
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
                            <button onClick={() => setLinkFor(m)} className="text-xs border rounded-full px-4 py-2.5 bg-amber-50 min-h-[44px]">{t("members.linkBtn")}</button>
                          ) : m.claimedAt ? (
                            <button onClick={() => unlinkAccount(m)} className="text-xs border rounded-full px-4 py-2.5 min-h-[44px]">{t("members.unlinkBtn")}</button>
                          ) : null}
                          <button onClick={() => askStatus(m.id, m.status === "active" ? "left" : "active")} className="text-xs border rounded-full px-4 py-2.5 hover:bg-zinc-50 min-h-[44px]">{m.status === "active" ? t("members.markLeft") : t("members.activate")}</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y">
            {members.map((m) => (
              <div key={m.id} className="p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{m.fullName}</span>
                  {m.isPrimaryManager && <span className="text-xs bg-zinc-900 text-white rounded-full px-2 py-0.5">{t("members.primaryBadge")}</span>}
                  {m.isPlaceholder && <span className="text-xs bg-amber-100 rounded-full px-2 py-0.5">{t("members.noAccountBadge")}</span>}
                  <span className={`ml-auto text-xs rounded-full px-2 py-1 ${m.status === "active" ? "bg-emerald-100" : m.status === "left" ? "bg-zinc-200" : "bg-amber-100"}`}>{t(`status.${m.status}`)}</span>
                </div>
                <div className="text-xs text-zinc-500">{m.email || "—"} • {m.joinedAt.slice(0, 10)}</div>
                {privileged && (
                  <select value={m.role} onChange={(e) => updateRole(m.id, e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm min-h-[44px] bg-white">
                    <option value="member">{t("roles.member")}</option>
                    <option value="assistant_manager">{t("roles.assistant_manager")}</option>
                    <option value="manager">{t("roles.manager")}</option>
                  </select>
                )}
                {privileged && (
                  <div className="flex flex-col gap-2">
                    {m.isPlaceholder ? (
                      <button onClick={() => setLinkFor(m)} className="w-full text-sm border rounded-full px-4 py-2.5 bg-amber-50 min-h-[48px]">{t("members.linkBtn")}</button>
                    ) : m.claimedAt ? (
                      <button onClick={() => unlinkAccount(m)} className="w-full text-sm border rounded-full px-4 py-2.5 min-h-[48px]">{t("members.unlinkBtn")}</button>
                    ) : null}
                    <button onClick={() => askStatus(m.id, m.status === "active" ? "left" : "active")} className="w-full text-sm border rounded-full px-4 py-2.5 hover:bg-zinc-50 min-h-[48px]">{m.status === "active" ? t("members.markLeft") : t("members.activate")}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {members.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">{t("members.noMembers")}</div>}
          <p className="p-3 text-xs text-zinc-500">{t("members.historyNote")}</p>
        </div>
      )}

      {joinRequests.length > 0 && (
        <div className="bg-white border rounded-2xl p-4 space-y-3">
          <div className="font-semibold text-sm">{t("members.joinRequests")}</div>
          <div className="text-xs text-zinc-500">{t("members.joinRequestsHint")}</div>
          <div className="space-y-2">
            {joinRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 border rounded-xl px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.fullName || r.email || t("finance.unknownMember")}</div>
                  <div className="text-xs text-zinc-500 truncate">{[r.email, r.phone].filter(Boolean).join(" • ")}</div>
                  <div><span className={`text-xs rounded-full px-2 py-0.5 ${r.status === "pending" ? "bg-amber-100" : r.status === "approved" ? "bg-emerald-100" : "bg-zinc-200"}`}>{t(`status.${r.status}`)}</span> <span className="text-xs text-zinc-500">{new Date(r.requestedAt).toLocaleDateString()}</span></div>
                </div>
                {r.status === "pending" && privileged && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleJoinRequest(r.id, "approve")} className="text-xs bg-zinc-900 text-white rounded-full px-4 py-2.5 min-h-[44px]">{t("common.approve")}</button>
                    <button onClick={() => handleJoinRequest(r.id, "reject")} className="text-xs border rounded-full px-4 py-2.5 min-h-[44px]">{t("common.reject")}</button>
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
            ? (confirmState.status === "active" ? t("members.statusConfirm") : t("members.leaveTiming"))
            : confirmState.kind === "link"
              ? `${t("members.linkBtn")}? ${t("members.linkConfirmMsg")}`
              : `${t("members.unlinkBtn")}?`
        }
        confirmLabel={
          !confirmState ? t("common.confirm") :
          confirmState.kind === "status"
            ? (confirmState.status === "active" ? t("members.activate") : t("members.leaveNow"))
            : confirmState.kind === "link" ? t("members.linkConfirm") : t("members.unlinkBtn")
        }
        altLabel={confirmState?.kind === "status" && confirmState.status === "left" ? t("members.keepTillMonthEnd") : undefined}
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
