import { getAvailableModels } from "@/app/lib/models";
import { CopyableCode } from "@/app/components/copyable-code";

export const dynamic = "force-dynamic";

const API_BASE_URL = "https://www.onerouter.my.id/v1";

export default async function DocsPage() {
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
  apiKey: process.env.ONEROUTER_API_KEY,
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">API Documentation</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          OneRouter exposes an OpenAI-compatible Chat Completions API. Point your existing SDK at
          our base URL and start inferencing in minutes.
        </p>
      </header>

      {/* Quickstart */}
      <section className="animate-fade-up-delay-1 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quickstart
        </h2>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">1. Create an API key</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Head to{" "}
            <a href="/dashboard/api-keys" className="font-medium text-foreground underline">
              API Keys
            </a>{" "}
            and generate a production key. It follows the{" "}
            <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[11px]">sk_live_…</code>{" "}
            format.
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">2. Make your first request</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">cURL</p>
          <div className="mt-2">
            <CopyableCode code={curlCode} />
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">3. Use the OpenAI SDK</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Any OpenAI-compatible client works — just swap the base URL.
          </p>
          <div className="mt-2">
            <CopyableCode code={jsCode} language="javascript" />
          </div>
        </div>
      </section>

      {/* Reference */}
      <section className="animate-fade-up-delay-2 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Reference
        </h2>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">Base URL</h3>
          <div className="mt-2">
            <CopyableCode code={API_BASE_URL} language="text" />
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">Authentication</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Send your API key as a Bearer token in the Authorization header.
          </p>
          <div className="mt-2">
            <CopyableCode code={`Authorization: Bearer sk_live_xxx`} language="text" />
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">Billing</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Every response includes an <code className="font-mono text-[11px]">x_billing</code>{" "}
            header with token usage and the deducted cost. You only pay for tokens consumed.
          </p>
          <div className="mt-2">
            <CopyableCode code={billingCode} language="json" />
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold tracking-tight">Available models</h3>
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
