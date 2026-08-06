import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, isAbsolute, join, resolve } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { csvEscape, sanitizedShotId } from "@/lib/production";
import { STORAGE_ROOT, storageRelativePath } from "@/lib/storage";

function slug(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "project";
}

function assetPath(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/api/media/")) {
    const relative = value.slice("/api/media/".length).split("/").map(decodeURIComponent).join("/");
    return resolve(process.cwd(), relative);
  }
  if (value.startsWith("storage/") || value.startsWith("storage\\")) return resolve(process.cwd(), value);
  if (isAbsolute(value)) return value;
  return resolve(process.cwd(), value);
}

async function copyIfPresent(sourceValue: string | null, destinationDirectory: string, outputStem: string) {
  const source = assetPath(sourceValue);
  if (!source) return { file: "", warning: "No source path recorded." };
  try {
    const details = await stat(source);
    if (!details.isFile()) return { file: "", warning: `Not a file: ${sourceValue}` };
    const extension = extname(source) || extname(basename(sourceValue || "")) || ".bin";
    const destination = join(destinationDirectory, `${outputStem}${extension}`);
    await copyFile(source, destination);
    return { file: basename(destination), warning: "" };
  } catch (error) {
    return { file: "", warning: `${sourceValue}: ${error instanceof Error ? error.message : "copy failed"}` };
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, include: { shots: { orderBy: { order: "asc" } } } });
  if (!project) return NextResponse.json({ success: false, error: "Project not found." }, { status: 404 });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const exportName = `${slug(project.title)}-${timestamp}`;
  const exportRoot = resolve(STORAGE_ROOT, "exports", exportName);
  const stillsDir = join(exportRoot, "stills");
  const previewsDir = join(exportRoot, "previews");
  const finalDir = join(exportRoot, "final");
  await Promise.all([mkdir(stillsDir, { recursive: true }), mkdir(previewsDir, { recursive: true }), mkdir(finalDir, { recursive: true })]);

  const warnings: string[] = [];
  const rows: unknown[][] = [["shot_id", "title", "duration", "still", "preview", "final", "motion_prompt"]];
  for (const shot of project.shots) {
    if (shot.status !== "APPROVED") continue;
    const shotId = sanitizedShotId(shot);
    const [still, preview, final] = await Promise.all([
      copyIfPresent(shot.sourceImagePath, stillsDir, shotId),
      copyIfPresent(shot.previewVideoPath, previewsDir, shotId),
      copyIfPresent(shot.finalVideoPath, finalDir, shotId),
    ]);
    for (const warning of [still.warning, preview.warning, final.warning]) if (warning && !/No source path recorded/.test(warning)) warnings.push(`${shotId}: ${warning}`);
    rows.push([shotId, shot.title ?? "", shot.durationSeconds ?? 3, still.file, preview.file, final.file, shot.motionPrompt ?? ""]);
  }
  const manifest = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  await writeFile(join(exportRoot, "manifest.csv"), manifest, "utf8");
  await writeFile(join(exportRoot, "README.txt"), "ShotDeck project export\n\nstills/   selected source images\npreviews/ approved WAN preview clips\nfinal/    1920x1080 upscaled clips\nmanifest.csv shot order and metadata\n", "utf8");

  return NextResponse.json({ success: true, exportPath: storageRelativePath("exports", exportName), exportedShots: rows.length - 1, warnings });
}
