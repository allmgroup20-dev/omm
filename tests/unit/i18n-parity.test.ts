import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { rawDicts, leafKeys, tx } from "@/i18n/dict";

describe("i18n — BN/EN parity", () => {
  const { bn, en } = rawDicts();

  it("has identical key sets in bn and en", () => {
    const bnKeys = leafKeys(bn).sort();
    const enKeys = new Set(leafKeys(en));
    expect(bnKeys.filter((k) => !enKeys.has(k))).toEqual([]);
    expect(enKeys.size).toBe(bnKeys.length);
  });

  it("has no empty or whitespace-only translations", () => {
    const bad: string[] = [];
    for (const locale of [bn, en]) {
      for (const k of leafKeys(locale)) {
        const v = tx(locale === bn ? "bn" : "en", k);
        if (!v.trim()) bad.push(k);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("mess overview IA — daily first, setup last", () => {
  const overview = readFileSync(
    join(process.cwd(), "src/app/(dashboard)/messes/[id]/page.tsx"),
    "utf8",
  );

  it("groups the overview into daily / weekly / setup sections", () => {
    expect(overview).toContain('t("mess.dailyTitle")');
    expect(overview).toContain('t("mess.weeklyTitle")');
    expect(overview).toContain('t("mess.setupTitle")');
  });

  it("puts the four daily essentials in the daily section", () => {
    const dailyBlock = overview.slice(overview.indexOf('t("mess.dailyTitle")'));
    const weeklyStart = dailyBlock.indexOf('t("mess.weeklyTitle")');
    const daily = dailyBlock.slice(0, weeklyStart === -1 ? dailyBlock.length : weeklyStart);
    for (const href of ["/meals`", "/market/add`", "/finance/deposits`", "/finance/dues`"]) {
      expect(daily).toContain(href);
    }
  });

  it("keeps settings and dashboard out of the daily section", () => {
    const dailyBlock = overview.slice(overview.indexOf('t("mess.dailyTitle")'), overview.indexOf('t("mess.weeklyTitle")'));
    expect(dailyBlock).not.toContain("/settings`");
    expect(dailyBlock).not.toContain("/dashboard`");
  });

  it("resolves the new overview labels in both locales", () => {
    for (const key of [
      "mess.dailyTitle",
      "mess.dailyNote",
      "mess.weeklyTitle",
      "mess.setupTitle",
      "mess.qaMealToday",
      "mess.qaDues",
      "mess.qaEntries",
      "mess.qaLedger",
      "mess.qaBalances",
      "mess.qaExpenses",
      "mess.qaMatrix",
      "nav.myMesses",
    ]) {
      for (const locale of ["bn", "en"] as const) {
        expect(tx(locale, key)).not.toBe(key);
      }
    }
  });
});

describe("mess scope — no stray native dialogs or legacy month pickers", () => {
  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return walk(p);
      return e.name.endsWith(".tsx") ? [p] : [];
    });
  }

  const files = walk(join(process.cwd(), "src/app/(dashboard)/messes"));
  it("finds page files to scan", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("has no window.confirm / window.prompt / bare alert() in mess pages", () => {
    const offenders = files.filter((f) => /window\.(confirm|prompt)\(|(?<![.\w])alert\(/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("uses a month input instead of separate year + month number boxes", () => {
    const offenders = files.filter((f) => {
      const src = readFileSync(f, "utf8");
      const hasMonthBox = /type="number"[^>]*min=\{1\}[^>]*max=\{12\}/.test(src);
      const hasMonthInput = /type="month"/.test(src);
      return hasMonthBox && !hasMonthInput;
    });
    expect(offenders).toEqual([]);
  });
});
