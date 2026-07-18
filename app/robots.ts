import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/app/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  const privatePaths = ["admin", "dashboard", "checkout"];
  const localizedPrivatePaths = ["id", "en"].flatMap((locale) =>
    privatePaths.flatMap((path) => [`/${locale}/${path}`, `/${locale}/${path}/`]),
  );
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...localizedPrivatePaths, "/api/", "/v1/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
