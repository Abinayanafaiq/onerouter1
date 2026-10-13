import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { getAvailableModels } from "@/app/lib/models";
import { getEnabledPackageModels } from "@/app/lib/package-models";
import { CopyableCode } from "@/app/components/copyable-code";

export const dynamic = "force-dynamic";

const API_BASE_URL = "https://9inference.cloud/v1";
const PACKAGE_BASE_URL = "https://9inference.cloud/v1/package";

function opencodeConfig(providerId: string, name: string, baseURL: string, modelIds: string[]) {
  return JSON.stringify(
    {
      $schema: "https://opencode.ai/config.json",
      provider: {
        [providerId]: {
          npm: "@ai-sdk/openai-compatible",
          name,
          options: {
            baseURL,
            apiKey: "{env:NINEINFERENCE_API_KEY}",
          },
          models: Object.fromEntries(modelIds.map((id) => [id, { name: id }])),
        },
      },
      model: `${providerId}/${modelIds[0]}`,
    },
    null,
    2,
  );
}

export default async function DocsPage() {
  const t = await getTranslations("Docs");
  const [availableModels, packageModels] = await Promise.all([
    getAvailableModels(),
    getEnabledPackageModels(),
  ]);
  const sampleModel = availableModels[0]?.modelId ?? "glm-5.2";
  const paygModelIds = availableModels.slice(0, 3).map((m) => m.modelId);
  const packageModelIds = packageModels.slice(0, 3).map((m) => m.modelId);

  const opencodePaygCode = opencodeConfig(
    "9inference",
    "9inference (PAYG)",
    API_BASE_URL,
    paygModelIds.length > 0 ? paygModelIds : [sampleModel],
  );
  const opencodePackageCode = opencodeConfig(
    "9inference-paket",
    "9inference (Paket)",
    PACKAGE_BASE_URL,
    packageModelIds.length > 0 ? packageModelIds : [sampleModel],
  );

  const opencodeInstallCode = `npm install -g opencode-ai`;

  const opencodeEnvCode = `# macOS / Linux
export NINEINFERENCE_API_KEY="sk_live_xxx"

# Windows (PowerShell) — ${t("opencodeEnvWinComment")}
setx NINEINFERENCE_API_KEY "sk_live_xxx"`;

  const opencodeRunCode = `cd ${t("opencodeRunPath")}
opencode

# ${t("opencodeRunComment")}
/models`;

  const opencodeErrors = [
    { code: "403 package_endpoint_required", desc: t("opencodeErrPackageEndpoint") },
    { code: "403 package_key_required", desc: t("opencodeErrPackageKey") },
    { code: "402 package_quota_exhausted", desc: t("opencodeErrQuota") },
    { code: "401 authentication_error", desc: t("opencodeErrAuth") },
    { code: "400 Extra inputs are not permitted", desc: t("opencodeErrExtraInputs") },
  ];

  const inlineCode = (chunks: ReactNode) => (
    <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[11px] text-foreground/90">{chunks}</code>
  );

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

      {/* PAYG vs Paket */}
      <section className="animate-fade-up-delay-1 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("endpointsTitle")}
        </h2>

        <div className="glass rounded-2xl p-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t.rich("endpointsDesc", {
              b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            })}
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="text-sm font-semibold tracking-tight">{t("paygTitle")}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t("paygDesc")}</p>
              <div className="mt-3">
                <CopyableCode code={API_BASE_URL} language="base url" />
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <li>{t.rich("paygKey", { link: (chunks) => <a href="/dashboard/api-keys" className="font-medium text-foreground underline">{chunks}</a> })}</li>
                <li>{t("paygBilling")}</li>
                <li>{t.rich("endpointChat", { path: "/v1/chat/completions", code: inlineCode })}</li>
                <li>{t.rich("endpointModels", { path: "/v1/models", code: inlineCode })}</li>
              </ul>
            </div>

            <div className="rounded-xl border border-accent/20 bg-accent/[0.05] p-4">
              <div className="text-sm font-semibold tracking-tight text-accent">{t("packageTitle")}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t("packageDesc")}</p>
              <div className="mt-3">
                <CopyableCode code={PACKAGE_BASE_URL} language="base url" />
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <li>{t.rich("packageKey", { link: (chunks) => <a href="/dashboard/packages" className="font-medium text-foreground underline">{chunks}</a> })}</li>
                <li>{t("packageBilling")}</li>
                <li>{t.rich("endpointChat", { path: "/v1/package/chat/completions", code: inlineCode })}</li>
                <li>{t.rich("endpointModels", { path: "/v1/package/models", code: inlineCode })}</li>
              </ul>
            </div>
          </div>

          <p className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-xs leading-relaxed text-muted-foreground">
            {t.rich("endpointsWarning", {
              b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
              code: inlineCode,
            })}
          </p>
        </div>
      </section>

      {/* OpenCode */}
      <section className="animate-fade-up-delay-2 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("opencodeTitle")}
        </h2>

        <div className="glass rounded-2xl p-6">
          <p className="text-xs leading-relaxed text-muted-foreground">{t("opencodeIntro")}</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">{t("opencodeStep1Title")}</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t.rich("opencodeStep1Desc", {
              link: (chunks) => (
                <a href="https://opencode.ai" target="_blank" rel="noreferrer" className="font-medium text-foreground underline">
                  {chunks}
                </a>
              ),
            })}
          </p>
          <div className="mt-2">
            <CopyableCode code={opencodeInstallCode} />
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">{t("opencodeStep2Title")}</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t.rich("opencodeStep2Desc", { code: inlineCode })}
          </p>
          <div className="mt-2">
            <CopyableCode code={opencodeEnvCode} />
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">{t("opencodeStep3Title")}</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t.rich("opencodeStep3Desc", { code: inlineCode })}
          </p>

          <p className="mt-4 text-xs font-medium text-foreground">{t("opencodeConfigPayg")}</p>
          <div className="mt-2">
            <CopyableCode code={opencodePaygCode} language="opencode.json" />
          </div>

          <p className="mt-4 text-xs font-medium text-accent">{t("opencodeConfigPackage")}</p>
          <div className="mt-2">
            <CopyableCode code={opencodePackageCode} language="opencode.json" />
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {t.rich("opencodeConfigNote", { code: inlineCode })}
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">{t("opencodeStep4Title")}</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t.rich("opencodeStep4Desc", { code: inlineCode })}
          </p>
          <div className="mt-2">
            <CopyableCode code={opencodeRunCode} />
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">{t("opencodeTroubleTitle")}</h3>
          <ul className="mt-3 space-y-2.5">
            {opencodeErrors.map((e) => (
              <li key={e.code} className="text-xs leading-relaxed text-muted-foreground">
                <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[11px] text-red-400">{e.code}</code>
                <span className="ml-2">{e.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Reference */}
      <section className="animate-fade-up-delay-2 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("reference")}
        </h2>

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

        {packageModels.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold tracking-tight">{t("packageModels")}</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">{t("packageModelsDesc")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {packageModels.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-accent/20 bg-accent/[0.05] px-2 py-1 font-mono text-[11px] text-foreground/80"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {m.modelId}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
