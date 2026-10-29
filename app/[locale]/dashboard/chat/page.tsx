import { getTranslations } from "next-intl/server";
import { auth } from "@/app/lib/auth";
import { getOrCreateWallet } from "@/app/lib/wallet";
import { getAvailableModels } from "@/app/lib/models";
import { prisma } from "@/app/lib/prisma";
import { Link } from "@/i18n/navigation";
import { ChatPlayground } from "./chat-playground";
import { NoApiKey } from "./no-api-key";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;

  const t = await getTranslations("Chat");

  const wallet = await getOrCreateWallet(userId);
  const models = await getAvailableModels();
  const balance = Number(wallet.balance);

  // Count all keys and active keys for diagnostics.
  const totalKeys = await prisma.apiKey.count({ where: { userId, deletedAt: null } });
  const activeKeys = await prisma.apiKey.count({
    where: {
      userId,
      isActive: true,
      enabled: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  // Pick the user's most recent active API key. This must NOT filter on the
  // `key` column — user-generated keys store only a hash (key=null) by design,
  // and the chat playground authenticates via the session through an internal
  // endpoint, so it never needs the plaintext key in the browser.
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      userId,
      isActive: true,
      enabled: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      enabled: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      allowedModels: true,
    },
  });

  // Debug logging (per debug checklist).
  console.log("[chat/page] diagnostics:", {
    userId,
    totalKeys,
    activeKeys,
    selectedKey: apiKey
      ? {
          id: apiKey.id,
          name: apiKey.name,
          enabled: apiKey.enabled,
          isActive: apiKey.isActive,
          expiresAt: apiKey.expiresAt,
          hasExpiry: apiKey.expiresAt !== null,
          isExpired: apiKey.expiresAt ? new Date(apiKey.expiresAt) <= new Date() : false,
        }
      : null,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground transition hover:text-foreground"
        >
          ← {t("backToDashboard")}
        </Link>
      </div>

      {!apiKey ? (
        <NoApiKey />
      ) : balance <= 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
          <p className="text-sm text-amber-400">
            {t.rich("noBalance", {
              link: (chunks) => (
                <Link href="/dashboard/wallet" className="font-medium underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      ) : (
        <ChatPlayground
          models={models.map((m) => ({
            id: m.modelId,
            name: m.name,
            inputPrice: Number(m.inputPricePerMillion),
            outputPrice: Number(m.outputPricePerMillion),
          }))}
          initialBalance={balance}
        />
      )}
    </div>
  );
}
