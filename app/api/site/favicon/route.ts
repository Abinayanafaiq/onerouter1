import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

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

  return new Response(Buffer.from(base64, "base64"), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
