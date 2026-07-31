# Backup database PostgreSQL via pg_dump (Windows).
# Kredensial diambil dari DIRECT_DATABASE_URL di .env — jangan tulis password di sini.
#
# Jalankan manual:
#   powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1
#
# Jadwal harian (Task Scheduler, jam 03:00):
#   schtasks /Create /TN "OneRouter-BackupDB" /SC DAILY /ST 03:00 /F ^
#     /TR "powershell -ExecutionPolicy Bypass -File C:\AICompany\onerouter\scripts\backup-db.ps1"
param(
    [string]$OutDir = "backups",
    [int]$KeepDays = 30,
    [int]$KeepCount = 0   # > 0: sisakan N file terbaru, abaikan KeepDays
)

$ErrorActionPreference = 'Stop'
$pgDump = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
$root = Split-Path -Parent $PSScriptRoot

# Ambil DIRECT_DATABASE_URL dari .env
$line = Select-String -Path (Join-Path $root ".env") -Pattern '^DIRECT_DATABASE_URL=' | Select-Object -First 1
if (-not $line) { throw "DIRECT_DATABASE_URL tidak ditemukan di .env" }
$url = $line.Line -replace '^DIRECT_DATABASE_URL=', '' -replace '^"|"$', ''

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$sqlFile = Join-Path $OutDir "backup-$ts.sql"

# --no-owner: backup bisa di-restore ke provider/user mana pun tanpa edit
& $pgDump --no-owner --no-privileges --file="$sqlFile" "$url"
if ($LASTEXITCODE -ne 0) { throw "pg_dump gagal (exit code $LASTEXITCODE)" }

# Kompres ke .zip lalu hapus .sql mentah
Compress-Archive -Path $sqlFile -DestinationPath "$sqlFile.zip"
Remove-Item $sqlFile

# Retensi backup
$files = Get-ChildItem $OutDir -Filter 'backup-*.sql.zip' | Sort-Object LastWriteTime -Descending
if ($KeepCount -gt 0) {
    # Sisakan $KeepCount file terbaru, hapus sisanya
    $files | Select-Object -Skip $KeepCount | Remove-Item
} else {
    # Hapus backup yang lebih tua dari $KeepDays hari
    $limit = (Get-Date).AddDays(-$KeepDays)
    $files | Where-Object { $_.LastWriteTime -lt $limit } | Remove-Item
}

$size = (Get-Item "$sqlFile.zip").Length / 1MB
Write-Host ("Backup OK: {0} ({1:N1} MB)" -f "$sqlFile.zip", $size)
