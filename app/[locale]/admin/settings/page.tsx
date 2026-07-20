import { getPakasirSettings } from "@/app/lib/pakasir";
import { getBscSettings } from "@/app/lib/crypto-bsc";
import { getTelegramGroupUrl } from "@/app/lib/telegram";
import { getAdmin2FASettings } from "@/app/lib/admin-2fa";
import { PakasirForm } from "./pakasir-form";
import { BscForm } from "./bsc-form";
import { TelegramForm } from "./telegram-form";
import { Admin2FAForm } from "./admin-2fa-form";
import { FaviconUploader } from "./favicon-uploader";
import { prisma } from "@/app/lib/prisma";

export default async function AdminSettingsPage() {
  const [settings, bscSettings, telegramUrl, admin2FA, favicon] = await Promise.all([
    getPakasirSettings(),
    getBscSettings(),
    getTelegramGroupUrl(),
    getAdmin2FASettings(),
    prisma.setting.findUnique({ where: { key: "site_favicon" }, select: { value: true } }),
  ]);
  const maskedApiKey = settings.apiKey
    ? `${settings.apiKey.slice(0, 4)}${"*".repeat(Math.max(0, settings.apiKey.length - 8))}${settings.apiKey.slice(-4)}`
    : "";

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Pengaturan</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Konfigurasi payment gateway & integrasi
        </p>
      </div>
      <FaviconUploader currentImage={favicon?.value ?? null} />
      <Admin2FAForm
        initial={{
          enabled: admin2FA.enabled,
          question: admin2FA.question,
          answerSet: !!admin2FA.answerHash,
        }}
      />
      <PakasirForm
        initial={{
          slug: settings.slug,
          apiKeyMasked: maskedApiKey,
          apiKeySet: !!settings.apiKey,
          webhookSecretSet: !!settings.webhookSecret,
        }}
      />
      <BscForm
        initial={{
          walletAddress: bscSettings.walletAddress,
          rpcUrl: bscSettings.rpcUrl,
          confirmations: bscSettings.confirmations,
          isConfigured: !!bscSettings.walletAddress,
        }}
      />
      <TelegramForm initialUrl={telegramUrl} />
    </div>
  );
}
