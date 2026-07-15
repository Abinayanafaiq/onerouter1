import { ImageResponse } from "next/og";

export const alt = "OneRouter — Platform Inferensi AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #050505 0%, #0b1020 50%, #0a0a0a 100%)",
          padding: 64,
          color: "#fafafa",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#111827",
              border: "2px solid #00ff88",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
              fontFamily: "ui-monospace, Menlo, monospace",
            }}
          >
            1R
          </div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>OneRouter</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5 }}>
            Satu API. Model AI Terbaik.
          </div>
          <div style={{ fontSize: 28, color: "#a1a1aa", maxWidth: 900, lineHeight: 1.35 }}>
            Gateway inferensi AI kompatibel OpenAI. GLM, DeepSeek, Qwen, Kimi & lainnya — bayar per token.
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, fontSize: 22, color: "#00ff88" }}>
          <span>API terpadu</span>
          <span>·</span>
          <span>Bayar per token</span>
          <span>·</span>
          <span>Siap produksi</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
