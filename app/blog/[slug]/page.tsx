import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/app/components/public-shell";
import { BreadcrumbJsonLd } from "@/app/components/breadcrumb-json-ld";
import { getAllPosts, getPostBySlug } from "@/app/lib/blog-posts";
import { getSiteUrl } from "@/app/lib/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Artikel tidak ditemukan" };
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const base = getSiteUrl();
  const others = getAllPosts().filter((p) => p.slug !== post.slug).slice(0, 3);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: "OneRouter" },
    publisher: {
      "@type": "Organization",
      name: "OneRouter",
      url: base,
    },
    mainEntityOfPage: `${base}/blog/${post.slug}`,
    keywords: post.keywords.join(", "),
    inLanguage: "id-ID",
  };

  return (
    <PublicShell>
      <BreadcrumbJsonLd
        items={[
          { name: "Beranda", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />

      <article className="px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
            <Link href="/blog" className="text-accent hover:underline">
              Blog
            </Link>
            <span>/</span>
            <span>{post.category}</span>
            <span>·</span>
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
            <span>·</span>
            <span>{post.readingMinutes} mnt baca</span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>

          <div className="mt-10 space-y-10">
            {post.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-xl font-bold tracking-tight">{s.heading}</h2>
                {s.paragraphs.map((para) => (
                  <p key={para.slice(0, 40)} className="mt-3 text-[15px] leading-relaxed text-foreground/90">
                    {para}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-accent/20 bg-accent/5 p-6">
            <h2 className="text-lg font-bold">Coba API model AI murah sekarang</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Satu API key, multi-model, bayar per token. Lihat{" "}
              <Link href="/models" className="text-accent underline">
                katalog model
              </Link>{" "}
              dan{" "}
              <Link href="/pricing" className="text-accent underline">
                harga
              </Link>
              .
            </p>
            <Link
              href="/register"
              className="btn-accent mt-4 inline-flex rounded-xl px-5 py-2.5 text-sm"
            >
              Daftar gratis
            </Link>
          </div>

          {others.length > 0 && (
            <section className="mt-14">
              <h2 className="text-lg font-bold">Artikel terkait</h2>
              <ul className="mt-4 space-y-3">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link
                      href={`/blog/${o.slug}`}
                      className="block rounded-xl border border-white/10 p-4 text-sm transition hover:border-white/20"
                    >
                      <div className="font-semibold">{o.title}</div>
                      <div className="mt-1 text-[12px] text-muted-foreground">{o.description}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </article>
    </PublicShell>
  );
}
