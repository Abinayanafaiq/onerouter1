import type { MetadataRoute } from "next";
import { getAllPosts } from "@/app/lib/blog-posts";
import { getEnabledModels } from "@/app/lib/models";
import { getSiteUrl } from "@/app/lib/site";
import { locales } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const staticPaths = ["", "/pricing", "/models", "/blog"];
  const priorities: Record<string, number> = {
    "": 1,
    "/pricing": 0.95,
    "/models": 0.95,
    "/blog": 0.9,
  };

  const staticRoutes: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    staticPaths.map((path) => ({
      url: `${base}/${locale}${path}`,
      changeFrequency: path === "" || path === "/models" ? ("daily" as const) : ("weekly" as const),
      priority: priorities[path] ?? 0.5,
      alternates: {
        languages: Object.fromEntries(
          [...locales.map((l) => [l, `${base}/${l}${path}`]), ["x-default", `${base}/id${path}`]],
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
        changeFrequency: "weekly" as const,
        priority: 0.85,
        alternates: {
          languages: Object.fromEntries([
            ...locales.map((l) => [l, `${base}/${l}/models/${encodeURIComponent(m.modelId)}`]),
            ["x-default", `${base}/id/models/${encodeURIComponent(m.modelId)}`],
          ]),
        },
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
      alternates: {
        languages: Object.fromEntries([
          ...locales.map((l) => [l, `${base}/${l}/blog/${p.slug}`]),
          ["x-default", `${base}/id/blog/${p.slug}`],
        ]),
      },
    })),
  );

  return [...staticRoutes, ...modelRoutes, ...blogRoutes];
}
