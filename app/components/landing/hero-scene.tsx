"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Ilustrasi hero isometrik yang hidup (pola gerak ala baseten.co):
 * - adegan berganti otomatis tiap ~10 detik, lengkap dengan tab ikon + garis progres;
 * - ubin lantai berganti warna mengikuti tema adegan (bergelombang dari belakang ke depan);
 * - gedung lama tenggelam ke lantai, gedung baru naik dari lantai;
 * - selama adegan berjalan, isi sisi gedung hidup: angka, grafik, log, dan daftar berputar.
 * Semua angka di sini ilustrasi, bukan data produksi.
 */

type V3 = [number, number, number];
type Pal = { top: string; left: string; right: string; ink: string };
type Geo = { x: number; y: number; w: number; d: number; h: number };

const S = 44; // ukuran 1 ubin (px)
const VW = 900;
const VH = 560;
const OX = 600;
const OY = 84;
const GRID = 11;
const COS = Math.cos(Math.PI / 6);
const SCENE_MS = 10_000;

const P = ([x, y, z]: V3): [number, number] => [OX + (x - y) * S * COS, OY + (x + y) * S * 0.5 - z * S];
const pts = (list: V3[]) =>
  list
    .map(P)
    .map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`)
    .join(" ");

/* Posisi gedung sama di semua adegan (seperti baseten) — hanya warna & isinya yang berubah. */
const GEO: Geo[] = [
  { x: 6.6, y: 1.6, w: 2.6, d: 1.3, h: 1.9 }, // C — panjang di belakang kanan (log)
  { x: 4.4, y: 3.4, w: 2.4, d: 2.4, h: 3.4 }, // A — gedung utama
  { x: 2.8, y: 7.8, w: 1.7, d: 1.4, h: 1.1 }, // D — kecil depan kiri (jendela)
  { x: 7.4, y: 6.6, w: 2.6, d: 1.3, h: 1.3 }, // B — rendah depan kanan
];
const [IDX_C, IDX_A, IDX_D, IDX_B] = [0, 1, 2, 3];

type Theme = {
  key: string;
  accent: string;
  soft: string;
  tiles: string[];
  main: Pal;
  alt: Pal;
  icon: string[];
  title: [string, string];
  desc: [string, string];
};

const THEMES: Theme[] = [
  {
    key: "paket",
    accent: "#19e76e",
    soft: "#d7face",
    tiles: ["#d7face", "#b9f5c8", "#effdf0", "#8ef3b5"],
    main: { top: "#8ef3b5", left: "#19e76e", right: "#0fbf57", ink: "#063d1f" },
    alt: { top: "#effdf0", left: "#c9f7d6", right: "#a6ebb8", ink: "#0e6a35" },
    icon: ["11111", "10001", "10101", "10001", "11111"],
    title: ["Paket token", "Token packages"],
    desc: [
      "Bayar sekali, kuota token jelas, API key langsung jadi. Tanpa langganan.",
      "Pay once, a clear token quota, and an instant API key. No subscription.",
    ],
  },
  {
    key: "openai",
    accent: "#8b6fd6",
    soft: "#ece6ff",
    tiles: ["#ece6ff", "#d9cdfb", "#f6f3ff", "#c2b0f2"],
    main: { top: "#cbbcf6", left: "#9a7fe0", right: "#7c61c6", ink: "#1f0f45" },
    alt: { top: "#f6f3ff", left: "#e2d8ff", right: "#cbbcf6", ink: "#4a2f88" },
    icon: ["00100", "01000", "10001", "00010", "00100"],
    title: ["Kompatibel OpenAI", "OpenAI-compatible"],
    desc: [
      "Cukup ganti base URL. SDK OpenAI, LangChain, dan tool lain langsung jalan.",
      "Just change the base URL. The OpenAI SDK, LangChain and other tools just work.",
    ],
  },
  {
    key: "model",
    accent: "#3da6ff",
    soft: "#d4ebff",
    tiles: ["#d4ebff", "#b3dbff", "#eef7ff", "#8fc9ff"],
    main: { top: "#a9d4ff", left: "#3da6ff", right: "#1f86e0", ink: "#04203d" },
    alt: { top: "#eef7ff", left: "#cfe7ff", right: "#a9d4ff", ink: "#0d4a85" },
    icon: ["11011", "11011", "00000", "11011", "11011"],
    title: ["Satu key, banyak model", "One key, many models"],
    desc: [
      "DeepSeek, GLM, Qwen, Kimi, MiniMax — ganti model cukup satu parameter.",
      "DeepSeek, GLM, Qwen, Kimi, MiniMax — switch models with one parameter.",
    ],
  },
  {
    key: "qris",
    accent: "#ff8a3d",
    soft: "#ffe2cc",
    tiles: ["#ffe2cc", "#ffd0ad", "#fff3ea", "#ffbb8a"],
    main: { top: "#ffd0ad", left: "#ff9a52", right: "#e67a2e", ink: "#3d1800" },
    alt: { top: "#fff3ea", left: "#ffe2cc", right: "#ffcfa8", ink: "#8a3d06" },
    icon: ["11011", "11010", "00101", "11011", "10111"],
    title: ["Bayar via QRIS", "Pay via QRIS"],
    desc: [
      "Semua e-wallet & mobile banking. Diproses otomatis, API key siap dalam hitungan detik.",
      "Any e-wallet or mobile banking app. Processed automatically, API key ready in seconds.",
    ],
  },
];

const MODELS = ["deepseek-v4.1-flash", "glm-5.3-flash", "qwen3-max", "kimi-k3", "minimax-m3"];

/* ---------- util ---------- */

const rnd = (n: number) => {
  const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};
const pad = (n: number) => String(n).padStart(2, "0");
const clock = (sec: number) => {
  const s = ((sec % 86400) + 86400) % 86400;
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

/** Transform lokal untuk menulis di sisi gedung: x ke kanan, y ke bawah (px). */
const leftM = (g: Geo) => {
  const [ox, oy] = P([g.x, g.y + g.d, g.h]);
  return `matrix(${COS},0.5,0,1,${ox.toFixed(1)},${oy.toFixed(1)})`;
};
const rightM = (g: Geo) => {
  const [ox, oy] = P([g.x + g.w, g.y + g.d, g.h]);
  return `matrix(${COS},-0.5,0,1,${ox.toFixed(1)},${oy.toFixed(1)})`;
};
const topM = (g: Geo) => {
  const [ox, oy] = P([g.x, g.y, g.h]);
  return `matrix(${COS},0.5,${-COS},0.5,${ox.toFixed(1)},${oy.toFixed(1)})`;
};

const MONO = "lp-mono";

function Spark({ t, x, y, w, h, color, seed }: { t: number; x: number; y: number; w: number; h: number; color: string; seed: number }) {
  const n = 14;
  const values = Array.from({ length: n }, (_, i) => 0.25 + 0.6 * rnd(seed + t + i) * (0.55 + (i / n) * 0.45));
  const line = values.map((v, i) => `${(x + (i / (n - 1)) * w).toFixed(1)},${(y + h - v * h).toFixed(1)}`).join(" ");
  return (
    <g>
      <line x1={x} y1={y + h} x2={x + w} y2={y + h} stroke={color} strokeOpacity={0.35} strokeDasharray="2 2" strokeWidth={0.6} />
      <polygon points={`${x},${y + h} ${line} ${x + w},${y + h}`} fill={color} opacity={0.12} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.1} strokeLinejoin="round" />
    </g>
  );
}

/* ---------- isi tiap adegan ---------- */

type Faces = { left?: React.ReactNode; right?: React.ReactNode; top?: React.ReactNode; windows?: boolean };

function sceneFaces(theme: Theme, t: number, isEn: boolean, fromPrice: string): Faces[] {
  const ink = theme.main.ink;
  const ink2 = theme.alt.ink;
  const A = GEO[IDX_A];
  const Wl = A.w * S;
  const Hl = A.h * S;
  const Wr = A.d * S;
  const lbl = (txt: string, x: number, y: number, color: string, size = 6.5) => (
    <text x={x} y={y} className={MONO} fontSize={size} fill={color} letterSpacing={0.4}>
      {txt}
    </text>
  );
  const big = (txt: string, x: number, y: number, color: string, size = 24) => (
    <text x={x} y={y} className="lp-display" fontSize={size} fill={color}>
      {txt}
    </text>
  );
  const topTitle = (txt: string, size = 14) => (
    <text x={8} y={A.d * S - 12} className="lp-display" fontSize={size} fill={ink} opacity={0.75}>
      {txt}
    </text>
  );
  const logLines = (lines: string[]) => (
    <g>
      {lines.map((l, i) => (
        <text key={`${t}-${i}`} x={8} y={24 + i * 11} className={MONO} fontSize={6.5} fill={ink2} opacity={1 - i * 0.18}>
          {l}
        </text>
      ))}
    </g>
  );
  const faces: Faces[] = [{}, {}, { windows: true }, {}];

  if (theme.key === "paket") {
    const left = 38.2 - t * 0.07;
    faces[IDX_A] = {
      top: topTitle(isEn ? "Token package" : "Paket token"),
      left: (
        <g>
          {lbl(isEn ? "PACKAGE · 40M" : "PAKET · 40 JT", 8, 14, ink)}
          {big(`${left.toLocaleString(isEn ? "en-US" : "id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${isEn ? "M" : " jt"}`, 8, 56, ink)}
          {lbl(isEn ? "TOKENS LEFT" : "TOKEN TERSISA", 8, 68, ink)}
          <Spark t={t} x={8} y={86} w={Wl - 16} h={46} color={ink} seed={11} />
        </g>
      ),
      right: (
        <g>
          {lbl(isEn ? "ACTIVE FOR" : "MASA AKTIF", 8, 14, ink)}
          {big(clock(23 * 3600 + 41 * 60 + 8 - t), 8, 38, ink, 15)}
          <rect x={8} y={50} width={Wr - 16} height={4} fill={ink} opacity={0.15} />
          <rect x={8} y={50} width={(Wr - 16) * (0.92 - (t % 60) * 0.002)} height={4} fill={ink} opacity={0.55} />
        </g>
      ),
    };
    faces[IDX_C] = {
      left: (
        <g>
          {lbl(isEn ? "USAGE" : "PEMAKAIAN", 8, 12, ink2)}
          {logLines([0, 1, 2, 3, 4].map((k) => `${clock(76000 + t - k * 2)}  -${Math.round(800 + rnd(t - k) * 3200).toLocaleString("id-ID")} tok`))}
        </g>
      ),
    };
    faces[IDX_B] = {
      left: (
        <g>
          {lbl("API KEY", 8, 14, ink2)}
          <text x={8} y={32} className={MONO} fontSize={10} fill={ink2}>
            or_••••7f3a
          </text>
          <rect x={8} y={41} width={5} height={5} fill={theme.accent} opacity={t % 2 ? 1 : 0.4} />
          {lbl(isEn ? "ACTIVE" : "AKTIF", 17, 46, ink2)}
        </g>
      ),
    };
  } else if (theme.key === "openai") {
    const streamed = 1284 + ((t * 137) % 4000);
    faces[IDX_A] = {
      top: topTitle("/v1", 18),
      left: (
        <g>
          {lbl("POST", 8, 14, ink)}
          {lbl("/v1/chat/completions", 8, 23, ink, 6)}
          {big(streamed.toLocaleString(isEn ? "en-US" : "id-ID"), 8, 60, ink)}
          {lbl(isEn ? "TOKENS STREAMED" : "TOKEN DI-STREAM", 8, 72, ink)}
          <Spark t={t} x={8} y={88} w={Wl - 16} h={44} color={ink} seed={53} />
        </g>
      ),
      right: (
        <g>
          {lbl("STATUS", 8, 14, ink)}
          {big("200 OK", 8, 38, ink, 16)}
          {lbl("stream: true", 8, 52, ink)}
        </g>
      ),
    };
    faces[IDX_C] = {
      left: (
        <g>
          {lbl("REQUESTS", 8, 12, ink2)}
          {logLines([0, 1, 2, 3, 4].map((k) => `${clock(76000 + t - k * 3)}  200  ${MODELS[(t + k) % MODELS.length]}`))}
        </g>
      ),
    };
    faces[IDX_B] = {
      left: (
        <g>
          {lbl("BASE URL", 8, 14, ink2)}
          <text x={8} y={32} className={MONO} fontSize={8.5} fill={ink2}>
            9inference.cloud/v1
          </text>
        </g>
      ),
    };
  } else if (theme.key === "model") {
    const active = t % MODELS.length;
    faces[IDX_A] = {
      top: topTitle("Router", 16),
      left: (
        <g>
          {lbl("MODEL", 8, 14, ink)}
          {MODELS.map((m, i) => (
            <g key={m}>
              {i === active && <rect x={5} y={22 + i * 19} width={Wl - 10} height={15} fill={ink} opacity={0.16} />}
              <text x={10} y={33 + i * 19} className={MONO} fontSize={7} fill={ink} opacity={i === active ? 1 : 0.6}>
                {i === active ? "▸ " : "  "}
                {m}
              </text>
            </g>
          ))}
          {lbl(isEn ? "ONE KEY · ALL MODELS" : "SATU KEY · SEMUA MODEL", 8, Hl - 10, ink, 6)}
        </g>
      ),
      right: (
        <g>
          {lbl("API KEY", 8, 14, ink)}
          {big("× 1", 8, 40, ink, 18)}
        </g>
      ),
    };
    faces[IDX_C] = {
      left: (
        <g>
          {lbl("REQUEST", 8, 12, ink2)}
          <text x={8} y={30} className={MONO} fontSize={7.5} fill={ink2}>
            {`model: "${MODELS[active]}"`}
          </text>
          {lbl(isEn ? "same SDK, same base URL" : "SDK & base URL sama", 8, 46, ink2)}
        </g>
      ),
    };
    faces[IDX_B] = {
      left: (
        <g>
          {lbl(isEn ? "SWITCH MODEL" : "GANTI MODEL", 8, 14, ink2)}
          <text x={8} y={32} className="lp-display" fontSize={13} fill={ink2}>
            {isEn ? "1 parameter" : "1 parameter"}
          </text>
        </g>
      ),
    };
  } else {
    const paid = t % 6 >= 3;
    const qr: React.ReactNode[] = [];
    const n = 9;
    const cell = 6;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const corner = (i < 3 && j < 3) || (i < 3 && j >= n - 3) || (i >= n - 3 && j < 3);
        const on = corner ? !(i % (n - 3) === 1 && j % (n - 3) === 1) : rnd(i * 31 + j * 7) > 0.5;
        if (on) qr.push(<rect key={`${i}-${j}`} x={8 + j * cell} y={20 + i * cell} width={cell - 0.6} height={cell - 0.6} fill={ink} />);
      }
    }
    faces[IDX_A] = {
      top: topTitle("QRIS", 18),
      left: (
        <g>
          {lbl("QRIS", 8, 14, ink)}
          {qr}
          <rect x={8} y={84} width={Wl - 16} height={18} fill={paid ? ink : "none"} stroke={ink} strokeWidth={0.8} opacity={paid ? 0.9 : 0.6} />
          <text x={14} y={96} className={MONO} fontSize={7} fill={paid ? theme.main.left : ink}>
            {paid ? (isEn ? "PAID ✓" : "LUNAS ✓") : isEn ? "WAITING…" : "MENUNGGU…"}
          </text>
          {lbl(isEn ? "PROCESSED AUTOMATICALLY" : "DIPROSES OTOMATIS", 8, 118, ink, 5.6)}
        </g>
      ),
      right: (
        <g>
          {lbl(isEn ? "FROM" : "MULAI DARI", 8, 14, ink)}
          {big(fromPrice, 8, 38, ink, 15)}
          {lbl(isEn ? "ONE-TIME" : "SEKALI BAYAR", 8, 52, ink)}
        </g>
      ),
    };
    const methods = isEn
      ? ["e-wallet", "mobile banking", "TOKS balance", "e-wallet", "mobile banking"]
      : ["e-wallet", "mobile banking", "saldo TOKS", "e-wallet", "mobile banking"];
    faces[IDX_C] = {
      left: (
        <g>
          {lbl(isEn ? "PAYMENTS" : "PEMBAYARAN", 8, 12, ink2)}
          {logLines([0, 1, 2, 3, 4].map((k) => `${clock(76000 + t - k * 4)}  ✓ ${methods[(t + k) % methods.length]}`))}
        </g>
      ),
    };
    faces[IDX_B] = {
      left: (
        <g>
          {lbl("API KEY", 8, 14, ink2)}
          <text x={8} y={32} className="lp-display" fontSize={12} fill={ink2}>
            {isEn ? "ready in seconds" : "siap dalam detik"}
          </text>
        </g>
      ),
    };
  }
  return faces;
}

