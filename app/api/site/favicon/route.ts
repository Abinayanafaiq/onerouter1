import sharp from "sharp";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

// Radius sudut relatif terhadap sisi terpendek. Sengaja sedikit di bawah
// masking ikon iOS (~22%) supaya sudut transparan tidak terlihat di sana.
const CORNER_RADIUS_RATIO = 0.2;

// Hasil pembulatan disimpan per isi favicon supaya sharp tidak jalan tiap request.
let cached: { source: string; png: Buffer } | null = null;

async function roundCorners(input: Buffer): Promise<Buffer> {
  const image = sharp(input).ensureAlpha();
  const { width, height } = await image.metadata();
  if (!width || !height) return input;

  const radius = Math.round(Math.min(width, height) * CORNER_RADIUS_RATIO);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}"/></svg>`,
  );
  return image
    .composite([{ input: mask, blend: "dest-in" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export async function GET(request: Request) {
  const setting = await prisma.setting.findUnique({
    where: { key: "site_favicon" },
    select: { value: true },
  });

  if (!setting?.value) {
    return Response.redirect(new URL("/icon", request.url));
  }

  const base64 = setting.value.split(",", 2)[1];
  if (!base64) {
    return new Response(null, { status: 404 });
  }

  if (cached?.source !== setting.value) {
    const original = Buffer.from(base64, "base64");
    let png: Buffer = original;
    try {
      png = await roundCorners(original);
    } catch (error) {
      // Gambar tetap disajikan apa adanya kalau pembulatan gagal.
      console.error("[site/favicon] gagal membulatkan sudut:", error);
    }
    cached = { source: setting.value, png };
  }

  return new Response(new Uint8Array(cached.png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
