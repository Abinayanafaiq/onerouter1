export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const orderId = formData.get("orderId") as string;
    const file = formData.get("proof") as File | null;

    if (!orderId || !file) {
      return Response.json({ success: false, error: "Order ID dan file diperlukan" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ success: false, error: "File terlalu besar (max 5MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const { prisma } = await import("@prisma/client").then(() =>
      import("@/app/lib/prisma"),
    );

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return Response.json({ success: false, error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (order.status !== "PENDING") {
      return Response.json({ success: false, error: "Order sudah diproses" }, { status: 400 });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProof: base64,
      },
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error("[manual/upload] exception:", e);
    return Response.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}