import { describe, it, expect } from "vitest";
import { resolveMyRole } from "@/hooks/useMyRole";

describe("useMyRole — UI gating without 403 surprises", () => {
  const members = [
    { userId: "u1", role: "manager", isPrimaryManager: false },
    { userId: "u2", role: "assistant_manager", isPrimaryManager: false },
    { userId: "u3", role: "member", isPrimaryManager: false },
    { userId: "u4", role: "member", isPrimaryManager: true },
  ];

  it("manager gets canManage + isManager", () => {
    expect(resolveMyRole("u1", members)).toEqual({ role: "manager", isPrimary: false, canManage: true, isManager: true });
  });

  it("assistant can manage but is not manager", () => {
    const r = resolveMyRole("u2", members);
    expect(r.canManage).toBe(true);
    expect(r.isManager).toBe(false);
  });

  it("primary manager can manage even with member role", () => {
    expect(resolveMyRole("u4", members).canManage).toBe(true);
  });

  it("plain member gets neither flag (edit buttons hidden)", () => {
    expect(resolveMyRole("u3", members)).toEqual({ role: "member", isPrimary: false, canManage: false, isManager: false });
  });

  it("guest/unknown user gets no permissions", () => {
    expect(resolveMyRole(null, members).canManage).toBe(false);
    expect(resolveMyRole("ghost", members)).toEqual({ role: null, isPrimary: false, canManage: false, isManager: false });
  });
});
