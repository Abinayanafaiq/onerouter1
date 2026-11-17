/**
 * Ilustrasi isometrik (kubus & ubin) untuk landing page.
 * Murni SVG tanpa state — aman dipakai di Server maupun Client Component.
 */

type Vec3 = [number, number, number];

type Palette = { top: string; left: string; right: string; win?: string; stroke?: string };

export const ISO_PALETTES = {
  green: { top: "#8ef3b5", left: "#19e76e", right: "#0fbf57", win: "#063d1f" },
  plum: { top: "#6b4a8c", left: "#4a2f66", right: "#33204a", win: "#9c7cc4" },
  lav: { top: "#ece6ff", left: "#cbbcf6", right: "#ad9ae6", win: "#7c66c4" },
  mint: { top: "#effdf0", left: "#d7face", right: "#b9eeb0", win: "#5ab87a" },
  ink: { top: "#3a3c3a", left: "#1a1b1a", right: "#000000", win: "#19e76e" },
  paper: { top: "#ffffff", left: "#f1f5f0", right: "#e3eae1", win: "#a2ae9d", stroke: "#c7d4c4" },
} satisfies Record<string, Palette>;

export type IsoCube = {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  palette: Palette;
  /** Pola jendela kotak-kotak di sisi kubus. */
  windows?: boolean;
  /** Garis-garis seperti kode di sisi kiri. */
  code?: boolean;
};

export type IsoTile = { x: number; y: number; color: string };

const COS = Math.cos(Math.PI / 6);

function makeProject(scale: number, ox: number, oy: number) {
  return ([x, y, z]: Vec3): [number, number] => [ox + (x - y) * scale * COS, oy + (x + y) * scale * 0.5 - z * scale];
}

