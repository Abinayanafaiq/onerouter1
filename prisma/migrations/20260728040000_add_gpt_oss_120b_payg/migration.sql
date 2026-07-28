INSERT INTO "AIModel" (
  "id", "modelId", "masterId", "name", "provider", "description",
  "contextWindow", "inputPricePerMillion", "outputPricePerMillion",
  "supportsText", "supportsImages", "supportsStreaming", "enabled",
  "maintenanceMode", "sort", "createdAt", "updatedAt"
)
VALUES
  (
    'payg-gpt-oss-120b', 'gpt-oss-120b', 'gpt-oss-120b', 'GPT-OSS 120B', 'OpenAI',
    'GPT-OSS 120B oleh OpenAI — model open-source untuk reasoning dan general task', '128K',
    0, 0, true, false, true, false, false, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT ("modelId") DO UPDATE SET
  "masterId" = EXCLUDED."masterId",
  "name" = EXCLUDED."name",
  "provider" = EXCLUDED."provider",
  "description" = EXCLUDED."description",
  "contextWindow" = EXCLUDED."contextWindow",
  "supportsText" = EXCLUDED."supportsText",
  "supportsImages" = EXCLUDED."supportsImages",
  "supportsStreaming" = EXCLUDED."supportsStreaming",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;
