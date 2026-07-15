import type { MetadataRoute } from "next";
import { getAllPosts } from "@/app/lib/blog-posts";
import { getEnabledModels } from "@/app/lib/models";
import { getSiteUrl } from "@/app/lib/site";
import { locales } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticPaths = ["", "/pricing", "/models", "/blog", "/register", "/login"];
  const priorities: Record<string, number> = {
    "": 1,
    "/pricing": 0.95,
    "/models": 0.95,
    "/blog": 0.9,
    "/register": 0.75,
    "/login": 0.4,
  };

  const staticRoutes: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    staticPaths.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: now,
      changeFrequency: path === "" || path === "/models" ? ("daily" as const) : ("weekly" as const),
      priority: priorities[path] ?? 0.5,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${base}/${l}${path}`]),
        ),
      },
    })),
  );

  let modelRoutes: MetadataRoute.Sitemap = [];
  try {
    const models = await getEnabledModels();
    modelRoutes = locales.flatMap((locale) =>
      models.map((m) => ({
        url: `${base}/${locale}/models/${encodeURIComponent(m.modelId)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.85,
      })),
    );
  } catch {
    modelRoutes = [];
  }

  const blogRoutes: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    getAllPosts().map((p) => ({
      url: `${base}/${locale}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  );

  return [...staticRoutes, ...modelRoutes, ...blogRoutes];
}
