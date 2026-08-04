-- Kimi K2.7 Code, Qwen 7 Plus & Kimi K3 terbukti menerima input gambar dari
-- upstream (diverifikasi langsung lewat /v1/package/chat/completions dengan
-- konten image_url). Sinkronkan metadata agar /v1/models mengiklankan
-- modality image.
UPDATE "AIModel"
SET "supportsImages" = true,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "modelId" IN ('kimi-k2.7-code', 'qwen3.7-plus', 'kimi-k3');
