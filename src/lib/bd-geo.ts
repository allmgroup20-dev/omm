import geo from "../../data/bd-geo.json";

/**
 * Bangladesh administrative hierarchy — SERVER ONLY.
 * Do NOT import this from client components (380KB JSON).
 * Client UI must use GET /api/geo per level.
 *
 * Sources: nuhil/bangladesh-geocode (MIT, bangladesh.gov.bd sourced),
 * iqbalhasandev/bangladesh-geo-json (MIT), open-admin-data (CC-BY-4.0, zip).
 */

export type GeoUnion = { en: string; bn: string; type: "union" | "pourashava" | "city_corporation" };
export type GeoUpazila = { en: string; bn: string; slug: string; zip: string[]; unions: GeoUnion[] };
export type GeoDistrict = {
  en: string;
  bn: string;
  slug: string;
  lat: string | null;
  lng: string | null;
  upazilas: GeoUpazila[];
  city_corporations: GeoUnion[];
};
export type GeoDivision = {
  en: string;
  bn: string;
  slug: string;
  lat: string | null;
  lng: string | null;
  districts: GeoDistrict[];
};

type GeoFile = {
  version: string;
  updated: string;
  country: { en: string; bn: string; code: string };
  counts: { divisions: number; districts: number; upazilas: number };
  divisions: GeoDivision[];
};

const data = geo as unknown as GeoFile;

export const COUNTRY = data.country;
export const GEO_VERSION = data.version;

export function getDivisions(): Pick<GeoDivision, "en" | "bn" | "slug">[] {
  return data.divisions.map((d) => ({ en: d.en, bn: d.bn, slug: d.slug }));
}

export function getDistricts(divisionEn: string): Pick<GeoDistrict, "en" | "bn" | "slug" | "lat" | "lng">[] {
  const div = data.divisions.find((d) => d.en === divisionEn);
  if (!div) return [];
  return div.districts.map((t) => ({ en: t.en, bn: t.bn, slug: t.slug, lat: t.lat, lng: t.lng }));
}

export function getUpazilas(districtEn: string): Pick<GeoUpazila, "en" | "bn" | "slug" | "zip">[] {
  for (const div of data.divisions) {
    const dist = div.districts.find((t) => t.en === districtEn);
    if (dist) return dist.upazilas.map((u) => ({ en: u.en, bn: u.bn, slug: u.slug, zip: u.zip }));
  }
  return [];
}

export function getUnions(districtEn: string, upazilaEn: string): GeoUnion[] {
  for (const div of data.divisions) {
    const dist = div.districts.find((t) => t.en === districtEn);
    if (!dist) continue;
    const up = dist.upazilas.find((u) => u.en === upazilaEn);
    if (up) return up.unions;
    // city corporations live at district level
    if (dist.city_corporations.length && upazilaEn === "__city__") return dist.city_corporations;
  }
  return [];
}

export function findDistrict(districtEn: string): GeoDistrict | null {
  for (const div of data.divisions) {
    const dist = div.districts.find((t) => t.en === districtEn);
    if (dist) return dist;
  }
  return null;
}

export function findDivisionOfDistrict(districtEn: string): GeoDivision | null {
  for (const div of data.divisions) {
    if (div.districts.some((t) => t.en === districtEn)) return div;
  }
  return null;
}

/** Full hierarchy validation for server-side forms. Returns normalized chain or null. */
export function validateChain(input: { division?: string; district?: string; upazila?: string; union?: string }): {
  division: string;
  district: string;
  upazila: string;
  union: string;
} | null {
  const { division = "", district = "", upazila = "", union = "" } = input;
  if (!division || !district) return null;
  const div = data.divisions.find((d) => d.en === division);
  if (!div) return null;
  const dist = div.districts.find((t) => t.en === district);
  if (!dist) return null;
  if (upazila) {
    const up = dist.upazilas.find((u) => u.en === upazila);
    if (!up) return null;
    if (union) {
      const ok = up.unions.some((u) => u.en === union) || dist.city_corporations.some((c) => c.en === union);
      if (!ok) return null;
    }
  } else if (union) {
    return null; // union requires upazila
  }
  return { division, district, upazila, union };
}

export function zipForUpazila(districtEn: string, upazilaEn: string): string[] {
  const list = getUpazilas(districtEn);
  return list.find((u) => u.en === upazilaEn)?.zip || [];
}
