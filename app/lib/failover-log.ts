import { promises as fs } from "fs";
import path from "path";

// Log failover upstream (backup-upstream error/unreachable) ditulis ke file
// terpisah supaya tidak membanjiri log PM2 dan menenggelamkan log penting lain.
// File harian: <FAILOVER_LOG_DIR>/failover-YYYY-MM-DD.log, disimpan 14 hari.
const LOG_DIR = process.env.FAILOVER_LOG_DIR || path.join(process.cwd(), "logs");
const RETENTION_DAYS = Number(process.env.FAILOVER_LOG_RETENTION_DAYS) || 14;

let dirReady: Promise<unknown> | null = null;
let lastCleanupDay = "";

async function cleanupOldFiles(today: string) {
  if (lastCleanupDay === today) return;
  lastCleanupDay = today;
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const files = await fs.readdir(LOG_DIR).catch(() => [] as string[]);
  for (const name of files) {
    const m = /^failover-(\d{4}-\d{2}-\d{2})\.log$/.exec(name);
    if (m && new Date(m[1]).getTime() < cutoff) {
      await fs.unlink(path.join(LOG_DIR, name)).catch(() => {});
    }
  }
}

export function logFailover(message: string) {
  const stamp = new Date().toLocaleString("sv-SE");
  const day = stamp.slice(0, 10);
  const line = `[${stamp}] ${message.replace(/\s*\n\s*/g, " ")}\n`;
  dirReady ??= fs.mkdir(LOG_DIR, { recursive: true });
  // Fire-and-forget: kegagalan menulis log tidak boleh mengganggu request.
  void dirReady
    .then(() => fs.appendFile(path.join(LOG_DIR, `failover-${day}.log`), line))
    .then(() => cleanupOldFiles(day))
    .catch((err) => {
      dirReady = null;
      console.error("[failover-log] gagal menulis log failover:", err);
    });
}
