"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type Tab = {
  id: string;
  label: string;
  icon: React.ReactNode;
  code: string;
  lang: string;
};

const ICON = "h-4 w-4";

const TABS: Tab[] = [
  {
    id: "node",
    label: "Node.js",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={ICON}>
        <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9 13c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5-1.3-2-3-2-3-1-3-2 1.3-2.5 3-2.5 3 1 3 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    lang: "javascript",
    code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://9inference.cloud/v1",
  apiKey: process.env.NINEINFERENCE_API_KEY,
});

const res = await client.chat.completions.create({
  model: "glm-5.2",
  messages: [
    { role: "user", content: "Hello!" }
  ],
});

console.log(res.choices[0].message.content);`,
  },
  {
    id: "python",
    label: "Python",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={ICON}>
        <path d="M12 3c-3 0-5 1-5 3v2h5v1H5c-2 0-3 2-3 5s1 5 3 5h2v-3c0-2 2-4 4-4h4c2 0 3-1 3-3V6c0-2-2-3-5-3h-1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="9.5" cy="6.5" r="0.8" fill="currentColor" />
      </svg>
    ),
    lang: "python",
    code: `from openai import OpenAI

client = OpenAI(
    base_url="https://9inference.cloud/v1",
    api_key="or_xxxxx",
)

res = client.chat.completions.create(
    model="glm-5.2",
    messages=[
        {"role": "user", "content": "Hello!"}
    ],
)

print(res.choices[0].message.content)`,
  },
  {
    id: "curl",
    label: "cURL",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={ICON}>
        <path d="M8 9h8M8 15h5M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    lang: "bash",
    code: `curl https://9inference.cloud/v1/chat/completions \\
  -H "Authorization: Bearer or_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "glm-5.2",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ]
  }'`,
  },
];

const INTEGRATIONS = [
  { name: "OpenAI SDK", desc: "Drop-in base URL swap" },
  { name: "Python", desc: "Official SDK" },
  { name: "Node.js", desc: "Official SDK" },
  { name: "LangChain", desc: "LLM provider" },
  { name: "Vercel AI SDK", desc: "Stream & generate" },
];

export function CodeTabs() {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const tab = TABS[active];

  async function copy() {
    try {
      await navigator.clipboard.writeText(tab.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Left: integrations */}
      <div className="lg:col-span-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Works with your stack
        </div>
        <div className="mt-4 space-y-2">
          {INTEGRATIONS.map((it) => (
            <div
              key={it.name}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 transition hover:border-white/15"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-accent">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <div className="text-[13px] font-semibold text-foreground">{it.name}</div>
                <div className="text-[11px] text-muted-foreground">{it.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: code */}
      <div className="lg:col-span-3">
        <div className="glass overflow-hidden rounded-2xl">
          {/* Tabs */}
          <div className="flex items-center border-b border-white/[0.06] px-2">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(i)}
                className={`relative flex items-center gap-2 px-3.5 py-3 text-[12px] font-medium transition ${
                  active === i ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={active === i ? "text-accent" : ""}>{t.icon}</span>
                {t.label}
                {active === i && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute inset-x-0 -bottom-px h-[2px] bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={copy}
              className="ml-auto mr-2 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] text-muted-foreground transition hover:text-foreground"
            >
              {copied ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-accent">
                    <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                    <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Code body */}
          <div className="relative bg-black/40">
            <AnimatePresence mode="wait">
              <motion.pre
                key={tab.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-foreground/90"
              >
                <code>{tab.code}</code>
              </motion.pre>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {tab.lang}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              9inference.cloud/v1
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
