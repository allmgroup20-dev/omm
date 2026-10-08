"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);

  async function load() {
    try {
      const res = await fetch("/api/notifications?limit=1");
      const data = await res.json();
      if (res.ok) setUnread(data.unreadCount || 0);
    } catch {}
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <Link href="/notifications" aria-label="Notifications" className="relative w-11 h-11 grid place-items-center rounded-full border hover:bg-zinc-50 text-base shrink-0">
      🔔
      {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full w-5 h-5 grid place-items-center">{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
}
