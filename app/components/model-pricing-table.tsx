import { getEnabledModels } from "@/app/lib/models";

const TOKS_TO_RP = 1000;
const TOKS_TO_USD = 0.0553;

function fmtRupiah(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}

function fmtUsd(rp: number): string {
  const toks = rp / TOKS_TO_RP;
  return "US$" + (toks * TOKS_TO_USD).toFixed(2);
}

function fmtToks(rp: number): string {
  return (rp / TOKS_TO_RP).toLocaleString("en-US", { maximumFractionDigits: 1 }) + " TOKS";
}

/**
 * DB-driven Model Pricing table. Reads enabled models (and their admin-managed
 * prices) directly from the database so the landing page always reflects the
 * latest values. No hardcoded prices.
 *
 * Models in maintenance mode are shown with a "Maintenance" status badge so
 * users know they are temporarily unavailable.
 */
export async function ModelPricingTable({ compact = false }: { compact?: boolean }) {
  const models = await getEnabledModels();

  if (models.length === 0) {
    return (
      <div className="border border-foreground/10 rounded-2xl p-8 text-center text-muted-foreground bg-muted/30">
        No models available yet.
      </div>
    );
  }

  return (
    <div className="border border-foreground/10 rounded-2xl overflow-hidden bg-muted/30 backdrop-blur">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-left">
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Model</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Provider</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Context</th>
              {!compact && (
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Supports</th>
              )}
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right">Input / 1M</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right">Output / 1M</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {models.map((m) => {
              const caps: string[] = [];
              if (m.supportsText) caps.push("Text");
              if (m.supportsImages) caps.push("Images");
              if (m.supportsStreaming) caps.push("Stream");
              const inRp = Number(m.inputPricePerMillion);
              const outRp = Number(m.outputPricePerMillion);
              return (
                <tr key={m.id} className="hover:bg-foreground/[0.03] transition">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold">{m.name}</div>
                    <code className="text-[11px] text-muted-foreground font-mono">{m.modelId}</code>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground capitalize">{m.provider}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full border border-foreground/15 text-muted-foreground">
                      {m.contextWindow || "—"}
                    </span>
                  </td>
                  {!compact && (
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {caps.length === 0 ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground">
                            —
                          </span>
                        ) : (
                          caps.map((c) => (
                            <span
                              key={c}
                              className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground"
                            >
                              {c}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-right">
                    <div className="font-mono font-semibold">{fmtRupiah(inRp)}</div>
                    <div className="text-[10px] text-muted-foreground">{fmtToks(inRp)} · {fmtUsd(inRp)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="font-mono font-semibold">{fmtRupiah(outRp)}</div>
                    <div className="text-[10px] text-muted-foreground">{fmtToks(outRp)} · {fmtUsd(outRp)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {m.maintenanceMode ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        Maintenance
                      </span>
                    ) : m.enabled ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                        Disabled
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-foreground/10 text-[11px] text-muted-foreground">
        Prices are per 1 million tokens. <strong className="text-foreground">1 TOKS = Rp1,000 = US$0.0553</strong>. You only pay for tokens actually consumed — no subscriptions, no hidden fees.
      </div>
    </div>
  );
}