/* ---------- gedung ---------- */

function Building({
  g,
  pal,
  faces,
  clipId,
  className,
  delay,
  t,
}: {
  g: Geo;
  pal: Pal;
  faces: Faces;
  clipId: string;
  className: string;
  delay: number;
  t: number;
}) {
  const { x, y, w, d, h } = g;
  const stroke = "rgba(0,0,0,0.12)";
  const windows: React.ReactNode[] = [];
  if (faces.windows) {
    const cols = 4;
    const W = w * S;
    const H = h * S;
    const cw = (W - 12) / cols;
    for (let i = 0; i < cols; i++) {
      const lit = (i + t) % 3 !== 0;
      windows.push(
        <rect key={i} x={6 + i * cw + 2} y={H * 0.3} width={cw - 4} height={H * 0.5} fill={pal.ink} opacity={lit ? 0.75 : 0.18} />,
      );
    }
  }
  return (
    <g clipPath={`url(#${clipId})`}>
      <g className={className} style={{ "--h": `${((h + (w + d) / 2) * S + 4).toFixed(1)}px`, animationDelay: `${delay}s` } as React.CSSProperties}>
        <polygon points={pts([[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, h], [x, y + d, h]])} fill={pal.left} stroke={stroke} strokeWidth={0.6} />
        <polygon points={pts([[x + w, y + d, 0], [x + w, y, 0], [x + w, y, h], [x + w, y + d, h]])} fill={pal.right} stroke={stroke} strokeWidth={0.6} />
        <polygon points={pts([[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]])} fill={pal.top} stroke={stroke} strokeWidth={0.6} />
        {faces.top && <g transform={topM(g)}>{faces.top}</g>}
        {faces.left && <g transform={leftM(g)}>{faces.left}</g>}
        {windows.length > 0 && <g transform={leftM(g)}>{windows}</g>}
        {faces.right && <g transform={rightM(g)}>{faces.right}</g>}
      </g>
    </g>
  );
}

