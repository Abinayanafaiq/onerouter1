import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 8,
          border: "1.5px solid #00ff88",
          color: "#fafafa",
          fontSize: 13,
          fontWeight: 800,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          letterSpacing: -0.5,
        }}
      >
        9i
      </div>
    ),
    { ...size },
  );
}
