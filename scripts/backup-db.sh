#!/usr/bin/env bash
# Backup database PostgreSQL via pg_dump (Linux/server).
# Kredensial diambil dari DIRECT_DATABASE_URL di .env — jangan tulis password di sini.
#
# Jalankan manual:
#   bash scripts/backup-db.sh
#
# Jadwal harian (cron, jam 03:00):
#   crontab -e
#   0 3 * * * /path/to/onerouter/scripts/backup-db.sh >> /path/to/onerouter/backups/backup.log 2>&1
set -euo pipefail

OUT_DIR="${1:-backups}"
KEEP_DAYS="${2:-30}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Ambil DIRECT_DATABASE_URL dari .env
URL=$(grep '^DIRECT_DATABASE_URL=' "$ROOT/.env" | head -1 | cut -d= -f2- | tr -d '"')
if [ -z "$URL" ]; then
  echo "DIRECT_DATABASE_URL tidak ditemukan di .env" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
TS=$(date +%Y%m%d-%H%M%S)
FILE="$OUT_DIR/backup-$TS.sql"

# --no-owner: backup bisa di-restore ke provider/user mana pun tanpa edit
pg_dump --no-owner --no-privileges -f "$FILE" "$URL"
gzip "$FILE"

# Hapus backup yang lebih tua dari KEEP_DAYS hari
find "$OUT_DIR" -name 'backup-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

echo "Backup OK: $FILE.gz ($(du -h "$FILE.gz" | cut -f1))"
