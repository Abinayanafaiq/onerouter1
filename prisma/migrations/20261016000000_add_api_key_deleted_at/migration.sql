-- ApiKey dipakai di setiap request API. Gagal cepat kalau lock tidak didapat,
-- daripada antre dan menahan semua query ke tabel ini.
SET lock_timeout = '5s';

ALTER TABLE "ApiKey"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
