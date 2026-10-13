import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Favicon disajikan dari DB lewat /api/site/favicon, tapi /api/ diblokir di
  // robots.txt sehingga Google tidak bisa mengambilnya. Alias di root ini bisa
  // di-crawl, dan /favicon.ico adalah lokasi bawaan yang dicari crawler.
  async rewrites() {
    return [
      { source: "/favicon.png", destination: "/api/site/favicon" },
      { source: "/favicon.ico", destination: "/api/site/favicon" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
