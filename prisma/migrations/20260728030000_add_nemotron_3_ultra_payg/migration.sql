INSERT INTO "AIModel" (
  "id", "modelId", "masterId", "name", "provider", "description",
  "contextWindow", "inputPricePerMillion", "outputPricePerMillion",
  "supportsText", "supportsImages", "supportsStreaming", "enabled",
  "maintenanceMode", "sort", "createdAt", "updatedAt"
)
VALUES
  (
    'payg-nemotron-3-ultra', 'nemotron-3-ultra', 'nemotron-3-ultra', 'Nemotron 3 Ultra', 'NVIDIA',
    'Nemotron 3 Ultra oleh NVIDIA untuk reasoning dan general task', '1M',
    0, 0, true, false, true, false, false, 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
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
