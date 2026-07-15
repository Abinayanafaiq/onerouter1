import Link from "next/link";
import { SiteHeader } from "@/app/components/site-header";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      {children}
      <footer className="border-t border-white/[0.06] px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-sm font-semibold">OneRouter</div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              API model AI murah — bayar per token, kompatibel OpenAI.
            </p>
          </div>
          <FooterCol
            title="Produk"
            links={[
              { label: "Model AI", href: "/models" },
              { label: "Harga Token", href: "/pricing" },
              { label: "Blog", href: "/blog" },
              { label: "Daftar", href: "/register" },
            ]}
          />
          <FooterCol
            title="Belajar"
            links={[
              { label: "API Model AI Murah", href: "/blog/api-model-ai-murah-indonesia" },
              { label: "DeepSeek API Murah", href: "/blog/deepseek-api-murah-cara-pakai" },
              { label: "Alternatif OpenAI", href: "/blog/alternatif-openai-api-murah" },
              { label: "Bayar Per Token", href: "/blog/bayar-per-token-vs-langganan" },
            ]}
          />
          <FooterCol
            title="Akun"
            links={[
              { label: "Masuk", href: "/login" },
              { label: "Dashboard", href: "/dashboard" },
              { label: "Isi Saldo", href: "/dashboard/wallet" },
            ]}
          />
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-[12px] text-muted-foreground">
          © {new Date().getFullYear()} OneRouter. API model murah untuk developer Indonesia.
        </p>
      </footer>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href}
              className="text-[13px] text-muted-foreground transition hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
