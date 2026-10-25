import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { APP_NAME } from "@/app/lib/constants";
import { WALLET_TOPUP_PACKAGE_ID } from "@/app/lib/order-approval";
import { Link, redirect } from "@/i18n/navigation";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Invoice — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

const SITE_DOMAIN = "9inference.cloud";
const TIME_ZONE = "Asia/Jakarta";

// Nomor invoice diturunkan dari tanggal lunas + id order, jadi tidak perlu
// kolom/migrasi baru dan selalu sama setiap kali dicetak ulang.
function invoiceNumber(orderId: string, paidAt: Date): string {
  const ymd = paidAt
    .toLocaleDateString("sv-SE", { timeZone: TIME_ZONE })
    .replaceAll("-", "");
  return `INV-${ymd}-${orderId.slice(-8).toUpperCase()}`;
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await auth();
  const locale = await getLocale();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) {
    redirect({ href: "/login", locale });
    return null;
  }

  const { orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { package: true, user: { select: { name: true, email: true, whatsapp: true } } },
  });
  // Hanya pemilik order (atau admin) yang boleh melihat, dan hanya order lunas.
  if (!order || (order.userId !== user.id && user.role !== "ADMIN") || order.status !== "APPROVED") {
    notFound();
  }

  const t = await getTranslations("Invoice");
  const paidAt = order.activatedAt ?? order.updatedAt;
  const number = invoiceNumber(order.id, paidAt);
  const isTopUp = order.packageId === WALLET_TOPUP_PACKAGE_ID;
  const dateFmt = (d: Date) =>
    d.toLocaleString(locale, { dateStyle: "long", timeStyle: "short", timeZone: TIME_ZONE });
  const idr = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

  const details: string[] = [];
  if (!isTopUp) {
    const quota = order.tokenQuotaSnapshot ?? order.package.tokenQuota;
    if (quota > BigInt(0)) details.push(t("quota", { tokens: Number(quota).toLocaleString(locale) }));
    const hours = order.durationHoursSnapshot ?? order.package.durationDays * 24;
    if (hours) {
      details.push(
        hours % 24 === 0 ? t("durationDays", { days: hours / 24 }) : t("durationHours", { hours }),
      );
    }
  }

  const method = [order.paymentMethod.replaceAll("_", " "), order.pakasirMethod?.toUpperCase()]
    .filter(Boolean)
    .join(" · ");
  const customerWa = order.user.whatsapp || order.whatsapp;

  return (
    <div className="invoice-root min-h-screen bg-neutral-100 px-4 py-8 text-neutral-900 print:bg-white print:p-0">
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          html, body { background: #fff !important; }
          body::before { display: none !important; }
          .invoice-root { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={isTopUp ? "/dashboard/wallet" : "/dashboard/packages"}
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          ← {t("back")}
        </Link>
        <PrintButton label={t("print")} />
      </div>

      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200 sm:p-10 print:max-w-none print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200 pb-6">
          <div>
            <p className="text-2xl font-bold tracking-tight">{APP_NAME}</p>
            <p className="mt-1 text-sm text-neutral-500">{SITE_DOMAIN}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold uppercase tracking-wide text-neutral-800">{t("title")}</p>
            <p className="mt-1 font-mono text-sm text-neutral-600">{number}</p>
            <span className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {t("paid")}
            </span>
          </div>
        </header>

        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{t("billedTo")}</p>
            {order.user.name && <p className="mt-2 font-semibold">{order.user.name}</p>}
            <p className={order.user.name ? "text-sm text-neutral-600" : "mt-2 font-semibold"}>{order.user.email}</p>
            {customerWa && <p className="text-sm text-neutral-600">{customerWa}</p>}
          </div>
          <dl className="space-y-1.5 text-sm sm:text-right">
            <div>
              <dt className="inline text-neutral-500">{t("orderDate")}: </dt>
              <dd className="inline">{dateFmt(order.createdAt)}</dd>
            </div>
            <div>
              <dt className="inline text-neutral-500">{t("paidDate")}: </dt>
              <dd className="inline">{dateFmt(paidAt)}</dd>
            </div>
            <div>
              <dt className="inline text-neutral-500">{t("paymentMethod")}: </dt>
              <dd className="inline">{method}</dd>
            </div>
            <div>
              <dt className="inline text-neutral-500">{t("orderId")}: </dt>
              <dd className="inline font-mono text-xs">{order.id}</dd>
            </div>
          </dl>
        </section>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500">
              <th className="py-3 pr-4 font-semibold">{t("item")}</th>
              <th className="py-3 pr-4 text-center font-semibold">{t("qty")}</th>
              <th className="py-3 text-right font-semibold">{t("amount")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-200 align-top">
              <td className="py-4 pr-4">
                <p className="font-medium">{isTopUp ? t("walletTopUp") : order.package.name}</p>
                {details.length > 0 && <p className="mt-1 text-xs text-neutral-500">{details.join(" · ")}</p>}
              </td>
              <td className="py-4 pr-4 text-center">1</td>
              <td className="py-4 text-right font-mono">{idr(order.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-4 pr-4 text-right font-semibold">{t("total")}</td>
              <td className="pt-4 text-right font-mono text-lg font-bold">{idr(order.amount)}</td>
            </tr>
          </tfoot>
        </table>

        <footer className="mt-12 border-t border-neutral-200 pt-6 text-xs leading-relaxed text-neutral-500">
          <p>{t("thanks", { app: APP_NAME })}</p>
          <p className="mt-1">{t("note")}</p>
        </footer>
      </article>
    </div>
  );
}
