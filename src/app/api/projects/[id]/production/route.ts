import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateImagePromptsForShot, pollGenerationJob, queueShotInComfy } from "@/lib/production";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  try {
    if (action === "save-settings") {
      await prisma.project.update({ where: { id }, data: { styleGuide: String(body.styleGuide ?? "").trim() || null, fixedNegativePrompt: String(body.fixedNegativePrompt ?? "").trim() || null, defaultWidth: Math.max(64, Number(body.defaultWidth) || 768), defaultHeight: Math.max(64, Number(body.defaultHeight) || 432), defaultFps: Math.max(1, Number(body.defaultFps) || 24), ...(body.referenceImageUrl !== undefined ? { referenceImageUrl: String(body.referenceImageUrl).trim() || null } : {}), ...(body.referenceImagePath !== undefined ? { referenceImagePath: String(body.referenceImagePath).trim() || null } : {}) } });
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
    if (action === "retry-job") {
      const jobId = String(body.jobId ?? "");
      const job = await prisma.generationJob.findFirst({ where: { id: jobId, shot: { projectId: id } } });
      if (!job) return NextResponse.json({ success: false, error: "Job not found in this project." }, { status: 404 });
      const queued = await queueShotInComfy(job.shotId, job.type);
      return NextResponse.json({ success: true, queued });
    }
    if (action === "approve-preview" || action === "approve-final") {
      const shotId = String(body.shotId ?? "");
      const mediaKind = action === "approve-final" ? "FINAL" : "PREVIEW";
      const shot = await prisma.shot.findFirst({ where: { id: shotId, projectId: id } });
      const assetPath = mediaKind === "FINAL" ? shot?.finalVideoPath : shot?.previewVideoPath;
      if (!shot || !assetPath) {
        return NextResponse.json({ success: false, error: `This shot has no ${mediaKind === "FINAL" ? "final 1080p" : "preview"} clip to approve.` }, { status: 409 });
      }
      const take = await prisma.take.findFirst({ where: { shotId, mediaKind, status: { in: ["READY", "SELECTED"] } }, orderBy: { versionNumber: "desc" } });
      if (!take) {
        return NextResponse.json({ success: false, error: `No ready ${mediaKind.toLowerCase()} Take was found for this shot.` }, { status: 409 });
      }
      await prisma.$transaction([
        prisma.take.updateMany({ where: { shotId, id: { not: take.id }, isSelected: true }, data: { isSelected: false, status: "READY" } }),
        prisma.take.update({ where: { id: take.id }, data: { isSelected: true, status: "SELECTED" } }),
        prisma.shot.update({ where: { id: shotId }, data: { status: "APPROVED", videoUrl: take.fileUrl ?? assetPath } }),
      ]);
      return NextResponse.json({ success: true, approved: mediaKind });
    }
    if (action === "queue-animation" || action === "queue-upscale") {
      const type = action === "queue-upscale" ? "UPSCALE" : "IMAGE_TO_VIDEO";
      const requestedIds = Array.isArray(body.shotIds) ? body.shotIds.map(String) : [];
      const shots = await prisma.shot.findMany({ where: { ...(type === "UPSCALE" ? { projectId: id, status: "APPROVED", previewVideoPath: { not: null } } : { projectId: id, status: "APPROVED", sourceImagePath: { not: null }, motionPrompt: { not: null } }), ...(requestedIds.length ? { id: { in: requestedIds } } : {}) }, orderBy: { order: "asc" } });
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
