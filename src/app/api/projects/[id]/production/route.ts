import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePromptsForShot, queueShotInComfy } from "@/lib/production";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  try {
    if (action === "save-settings") {
      await prisma.project.update({ where: { id }, data: { styleGuide: String(body.styleGuide ?? "").trim() || null, referenceImagePath: String(body.referenceImagePath ?? "").trim() || null, fixedNegativePrompt: String(body.fixedNegativePrompt ?? "").trim() || null, defaultWidth: Number(body.defaultWidth) || 768, defaultHeight: Number(body.defaultHeight) || 432, defaultFps: Number(body.defaultFps) || 24 } });
      return NextResponse.json({ success: true });
    }
    const shots = await prisma.shot.findMany({ where: action === "generate-prompts" ? { projectId: id } : { projectId: id, status: "APPROVED" }, orderBy: { order: "asc" } });
    if (action === "generate-prompts") {
      const results = [];
      for (const shot of shots) {
        try { await generatePromptsForShot(shot.id); results.push({ shotId: shot.id, ok: true }); }
        catch (error) { results.push({ shotId: shot.id, ok: false, error: error instanceof Error ? error.message : "Unknown error" }); }
      }
      return NextResponse.json({ success: true, results });
    }
    if (action === "queue-animation" || action === "queue-upscale") {
      const type = action === "queue-upscale" ? "UPSCALE" : "IMAGE_TO_VIDEO";
      const results = [];
      for (const shot of shots) {
        try { const queued = await queueShotInComfy(shot.id, type); results.push({ shotId: shot.id, ok: true, ...queued }); }
        catch (error) { results.push({ shotId: shot.id, ok: false, error: error instanceof Error ? error.message : "Unknown error" }); }
      }
      return NextResponse.json({ success: true, results });
    }
    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
