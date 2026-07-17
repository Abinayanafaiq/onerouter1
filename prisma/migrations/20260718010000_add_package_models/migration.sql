CREATE TABLE IF NOT EXISTS "PackageModel" (
  "id" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "upstreamId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'WeizeRouter',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "supportsStreaming" BOOLEAN NOT NULL DEFAULT true,
  "sort" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PackageModel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PackageModel_modelId_key" ON "PackageModel"("modelId");
CREATE UNIQUE INDEX IF NOT EXISTS "PackageModel_upstreamId_key" ON "PackageModel"("upstreamId");
CREATE INDEX IF NOT EXISTS "PackageModel_enabled_sort_idx" ON "PackageModel"("enabled", "sort");

INSERT INTO "PackageModel" ("id", "modelId", "upstreamId", "name", "provider", "enabled", "supportsStreaming", "sort", "updatedAt")
VALUES
  ('pkg-gpt-5-6-sol', 'gpt-5.6-sol', 'wz/gpt-5.6-sol', 'GPT 5.6 Sol', 'OpenAI', true, true, 1, CURRENT_TIMESTAMP),
  ('pkg-gpt-5-6-terra', 'gpt-5.6-terra', 'wz/gpt-5.6-terra', 'GPT 5.6 Terra', 'OpenAI', true, true, 2, CURRENT_TIMESTAMP),
  ('pkg-gpt-5-6-luna', 'gpt-5.6-luna', 'wz/gpt-5.6-luna', 'GPT 5.6 Luna', 'OpenAI', true, true, 3, CURRENT_TIMESTAMP),
  ('pkg-gpt-5-5-review', 'gpt-5.5-review', 'wz/gpt-5.5-review', 'GPT 5.5 Review', 'OpenAI', true, true, 4, CURRENT_TIMESTAMP),
  ('pkg-gpt-5-4', 'gpt-5.4', 'wz/gpt-5.4', 'GPT 5.4', 'OpenAI', true, true, 5, CURRENT_TIMESTAMP),
  ('pkg-gpt-5-4-review', 'gpt-5.4-review', 'wz/gpt-5.4-review', 'GPT 5.4 Review', 'OpenAI', true, true, 6, CURRENT_TIMESTAMP),
  ('pkg-gpt-5-4-mini', 'gpt-5.4-mini', 'wz/gpt-5.4-mini', 'GPT 5.4 Mini', 'OpenAI', true, true, 7, CURRENT_TIMESTAMP),
  ('pkg-gpt-5-4-mini-review', 'gpt-5.4-mini-review', 'wz/gpt-5.4-mini-review', 'GPT 5.4 Mini Review', 'OpenAI', true, true, 8, CURRENT_TIMESTAMP),
  ('pkg-grok-4-5', 'grok-4.5', 'wz/grok-4.5', 'Grok 4.5', 'xAI', true, true, 9, CURRENT_TIMESTAMP),
  ('pkg-grok-4-5-low', 'grok-4.5-low', 'wz/grok-4.5-low', 'Grok 4.5 Low', 'xAI', true, true, 10, CURRENT_TIMESTAMP),
  ('pkg-grok-4-5-medium', 'grok-4.5-medium', 'wz/grok-4.5-medium', 'Grok 4.5 Medium', 'xAI', true, true, 11, CURRENT_TIMESTAMP),
  ('pkg-grok-4-5-high', 'grok-4.5-high', 'wz/grok-4.5-high', 'Grok 4.5 High', 'xAI', true, true, 12, CURRENT_TIMESTAMP),
  ('pkg-gemini-3-5-flash-extra-low', 'gemini-3.5-flash-extra-low', 'wz/gemini-3.5-flash-extra-low', 'Gemini 3.5 Flash Extra Low', 'Google', true, true, 13, CURRENT_TIMESTAMP),
  ('pkg-gemini-3-flash-agent', 'gemini-3-flash-agent', 'wz/gemini-3-flash-agent', 'Gemini 3 Flash Agent', 'Google', true, true, 14, CURRENT_TIMESTAMP),
  ('pkg-gemini-3-5-flash-low', 'gemini-3.5-flash-low', 'wz/gemini-3.5-flash-low', 'Gemini 3.5 Flash Low', 'Google', true, true, 15, CURRENT_TIMESTAMP),
  ('pkg-gemini-pro-agent', 'gemini-pro-agent', 'wz/gemini-pro-agent', 'Gemini Pro Agent', 'Google', true, true, 16, CURRENT_TIMESTAMP),
  ('pkg-gemini-3-1-pro-low', 'gemini-3.1-pro-low', 'wz/gemini-3.1-pro-low', 'Gemini 3.1 Pro Low', 'Google', true, true, 17, CURRENT_TIMESTAMP),
  ('pkg-gemini-3-flash', 'gemini-3-flash', 'wz/gemini-3-flash', 'Gemini 3 Flash', 'Google', true, true, 18, CURRENT_TIMESTAMP),
  ('pkg-gemini-3-1-flash-lite-preview', 'gemini-3.1-flash-lite-preview', 'wz/gemini-3.1-flash-lite-preview', 'Gemini 3.1 Flash Lite Preview', 'Google', true, true, 19, CURRENT_TIMESTAMP),
  ('pkg-gemini-2-5-pro', 'gemini-2.5-pro', 'wz/gemini-2.5-pro', 'Gemini 2.5 Pro', 'Google', true, true, 20, CURRENT_TIMESTAMP),
  ('pkg-gemini-2-5-flash', 'gemini-2.5-flash', 'wz/gemini-2.5-flash', 'Gemini 2.5 Flash', 'Google', true, true, 21, CURRENT_TIMESTAMP),
  ('pkg-gemini-2-5-flash-lite', 'gemini-2.5-flash-lite', 'wz/gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', 'Google', true, true, 22, CURRENT_TIMESTAMP)
ON CONFLICT ("modelId") DO UPDATE SET
  "upstreamId" = EXCLUDED."upstreamId",
  "name" = EXCLUDED."name",
  "provider" = EXCLUDED."provider",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;
