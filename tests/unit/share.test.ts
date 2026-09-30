import { describe, it, expect } from "vitest";
import { isShareTokenValid, pickValidShareToken, shareUrl } from "@/lib/share";

const NOW = "2026-09-30T10:00:00.000Z";

describe("dashboard share — token reuse", () => {
  it("reuses the newest still-valid token", () => {
    const token = pickValidShareToken(
      [
        { token: "old", expiresAt: "2026-10-20T00:00:00.000Z", createdAt: "2026-09-01T00:00:00.000Z" },
        { token: "new", expiresAt: "2026-10-25T00:00:00.000Z", createdAt: "2026-09-20T00:00:00.000Z" },
      ],
      NOW,
    );
    expect(token).toBe("new");
  });

  it("skips expired tokens", () => {
    const token = pickValidShareToken(
      [
        { token: "dead", expiresAt: "2026-09-01T00:00:00.000Z", createdAt: "2026-08-01T00:00:00.000Z" },
        { token: "live", expiresAt: "2026-10-20T00:00:00.000Z", createdAt: "2026-09-20T00:00:00.000Z" },
      ],
      NOW,
    );
    expect(token).toBe("live");
  });

  it("returns null when everything expired (must POST a fresh token)", () => {
    expect(pickValidShareToken([{ token: "dead", expiresAt: "2026-01-01T00:00:00.000Z" }], NOW)).toBeNull();
    expect(pickValidShareToken([], NOW)).toBeNull();
  });

  it("missing expiry counts as valid (legacy rows)", () => {
    expect(isShareTokenValid({ token: "x" }, NOW)).toBe(true);
    expect(isShareTokenValid({ token: "" }, NOW)).toBe(false);
  });

  it("builds absolute share URL without double slash", () => {
    expect(shareUrl("https://omm.jobayergroup.com", "abc123")).toBe("https://omm.jobayergroup.com/share/abc123");
    expect(shareUrl("https://omm.jobayergroup.com/", "abc123")).toBe("https://omm.jobayergroup.com/share/abc123");
  });
});
