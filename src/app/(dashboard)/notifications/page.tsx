"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";
import { EmptyState, LoadingState } from "@/components/ui/empty";

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; isRead: boolean; createdAt: string; messId: string | null };

export default function NotificationsPage() {
  const { t } = useLocale();
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const qs = filter === "unread" ? "?unread=true" : "";
    const res = await fetch(`/api/notifications${qs}`);
    const data = await res.json();
    if (res.ok) {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [filter]);

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
  }
  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await fetch(`/api/notifications/read-all`, { method: "POST" });
  }

  function typeLabel(type: string) {
    const key = `notifications.type_${type}`;
    const v = t(key);
    return v === key ? type : v;
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-lg font-bold">{t("notifications.title")} {unreadCount > 0 && <span className="text-xs bg-red-600 text-white rounded-full px-2 py-0.5 ml-2">{unreadCount} {t("notifications.unread")}</span>}</h1>
        <button onClick={markAllRead} className="px-5 py-2.5 border rounded-full text-sm min-h-[44px]">{t("notifications.markAll")}</button>
      </div>

      <div className="flex gap-2 text-sm">
        <button onClick={() => setFilter("all")} className={`px-4 py-2.5 rounded-full border min-h-[44px] ${filter === "all" ? "bg-zinc-900 text-white" : "bg-white"}`}>{t("notifications.allTab")}</button>
        <button onClick={() => setFilter("unread")} className={`px-4 py-2.5 rounded-full border min-h-[44px] ${filter === "unread" ? "bg-zinc-900 text-white" : "bg-white"}`}>{t("notifications.unreadTab")} {unreadCount > 0 ? `(${unreadCount})` : ""}</button>
      </div>

      {loading ? (
        <LoadingState />
      ) : notifications.length === 0 ? (
        <EmptyState title={t("notifications.noNotif")} description={t("notifications.allCaughtUp")} />
      ) : (
      <div className="space-y-2">
        {notifications.map((n) => (
          <div key={n.id} className={`rounded-2xl border p-4 ${n.isRead ? "bg-white" : "bg-amber-50 border-amber-200"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-sm">{n.title} <span className="text-xs bg-zinc-100 rounded-full px-2 py-0.5 ml-2">{typeLabel(n.type)}</span></div>
                {n.body && <div className="text-sm text-zinc-600 mt-1 break-words">{n.body}</div>}
                <div className="text-xs text-zinc-500 mt-1">{new Date(n.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {!n.isRead && <button onClick={() => markRead(n.id)} className="text-xs border rounded-full px-4 py-2.5 bg-white min-h-[44px]">{t("notifications.markRead")}</button>}
                {n.link && <Link href={n.link} className="text-xs underline text-center min-h-[44px] inline-flex items-center justify-center px-2">{t("notifications.open")}</Link>}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
      <p className="text-xs text-zinc-500 text-center">{t("notifications.prefNote")}</p>
    </div>
  );
}
