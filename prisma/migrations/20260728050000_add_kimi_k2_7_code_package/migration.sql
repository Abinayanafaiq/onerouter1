INSERT INTO "PackageModel" ("id", "modelId", "upstreamId", "name", "provider", "enabled", "supportsStreaming", "sort", "updatedAt")
VALUES
  ('pkg-kimi-k2-7-code', 'kimi-k2.7-code', 'kimi-k2.7-code', 'Kimi K2.7 Code', 'Moonshot AI', true, true, 23, CURRENT_TIMESTAMP)
ON CONFLICT ("modelId") DO UPDATE SET
  "upstreamId" = EXCLUDED."upstreamId",
  "name" = EXCLUDED."name",
  "provider" = EXCLUDED."provider",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;
