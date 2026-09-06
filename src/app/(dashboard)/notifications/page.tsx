"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/provider";

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; isRead: boolean; createdAt: string; messId: string | null };

export default function NotificationsPage() {
  const { t } = useLocale();
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  async function load() {
    const qs = filter === "unread" ? "?unread=true" : "";
    const res = await fetch(`/api/notifications${qs}`);
    const data = await res.json();
    if (res.ok) {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
  }
  useEffect(() => { load(); }, [filter]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    load();
  }
  async function markAllRead() {
    await fetch(`/api/notifications/read-all`, { method: "POST" });
    load();
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("notifications.title")} <span className="text-xs bg-red-600 text-white rounded-full px-2 py-0.5 ml-2">{unreadCount} {t("notifications.unread")}</span></h1>
        <button onClick={markAllRead} className="px-4 py-1.5 border rounded-full text-sm">{t("notifications.markAll")}</button>
      </div>

      <div className="flex gap-2 text-sm">
        <button onClick={() => setFilter("all")} className={`px-3 py-1 rounded-full border ${filter === "all" ? "bg-zinc-900 text-white" : "bg-white"}`}>{t("notifications.allTab")}</button>
        <button onClick={() => setFilter("unread")} className={`px-3 py-1 rounded-full border ${filter === "unread" ? "bg-zinc-900 text-white" : "bg-white"}`}>{t("notifications.unreadTab")}</button>
      </div>

      <div className="space-y-2">
        {notifications.map((n) => (
          <div key={n.id} className={`rounded-2xl border p-4 ${n.isRead ? "bg-white" : "bg-amber-50 border-amber-200"}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-sm">{n.title} <span className="text-xs bg-zinc-100 rounded-full px-2 py-0.5 ml-2">{n.type}</span></div>
                {n.body && <div className="text-sm text-zinc-600 mt-1">{n.body}</div>}
                <div className="text-xs text-zinc-500 mt-1">{new Date(n.createdAt).toLocaleString()} {n.messId ? `• Mess ${n.messId.slice(0, 6)}` : ""}</div>
              </div>
              <div className="flex flex-col gap-1">
                {!n.isRead && <button onClick={() => markRead(n.id)} className="text-xs border rounded-full px-3 bg-white">{t("notifications.markRead")}</button>}
                {n.link && <Link href={n.link} className="text-xs underline">{t("notifications.open")}</Link>}
              </div>
            </div>
          </div>
        ))}
        {notifications.length === 0 && <div className="rounded-2xl border bg-white p-10 text-center text-sm text-zinc-500">{t("notifications.noNotif")}</div>}
      </div>
      <p className="text-xs text-zinc-500 text-center">{t("notifications.prefNote")}</p>
    </div>
  );
}
