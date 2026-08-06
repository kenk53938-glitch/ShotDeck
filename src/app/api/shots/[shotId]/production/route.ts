import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePromptsForShot, queueShotInComfy } from "@/lib/production";

export async function POST(request: NextRequest, { params }: { params: Promise<{ shotId: string }> }) {
  const { shotId } = await params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "save");
  try {
    if (action === "generate") return NextResponse.json({ success: true, prompts: await generatePromptsForShot(shotId) });
    if (action === "queue-animation" || action === "queue-upscale") {
      const type = action === "queue-upscale" ? "UPSCALE" : "IMAGE_TO_VIDEO";
      return NextResponse.json({ success: true, ...(await queueShotInComfy(shotId, type)) });
    }
    await prisma.shot.update({ where: { id: shotId }, data: { stillPrompt: String(body.stillPrompt ?? "").trim() || null, prompt: String(body.stillPrompt ?? "").trim() || null, motionPrompt: String(body.motionPrompt ?? "").trim() || null, negativePrompt: String(body.negativePrompt ?? "").trim() || null, sourceImagePath: String(body.sourceImagePath ?? "").trim() || null, previewVideoPath: String(body.previewVideoPath ?? "").trim() || null, finalVideoPath: String(body.finalVideoPath ?? "").trim() || null, seed: String(body.seed ?? "").trim() || null, width: Number(body.width) || null, height: Number(body.height) || null, fps: Number(body.fps) || null } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
