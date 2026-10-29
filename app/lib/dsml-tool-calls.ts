import { randomBytes } from "crypto";

/**
 * DeepSeek models sometimes leak their internal tool-call markup ("DSML")
 * into `content` instead of returning native `tool_calls`, e.g.:
 *
 *   <｜DSML｜function_calls>
 *   <｜DSML｜invoke name="get_weather">
 *   <｜DSML｜parameter name="city" string="true">Jakarta</｜DSML｜parameter>
 *   </｜DSML｜invoke>
 *   </｜DSML｜function_calls>
 *
 * Clients then print the raw tags instead of running the tool. This module
 * turns that markup back into OpenAI `tool_calls`, for both aggregated
 * (non-stream) completions and SSE streams. Both the fullwidth `｜` and the
 * ASCII `|` spelling are accepted, as is any `*calls` container name.
 */

export type ParsedToolCall = { name: string; arguments: string };

const BAR = "[|｜]";
const START_RE = new RegExp(`<\\s*${BAR}\\s*DSML\\s*${BAR}`);
const BLOCK_CLOSE_RE = new RegExp(`<\\s*/\\s*${BAR}\\s*DSML\\s*${BAR}\\s*\\w*calls\\s*>`);
const INVOKE_RE = new RegExp(
  `<\\s*${BAR}\\s*DSML\\s*${BAR}\\s*invoke\\s+name\\s*=\\s*"([^"]*)"\\s*>([\\s\\S]*?)<\\s*/\\s*${BAR}\\s*DSML\\s*${BAR}\\s*invoke\\s*>`,
  "g",
);
const PARAM_RE = new RegExp(
  `<\\s*${BAR}\\s*DSML\\s*${BAR}\\s*parameter\\s+name\\s*=\\s*"([^"]*)"([^>]*)>([\\s\\S]*?)<\\s*/\\s*${BAR}\\s*DSML\\s*${BAR}\\s*parameter\\s*>`,
  "g",
);
// Trailing text that may be the beginning of a start marker split across
// stream chunks ("<", "<｜", "<|DS", ...).
const PARTIAL_START_RE = new RegExp(`<\\s*(${BAR}\\s*(D(S(M(L\\s*)?)?)?)?)?$`);

function parseParamValue(raw: string, attrs: string): unknown {
  const stringAttr = /string\s*=\s*"(true|false)"/i.exec(attrs)?.[1]?.toLowerCase();
  if (stringAttr === "true") return raw;
  try {
    return JSON.parse(raw.trim());
  } catch {
    return raw;
  }
}

/** Parse every complete `invoke` in a DSML block. */
function parseInvokes(block: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  for (const [, name, inner] of block.matchAll(INVOKE_RE)) {
    if (!name) continue;
    const args: Record<string, unknown> = {};
    let hasParams = false;
    for (const [, key, attrs, value] of inner.matchAll(PARAM_RE)) {
      hasParams = true;
      args[key] = parseParamValue(value, attrs);
    }
    let argsJson = JSON.stringify(args);
    // Variant: the invoke body is a raw JSON object instead of parameters.
    if (!hasParams && inner.trim().startsWith("{")) {
      try {
        const parsed: unknown = JSON.parse(inner.trim());
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) argsJson = JSON.stringify(parsed);
      } catch {
        // Keep the empty arguments.
      }
    }
    calls.push({ name, arguments: argsJson });
  }
  return calls;
}

/**
 * Split `content` into plain text and the tool calls encoded in its DSML
 * blocks. Returns null when there is nothing to convert, so content that
 * merely mentions DSML (no parseable invoke) is left untouched.
 */
export function extractDsmlToolCalls(content: string): { content: string; toolCalls: ParsedToolCall[] } | null {
  if (!START_RE.test(content)) return null;
  const toolCalls: ParsedToolCall[] = [];
  let text = "";
  let rest = content;
  while (true) {
    const start = rest.search(START_RE);
    if (start < 0) {
      text += rest;
      break;
    }
    text += rest.slice(0, start);
    const tail = rest.slice(start);
    const close = BLOCK_CLOSE_RE.exec(tail);
    const block = close ? tail.slice(0, close.index + close[0].length) : tail;
    const calls = parseInvokes(block);
    if (calls.length === 0) {
      // Not a tool-call block we understand — keep it verbatim.
      text += block;
    } else {
      toolCalls.push(...calls);
    }
    if (!close) break;
    rest = tail.slice(close.index + close[0].length);
  }
  if (toolCalls.length === 0) return null;
  return { content: text.trim(), toolCalls };
}

