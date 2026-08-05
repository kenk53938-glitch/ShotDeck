import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateImagePromptsForShot, pollGenerationJob, queueShotInComfy } from "@/lib/production";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  try {
    if (action === "save-settings") {
      await prisma.project.update({
        where: { id },
        data: {
          styleGuide: String(body.styleGuide ?? "").trim() || null,
          fixedNegativePrompt: String(body.fixedNegativePrompt ?? "").trim() || null,
          defaultWidth: Math.max(64, Number(body.defaultWidth) || 768),
          defaultHeight: Math.max(64, Number(body.defaultHeight) || 432),
          defaultFps: Math.max(1, Number(body.defaultFps) || 24),
          ...(body.referenceImageUrl !== undefined ? { referenceImageUrl: String(body.referenceImageUrl).trim() || null } : {}),
          ...(body.referenceImagePath !== undefined ? { referenceImagePath: String(body.referenceImagePath).trim() || null } : {}),
        },
      });
      return NextResponse.json({ success: true });
    }
    if (action === "generate-prompts") {
      const overwrite = body.overwrite === true;
      const shots = await prisma.shot.findMany({ where: { projectId: id, status: { in: ["PLANNED", "PROMPTING"] } }, orderBy: { order: "asc" } });
      const results = [];
      for (const shot of shots) {
        if (!overwrite && (shot.positivePrompt?.trim() || shot.negativePrompt?.trim())) { results.push({ shotId: shot.id, ok: true, skipped: true, reason: "Existing prompt preserved" }); continue; }
        try { const generated = await generateImagePromptsForShot(shot.id, { persist: true, overwrite }); results.push({ shotId: shot.id, ok: true, skipped: false, visionWarning: generated.visionWarning }); }
        catch (error) { results.push({ shotId: shot.id, ok: false, error: error instanceof Error ? error.message : "Unknown prompt-generation error" }); }
      }
      return NextResponse.json({ success: true, results });
    }
    if (action === "poll-jobs") {
      const jobs = await prisma.generationJob.findMany({ where: { shot: { projectId: id }, status: { in: ["QUEUED", "RUNNING"] } }, orderBy: { createdAt: "asc" } });
      const results = [];
      for (const job of jobs) {
        try { const updated = await pollGenerationJob(job.id); results.push({ jobId: job.id, ok: true, status: updated?.status }); }
        catch (error) { results.push({ jobId: job.id, ok: false, error: error instanceof Error ? error.message : "Polling failed" }); }
      }
      return NextResponse.json({ success: true, results });
    }
    if (action === "queue-animation" || action === "queue-upscale") {
      const type = action === "queue-upscale" ? "UPSCALE" : "IMAGE_TO_VIDEO";
      const shots = await prisma.shot.findMany({ where: type === "UPSCALE" ? { projectId: id, status: "APPROVED", previewVideoPath: { not: null } } : { projectId: id, status: "APPROVED", sourceImagePath: { not: null }, motionPrompt: { not: null } }, orderBy: { order: "asc" } });
      const results = [];
      for (const shot of shots) {
        try { const queued = await queueShotInComfy(shot.id, type); results.push({ shotId: shot.id, ok: true, ...queued }); }
        catch (error) { results.push({ shotId: shot.id, ok: false, error: error instanceof Error ? error.message : "Queue failed" }); }
      }
      return NextResponse.json({ success: true, results });
    }
    return NextResponse.json({ success: false, error: "Unknown production action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
