"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type Line = {
  id: number;
  type: "command" | "json-key" | "json-value" | "json-string" | "comment" | "output" | "meta";
  text: string;
};

const SCRIPT: { text: string; type: Line["type"]; delay: number }[] = [
  { text: "POST /v1/chat/completions", type: "command", delay: 50 },
  { text: "Authorization: Bearer or_live_••••", type: "meta", delay: 30 },
  { text: "Content-Type: application/json", type: "meta", delay: 30 },
  { text: "", type: "comment", delay: 200 },
  { text: "{", type: "command", delay: 60 },
  { text: '  "model": "glm-5.2",', type: "json-key", delay: 40 },
  { text: '  "messages": [', type: "json-key", delay: 40 },
  { text: '    { "role": "user", "content": "Hello" }', type: "json-value", delay: 40 },
  { text: "  ]", type: "json-key", delay: 40 },
  { text: "}", type: "command", delay: 250 },
  { text: "", type: "comment", delay: 400 },
  { text: "← 200 OK", type: "output", delay: 30 },
  { text: '{', type: "output", delay: 30 },
  { text: '  "role": "assistant",', type: "json-key", delay: 30 },
  { text: '  "content": "Hello developer"', type: "json-string", delay: 30 },
  { text: "}", type: "output", delay: 300 },
];

const COLORS: Record<Line["type"], string> = {
  command: "text-accent",
  "json-key": "text-[#7dd3fc]",
  "json-value": "text-[#c4b5fd]",
  "json-string": "text-[#86efac]",
  comment: "text-muted-foreground",
  output: "text-foreground",
  meta: "text-muted-foreground",
};

export function HeroTerminal() {
  const [lines, setLines] = useState<Line[]>([]);
  const [latency, setLatency] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idxRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const next = () => {
      if (cancelled) return;
      const i = idxRef.current;
      if (i >= SCRIPT.length) {
        setDone(true);
        // Animate the live metrics after the "response" arrives
        let l = 0;
        let t = 0;
        const targetL = 87;
        const targetT = 13;
        const latTimer = setInterval(() => {
          l += 4;
          t += 1;
          setLatency(Math.min(l, targetL));
          setTokens(Math.min(t, targetT));
          if (l >= targetL && t >= targetT) clearInterval(latTimer);
        }, 16);
        return;
      }
      const step = SCRIPT[i];
      setLines((prev) => [...prev, { id: i, type: step.type, text: step.text }]);
      idxRef.current += 1;
      timer = setTimeout(next, step.delay);
    };

    timer = setTimeout(next, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="relative">
      {/* Glow */}
      <div
        className="pointer-events-none absolute -inset-6 rounded-3xl opacity-60 blur-2xl"
        style={{
          background:
            "radial-gradient(60% 60% at 70% 20%, rgba(0,255,136,0.10), transparent 70%), radial-gradient(50% 50% at 20% 90%, rgba(99,102,241,0.12), transparent 70%)",
        }}
        aria-hidden
      />

      {/* Terminal window */}
      <motion.div
        initial={{ opacity: 0, y: 24, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl"
        style={{ transformPerspective: 1200 }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]/80" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]/80" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]/80" />
          <span className="ml-3 font-mono text-[11px] text-muted-foreground">onerouter — chat</span>
          <span className="ml-auto flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            <span className="font-mono text-[10px] font-medium text-accent">live</span>
          </span>
        </div>

        {/* Body */}
        <div
          ref={scrollRef}
          className="h-[300px] overflow-y-auto bg-black/40 p-4 font-mono text-[12px] leading-relaxed sm:text-[13px]"
        >
          <AnimatePresence>
            {lines.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18 }}
                className={`whitespace-pre ${COLORS[line.type]}`}
              >
                {line.text === "" ? "\u00A0" : line.text}
              </motion.div>
            ))}
          </AnimatePresence>
          {!done && (
            <span className="animate-blink inline-block text-accent">▋</span>
          )}
        </div>

        {/* Status bar */}
        <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/[0.06]">
          <Metric label="latency" value={latency > 0 ? `${latency}ms` : "—"} accent />
          <Metric label="tokens" value={tokens > 0 ? `${tokens}` : "—"} />
          <Metric label="status" value={done ? "200 OK" : "…"} />
        </div>
      </motion.div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-4 py-2.5">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-[13px] font-semibold ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}
