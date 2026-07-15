import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #111827 100%)",
          borderRadius: 36,
          border: "6px solid #00ff88",
          color: "#fafafa",
          fontSize: 72,
          fontWeight: 800,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          letterSpacing: -2,
        }}
      >
        1R
      </div>
    ),
    { ...size },
  );
}
