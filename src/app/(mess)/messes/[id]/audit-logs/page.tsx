"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";

type Log = { id: string; action: string; entityType: string; entityId: string; actorId: string | null; beforeJson: string | null; afterJson: string | null; reason: string | null; createdAt: string };

export default function AuditLogsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const qs = filter ? `?entityType=${filter}` : "";
    const res = await fetch(`/api/messes/${id}/audit-logs${qs}`);
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Failed");
    else {
      setLogs(data.auditLogs);
      setMsg("");
    }
  }
  useEffect(() => { load(); }, [id, filter]);

  function humanAction(action: string) {
    const key = `audit.act_${action}`;
    const v = t(key);
    return v === key ? action : v;
  }

  function humanEntity(entityType: string) {
    const key = `audit.ent_${entityType}`;
    const v = t(key);
    return v === key ? entityType : v;
  }

  return (
    <div className="space-y-4">
      <Link href={`/messes/${id}`} className="text-sm text-zinc-500">← {t("nav.overview")}</Link>
      <h1 className="text-lg font-bold">{t("audit.title")}</h1>
      <p className="text-xs text-zinc-500">{t("audit.desc")}</p>

      <div className="flex gap-2 text-sm">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded-full px-4 py-2.5">
          <option value="">{t("audit.filterAll")}</option>
          <option value="meal_record">{t("audit.ent_meal_record")}</option>
          <option value="expense">{t("audit.ent_expense")}</option>
          <option value="deposit">{t("audit.ent_deposit")}</option>
          <option value="settlement">{t("audit.ent_settlement")}</option>
          <option value="mess_member">{t("audit.ent_mess_member")}</option>
          <option value="meal_lock">{t("audit.ent_meal_lock")}</option>
          <option value="market_entry">{t("audit.ent_market_entry")}</option>
          <option value="market_category">{t("audit.ent_market_category")}</option>
          <option value="market_product">{t("audit.ent_market_product")}</option>
        </select>
        <button onClick={load} className="px-4 py-1.5 border rounded-full">{t("common.refresh")}</button>
      </div>

      {msg && <div className="rounded-xl bg-red-50 border p-3 text-sm text-red-700">{msg}</div>}

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50"><tr><th className="text-left p-2">{t("audit.time")}</th><th className="text-left p-2">{t("audit.actor")}</th><th className="text-left p-2">{t("audit.action")}</th><th className="text-left p-2">{t("audit.entity")}</th><th className="text-left p-2">{t("audit.change")}</th><th className="text-left p-2">{t("audit.reason")}</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-2 font-mono">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="p-2 font-mono text-[10px]">{l.actorId?.slice(0, 6) || "—"}</td>
                  <td className="p-2"><span className={`rounded-full px-2 py-0.5 ${l.action === "correct" ? "bg-amber-100" : l.action === "close" ? "bg-emerald-100" : l.action === "reopen" ? "bg-sky-100" : "bg-zinc-100"}`}>{humanAction(l.action)}</span></td>
                  <td className="p-2">{humanEntity(l.entityType)}</td>
                  <td className="p-2 max-w-[260px] truncate"><div className="text-[10px]">Before: {l.beforeJson?.slice(0, 80) || "—"}</div><div className="text-[10px]">After: {l.afterJson?.slice(0, 80) || "—"}</div></td>
                  <td className="p-2">{l.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y">
          {logs.map((l) => (
            <div key={l.id} className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm flex-1">{humanAction(l.action)}</span>
                <span className="text-xs text-zinc-500">{new Date(l.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="text-xs text-zinc-500">{humanEntity(l.entityType)} • {l.reason || "—"}</div>
              {(l.beforeJson || l.afterJson) && (
                <details className="text-xs">
                  <summary className="text-zinc-500 cursor-pointer py-1 min-h-[44px] inline-flex items-center">{t("audit.details")}</summary>
                  <div className="rounded-lg bg-zinc-50 p-2 font-mono text-[11px] break-all whitespace-pre-wrap">{t("audit.before")}: {l.beforeJson || "—"}{"\n"}{t("audit.after")}: {l.afterJson || "—"}</div>
                </details>
              )}
            </div>
          ))}
        </div>
        {logs.length === 0 && !msg && <div className="p-6 text-center text-sm text-zinc-500">{t("audit.noLogs")}</div>}
        <div className="p-3 text-xs text-zinc-500 border-t">{t("audit.immutable")}</div>
      </div>
    </div>
  );
}
