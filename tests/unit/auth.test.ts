import { describe, it, expect } from "vitest";
import { validatePasswordPolicy, sessionCookie, oauthStateCookie, clearOauthStateCookie, getCookieName, OAUTH_STATE_COOKIE } from "@/lib/auth";
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

describe("auth — OAuth cookie headers (Google silent-loop fix)", () => {
  it("session cookie carries Path/HttpOnly/SameSite/Max-Age", () => {
    const s = sessionCookie("tok123");
    expect(s.startsWith(`${getCookieName()}=tok123`)).toBe(true);
    for (const part of ["Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=604800"]) {
      expect(s).toContain(part);
    }
  });

  it("oauth state set/clear helpers share name + path", () => {
    expect(oauthStateCookie("abc")).toContain(`${OAUTH_STATE_COOKIE}=abc`);
    expect(oauthStateCookie("abc")).toContain("Max-Age=300");
    expect(clearOauthStateCookie()).toContain(`${OAUTH_STATE_COOKIE}=;`);
    expect(clearOauthStateCookie()).toContain("Max-Age=0");
  });

  it("appending both headers keeps BOTH cookies (the silent-loop bug)", () => {
    // mirrors the Google callback: two raw appends, never cookies-API mixing
    const h = new Headers();
    h.append("Set-Cookie", sessionCookie("tok123"));
    h.append("Set-Cookie", clearOauthStateCookie());
    const all = h.getSetCookie();
    expect(all.length).toBe(2);
    expect(all[0]).toContain(getCookieName());
    expect(all[1]).toContain(OAUTH_STATE_COOKIE);
  });
});
