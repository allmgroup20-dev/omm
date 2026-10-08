import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(tsx|ts)$/.test(e.name) ? [p] : [];
  });
}

// App scope: mess app + account shell + shared components.
// Excludes: frozen manager dashboard (src/app/messes/[id]/dashboard),
// public marketplace shells, API routes.
const scopeDirs = [
  "src/app/(mess)",
  "src/app/(dashboard)",
  "src/components",
];

function scopedFiles(): string[] {
  return scopeDirs.flatMap((d) => walk(join(process.cwd(), d)));
}

describe("ui guards — touch targets", () => {
  it("has no sub-44px min-height overrides on interactive elements", () => {
    const offenders: string[] = [];
    for (const f of scopedFiles()) {
      const src = readFileSync(f, "utf8");
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        if (/min-h-\[(36|32|28|24)px\]/.test(line) && /<(button|a|select|input|summary)/.test(line)) {
          offenders.push(`${f}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe("ui guards — bottom stack contract", () => {
  it("no sticky bottom-0 bar without a safe-area offset in mess pages", () => {
    const offenders: string[] = [];
    for (const f of walk(join(process.cwd(), "src/app/(mess)"))) {
      if (!f.endsWith(".tsx")) continue;
      const src = readFileSync(f, "utf8");
      src.split("\n").forEach((line, i) => {
        if (/sticky/.test(line) && /bottom-0/.test(line) && !/bottom-\[/.test(line)) {
          offenders.push(`${f}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("fixed bottom layers respect the home-indicator safe area", () => {
    for (const p of [
      "src/components/mobile-action-bar.tsx",
      "src/components/ui/toast.tsx",
      "src/components/ui/confirm-sheet.tsx",
    ]) {
      const src = readFileSync(join(process.cwd(), p), "utf8");
      expect(src).toContain("env(safe-area-inset-bottom)");
    }
  });
});

describe("ui guards — tables ship card alternatives on mobile", () => {
  it("list pages render cards alongside desktop tables", () => {
    const pages = [
      "src/app/(mess)/messes/[id]/members/page.tsx",
      "src/app/(mess)/messes/[id]/expenses/page.tsx",
      "src/app/(mess)/messes/[id]/market/entries/page.tsx",
      "src/app/(mess)/messes/[id]/finance/deposits/page.tsx",
      "src/app/(mess)/messes/[id]/finance/ledger/page.tsx",
      "src/app/(mess)/messes/[id]/finance/balances/page.tsx",
      "src/app/(mess)/messes/[id]/settlements/page.tsx",
      "src/app/(mess)/messes/[id]/settlements/[settlementId]/page.tsx",
      "src/app/(mess)/messes/[id]/audit-logs/page.tsx",
      "src/app/(mess)/messes/[id]/meals/matrix/page.tsx",
    ];
    const missing = pages.filter((p) => {
      const src = readFileSync(join(process.cwd(), p), "utf8");
      return !/(md|sm|lg):hidden/.test(src) || !/hidden (md|sm|lg):(table|block)/.test(src);
    });
    expect(missing).toEqual([]);
  });
});

describe("ui guards — dead patterns stay dead", () => {
  it("has no ThemeToggle usage (dark mode removed)", () => {
    const offenders = scopedFiles().filter((f) =>
      /ThemeToggle|theme-toggle/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("ConfirmSheet cancel label is localized, not hardcoded", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/ui/confirm-sheet.tsx"),
      "utf8",
    );
    expect(src).not.toContain('"বাতিল"');
    expect(src).toContain('t("common.cancel")');
  });
});
