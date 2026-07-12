import { auth } from "@/app/lib/auth";
import { getOrCreateWallet } from "@/app/lib/wallet";
import { getAvailableModels } from "@/app/lib/models";
import { prisma } from "@/app/lib/prisma";
import Link from "next/link";
import { ChatPlayground } from "./chat-playground";
import { NoApiKey } from "./no-api-key";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;

  const wallet = await getOrCreateWallet(userId);
  const models = await getAvailableModels();
  const balance = Number(wallet.balance);

  // Count all keys and active keys for diagnostics.
  const totalKeys = await prisma.apiKey.count({ where: { userId } });
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
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Chat Playground</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test API & lihat billing real-time
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground transition"
        >
          ← Dashboard
        </Link>
      </div>

      {!apiKey ? (
        <NoApiKey />
      ) : balance <= 0 ? (
        <div className="border border-yellow-500/30 bg-yellow-500/10 rounded-lg p-6 text-center">
          <p className="text-sm text-yellow-700">
            Saldo wallet habis.{" "}
            <Link href="/dashboard/wallet" className="font-medium underline">Top up dulu</Link>{" "}
            untuk mulai chat.
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
