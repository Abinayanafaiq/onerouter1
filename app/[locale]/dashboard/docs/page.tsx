import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { getAvailableModels } from "@/app/lib/models";
import { getEnabledPackageModels } from "@/app/lib/package-models";
import { CopyableCode } from "@/app/components/copyable-code";
import { DocsTabs } from "@/app/components/docs-tabs";

export const dynamic = "force-dynamic";

const API_BASE_URL = "https://9inference.cloud/v1";
const PACKAGE_BASE_URL = "https://9inference.cloud/v1/package";

// Custom-provider models are text-only in OpenCode unless `modalities.input`
// lists "image"; otherwise attached images are replaced with an error text.
const OPENCODE_IMAGE_FIELDS = {
  attachment: true,
  modalities: { input: ["text", "image"], output: ["text"] },
};

function opencodeConfig(
  providerId: string,
  name: string,
  baseURL: string,
  modelIds: string[],
  imageModelIds: ReadonlySet<string> = new Set(),
) {
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
          models: Object.fromEntries(
            modelIds.map((id) => [id, imageModelIds.has(id) ? { name: id, ...OPENCODE_IMAGE_FIELDS } : { name: id }]),
          ),
        },
      },
      model: `${providerId}/${modelIds[0]}`,
    },
    null,
    2,
  );
}

function harnessConfig(providerId: string, baseURL: string, modelIds: string[]) {
  return `- id: llm-pi-ai
  config:
    providers:
      ${providerId}:
        apiKeyEnv: NINEINFERENCE_API_KEY
        api: openai-completions
        baseURL: ${baseURL}
        compat:
          supportsDeveloperRole: false
          maxTokensField: max_tokens
        models:
${modelIds.map((id) => `          - id: ${id}`).join("\n")}`;
}

// Zed reads the key from `<PROVIDER_ID>_API_KEY` (upper snake case) or the
// system keychain; it must never be stored in settings.json.
function zedConfig(
  providerId: string,
  baseURL: string,
  modelIds: string[],
  imageModelIds: ReadonlySet<string> = new Set(),
) {
  return JSON.stringify(
    {
      language_models: {
        openai_compatible: {
          [providerId]: {
            api_url: baseURL,
            available_models: modelIds.map((id) => ({
              name: id,
              display_name: id,
              max_tokens: 128000,
              capabilities: {
                tools: true,
                images: imageModelIds.has(id),
                parallel_tool_calls: false,
                prompt_cache_key: false,
              },
            })),
          },
        },
      },
    },
    null,
    2,
  );
}

function PanelHeader({ logo, name, href, children }: { logo: string; name: string; href: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4 border-b border-white/[0.06] pb-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt={`Logo ${name}`}
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-xl border border-white/[0.08] bg-black/60 object-contain p-2"
      />
      <div className="min-w-0">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-base font-semibold tracking-tight hover:text-accent"
        >
          {name}
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-muted-foreground" aria-hidden>
            <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="group relative pb-7 pl-11 last:pb-0">
      <span className="absolute left-0 top-0 grid h-7 w-7 place-items-center rounded-full border border-accent/30 bg-accent/10 text-xs font-semibold text-accent">
        {n}
      </span>
      <span className="absolute bottom-1 left-3.5 top-9 w-px bg-white/[0.08] group-last:hidden" aria-hidden />
      <h3 className="pt-1 text-sm font-semibold tracking-tight">{title}</h3>
      <div className="mt-1.5 space-y-3 text-xs leading-relaxed text-muted-foreground">{children}</div>
    </li>
  );
}

