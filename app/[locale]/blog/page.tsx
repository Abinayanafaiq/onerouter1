import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/app/components/public-shell";
import { BreadcrumbJsonLd } from "@/app/components/breadcrumb-json-ld";
import { getAllPosts } from "@/app/lib/blog-posts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("blogTitle"),
    description: t("blogDescription"),
    alternates: {
      canonical: `/${locale}/blog`,
      languages: { "id-ID": "/id/blog", "en-US": "/en/blog", "x-default": "/id/blog" },
    },
    openGraph: {
      title: t("blogTitle"),
      description: t("blogDescription"),
      url: `/${locale}/blog`,
    },
  };
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Blog");
  const tc = await getTranslations("Common");
  const posts = getAllPosts();

  return (
    <PublicShell>
      <BreadcrumbJsonLd
        items={[
          { name: tc("home"), path: `/${locale}` },
          { name: tc("blog"), path: `/${locale}/blog` },
        ]}
      />
      <section className="px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            {t("title")}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            {t("subtitle")}
          </p>

          <ul className="mt-12 space-y-4">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="glass card-hover block rounded-2xl p-5 transition"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full border border-white/10 px-2 py-0.5">
                      {p.category}
                    </span>
                    <time dateTime={p.publishedAt}>
                      {new Date(p.publishedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                    <span>·</span>
                    <span>{p.readingMinutes} mnt baca</span>
                  </div>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight">{p.title}</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">{p.description}</p>
                  <span className="mt-3 inline-block text-[13px] text-accent">Baca artikel →</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-12 rounded-2xl border border-white/10 p-6 text-sm text-muted-foreground">
            Siap coba? Lihat{" "}
            <Link href="/models" className="text-accent underline">
              katalog model
            </Link>{" "}
            atau{" "}
            <Link href="/pricing" className="text-accent underline">
              harga token
            </Link>
            .
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