function pts(project: (p: Vec3) => [number, number], list: Vec3[]) {
  return list
    .map(project)
    .map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`)
    .join(" ");
}

/** Titik pada bidang: O + U*u + V*v */
function onFace(o: Vec3, u: Vec3, v: Vec3, a: number, b: number): Vec3 {
  return [o[0] + u[0] * a + v[0] * b, o[1] + u[1] * a + v[1] * b, o[2] + u[2] * a + v[2] * b];
}

function faceRect(o: Vec3, u: Vec3, v: Vec3, a0: number, a1: number, b0: number, b1: number): Vec3[] {
  return [onFace(o, u, v, a0, b0), onFace(o, u, v, a1, b0), onFace(o, u, v, a1, b1), onFace(o, u, v, a0, b1)];
}

function Cube({ c, project }: { c: IsoCube; project: (p: Vec3) => [number, number] }) {
  const { x, y, w, d, h, palette } = c;
  const z = c.z ?? 0;
  const top: Vec3[] = [
    [x, y, z + h],
    [x + w, y, z + h],
    [x + w, y + d, z + h],
    [x, y + d, z + h],
  ];
  // Sisi kiri (menghadap penonton, bidang y = y + d)
  const leftO: Vec3 = [x, y + d, z];
  const leftU: Vec3 = [w, 0, 0];
  const leftV: Vec3 = [0, 0, h];
  // Sisi kanan (bidang x = x + w)
  const rightO: Vec3 = [x + w, y + d, z];
  const rightU: Vec3 = [0, -d, 0];
  const rightV: Vec3 = [0, 0, h];

  const stroke = palette.stroke ?? "rgba(0,0,0,0.12)";
  const extras: React.ReactNode[] = [];

  if (c.windows && palette.win) {
    const cols = Math.max(2, Math.round(w * 1.4));
    const rows = Math.max(2, Math.round(h * 1.4));
    const colsR = Math.max(2, Math.round(d * 1.4));
    const gap = 0.22;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i * 7 + j * 3) % 5 === 0) continue;
        extras.push(
          <polygon
            key={`l${i}-${j}`}
            points={pts(project, faceRect(leftO, leftU, leftV, (i + gap) / cols, (i + 1 - gap) / cols, (j + gap) / rows, (j + 1 - gap) / rows))}
            fill={palette.win}
            opacity={0.85}
          />,
        );
      }
    }
    for (let i = 0; i < colsR; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i * 5 + j * 2) % 4 === 0) continue;
        extras.push(
          <polygon
            key={`r${i}-${j}`}
            points={pts(project, faceRect(rightO, rightU, rightV, (i + gap) / colsR, (i + 1 - gap) / colsR, (j + gap) / rows, (j + 1 - gap) / rows))}
            fill={palette.win}
            opacity={0.7}
          />,
        );
      }
    }
  }

  if (c.code && palette.win) {
    const lines = [0.62, 0.4, 0.78, 0.3, 0.55, 0.7, 0.25];
    lines.forEach((len, i) => {
      const v1 = 0.86 - i * 0.11;
      extras.push(
        <polygon
          key={`c${i}`}
          points={pts(project, faceRect(leftO, leftU, leftV, 0.1, 0.1 + len * 0.8, v1 - 0.045, v1))}
          fill={palette.win}
        />,
      );
    });
  }

  return (
    <g>
      <polygon points={pts(project, faceRect(leftO, leftU, leftV, 0, 1, 0, 1))} fill={palette.left} stroke={stroke} strokeWidth={0.6} />
      <polygon points={pts(project, faceRect(rightO, rightU, rightV, 0, 1, 0, 1))} fill={palette.right} stroke={stroke} strokeWidth={0.6} />
      <polygon points={pts(project, top)} fill={palette.top} stroke={stroke} strokeWidth={0.6} />
      {extras}
    </g>
  );
}

export function IsoScene({
  cubes,
  tiles = [],
  grid = 12,
  scale = 38,
  width = 900,
  height = 560,
  originX,
  originY,
  className,
  children,
}: {
  cubes: IsoCube[];
  tiles?: IsoTile[];
  grid?: number;
  scale?: number;
  width?: number;
  height?: number;
  originX?: number;
  originY?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const project = makeProject(scale, originX ?? width / 2, originY ?? scale * 2.5);
  const lines: React.ReactNode[] = [];
  for (let i = 0; i <= grid; i++) {
    const [ax, ay] = project([i, 0, 0]);
    const [bx, by] = project([i, grid, 0]);
    const [cx, cy] = project([0, i, 0]);
    const [dx, dy] = project([grid, i, 0]);
    lines.push(<line key={`gx${i}`} x1={ax} y1={ay} x2={bx} y2={by} />);
    lines.push(<line key={`gy${i}`} x1={cx} y1={cy} x2={dx} y2={dy} />);
  }
  // Gambar dari belakang ke depan supaya tumpukan benar
  const ordered = [...cubes].sort((a, b) => a.x + a.y + (a.z ?? 0) * 0.01 - (b.x + b.y + (b.z ?? 0) * 0.01));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      {tiles.map((t) => (
        <polygon
          key={`t${t.x}-${t.y}`}
          points={pts(project, [
            [t.x, t.y, 0],
            [t.x + 1, t.y, 0],
            [t.x + 1, t.y + 1, 0],
            [t.x, t.y + 1, 0],
          ])}
          fill={t.color}
        />
      ))}
      <g stroke="#c7d4c4" strokeWidth={0.8}>{lines}</g>
      {ordered.map((c, i) => (
        <Cube key={i} c={c} project={project} />
      ))}
      {children}
    </svg>
  );
}

/* ---------- Komposisi siap pakai ---------- */

const TILE_COLORS = ["#d7face", "#e2d8ff", "#ffe2cc", "#fbd5e8", "#d4ebff", "#f3f7c8"];

export const HERO_TILES: IsoTile[] = [
  [1, 1], [2, 1], [5, 0], [7, 2], [9, 1], [10, 4], [3, 3], [0, 5], [6, 5], [8, 7], [11, 6], [2, 8], [4, 9], [9, 9], [11, 10], [6, 11], [1, 10], [10, 0], [0, 2], [7, 9],
].map(([x, y], i) => ({ x, y, color: TILE_COLORS[i % TILE_COLORS.length] }));

export function HeroIso({ className }: { className?: string }) {
  const P = ISO_PALETTES;
  return (
    <IsoScene
      className={className}
      originX={560}
      tiles={HERO_TILES}
      cubes={[
        { x: 7, y: 1, w: 2, d: 2, h: 1.2, palette: P.lav, windows: true },
        { x: 9.5, y: 2.5, w: 1.6, d: 1.6, h: 2.4, palette: P.plum, windows: true },
        { x: 4, y: 3, w: 2.6, d: 2.6, h: 3.4, palette: P.green, code: true },
        { x: 6.8, y: 4.4, w: 1.8, d: 1.8, h: 1.6, palette: P.green, windows: true },
        { x: 2, y: 7, w: 1.6, d: 1.6, h: 1, palette: P.paper, windows: true },
        { x: 8.5, y: 7, w: 2.2, d: 1.4, h: 0.8, palette: P.mint, windows: true },
        { x: 5, y: 8, w: 1.2, d: 1.2, h: 2.2, palette: P.ink, windows: true },
      ]}
    >
      {/* Label melayang di atas kubus utama */}
      <g transform="translate(495 78)" className="max-sm:hidden">
        <rect width="196" height="30" fill="#ffffff" stroke="#000000" strokeWidth="1" />
        <rect x="10" y="11" width="8" height="8" fill="#19e76e" />
        <text x="26" y="19.5" fontFamily="var(--font-geist-mono), monospace" fontSize="11" fill="#000000">
          POST /v1/chat/completions
        </text>
      </g>
      <line x1="593" y1="108" x2="593" y2="146" stroke="#000000" strokeWidth="1" className="max-sm:hidden" />
    </IsoScene>
  );
}

/** Adegan untuk panel fitur — kubus ke-`accent` disorot hijau. */
export function FeatureIso({ accent, className }: { accent: number; className?: string }) {
  const P = ISO_PALETTES;
  const base: Omit<IsoCube, "palette">[] = [
    { x: 2, y: 2, w: 3, d: 3, h: 3, windows: true },
    { x: 6.5, y: 1.5, w: 2.4, d: 2.4, h: 2.2, windows: true },
    { x: 6, y: 6, w: 2.6, d: 2.6, h: 2.8, windows: true },
    { x: 1.5, y: 7, w: 2.2, d: 2.2, h: 1.6, windows: true },
  ];
  const rest = [P.plum, P.lav, P.ink, P.mint];
  return (
    <IsoScene
      className={className}
      grid={11}
      scale={34}
      originX={360}
      originY={110}
      tiles={HERO_TILES.slice(0, 12)}
      cubes={base.map((c, i) => ({ ...c, palette: i === accent ? P.green : rest[i], code: i === accent }))}
    />
  );
}
