import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveMediaFile, type MediaKind as StorageMediaKind } from "@/lib/storage";
import { selectTakeById } from "@/lib/takes";

const VALID_MEDIA_KINDS = new Set(["STILL", "PREVIEW", "FINAL"]);

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shotId: string }> },
) {
  const { shotId } = await params;

  try {
    const shot = await prisma.shot.findUnique({ where: { id: shotId } });
    if (!shot) {
      return NextResponse.json({ success: false, error: "Shot not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const mediaKindRaw = text(formData.get("mediaKind")).toUpperCase();
    const mediaKind = VALID_MEDIA_KINDS.has(mediaKindRaw) ? mediaKindRaw : "STILL";
    const storageKind: StorageMediaKind = mediaKind === "STILL" ? "image" : "video";

    const model = text(formData.get("model"));
    const seed = text(formData.get("seed"));
    const notes = text(formData.get("notes"));
    const manualFileUrl = text(formData.get("fileUrl"));
    const uploaded = formData.get("file");

    let fileUrl: string | null = null;
    let localPath: string | null = null;
    let originalFileName: string | null = null;

    if (uploaded instanceof File && uploaded.size > 0) {
      const subfolder = mediaKind === "STILL" ? "stills" : mediaKind === "FINAL" ? "final" : "previews";
      const saved = await saveMediaFile(
        uploaded,
        ["projects", shot.projectId, subfolder, shot.id],
        uploaded.name,
        storageKind,
      );
      fileUrl = saved.url;
      localPath = saved.fullPath;
      originalFileName = uploaded.name;
    } else if (manualFileUrl) {
      fileUrl = manualFileUrl;
      localPath = manualFileUrl;
    } else {
      return NextResponse.json(
        { success: false, error: "Choose a file to upload, or enter a File URL / path." },
        { status: 400 },
      );
    }

    const lastTake = await prisma.take.findFirst({
      where: { shotId },
      orderBy: { versionNumber: "desc" },
    });

    const take = await prisma.take.create({
      data: {
        shotId,
        versionNumber: (lastTake?.versionNumber ?? 0) + 1,
        status: "READY",
        fileUrl,
        localPath,
        originalFileName,
        mediaKind,
        model: model || (uploaded instanceof File ? "Manual upload" : null),
        seed: seed || null,
        notes: notes || null,
      },
    });

    const hasSelectedForKind = await prisma.take.findFirst({
      where: { shotId, mediaKind, isSelected: true },
    });
    let selected = false;
    if (!hasSelectedForKind) {
      try {
        await selectTakeById(take.id, shotId);
        selected = true;
      } catch {
        // Non-fatal: the take was still created successfully.
      }
    }

    const fresh = await prisma.take.findUnique({ where: { id: take.id } });
    return NextResponse.json({ success: true, take: fresh, selected });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Could not add the take." },
      { status: 400 },
    );
  }
}
