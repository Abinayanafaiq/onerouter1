import { ImageResponse } from "next/og";

export const alt = "9inference — Platform Inferensi AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
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
            9i
          </div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>9inference</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5 }}>
            API Model AI Murah
          </div>
          <div style={{ fontSize: 28, color: "#a1a1aa", maxWidth: 900, lineHeight: 1.35 }}>
            DeepSeek, GLM, Qwen, Kimi — satu API key, bayar per token, harga dalam rupiah.
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, fontSize: 22, color: "#00ff88" }}>
          <span>API model murah</span>
          <span>·</span>
          <span>Bayar per token</span>
          <span>·</span>
          <span>OpenAI-compatible</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
