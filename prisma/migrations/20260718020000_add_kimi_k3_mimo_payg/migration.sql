INSERT INTO "AIModel" (
  "id", "modelId", "masterId", "name", "provider", "description",
  "contextWindow", "inputPricePerMillion", "outputPricePerMillion",
  "supportsText", "supportsImages", "supportsStreaming", "enabled",
  "maintenanceMode", "sort", "createdAt", "updatedAt"
)
VALUES
  (
    'payg-kimi-k3', 'kimi-k3', 'kimi-k3', 'Kimi K3', 'Moonshot AI',
    'Kimi K3 oleh Moonshot AI untuk reasoning dan general task', '256K',
    0, 0, true, false, true, false, false, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'payg-mimo-v2-5-pro', 'mimo-v2.5-pro', 'mimo-v2.5-pro', 'MiMo V2.5 Pro', 'Xiaomi',
    'MiMo V2.5 Pro oleh Xiaomi untuk reasoning dan coding', '256K',
    0, 0, true, false, true, false, false, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
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
