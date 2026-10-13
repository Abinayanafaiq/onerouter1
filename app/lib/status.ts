import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getEnabledModels } from "./models";
import { getEnabledPackageModels } from "./package-models";

const PAYG_ENDPOINT = "/v1/chat/completions";
const PACKAGE_ENDPOINT = "/v1/package/chat/completions";

export const STATUS_HISTORY_DAYS = 30;
// Di bawah jumlah ini sampelnya terlalu kecil untuk menyimpulkan status.
const MIN_SAMPLE = 10;
const OPERATIONAL_RATE = 0.98;
const DEGRADED_RATE = 0.9;

export type ServiceState = "operational" | "degraded" | "outage" | "maintenance" | "nodata";

export type StatusDay = {
  date: string; // YYYY-MM-DD (WIB)
  uptime: number | null; // 0..1, null = tidak ada request terhitung
};

export type ModelStatus = {
  modelId: string;
  name: string;
  state: ServiceState;
  uptime30d: number | null;
  medianMs: number | null;
  days: StatusDay[];
};

export type StatusData = {
  payg: ModelStatus[];
  paket: ModelStatus[];
  overall: "operational" | "degraded" | "outage";
  updatedAt: string;
};

type HistoryRow = { endpoint: string; model: string; day: string; ok: number; failed: number };
type WindowRow = {
  endpoint: string;
  model: string;
  ok1h: number;
  failed1h: number;
  ok24h: number;
  failed24h: number;
  medianMs: number | null;
};

// Aturan hitung: sukses = success. Gagal layanan = 5xx, atau 401/404/408/429
// dari upstream (status itu tidak pernah dicatat untuk penolakan kita sendiri).
// 400/402/403 adalah penolakan dari sisi user dan tidak ikut dihitung.
const SERVICE_FAILURE = Prisma.sql`NOT "success" AND ("statusCode" >= 500 OR "statusCode" IN (401, 404, 408, 429))`;
const getHistory = unstable_cache(
  async (): Promise<HistoryRow[]> => {
    const since = new Date(Date.now() - (STATUS_HISTORY_DAYS + 1) * 86_400_000);
    return prisma.$queryRaw<HistoryRow[]>`
      SELECT
        "endpoint",
        "model",
        to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS "day",
        (count(*) FILTER (WHERE "success"))::int AS "ok",
        (count(*) FILTER (
          WHERE ${SERVICE_FAILURE}
        ))::int AS "failed"
      FROM public."ApiRequestLog"
      WHERE "createdAt" >= ${since}
        AND "endpoint" IN (${PAYG_ENDPOINT}, ${PACKAGE_ENDPOINT})
      GROUP BY 1, 2, 3
    `;
  },
  ["status-history"],
  { revalidate: 600 },
);

const getWindows = unstable_cache(
  async (): Promise<WindowRow[]> => {
    const now = Date.now();
    const dayAgo = new Date(now - 86_400_000);
    const hourAgo = new Date(now - 3_600_000);
    return prisma.$queryRaw<WindowRow[]>`
      SELECT
        "endpoint",
        "model",
        (count(*) FILTER (WHERE "success" AND "createdAt" >= ${hourAgo}))::int AS "ok1h",
        (count(*) FILTER (
          WHERE ${SERVICE_FAILURE}
            AND "createdAt" >= ${hourAgo}
        ))::int AS "failed1h",
        (count(*) FILTER (WHERE "success"))::int AS "ok24h",
        (count(*) FILTER (
          WHERE ${SERVICE_FAILURE}
        ))::int AS "failed24h",
        (percentile_cont(0.5) WITHIN GROUP (ORDER BY "responseTime")
          FILTER (WHERE "success"))::float8 AS "medianMs"
      FROM public."ApiRequestLog"
      WHERE "createdAt" >= ${dayAgo}
        AND "endpoint" IN (${PAYG_ENDPOINT}, ${PACKAGE_ENDPOINT})
      GROUP BY 1, 2
    `;
  },
  ["status-windows"],
  { revalidate: 60 },
);

/** Tanggal WIB (UTC+7) untuk N hari terakhir, urut dari yang terlama. */
function lastDays(count: number): string[] {
  const wibNow = Date.now() + 7 * 3_600_000;
  return Array.from({ length: count }, (_, i) =>
    new Date(wibNow - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
}

function rate(ok: number, failed: number): number | null {
  const total = ok + failed;
  return total > 0 ? ok / total : null;
}

function stateFromWindow(win: WindowRow | undefined): ServiceState {
  if (!win) return "nodata";
  const sample =
    win.ok1h + win.failed1h >= MIN_SAMPLE
      ? rate(win.ok1h, win.failed1h)
      : win.ok24h + win.failed24h >= MIN_SAMPLE
        ? rate(win.ok24h, win.failed24h)
        : null;
  if (sample === null) return "nodata";
  if (sample >= OPERATIONAL_RATE) return "operational";
  return sample >= DEGRADED_RATE ? "degraded" : "outage";
}

function buildModelStatus(
  endpoint: string,
  model: { modelId: string; name: string; maintenance: boolean },
  days: string[],
  history: HistoryRow[],
  windows: WindowRow[],
): ModelStatus {
  const byDay = new Map<string, HistoryRow>();
  for (const row of history) {
    if (row.endpoint === endpoint && row.model === model.modelId) byDay.set(row.day, row);
  }
  const win = windows.find((w) => w.endpoint === endpoint && w.model === model.modelId);

  let ok = 0;
  let failed = 0;
  const dayStats = days.map((date) => {
    const row = byDay.get(date);
    ok += row?.ok ?? 0;
    failed += row?.failed ?? 0;
    return { date, uptime: row ? rate(row.ok, row.failed) : null };
  });

  return {
    modelId: model.modelId,
    name: model.name,
    state: model.maintenance ? "maintenance" : stateFromWindow(win),
    uptime30d: rate(ok, failed),
    medianMs: win?.medianMs ?? null,
    days: dayStats,
  };
}

export async function getStatusData(): Promise<StatusData> {
  const [history, windows, paygModels, packageModels] = await Promise.all([
    getHistory(),
    getWindows(),
    getEnabledModels(),
    getEnabledPackageModels(),
  ]);
  const days = lastDays(STATUS_HISTORY_DAYS);

  const payg = paygModels.map((m) =>
    buildModelStatus(
      PAYG_ENDPOINT,
      { modelId: m.modelId, name: m.name, maintenance: m.maintenanceMode },
      days,
      history,
      windows,
    ),
  );
  const paket = packageModels.map((m) =>
    buildModelStatus(
      PACKAGE_ENDPOINT,
      { modelId: m.modelId, name: m.name, maintenance: false },
      days,
      history,
      windows,
    ),
  );

  const all = [...payg, ...paket];
  const overall = all.some((m) => m.state === "outage")
    ? "outage"
    : all.some((m) => m.state === "degraded")
      ? "degraded"
      : "operational";

  return { payg, paket, overall, updatedAt: new Date().toISOString() };
}
