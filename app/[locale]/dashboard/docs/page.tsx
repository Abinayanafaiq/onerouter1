import { getTranslations } from "next-intl/server";
import { getAvailableModels } from "@/app/lib/models";
import { CopyableCode } from "@/app/components/copyable-code";

export const dynamic = "force-dynamic";

const API_BASE_URL = "https://9inference.cloud/v1";

export default async function DocsPage() {
  const t = await getTranslations("Docs");
  const availableModels = await getAvailableModels();
  const sampleModel = availableModels[0]?.modelId ?? "glm-5.2";

  const curlCode = `curl ${API_BASE_URL}/chat/completions \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${sampleModel}",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ]
  }'`;

  const jsCode = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${API_BASE_URL}",
  apiKey: process.env.NINEINFERENCE_API_KEY,
});

const res = await client.chat.completions.create({
  model: "${sampleModel}",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(res.choices[0].message.content);`;

  const billingCode = `"x_billing": {
  "inputTokens": 10,
  "outputTokens": 25,
  "totalTokens": 35,
  "inputCost": 0.01,
  "outputCost": 0.075,
  "totalCost": 0.085,
  "remainingBalance": 9999.92
}`;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      {/* Quickstart */}
      <section className="animate-fade-up-delay-1 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("quickstart")}
        </h2>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">{t("step1Title")}</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t.rich("step1Desc", {
              link: (chunks) => (
                <a href="/dashboard/api-keys" className="font-medium text-foreground underline">
                  {chunks}
                </a>
              ),
              code: (chunks) => (
                <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[11px]">{chunks}</code>
              ),
            })}
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">{t("step2Title")}</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">cURL</p>
          <div className="mt-2">
            <CopyableCode code={curlCode} />
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">{t("step3Title")}</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("step3Desc")}
          </p>
          <div className="mt-2">
            <CopyableCode code={jsCode} language="javascript" />
          </div>
        </div>
      </section>

      {/* Reference */}
      <section className="animate-fade-up-delay-2 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("reference")}
        </h2>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">{t("baseUrl")}</h3>
          <div className="mt-2">
            <CopyableCode code={API_BASE_URL} language="text" />
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">{t("authentication")}</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("authenticationDesc")}
          </p>
          <div className="mt-2">
            <CopyableCode code={`Authorization: Bearer sk_live_xxx`} language="text" />
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">{t("billing")}</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t.rich("billingDesc", {
              code: (chunks) => <code className="font-mono text-[11px]">{chunks}</code>,
            })}
          </p>
          <div className="mt-2">
            <CopyableCode code={billingCode} language="json" />
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">{t("availableModels")}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableModels.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-foreground/80"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {m.modelId}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
