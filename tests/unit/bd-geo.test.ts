import { describe, it, expect } from "vitest";
import {
  COUNTRY,
  getDivisions,
  getDistricts,
  getUpazilas,
  getUnions,
  validateChain,
  zipForUpazila,
  findDivisionOfDistrict,
} from "@/lib/bd-geo";

describe("bd-geo — government hierarchy", () => {
  it("country is Bangladesh (future-ready code BD)", () => {
    expect(COUNTRY.code).toBe("BD");
    expect(COUNTRY.bn).toBe("বাংলাদেশ");
  });

  it("has exactly 8 divisions", () => {
    const divs = getDivisions();
    expect(divs.length).toBe(8);
    expect(divs.map((d) => d.bn)).toContain("ঢাকা");
  });

  it("has exactly 64 districts across divisions", () => {
    const total = getDivisions().reduce((a, d) => a + getDistricts(d.en).length, 0);
    expect(total).toBe(64);
  });

  it("Dhaka division contains Dhaka district", () => {
    const dhakaDiv = getDivisions().find((d) => d.bn === "ঢাকা");
    expect(dhakaDiv).toBeDefined();
    const dists = getDistricts(dhakaDiv!.en);
    expect(dists.map((d) => d.bn)).toContain("ঢাকা");
  });

  it("upazilas load per district (Dhaka has 5+)", () => {
    const dhakaDiv = getDivisions().find((d) => d.bn === "ঢাকা")!;
    const dhakaDist = getDistricts(dhakaDiv.en).find((d) => d.bn === "ঢাকা")!;
    const ups = getUpazilas(dhakaDist.en);
    expect(ups.length).toBeGreaterThanOrEqual(5);
  });

  it("unions load per upazila with types", () => {
    const dhakaDiv = getDivisions().find((d) => d.bn === "ঢাকা")!;
    const dhakaDist = getDistricts(dhakaDiv.en).find((d) => d.bn === "ঢাকা")!;
    const ups = getUpazilas(dhakaDist.en);
    const unions = getUnions(dhakaDist.en, ups[0].en);
    expect(unions.length).toBeGreaterThan(0);
    expect(unions[0]).toHaveProperty("type");
  });

  it("validateChain accepts correct hierarchy", () => {
    const dhakaDiv = getDivisions().find((d) => d.bn === "ঢাকা")!;
    const dhakaDist = getDistricts(dhakaDiv.en).find((d) => d.bn === "ঢাকা")!;
    const ups = getUpazilas(dhakaDist.en);
    const ok = validateChain({ division: dhakaDiv.en, district: dhakaDist.en, upazila: ups[0].en });
    expect(ok).not.toBeNull();
  });

  it("validateChain rejects wrong district for division", () => {
    const dhakaDiv = getDivisions().find((d) => d.bn === "ঢাকা")!;
    const ctgDiv = getDivisions().find((d) => d.bn === "চট্টগ্রাম")!;
    const ctgDist = getDistricts(ctgDiv.en)[0];
    // Chattogram district under Dhaka division must fail
    expect(validateChain({ division: dhakaDiv.en, district: ctgDist.en })).toBeNull();
  });

  it("validateChain rejects unknown names", () => {
    expect(validateChain({ division: "Nope", district: "Nope" })).toBeNull();
    expect(validateChain({ division: "", district: "" })).toBeNull();
  });

  it("validateChain requires upazila when union given", () => {
    const dhakaDiv = getDivisions().find((d) => d.bn === "ঢাকা")!;
    const dhakaDist = getDistricts(dhakaDiv.en).find((d) => d.bn === "ঢাকা")!;
    expect(validateChain({ division: dhakaDiv.en, district: dhakaDist.en, union: "Mirpur" })).toBeNull();
  });

  it("zip lookup returns array (may be empty for unmatched)", () => {
    const dhakaDiv = getDivisions().find((d) => d.bn === "ঢাকা")!;
    const dhakaDist = getDistricts(dhakaDiv.en).find((d) => d.bn === "ঢাকা")!;
    const ups = getUpazilas(dhakaDist.en);
    const zip = zipForUpazila(dhakaDist.en, ups[0].en);
    expect(Array.isArray(zip)).toBe(true);
  });

  it("findDivisionOfDistrict resolves parent", () => {
    const dhakaDiv = getDivisions().find((d) => d.bn === "ঢাকা")!;
    const dhakaDist = getDistricts(dhakaDiv.en).find((d) => d.bn === "ঢাকা")!;
    expect(findDivisionOfDistrict(dhakaDist.en)?.en).toBe(dhakaDiv.en);
    expect(findDivisionOfDistrict("Nope")).toBeNull();
  });
});