function newToolCallId(): string {
  return `call_${randomBytes(12).toString("hex")}`;
}

/** Whether the request offered tools, i.e. DSML in the reply is a tool call. */
export function requestHasTools(body: Record<string, unknown>): boolean {
  return (
    (Array.isArray(body.tools) && body.tools.length > 0) ||
    (Array.isArray(body.functions) && body.functions.length > 0)
  );
}

type CompletionLike = { choices?: unknown };

/**
 * Convert leaked DSML in a non-stream chat.completion into `tool_calls`, in
 * place. Returns how many tool calls were recovered (for logging).
 */
export function fixDsmlInCompletion(data: CompletionLike): number {
  if (!Array.isArray(data.choices)) return 0;
  let recovered = 0;
  for (const choice of data.choices as Record<string, unknown>[]) {
    const message = choice?.message as Record<string, unknown> | undefined;
    if (!message || typeof message.content !== "string") continue;
    const extracted = extractDsmlToolCalls(message.content);
    if (!extracted) continue;
    const existing = Array.isArray(message.tool_calls) ? (message.tool_calls as unknown[]) : [];
    message.tool_calls = [
      ...existing,
      ...extracted.toolCalls.map((c) => ({
        id: newToolCallId(),
        type: "function",
        function: { name: c.name, arguments: c.arguments },
      })),
    ];
    message.content = extracted.content || null;
    choice.finish_reason = "tool_calls";
    recovered += extracted.toolCalls.length;
  }
  return recovered;
}

type ChoiceState = {
  /** Content not yet forwarded (may hold a partial start marker). */
  pending: string;
  /** Inside a DSML block: everything is captured until it closes. */
  capturing: boolean;
  /** Highest native tool_calls index seen, so ours never collide. */
  nativeToolCalls: number;
  emittedToolCalls: number;
  finished: boolean;
};

type Chunk = {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: { index?: number; delta?: Record<string, unknown>; finish_reason?: string | null }[];
  usage?: unknown;
} & Record<string, unknown>;

/**
 * Rewrites an upstream SSE stream line by line so DSML tool-call markup in
 * `delta.content` comes out as native `delta.tool_calls`. Plain text is
 * forwarded as soon as it can't be the start of a DSML block; a block is held
 * back until it closes, then emitted as one tool_calls delta per call, and
 * the choice's finish_reason becomes "tool_calls".
 */
export class DsmlStreamFixer {
  private states = new Map<number, ChoiceState>();
  private template: Pick<Chunk, "id" | "object" | "created" | "model"> = {};
  recovered = 0;

  private state(index: number): ChoiceState {
    let s = this.states.get(index);
    if (!s) {
      s = { pending: "", capturing: false, nativeToolCalls: 0, emittedToolCalls: 0, finished: false };
      this.states.set(index, s);
    }
    return s;
  }

  // Injected lines end in "\n" so, once the caller appends its own newline,
  // each forms a separate SSE event.
  private chunkLine(choices: NonNullable<Chunk["choices"]>): string {
    return `data: ${JSON.stringify({ ...this.template, object: "chat.completion.chunk", choices })}\n`;
  }

  /**
   * Consume `pending` as far as possible. Returns the text that can be
   * forwarded now and the tool calls recovered from closed blocks. With
   * `final`, unclosed blocks are parsed (or released as text) too.
   */
  private drain(s: ChoiceState, final: boolean): { text: string; calls: ParsedToolCall[] } {
    let text = "";
    const calls: ParsedToolCall[] = [];
    while (s.pending) {
      if (!s.capturing) {
        const start = s.pending.search(START_RE);
        if (start >= 0) {
          text += s.pending.slice(0, start);
          s.pending = s.pending.slice(start);
          s.capturing = true;
          continue;
        }
        const partial = final ? null : PARTIAL_START_RE.exec(s.pending);
        const cut = partial ? partial.index : s.pending.length;
        text += s.pending.slice(0, cut);
        s.pending = s.pending.slice(cut);
        break;
      }
      const close = BLOCK_CLOSE_RE.exec(s.pending);
      if (!close && !final) break;
      const end = close ? close.index + close[0].length : s.pending.length;
      const block = s.pending.slice(0, end);
      const parsed = parseInvokes(block);
      if (parsed.length > 0) calls.push(...parsed);
      else text += block;
      s.pending = s.pending.slice(end);
      s.capturing = false;
    }
    return { text, calls };
  }