function FieldTable({
  columns,
  rows,
}: {
  columns: { label: string; accent?: boolean }[];
  rows: { label: string; values: string[] }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-black/30">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-muted-foreground">
            {columns.map((c) => (
              <th key={c.label} className={`px-3 py-2 font-medium ${c.accent ? "text-accent" : ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-white/[0.04] last:border-0">
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{r.label}</td>
              {r.values.map((v, i) => (
                <td key={i} className="px-3 py-2 font-mono text-[11px] text-foreground/90">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlowDiagram({ nodes }: { nodes: { title: string; sub: string; accent?: boolean }[] }) {
  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      {nodes.map((node, i) => (
        <div key={node.title} className="contents">
          {i > 0 && (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 self-center rotate-90 text-muted-foreground sm:rotate-0" aria-hidden>
              <path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <div
            className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-center ${
              node.accent ? "border-accent/30 bg-accent/[0.06]" : "border-white/[0.08] bg-white/[0.02]"
            }`}
          >
            <div className={`text-xs font-semibold tracking-tight ${node.accent ? "text-accent" : ""}`}>{node.title}</div>
            <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{node.sub}</div>
          </div>
        </div>
      ))}
    </div>
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
  const imageModels = availableModels.filter((m) => m.supportsImages);
  const imageModelIds = new Set(imageModels.map((m) => m.modelId));
  // Make sure the OpenCode sample config shows at least one image-capable model.
  const opencodePaygModelIds = [
    ...(paygModelIds.length > 0 ? paygModelIds : [sampleModel]),
    ...(imageModels[0] && !paygModelIds.includes(imageModels[0].modelId) ? [imageModels[0].modelId] : []),
  ];
  const sampleImageModel = imageModels[0]?.modelId ?? sampleModel;

  const opencodePaygCode = opencodeConfig(
    "9inference",
    "9inference (PAYG)",
    API_BASE_URL,
    opencodePaygModelIds,
    imageModelIds,
  );
  const opencodePackageCode = opencodeConfig(
    "9inference-paket",
    "9inference (Paket)",
    PACKAGE_BASE_URL,
    packageModelIds.length > 0 ? packageModelIds : [sampleModel],
  );

  const harnessPaygCode = harnessConfig(
    "nineinference",
    API_BASE_URL,
    paygModelIds.length > 0 ? paygModelIds : [sampleModel],
  );
  const harnessPackageCode = harnessConfig(
    "nineinference-paket",
    PACKAGE_BASE_URL,
    packageModelIds.length > 0 ? packageModelIds : [sampleModel],
  );
  const harnessRunCode = `npx @deepseek-ai/dsh web`;
  const harnessFields = [
    { label: "Provider ID", payg: "nineinference", pkg: "nineinference-paket" },
    { label: "Base URL", payg: API_BASE_URL, pkg: PACKAGE_BASE_URL },
    { label: "API protocol", payg: "OpenAI Chat Completions", pkg: "OpenAI Chat Completions" },
    { label: "API key", payg: t("harnessFieldKeyPayg"), pkg: t("harnessFieldKeyPackage") },
  ];

  const zedPaygCode = zedConfig("nineinference", API_BASE_URL, opencodePaygModelIds, imageModelIds);
  const zedPackageCode = zedConfig(
    "nineinference-paket",
    PACKAGE_BASE_URL,
    packageModelIds.length > 0 ? packageModelIds : [sampleModel],
  );
  const zedEnvCode = `# macOS / Linux — PAYG
export NINEINFERENCE_API_KEY="sk_live_xxx"
# ${t("zedEnvPackageComment")}
export NINEINFERENCE_PAKET_API_KEY="pkg_xxx"

# Windows (PowerShell)
setx NINEINFERENCE_API_KEY "sk_live_xxx"
setx NINEINFERENCE_PAKET_API_KEY "pkg_xxx"`;
  const zedFields = [
    { label: "Provider ID", values: ["nineinference", "nineinference-paket"] },
    { label: "API URL", values: [API_BASE_URL, PACKAGE_BASE_URL] },
    { label: "API key", values: [t("harnessFieldKeyPayg"), t("harnessFieldKeyPackage")] },
  ];
  const zedErrors = [
    { code: t("zedErrNoProviderTitle"), desc: t("zedErrNoProvider") },
    { code: "401 authentication_error", desc: t("zedErrAuth") },
    { code: "403 package_endpoint_required", desc: t("opencodeErrPackageEndpoint") },
    { code: t("zedErrToolsTitle"), desc: t("zedErrTools") },
  ];

  const ninerouterPaygPrefix = "9i";
  const ninerouterPackagePrefix = "9i-paket";
  const ninerouterBaseUrl = "http://localhost:20128/v1";
  const samplePackageModel = packageModels[0]?.modelId ?? sampleModel;
  const ninerouterInstallCode = `npm install -g 9router
9router`;
  const ninerouterProviderFields = [
    { label: "Name", values: ["9inference PAYG", "9inference Paket"] },
    { label: "Prefix", values: [ninerouterPaygPrefix, ninerouterPackagePrefix] },
    { label: "API Type", values: ["Chat Completions", "Chat Completions"] },
    { label: "Base URL", values: [API_BASE_URL, PACKAGE_BASE_URL] },
  ];
  const ninerouterModelsCode = [
    ...(paygModelIds.length > 0 ? paygModelIds : [sampleModel]).map((id) => `${ninerouterPaygPrefix}/${id}`),
    ...packageModelIds.map((id) => `${ninerouterPackagePrefix}/${id}`),
  ].join("\n");
  const ninerouterClientFields = [
    { label: "Base URL", values: [ninerouterBaseUrl] },
    { label: "API key", values: [t("ninerouterFieldKey")] },
    { label: "Model", values: [`${ninerouterPaygPrefix}/${sampleModel}`] },
  ];
  const ninerouterCurlCode = `curl ${ninerouterBaseUrl}/chat/completions \\
  -H "Authorization: Bearer API_KEY_9ROUTER" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${ninerouterPaygPrefix}/${sampleModel}",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ]
  }'`;
  const ninerouterComboCode = `Combo Name : 9inference-hemat
${t("ninerouterComboStrategy")}   : Fallback — try in order

1. ${ninerouterPackagePrefix}/${samplePackageModel}
2. ${ninerouterPaygPrefix}/${sampleModel}`;
  const ninerouterErrors = [
    { code: t("ninerouterErr401Title"), desc: t("ninerouterErr401") },
    { code: t("ninerouterErrModelTitle"), desc: t("ninerouterErrModel") },
    { code: t("ninerouterErrImportTitle"), desc: t("ninerouterErrImport") },
    { code: t("ninerouterErrPackageTitle"), desc: t("ninerouterErrPackage") },
    { code: t("ninerouterErrApiTypeTitle"), desc: t("ninerouterErrApiType") },
    { code: t("ninerouterErrRefusedTitle"), desc: t("ninerouterErrRefused") },
  ];

  const opencodeInstallCode = `npm install -g opencode-ai`;

  const opencodeEnvCode = `# macOS / Linux
export NINEINFERENCE_API_KEY="sk_live_xxx"

# Windows (PowerShell) — ${t("opencodeEnvWinComment")}
setx NINEINFERENCE_API_KEY "sk_live_xxx"`;

  const opencodeRunCode = `cd ${t("opencodeRunPath")}
opencode

# ${t("opencodeRunComment")}
/models`;

  const opencodeImageConfigCode = JSON.stringify(
    { [sampleImageModel]: { name: sampleImageModel, ...OPENCODE_IMAGE_FIELDS } },
    null,
    2,
  );
  const opencodeImageRunCode = `opencode run -m 9inference/${sampleImageModel} -f screenshot.png "${t("opencodeImageRunPrompt")}"

# ${t("opencodeImageRunMultiComment")}
opencode run -m 9inference/${sampleImageModel} -f desain-lama.png -f desain-baru.png "${t("opencodeImageRunMultiPrompt")}"`;

  const opencodeErrors = [
    { code: "403 package_endpoint_required", desc: t("opencodeErrPackageEndpoint") },
    { code: "403 package_key_required", desc: t("opencodeErrPackageKey") },
    { code: "402 package_quota_exhausted", desc: t("opencodeErrQuota") },
    { code: "401 authentication_error", desc: t("opencodeErrAuth") },
    { code: "400 Extra inputs are not permitted", desc: t("opencodeErrExtraInputs") },
    { code: "this model does not support image input", desc: t("opencodeErrNoImage") },
  ];

  const inlineCode = (chunks: ReactNode) => (
    <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[11px] text-foreground/90">{chunks}</code>
  );

  const bold = (chunks: ReactNode) => <span className="font-medium text-foreground">{chunks}</span>;

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

      {/* IDE tutorials */}
      <section className="animate-fade-up-delay-2 space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("ideTitle")}
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground">{t("ideDesc")}</p>
        </div>

        <DocsTabs
          ariaLabel={t("ideTitle")}
          tabs={[
            {
              id: "opencode",
              label: "OpenCode",
              logo: "/logos/opencode.svg",
              hint: t("opencodeHint"),
              content: (
                <div className="glass rounded-2xl p-6">
                  <PanelHeader logo="/logos/opencode.svg" name="OpenCode" href="https://opencode.ai">
                    {t("opencodeIntro")}
                  </PanelHeader>

                  <ol className="mt-6">
                    <Step n={1} title={t("opencodeStep1Title")}>
                      <p>
                        {t.rich("opencodeStep1Desc", {
                          link: (chunks) => (
                            <a href="https://opencode.ai" target="_blank" rel="noreferrer" className="font-medium text-foreground underline">
                              {chunks}
                            </a>
                          ),
                        })}
                      </p>
                      <CopyableCode code={opencodeInstallCode} />
                    </Step>

                    <Step n={2} title={t("opencodeStep2Title")}>
                      <p>{t.rich("opencodeStep2Desc", { code: inlineCode })}</p>
                      <CopyableCode code={opencodeEnvCode} />
                    </Step>

                    <Step n={3} title={t("opencodeStep3Title")}>
                      <p>{t.rich("opencodeStep3Desc", { code: inlineCode })}</p>
                      <DocsTabs
                        variant="pills"
                        ariaLabel={t("configKeyType")}
                        tabs={[
                          {
                            id: "payg",
                            label: t("opencodeConfigPayg"),
                            content: <CopyableCode code={opencodePaygCode} language="opencode.json" />,
                          },
                          {
                            id: "package",
                            label: t("opencodeConfigPackage"),
                            content: <CopyableCode code={opencodePackageCode} language="opencode.json" />,
                          },
                        ]}
                      />
                      <p>{t.rich("opencodeConfigNote", { code: inlineCode })}</p>
                    </Step>

                    <Step n={4} title={t("opencodeStep4Title")}>
                      <p>{t.rich("opencodeStep4Desc", { code: inlineCode })}</p>
                      <CopyableCode code={opencodeRunCode} />
                    </Step>

                    <Step n={5} title={t("opencodeImageTitle")}>
                      <p>{t.rich("opencodeImageDesc", { b: bold, code: inlineCode })}</p>
                      <CopyableCode code={opencodeImageConfigCode} language="opencode.json" />
                      <p>{t.rich("opencodeImageConfigNote", { b: bold, code: inlineCode })}</p>

                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("opencodeImageModelsTitle")}
                        </div>
                        {imageModels.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {imageModels.map((m) => (
                              <span
                                key={m.id}
                                className="inline-flex items-center gap-1.5 rounded-md border border-accent/20 bg-accent/[0.05] px-2 py-1 font-mono text-[11px] text-foreground/80"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                                {m.modelId}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1.5">{t("opencodeImageModelsEmpty")}</p>
                        )}
                        <p className="mt-2">{t("opencodeImagePackageNote")}</p>
                      </div>

                      <p className="font-medium text-foreground">{t("opencodeImageHowTitle")}</p>
                      <ul className="space-y-2">
                        {(["opencodeImageHowPaste", "opencodeImageHowDrop", "opencodeImageHowPath"] as const).map((key) => (
                          <li key={key} className="flex gap-2">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                            <span>{t.rich(key, { b: bold, code: inlineCode })}</span>
                          </li>
                        ))}
                      </ul>

                      <p>{t.rich("opencodeImageRunDesc", { code: inlineCode })}</p>
                      <CopyableCode code={opencodeImageRunCode} />
                      <p className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                        {t.rich("opencodeImageLimits", { b: bold })}
                      </p>
                    </Step>
                  </ol>
                </div>
              ),
            },
            {
              id: "zed",
              label: "Zed",
              logo: "/logos/zed.svg",
              hint: t("zedHint"),
              content: (
                <div className="glass rounded-2xl p-6">
                  <PanelHeader logo="/logos/zed.svg" name="Zed" href="https://zed.dev">
                    {t("zedIntro")}
                  </PanelHeader>

                  <ol className="mt-6">
                    <Step n={1} title={t("zedStep1Title")}>
                      <p>
                        {t.rich("zedStep1Desc", {
                          link: (chunks) => (
                            <a href="https://zed.dev/download" target="_blank" rel="noreferrer" className="font-medium text-foreground underline">
                              {chunks}
                            </a>
                          ),
                        })}
                      </p>
                    </Step>

                    <Step n={2} title={t("zedStep2Title")}>
                      <p>{t.rich("zedStep2Desc", { b: bold, code: inlineCode })}</p>
                      <DocsTabs
                        variant="pills"
                        ariaLabel={t("configKeyType")}
                        tabs={[
                          {
                            id: "payg",
                            label: t("opencodeConfigPayg"),
                            content: <CopyableCode code={zedPaygCode} language="settings.json" />,
                          },
                          {
                            id: "package",
                            label: t("opencodeConfigPackage"),
                            content: <CopyableCode code={zedPackageCode} language="settings.json" />,
                          },
                        ]}
                      />
                      <p>{t.rich("zedStep2Note", { b: bold, code: inlineCode })}</p>
                      <FieldTable
                        columns={[{ label: t("harnessFieldCol") }, { label: "PAYG" }, { label: t("packageTitle"), accent: true }]}
                        rows={zedFields}
                      />
                    </Step>

                    <Step n={3} title={t("zedStep3Title")}>
                      <p>{t.rich("zedStep3Desc", { b: bold, code: inlineCode })}</p>
                      <p>{t.rich("zedStep3Env", { code: inlineCode })}</p>
                      <CopyableCode code={zedEnvCode} />
                      <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3">
                        {t.rich("zedStep3Warning", { b: bold, code: inlineCode })}
                      </p>
                    </Step>

                    <Step n={4} title={t("zedStep4Title")}>
                      <p>{t.rich("zedStep4Desc", { b: bold, code: inlineCode })}</p>
                      <p>{t.rich("zedStep4Image", { b: bold, code: inlineCode })}</p>
                    </Step>
                  </ol>

                  <details className="group/zed mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
                      {t("zedTroubleTitle")}
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-muted-foreground transition group-open/zed:rotate-180" aria-hidden>
                        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </summary>
                    <ul className="space-y-3 border-t border-white/[0.06] px-4 py-4">
                      {zedErrors.map((e) => (
                        <li key={e.code} className="text-xs leading-relaxed text-muted-foreground">
                          <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-red-400">{e.code}</code>
                          <p className="mt-1">{e.desc}</p>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              ),
            },
            {
              id: "deepseek-harness",
              label: "DeepSeek Harness",
              logo: "/logos/deepseek-harness.svg",
              hint: t("harnessHint"),
              content: (
                <div className="glass rounded-2xl p-6">
                  <PanelHeader
                    logo="/logos/deepseek-harness.svg"
                    name="DeepSeek Harness"
                    href="https://github.com/deepseek-ai/deepseek-harness"
                  >
                    {t("harnessIntro")}
                  </PanelHeader>

                  <ol className="mt-6">
                    <Step n={1} title={t("harnessStep1Title")}>
                      <p>{t.rich("harnessStep1Desc", { code: inlineCode })}</p>
                      <CopyableCode code={harnessRunCode} />
                    </Step>

                    <Step n={2} title={t("harnessStep2Title")}>
                      <p>
                        {t.rich("harnessStep2Desc", {
                          b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
                        })}
                      </p>
                      <FieldTable
                        columns={[{ label: t("harnessFieldCol") }, { label: "PAYG" }, { label: t("packageTitle"), accent: true }]}
                        rows={harnessFields.map((f) => ({ label: f.label, values: [f.payg, f.pkg] }))}
                      />
                    </Step>

                    <Step n={3} title={t("harnessStep3Title")}>
                      <p>
                        {t.rich("harnessStep3Desc", {
                          b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
                        })}
                      </p>
                    </Step>
                  </ol>

                  <details className="group/adv mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
                      {t("harnessAdvancedTitle")}
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-muted-foreground transition group-open/adv:rotate-180" aria-hidden>
                        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </summary>
                    <div className="space-y-3 border-t border-white/[0.06] px-4 py-4 text-xs leading-relaxed text-muted-foreground">
                      <p>{t.rich("harnessAdvancedDesc", { code: inlineCode })}</p>
                      <DocsTabs
                        variant="pills"
                        ariaLabel={t("configKeyType")}
                        tabs={[
                          {
                            id: "payg",
                            label: t("opencodeConfigPayg"),
                            content: <CopyableCode code={harnessPaygCode} language="cordis.patch.yml" />,
                          },
                          {
                            id: "package",
                            label: t("opencodeConfigPackage"),
                            content: <CopyableCode code={harnessPackageCode} language="cordis.patch.yml" />,
                          },
                        ]}
                      />
                      <p>{t.rich("harnessAdvancedNote", { code: inlineCode })}</p>
                    </div>
                  </details>
                </div>
              ),
            },
            {
              id: "9router",
              label: "9router",
              logo: "/logos/9router.svg",
              hint: t("ninerouterHint"),
              content: (
                <div className="glass rounded-2xl p-6">
                  <PanelHeader logo="/logos/9router.svg" name="9router" href="https://github.com/decolua/9router">
                    {t("ninerouterIntro")}
                  </PanelHeader>

                  <div className="mt-5 space-y-4">
                    <FlowDiagram
                      nodes={[
                        { title: t("ninerouterFlowTools"), sub: t("ninerouterFlowToolsSub") },
                        { title: "9router", sub: t("ninerouterFlowRouterSub"), accent: true },
                        { title: "9inference", sub: t("ninerouterFlowUpstreamSub") },
                      ]}
                    />
                    <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 text-xs leading-relaxed text-muted-foreground">
                      <div className="font-semibold text-amber-300">{t("ninerouterKeysTitle")}</div>
                      <p className="mt-1">{t.rich("ninerouterKeysDesc", { b: bold })}</p>
                    </div>
                  </div>

                  <ol className="mt-6">
                    <Step n={1} title={t("ninerouterStep1Title")}>
                      <p>{t.rich("ninerouterStep1Desc", { code: inlineCode })}</p>
                      <CopyableCode code={ninerouterInstallCode} />
                      <p>{t.rich("ninerouterStep1Note", { code: inlineCode })}</p>
                    </Step>

                    <Step n={2} title={t("ninerouterStep2Title")}>
                      <p>{t.rich("ninerouterStep2Desc", { b: bold })}</p>
                      <FieldTable
                        columns={[{ label: t("harnessFieldCol") }, { label: "PAYG" }, { label: t("packageTitle"), accent: true }]}
                        rows={ninerouterProviderFields}
                      />
                      <p>{t.rich("ninerouterStep2Note", { b: bold, code: inlineCode })}</p>
                      <p>{t.rich("ninerouterStep2Check", { b: bold })}</p>
                      <p className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">{t("ninerouterStep2Both")}</p>
                    </Step>

                    <Step n={3} title={t("ninerouterStep3Title")}>
                      <p>
                        {t.rich("ninerouterStep3Desc", {
                          b: bold,
                          keys: (chunks) => (
                            <a href="/dashboard/api-keys" className="font-medium text-foreground underline">
                              {chunks}
                            </a>
                          ),
                          packages: (chunks) => (
                            <a href="/dashboard/packages" className="font-medium text-foreground underline">
                              {chunks}
                            </a>
                          ),
                        })}
                      </p>
                      <p>{t("ninerouterStep3Note")}</p>
                    </Step>

                    <Step n={4} title={t("ninerouterStep4Title")}>
                      <p>{t.rich("ninerouterStep4Desc", { b: bold })}</p>
                      <p>{t.rich("ninerouterStep4Note", { code: inlineCode })}</p>
                      <CopyableCode code={ninerouterModelsCode} language="model" />
                    </Step>

                    <Step n={5} title={t("ninerouterStep5Title")}>
                      <p>{t.rich("ninerouterStep5Desc", { b: bold })}</p>
                      <FieldTable
                        columns={[{ label: t("harnessFieldCol") }, { label: t("ninerouterFieldValue") }]}
                        rows={ninerouterClientFields}
                      />
                      <p>{t("ninerouterStep5Test")}</p>
                      <CopyableCode code={ninerouterCurlCode} />
                      <p>{t.rich("ninerouterStep5Tools", { b: bold, code: inlineCode })}</p>
                    </Step>

                    <Step n={6} title={t("ninerouterStep6Title")}>
                      <p>{t.rich("ninerouterStep6Desc", { b: bold, code: inlineCode })}</p>
                      <CopyableCode code={ninerouterComboCode} language="combo" />
                      <p>{t.rich("ninerouterStep6Example", { code: inlineCode })}</p>
                    </Step>
                  </ol>

                  <details className="group/nr mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
                      {t("ninerouterTroubleTitle")}
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-muted-foreground transition group-open/nr:rotate-180" aria-hidden>
                        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </summary>
                    <ul className="space-y-3 border-t border-white/[0.06] px-4 py-4">
                      {ninerouterErrors.map((e) => (
                        <li key={e.code} className="text-xs leading-relaxed text-muted-foreground">
                          <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-red-400">{e.code}</code>
                          <p className="mt-1">{e.desc}</p>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              ),
            },
          ]}
        />

        <details className="glass group/err rounded-2xl">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6 text-sm font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
            {t("opencodeTroubleTitle")}
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-muted-foreground transition group-open/err:rotate-180" aria-hidden>
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <ul className="space-y-3 border-t border-white/[0.06] px-6 py-5">
            {opencodeErrors.map((e) => (
              <li key={e.code} className="text-xs leading-relaxed text-muted-foreground">
                <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-red-400">{e.code}</code>
                <p className="mt-1">{e.desc}</p>
              </li>
            ))}
          </ul>
        </details>
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
