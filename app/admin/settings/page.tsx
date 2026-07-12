import { getPakasirSettings } from "@/app/lib/pakasir";
import { PakasirForm } from "./pakasir-form";

export default async function AdminSettingsPage() {
  const settings = await getPakasirSettings();
  const maskedApiKey = settings.apiKey
    ? `${settings.apiKey.slice(0, 4)}${"*".repeat(Math.max(0, settings.apiKey.length - 8))}${settings.apiKey.slice(-4)}`
    : "";

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Pengaturan</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Konfigurasi payment gateway Pakasir
        </p>
      </div>
      <PakasirForm
        initial={{
          slug: settings.slug,
          apiKeyMasked: maskedApiKey,
          apiKeySet: !!settings.apiKey,
          webhookSecretSet: !!settings.webhookSecret,
        }}
      />
    </div>
  );
}
