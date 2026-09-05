import { NextResponse } from "next/server";
import { COUNTRY, GEO_VERSION, getDivisions, getDistricts, getUpazilas, getUnions, zipForUpazila } from "@/lib/bd-geo";

// GET /api/geo?level=divisions|districts|upazilas|unions&division=&district=&upazila=
// Public, cacheable reference data (government hierarchy, versioned).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const level = url.searchParams.get("level") || "divisions";
  const division = url.searchParams.get("division") || "";
  const district = url.searchParams.get("district") || "";
  const upazila = url.searchParams.get("upazila") || "";

  let data: unknown = [];
  if (level === "divisions") {
    data = getDivisions();
  } else if (level === "districts") {
    if (!division) return NextResponse.json({ error: "division required" }, { status: 400 });
    data = getDistricts(division);
  } else if (level === "upazilas") {
    if (!district) return NextResponse.json({ error: "district required" }, { status: 400 });
    data = getUpazilas(district);
  } else if (level === "unions") {
    if (!district || !upazila) return NextResponse.json({ error: "district and upazila required" }, { status: 400 });
    data = getUnions(district, upazila);
  } else if (level === "zip") {
    if (!district || !upazila) return NextResponse.json({ error: "district and upazila required" }, { status: 400 });
    data = { zip: zipForUpazila(district, upazila) };
  } else {
    return NextResponse.json({ error: "Invalid level" }, { status: 400 });
  }

  const res = NextResponse.json({ country: COUNTRY, version: GEO_VERSION, level, data });
  // Reference data changes rarely — cache aggressively
  res.headers.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  return res;
}