  private toolCallDeltas(s: ChoiceState, calls: ParsedToolCall[]): Record<string, unknown>[] {
    return calls.map((c) => ({
      index: s.nativeToolCalls + s.emittedToolCalls++,
      id: newToolCallId(),
      type: "function",
      function: { name: c.name, arguments: c.arguments },
    }));
  }

  /**
   * Transform one SSE line; returns the line(s) to forward instead. The
   * caller writes each entry followed by "\n", as it does for upstream lines.
   */
  transformLine(line: string): string[] {
    if (!line.startsWith("data:")) return [line];
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return [line];
    let chunk: Chunk;
    try {
      chunk = JSON.parse(payload) as Chunk;
    } catch {
      return [line];
    }
    if (chunk.id) this.template.id = chunk.id;
    if (chunk.created) this.template.created = chunk.created;
    if (chunk.model) this.template.model = chunk.model;
    if (!Array.isArray(chunk.choices) || chunk.choices.length === 0) return [line];

    const after: string[] = [];
    let changed = false;
    for (const choice of chunk.choices) {
      const index = typeof choice.index === "number" ? choice.index : 0;
      const s = this.state(index);
      const delta = choice.delta;
      if (delta && Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls as { index?: number }[]) {
          if (typeof tc?.index === "number") s.nativeToolCalls = Math.max(s.nativeToolCalls, tc.index + 1);
        }
      }
      const finishing = !!choice.finish_reason;
      const hasContent = !!delta && typeof delta.content === "string" && delta.content !== "";
      if (!hasContent && !finishing) continue;
      if (!hasContent && !s.pending && s.emittedToolCalls === 0) continue;

      if (hasContent) s.pending += delta!.content as string;
      const { text, calls } = this.drain(s, finishing);
      if (delta && (hasContent || text)) {
        delta.content = text;
        changed = true;
      } else if (text) {
        choice.delta = { ...(delta ?? {}), content: text };
        changed = true;
      }
      if (calls.length > 0) {
        this.recovered += calls.length;
        after.push(this.chunkLine([{ index, delta: { tool_calls: this.toolCallDeltas(s, calls) }, finish_reason: null }]));
      }
      if (finishing) {
        s.finished = true;
        if (s.emittedToolCalls > 0) {
          // Re-send finish_reason after the injected tool_calls deltas.
          after.push(this.chunkLine([{ index, delta: {}, finish_reason: "tool_calls" }]));
          choice.finish_reason = null;
          changed = true;
        }
      }
    }
    if (!changed && after.length === 0) return [line];
    if (after.length > 0 && chunk.usage) {
      // Keep usage on the last chunk this upstream chunk turns into.
      const last = JSON.parse(after[after.length - 1].slice(5)) as Chunk;
      last.usage = chunk.usage;
      after[after.length - 1] = `data: ${JSON.stringify(last)}\n`;
      delete chunk.usage;
    }
    return [`data: ${JSON.stringify(chunk)}${after.length > 0 ? "\n" : ""}`, ...after];
  }

  /**
   * Flush state for choices the upstream never finished (stream cut short).
   * Returns SSE lines to send before the terminating `[DONE]`.
   */
  flush(): string[] {
    const out: string[] = [];
    for (const [index, s] of this.states) {
      if (s.finished || !s.pending) continue;
      const { text, calls } = this.drain(s, true);
      if (text) out.push(this.chunkLine([{ index, delta: { content: text }, finish_reason: null }]));
      if (calls.length > 0) {
        this.recovered += calls.length;
        out.push(this.chunkLine([{ index, delta: { tool_calls: this.toolCallDeltas(s, calls) }, finish_reason: null }]));
        out.push(this.chunkLine([{ index, delta: {}, finish_reason: "tool_calls" }]));
      }
    }
    return out;
  }
}
