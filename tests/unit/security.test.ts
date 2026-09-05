import { describe, it, expect } from "vitest";
import { sanitizeString, validateUpload, escapeHtml, assertTenant } from "@/lib/security";

describe("security — sanitization, upload, tenant isolation", () => {
  it("sanitizeString removes control chars and limits", () => {
    expect(sanitizeString(" hello\x00\x1Fworld ", 5)).toBe("hello");
  });

  it("escapeHtml encodes", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toContain("&lt;script&gt;");
  });

  it("validateUpload rejects large file", () => {
    expect(validateUpload({ size: 6 * 1024 * 1024, type: "image/jpeg", name: "a.jpg" })).toContain("too large");
  });

  it("validateUpload rejects bad mime", () => {
    expect(validateUpload({ size: 1000, type: "text/html", name: "a.html" })).toContain("Unsupported");
  });

  it("validateUpload accepts valid", () => {
    expect(validateUpload({ size: 1000, type: "image/jpeg", name: "photo.jpg" })).toBeNull();
  });

  it("assertTenant throws on missing messId", () => {
    expect(() => assertTenant("")).toThrow();
    expect(() => assertTenant(null as unknown as string)).toThrow();
    expect(() => assertTenant("valid-mess-id-123")).not.toThrow();
  });
});
