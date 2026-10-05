"use client";
import { useEffect, useState } from "react";

export type MyRole = { role: string | null; isPrimary: boolean; canManage: boolean; isManager: boolean };

/**
 * Pure role resolution (unit-tested): match login userId against mess members.
 * - canManage: manager | assistant_manager | primary manager
 * - isManager: manager only
 */
export function resolveMyRole(
  userId: string | null,
  members: { userId: string | null; role?: string; isPrimaryManager?: boolean }[],
): MyRole {
  const m = userId ? members.find((x) => x.userId === userId) : undefined;
  const role = m?.role || null;
  const isPrimary = !!m?.isPrimaryManager;
  return {
    role,
    isPrimary,
    canManage: role === "manager" || role === "assistant_manager" || isPrimary,
    isManager: role === "manager",
  };
}

/**
 * Own mess role for UI gating (server still enforces everything).
 * - canManage: manager | assistant_manager | primary manager
 * - isManager: manager only
 * Edit/void buttons render only when permitted — no more 403 surprises.
 */
export function useMyRole(messId: string): MyRole {
  const [resolved, setResolved] = useState<MyRole>({ role: null, isPrimary: false, canManage: false, isManager: false });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetch("/api/auth/me", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        const userId = me?.user?.id || null;
        if (!userId || cancelled) return;
        const d = await fetch(`/api/messes/${messId}/members`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        if (!d || cancelled) return;
        setResolved(resolveMyRole(userId, d?.members || []));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [messId]);
  return resolved;
}
