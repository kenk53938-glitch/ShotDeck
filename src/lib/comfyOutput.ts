import { copyFile, mkdir } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { prisma } from "@/lib/prisma";
import { mediaUrl, STORAGE_ROOT } from "@/lib/storage";

function safeFileName(value: string) {
  const name = basename(value).replace(/[^a-zA-Z0-9._-]+/g, "_");
  return name || "comfy-output.bin";
}

function comfyViewUrl(outputPath: string) {
  const normalized = outputPath.replaceAll("\\", "/");
  const fileName = normalized.split("/").pop() || normalized;
  const subfolder = normalized.includes("/")
    ? normalized.slice(0, Math.max(0, normalized.lastIndexOf("/")))
    : "";
  const base = (process.env.COMFY_URL ?? "http://127.0.0.1:8188").replace(/\/+$/, "");
  const url = new URL(`${base}/view`);
  url.searchParams.set("filename", fileName);
  if (subfolder && !isAbsolute(outputPath)) url.searchParams.set("subfolder", subfolder);
  url.searchParams.set("type", "output");
  return url.toString();
}

/**
 * Converts a completed ComfyUI history result into a usable ShotDeck asset.
 *
 * When COMFY_OUTPUT_DIRECTORY is configured, the output is copied into
 * ShotDeck's local storage and served through the protected media route. When
 * it is not configured, the Take still receives a ComfyUI /view URL so the
 * creator can inspect the render, while final project organization reports a
 * clear missing-local-file warning instead of crashing.
 */
export async function materializeCompletedJob(jobId: string) {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: { shot: true },
  });
  if (!job || job.status !== "COMPLETED" || !job.outputTakeId || !job.outputPath) {
    return { warning: null as string | null };
  }

  const take = await prisma.take.findUnique({ where: { id: job.outputTakeId } });
  if (!take) {
    return { warning: "The render completed, but its output Take could not be found." };
  }
  if (take.fileUrl?.startsWith("/api/media/") && take.localPath && isAbsolute(take.localPath)) {
    return { warning: null as string | null };
  }

  const outputPath = job.outputPath;
  let localPath = take.localPath || outputPath;
  let fileUrl = take.fileUrl && /^(https?:|\/api\/media\/)/i.test(take.fileUrl)
    ? take.fileUrl
    : comfyViewUrl(outputPath);
  let warning: string | null = null;

  const outputDirectory = process.env.COMFY_OUTPUT_DIRECTORY?.trim();
  if (outputDirectory) {
    const sourcePath = isAbsolute(outputPath)
      ? outputPath
      : resolve(outputDirectory, outputPath.replace(/^[/\\]+/, ""));
    const stageDirectory = job.type === "UPSCALE" ? "final" : "previews";
    const destinationDirectory = resolve(
      STORAGE_ROOT,
      "projects",
      job.shot.projectId,
      stageDirectory,
      job.shotId,
    );
    const destinationPath = join(
      destinationDirectory,
      `${job.id}_${safeFileName(outputPath)}`,
    );

    try {
      await mkdir(destinationDirectory, { recursive: true });
      await copyFile(sourcePath, destinationPath);
      localPath = destinationPath;
      fileUrl = mediaUrl(relative(process.cwd(), destinationPath));
    } catch (error) {
      warning = `The render completed, but ShotDeck could not copy ${sourcePath} into local storage: ${
        error instanceof Error ? error.message : "unknown filesystem error"
      }`;
    }
  } else if (isAbsolute(outputPath)) {
    warning = "The render completed, but COMFY_OUTPUT_DIRECTORY is not configured, so the absolute ComfyUI output cannot be copied into the final project export.";
  }

  const mediaKind = job.type === "UPSCALE" ? "FINAL" : "PREVIEW";
  await prisma.$transaction([
    prisma.take.update({
      where: { id: take.id },
      data: {
        fileUrl,
        localPath,
        originalFileName: safeFileName(outputPath),
        notes: [take.notes, warning].filter(Boolean).join(" · ") || null,
      },
    }),
    prisma.generationJob.update({
      where: { id: job.id },
      data: { outputPath: localPath, errorMessage: warning },
    }),
    prisma.shot.update({
      where: { id: job.shotId },
      data: {
        videoUrl: fileUrl,
        ...(mediaKind === "FINAL"
          ? { finalVideoPath: localPath }
          : { previewVideoPath: localPath }),
      },
    }),
  ]);

  return { warning, fileUrl, localPath };
}
