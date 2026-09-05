import { describe, it, expect } from "vitest";
import { validatePasswordPolicy } from "@/lib/auth";
import { registerSchema, loginSchema } from "@/lib/validators";

describe("auth — password policy & validators", () => {
  it("rejects weak passwords", () => {
    expect(validatePasswordPolicy("short")).not.toBeNull();
    expect(validatePasswordPolicy("nouppercase1")).not.toBeNull();
    expect(validatePasswordPolicy("NOLOWER1")).not.toBeNull();
    expect(validatePasswordPolicy("NoNumber")).not.toBeNull();
  });

  it("accepts strong password", () => {
    expect(validatePasswordPolicy("StrongPass1")).toBeNull();
  });

  it("registerSchema validates email and confirm", () => {
    const ok = registerSchema.safeParse({ fullName: "Jobayer", email: "test@example.com", password: "StrongPass1", confirmPassword: "StrongPass1" });
    expect(ok.success).toBe(true);
    const bad = registerSchema.safeParse({ fullName: "J", email: "bad", password: "short", confirmPassword: "short2" });
    expect(bad.success).toBe(false);
  });

  it("loginSchema requires email and password", () => {
    expect(loginSchema.safeParse({ email: "test@example.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "bad", password: "" }).success).toBe(false);
  });
});
