import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { updateModel } from "@/app/lib/models";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      id: string;
      name?: string;
      provider?: string;
      modelId?: string;
      contextWindow?: string | null;
      inputPricePerMillion?: number;
      outputPricePerMillion?: number;
      supportsText?: boolean;
      supportsImages?: boolean;
      supportsStreaming?: boolean;
      enabled?: boolean;
      maintenanceMode?: boolean;
      sort?: number;
      description?: string | null;
    };

    if (!body.id) {
      return NextResponse.json({ success: false, error: "ID diperlukan" }, { status: 400 });
    }

    const updateData: {
      name?: string;
      provider?: string;
      modelId?: string;
      contextWindow?: string | null;
      inputPricePerMillion?: number;
      outputPricePerMillion?: number;
      supportsText?: boolean;
      supportsImages?: boolean;
      supportsStreaming?: boolean;
      enabled?: boolean;
      maintenanceMode?: boolean;
      sort?: number;
      description?: string | null;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json({ success: false, error: "Name tidak valid" }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }

    if (body.provider !== undefined) {
      if (typeof body.provider !== "string" || body.provider.trim().length === 0) {
        return NextResponse.json({ success: false, error: "Provider tidak valid" }, { status: 400 });
      }
      updateData.provider = body.provider.trim();
    }

    if (body.modelId !== undefined) {
      if (typeof body.modelId !== "string" || body.modelId.trim().length === 0) {
        return NextResponse.json({ success: false, error: "Model ID tidak valid" }, { status: 400 });
      }
      updateData.modelId = body.modelId.trim();
    }

    if (body.contextWindow !== undefined) {
      updateData.contextWindow =
        typeof body.contextWindow === "string" && body.contextWindow.trim().length > 0
          ? body.contextWindow.trim()
          : null;
    }

    if (body.description !== undefined) {
      updateData.description =
        typeof body.description === "string" && body.description.trim().length > 0
          ? body.description.trim()
          : null;
    }

    if (body.inputPricePerMillion !== undefined) {
      if (Number.isFinite(body.inputPricePerMillion) && body.inputPricePerMillion >= 0) {
        updateData.inputPricePerMillion = body.inputPricePerMillion;
      } else {
        return NextResponse.json({ success: false, error: "Input price tidak valid" }, { status: 400 });
      }
    }
    if (body.outputPricePerMillion !== undefined) {
      if (Number.isFinite(body.outputPricePerMillion) && body.outputPricePerMillion >= 0) {
        updateData.outputPricePerMillion = body.outputPricePerMillion;
      } else {
        return NextResponse.json({ success: false, error: "Output price tidak valid" }, { status: 400 });
      }
    }

    if (body.supportsText !== undefined) {
      if (typeof body.supportsText !== "boolean") {
        return NextResponse.json({ success: false, error: "supportsText harus boolean" }, { status: 400 });
      }
      updateData.supportsText = body.supportsText;
    }
    if (body.supportsImages !== undefined) {
      if (typeof body.supportsImages !== "boolean") {
        return NextResponse.json({ success: false, error: "supportsImages harus boolean" }, { status: 400 });
      }
      updateData.supportsImages = body.supportsImages;
    }
    if (body.supportsStreaming !== undefined) {
      if (typeof body.supportsStreaming !== "boolean") {
        return NextResponse.json({ success: false, error: "supportsStreaming harus boolean" }, { status: 400 });
      }
      updateData.supportsStreaming = body.supportsStreaming;
    }

    if (body.enabled !== undefined) {
      if (typeof body.enabled !== "boolean") {
        return NextResponse.json({ success: false, error: "enabled harus boolean" }, { status: 400 });
      }
      updateData.enabled = body.enabled;
    }
    if (body.maintenanceMode !== undefined) {
      if (typeof body.maintenanceMode !== "boolean") {
        return NextResponse.json({ success: false, error: "maintenanceMode harus boolean" }, { status: 400 });
      }
      updateData.maintenanceMode = body.maintenanceMode;
    }

    if (body.sort !== undefined) {
      if (Number.isFinite(body.sort) && Number.isInteger(body.sort)) {
        updateData.sort = body.sort;
      } else {
        return NextResponse.json({ success: false, error: "Sort tidak valid" }, { status: 400 });
      }
    }

    const updated = await updateModel(body.id, updateData);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Model tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/models/update] exception:", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
