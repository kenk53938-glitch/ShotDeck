import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizedShotId } from "@/lib/production";
import { saveImageFile } from "@/lib/storage";

function normalizeStem(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/,/g, "_")
    .replace(/-+/g, "_")
    .replace(/_+/g, "_");
}

function identifiersForShot(shot: { order: number; title: string | null; description: string | null }) {
  const primary = sanitizedShotId(shot).toLowerCase();
  const order = String(shot.order);
  const padded = order.padStart(2, "0");
  const values = new Set([primary, `shot${order}`, `shot${padded}`, `shot_${order}`, `shot_${padded}`]);
  const title = `${shot.title ?? ""} ${shot.description ?? ""}`;
  const scene = title.match(/shot\s*0*(\d+)\s*[, _-]*s(?:cene)?\s*0*(\d+)/i);
  if (scene) {
    values.add(`shot${Number(scene[1])}_s${Number(scene[2])}`);
    values.add(`shot_${Number(scene[1])}_s${Number(scene[2])}`);
  }
  return [...values].map(normalizeStem);
}

function findShotForFile(
  fileName: string,
  shots: { id: string; order: number; title: string | null; description: string | null }[],
) {
  const stem = normalizeStem(fileName);
  const exact = shots.find((shot) => identifiersForShot(shot).some((id) => stem === id || stem.startsWith(`${id}_`)));
  if (exact) return exact;
  const match = stem.match(/^shot_?0*(\d+)/i);
  if (!match) return null;
  return shots.find((shot) => shot.order === Number(match[1])) ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { shots: { orderBy: { order: "asc" } } },
  });
  if (!project) return NextResponse.json({ success: false, error: "Project not found." }, { status: 404 });

  const formData = await request.formData();
  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) return NextResponse.json({ success: false, error: "Choose one or more images." }, { status: 400 });
  if (files.length > 250) return NextResponse.json({ success: false, error: "Upload at most 250 images at a time." }, { status: 400 });

  const report = {
    matched: [] as { fileName: string; shotId: string; shotOrder: number; shotTitle: string | null; takeId: string }[],
    unmatched: [] as { fileName: string; reason: string }[],
    duplicates: [] as { shotId: string; shotOrder: number; files: string[] }[],
    missing: [] as { shotId: string; shotOrder: number; shotTitle: string | null }[],
    errors: [] as { fileName: string; error: string }[],
  };

  const grouped = new Map<string, File[]>();
  for (const file of files) {
    const shot = findShotForFile(file.name, project.shots);
    if (!shot) {
      report.unmatched.push({ fileName: file.name, reason: "No shot number or scene identifier matched." });
      continue;
    }
    grouped.set(shot.id, [...(grouped.get(shot.id) ?? []), file]);
  }

  for (const shot of project.shots) {
    const shotFiles = grouped.get(shot.id) ?? [];
    if (shotFiles.length === 0) {
      report.missing.push({ shotId: shot.id, shotOrder: shot.order, shotTitle: shot.title });
      continue;
    }
    if (shotFiles.length > 1) {
      report.duplicates.push({ shotId: shot.id, shotOrder: shot.order, files: shotFiles.map((file) => file.name) });
    }

    const existingSelected = await prisma.take.findFirst({ where: { shotId: shot.id, isSelected: true } });
    let shouldSelect = !existingSelected;
    for (const file of shotFiles) {
      try {
        const saved = await saveImageFile(file, ["projects", id, "stills", shot.id], file.name);
        const lastTake = await prisma.take.findFirst({ where: { shotId: shot.id }, orderBy: { versionNumber: "desc" } });
        const take = await prisma.take.create({
          data: {
            shotId: shot.id,
            versionNumber: (lastTake?.versionNumber ?? 0) + 1,
            status: shouldSelect ? "SELECTED" : "READY",
            fileUrl: saved.url,
            localPath: saved.fullPath,
            originalFileName: file.name,
            mediaKind: "STILL",
            model: "Manual image upload",
            isSelected: shouldSelect,
          },
        });
        if (shouldSelect) {
          await prisma.shot.update({ where: { id: shot.id }, data: { sourceImagePath: saved.fullPath, status: "REVIEW" } });
          shouldSelect = false;
        }
        report.matched.push({ fileName: file.name, shotId: shot.id, shotOrder: shot.order, shotTitle: shot.title, takeId: take.id });
      } catch (error) {
        report.errors.push({ fileName: file.name, error: error instanceof Error ? error.message : "Upload failed." });
      }
    }
  }

  return NextResponse.json({ success: true, report });
}
