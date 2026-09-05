import { describe, it, expect, beforeEach } from "vitest";
import { buildGoogleAuthUrl, googleConfig, isGoogleConfigured } from "@/lib/google";

describe("google oauth — config & auth URL", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
    process.env.APP_URL = "https://omm.jobayergroup.com";
  });

  it("isGoogleConfigured true when both set", () => {
    expect(isGoogleConfigured()).toBe(true);
  });

  it("isGoogleConfigured false when missing", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    expect(isGoogleConfigured()).toBe(false);
  });

  it("redirect URI points to callback", () => {
    expect(googleConfig().redirectUri).toBe("https://omm.jobayergroup.com/api/auth/google/callback");
  });

  it("buildGoogleAuthUrl contains required params", () => {
    const url = new URL(buildGoogleAuthUrl("state-123"));
    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-client-id.apps.googleusercontent.com");
    expect(url.searchParams.get("redirect_uri")).toBe("https://omm.jobayergroup.com/api/auth/google/callback");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toContain("openid");
    expect(url.searchParams.get("scope")).toContain("email");
    expect(url.searchParams.get("state")).toBe("state-123");
  });
});
