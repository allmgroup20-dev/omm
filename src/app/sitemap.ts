import type { MetadataRoute } from "next";
import { getDb } from "@/db";
import { listings } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://omm.jobayergroup.com";
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/s`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const db = getDb();
    const published = await db.select().from(listings).where(eq(listings.status, "published")).limit(1000);
    const listingUrls: MetadataRoute.Sitemap = published.map((l) => ({
      url: `${base}/listings/${l.slug}`,
      lastModified: new Date(l.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }));
    return [...staticRoutes, ...listingUrls];
  } catch {
    return staticRoutes;
  }
}
