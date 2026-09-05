import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://omm.jobayergroup.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/s", "/listings/", "/properties/"],
        disallow: ["/dashboard", "/messes", "/api/", "/admin", "/profile", "/notifications"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
