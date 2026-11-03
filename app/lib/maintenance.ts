import { NextResponse } from "next/server";
import { SITE_NAME } from "./site";

// Mode pemeliharaan situs, diatur lewat .env (perlu restart aplikasi):
//   MAINTENANCE_MODE=true
//   MAINTENANCE_TITLE="Sedang Pemeliharaan"
//   MAINTENANCE_MESSAGE="Kami sedang memindahkan server.\nEstimasi selesai pukul 22.00 WIB."
// File ini dipakai proxy.ts dan instrumentation.ts, jadi jangan mengimpor Prisma:
// saat mode ini aktif, database boleh jadi sedang tidak bisa dihubungi.

const DEFAULT_TITLE = "Sedang Pemeliharaan";
const DEFAULT_MESSAGE =
  "Layanan sedang dalam pemeliharaan dan akan segera kembali. Silakan coba lagi beberapa saat lagi.";

export function isMaintenanceMode(): boolean {
  const value = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "on";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderPage(title: string, message: string): string {
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<link rel="icon" href="data:,">
<title>${escapeHtml(title)} | ${SITE_NAME}</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; background: #0a0a0a; color: #e5e5e5; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 480px; text-align: center; }
  .brand { font-size: 14px; color: #737373; margin: 0 0 16px; }
  h1 { font-size: 28px; line-height: 1.25; color: #fff; margin: 0 0 12px; }
  p.message { font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-line; overflow-wrap: anywhere; }
</style>
</head>
<body>
<main>
  <p class="brand">${SITE_NAME}</p>
  <h1>${escapeHtml(title)}</h1>
  <p class="message">${escapeHtml(message)}</p>
</main>
</body>
</html>`;
}

export function maintenanceResponse(pathname: string): NextResponse {
  const title = process.env.MAINTENANCE_TITLE?.trim() || DEFAULT_TITLE;
  const message = process.env.MAINTENANCE_MESSAGE?.trim() || DEFAULT_MESSAGE;
  const headers = { "Cache-Control": "no-store" };

  if (/^\/(api|v1)(\/|$)/.test(pathname)) {
    return NextResponse.json(
      {
        error: {
          message,
          type: "service_unavailable",
          param: null,
          code: "site_maintenance",
        },
      },
      { status: 503, headers },
    );
  }

  return new NextResponse(renderPage(title, message), {
    status: 503,
    headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
  });
}
