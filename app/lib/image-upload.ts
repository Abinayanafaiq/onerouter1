import sharp from "sharp";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 25_000_000;
const MAX_IMAGE_DIMENSION = 3000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export class InvalidImageError extends Error {}

export async function normalizeUploadedImage(file: File): Promise<string> {
  if (file.size === 0) {
    throw new InvalidImageError("File gambar kosong");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new InvalidImageError("File terlalu besar (maksimal 5 MB)");
  }

  const input = Buffer.from(await file.arrayBuffer());

  try {
    const image = sharp(input, {
      animated: false,
      failOn: "warning",
      limitInputPixels: MAX_IMAGE_PIXELS,
    });
    const metadata = await image.metadata();

    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
      throw new InvalidImageError("Format gambar harus PNG, JPEG, atau WebP");
    }
    if (!metadata.width || !metadata.height) {
      throw new InvalidImageError("Dimensi gambar tidak valid");
    }

    const normalized = await image
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ compressionLevel: 9 })
      .toBuffer();

    return `data:image/png;base64,${normalized.toString("base64")}`;
  } catch (error) {
    if (error instanceof InvalidImageError) throw error;
    throw new InvalidImageError("File bukan gambar yang valid atau rusak");
  }
}