/* ---------- ikon tab (piksel 5x5) ---------- */

function PixelIcon({ rows, color }: { rows: string[]; color: string }) {
  return (
    <svg viewBox="0 0 25 25" className="h-5 w-5" aria-hidden="true">
      {rows.flatMap((r, i) =>
        r.split("").map((v, j) => (v === "1" ? <rect key={`${i}-${j}`} x={j * 5 + 0.5} y={i * 5 + 0.5} width={4} height={4} fill={color} /> : null)),
      )}
    </svg>
  );
}

/* ---------- komponen utama ---------- */

export function HeroScene({
  intro,
  isEn,
  fromPrice,
  className = "",
}: {
  intro: React.ReactNode;
  isEn: boolean;
  fromPrice: string;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [tick, setTick] = useState(0);
  const [visible, setVisible] = useState(true);
  const [hover, setHover] = useState(false);
  const [reduced, setReduced] = useState(false);
  const theme = THEMES[active];
  const paused = !visible || hover;

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  // Jeda saat hero tidak terlihat atau tab browser disembunyikan.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let inView = true;
    const update = () => setVisible(inView && document.visibilityState === "visible");
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      update();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  // Isi gedung "hidup": angka & grafik bergerak tiap detik.
  useEffect(() => {
    if (paused || reduced) return;
    const id = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [paused, reduced]);

  const go = useCallback(
    (next: number) => {
      if (next === active) return;
      setLeaving(active);
      setActive(next);
      setRound((r) => r + 1);
    },
    [active],
  );

  // Gedung lama dilepas setelah animasi tenggelam selesai.
  useEffect(() => {
    if (leaving === null) return;
    const id = window.setTimeout(() => setLeaving(null), 700);
    return () => window.clearTimeout(id);
  }, [leaving, round]);

  const faces = sceneFaces(theme, tick, isEn, fromPrice);
  const leavingTheme = leaving !== null ? THEMES[leaving] : null;
  const leavingFaces = leavingTheme ? sceneFaces(leavingTheme, tick, isEn, fromPrice) : null;
  const firstRound = round === 0;

  // Lantai: ubin bertema, transisi warna bergelombang dari belakang ke depan.
  const tiles: React.ReactNode[] = [];
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const hsh = (i * 7 + j * 13 + i * j * 3) % 10;
      const fill = hsh < 4 ? (hsh % 2 ? "#eef2ed" : "#f6f8f5") : theme.tiles[hsh % theme.tiles.length];
      tiles.push(
        <polygon
          key={`${i}-${j}`}
          points={pts([[i, j, 0], [i + 1, j, 0], [i + 1, j + 1, 0], [i, j + 1, 0]])}
          fill={fill}
          className="lp-floor-tile"
          style={{ transitionDelay: `${((i + j) * 0.025).toFixed(3)}s` }}
        />,
      );
    }
  }
  const lines: React.ReactNode[] = [];
  for (let i = 0; i <= GRID; i++) {
    const [ax, ay] = P([i, 0, 0]);
    const [bx, by] = P([i, GRID, 0]);
    const [cx, cy] = P([0, i, 0]);
    const [dx, dy] = P([GRID, i, 0]);
    lines.push(<line key={`a${i}`} x1={ax} y1={ay} x2={bx} y2={by} />);
    lines.push(<line key={`b${i}`} x1={cx} y1={cy} x2={dx} y2={dy} />);
  }

  const order = GEO.map((g, i) => ({ g, i })).sort((a, b) => a.g.x + a.g.y + a.g.w / 2 - (b.g.x + b.g.y + b.g.w / 2));

  return (
    <div ref={rootRef} className={`relative flex flex-col sm:block sm:min-h-[600px] ${paused ? "lp-paused" : ""} ${className}`}>
      {/* Adegan */}
      <div className="relative order-2 h-[340px] overflow-hidden sm:absolute sm:inset-0 sm:h-auto">
        <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            {GEO.map((g, i) => {
              const [lx, ly] = P([g.x, g.y + g.d, 0]);
              const [fx, fy] = P([g.x + g.w, g.y + g.d, 0]);
              const [rx, ry] = P([g.x + g.w, g.y, 0]);
              return (
                <clipPath key={i} id={`${uid}c${i}`} clipPathUnits="userSpaceOnUse">
                  <polygon points={`${lx},${ly} ${fx},${fy} ${rx},${ry} ${rx},-400 ${lx},-400`} />
                </clipPath>
              );
            })}
          </defs>
          <g>{tiles}</g>
          <g stroke="#c7d4c4" strokeWidth={0.8}>
            {lines}
          </g>
          {leavingTheme && leavingFaces && (
            <g key={`out-${round}`}>
              {order.map(({ g, i }) => (
                <Building
                  key={i}
                  g={g}
                  pal={i === IDX_A ? leavingTheme.main : leavingTheme.alt}
                  faces={leavingFaces[i]}
                  clipId={`${uid}c${i}`}
                  className="lp-block-sink"
                  delay={0}
                  t={tick}
                />
              ))}
            </g>
          )}
          <g key={`in-${round}`}>
            {order.map(({ g, i }, k) => (
              <Building
                key={i}
                g={g}
                pal={i === IDX_A ? theme.main : theme.alt}
                faces={faces[i]}
                clipId={`${uid}c${i}`}
                className="lp-block-rise"
                delay={(firstRound ? 0.25 : 0.4) + k * 0.09}
                t={tick}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Kotak intro */}
      <div className="relative z-10 order-1 p-4 sm:p-8 lg:p-10">{intro}</div>

      {/* Tab adegan + kartu */}
      <div
        className="relative z-10 order-3 p-4 sm:absolute sm:bottom-0 sm:left-0 sm:p-8 lg:p-10"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div className="inline-flex flex-col bg-white">
          <div role="tablist" aria-label={isEn ? "Highlights" : "Sorotan"} className="flex gap-1 p-1.5">
            {THEMES.map((th, i) => (
              <button
                key={th.key}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={th.title[isEn ? 1 : 0]}
                onClick={() => go(i)}
                className="group relative inline-flex h-8 w-8 items-center justify-center transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                style={{ background: i === active ? th.soft : "transparent" }}
              >
                <PixelIcon rows={th.icon} color={th.accent} />
                <span className="lp-mono pointer-events-none absolute bottom-full left-0 mb-2 whitespace-nowrap bg-[var(--lp-pale)] px-1.5 py-1 text-[10px] uppercase tracking-[0.04em] text-black opacity-0 transition-opacity group-hover:opacity-100">
                  {th.title[isEn ? 1 : 0]}
                </span>
              </button>
            ))}
          </div>
          <div className="h-[2px] w-full bg-[var(--lp-pale)]">
            {!reduced && (
              <span
                key={`timer-${round}-${active}`}
                className="lp-timer block h-full"
                style={{ background: theme.accent, animationDuration: `${SCENE_MS}ms` }}
                onAnimationEnd={(e) => {
                  if (e.target === e.currentTarget) go((active + 1) % THEMES.length);
                }}
              />
            )}
          </div>
        </div>
        <div key={`card-${active}`} className="lp-card-in mt-0 w-full max-w-[320px] bg-white p-4">
          <div className="text-[15px] tracking-tight text-black">{theme.title[isEn ? 1 : 0]}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted-foreground)]">{theme.desc[isEn ? 1 : 0]}</p>
        </div>
      </div>
    </div>
  );
}
