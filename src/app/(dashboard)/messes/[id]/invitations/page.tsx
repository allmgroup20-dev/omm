"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";

type Inv = { id: string; code: string; linkToken: string; role: string; status: string; createdAt: string; email: string | null };

export default function InvitationsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
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
      setMsg(`${t("invitations.codeCol")}: ${data.invitation.code} | ${t("invitations.linkCol")}: ${window.location.origin}/join?token=${data.invitation.linkToken}`);
      load();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
      <h1 className="text-lg font-bold">{t("invitations.title")}</h1>
      <div className="bg-white border rounded-2xl p-4 sm:p-5">
        <div className="flex gap-2 items-center flex-wrap">
          <select value={role} onChange={(e) => setRole(e.target.value)} className="flex-1 sm:flex-none border rounded-full px-4 py-3 text-base sm:text-sm min-h-[44px]">
            <option value="member">{t("roles.member")}</option>
            <option value="assistant_manager">{t("roles.assistant_manager")}</option>
            <option value="manager">{t("roles.manager")}</option>
          </select>
          <button onClick={create} disabled={loading} className="px-6 py-3 rounded-full bg-zinc-900 text-white text-sm disabled:opacity-50 min-h-[44px]">{t("invitations.generate")}</button>
        </div>
        {msg && <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm break-all">{msg}</div>}
        <p className="text-xs text-zinc-500 mt-2">{t("invitations.note")}</p>
      </div>
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr><th className="text-left p-3">{t("invitations.codeCol")}</th><th className="text-left p-3">{t("invitations.roleCol")}</th><th className="text-left p-3">{t("invitations.statusCol")}</th><th className="text-left p-3">{t("invitations.createdCol")}</th><th className="text-left p-3">{t("invitations.linkCol")}</th></tr>
              </thead>
          <tbody>
            {invites.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="p-3 font-mono text-xs">{inv.code}</td>
                <td className="p-3 text-xs">{t(`roles.${inv.role}`)}</td>
                <td className="p-3 text-xs">{inv.status}</td>
                <td className="p-3 text-xs">{inv.createdAt.slice(0, 10)}</td>
                <td className="p-3 text-xs break-all">/join?token={inv.linkToken}</td>
              </tr>
            ))}
            </tbody>
            </table>
          </div>
        </div>
        {invites.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">{t("invitations.noInvites")}</div>}
      </div>
    </div>
  );
}
