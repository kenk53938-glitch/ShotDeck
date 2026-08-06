import { prisma } from "@/lib/prisma";

/**
 * The single place that marks a Take as selected. Always clears any
 * other selected Take on the same shot in the same transaction, and
 * mirrors the choice onto the Shot's source/preview/final path fields.
 * Every code path that can select a take (manual select button, bulk
 * still-image intake auto-select, preview/final approval) must call
 * this instead of writing isSelected/status directly, or the
 * exactly-one-selected-take guarantee can desync.
 */
export async function selectTakeById(takeId: string, shotId: string) {
  const take = await prisma.take.findUnique({ where: { id: takeId } });
  if (!take) throw new Error("Take not found.");
  if (take.shotId !== shotId) {
    throw new Error("This take does not belong to the requested shot.");
  }
  if (!["READY", "SELECTED"].includes(take.status)) {
    throw new Error("Only ready takes can be selected.");
  }

  const displayPath = take.fileUrl ?? take.localPath;
  const localPath = take.localPath ?? take.fileUrl;

  await prisma.$transaction([
    prisma.take.updateMany({
      where: { shotId: take.shotId, id: { not: take.id }, isSelected: true },
      data: { isSelected: false, status: "READY" },
    }),
    prisma.take.update({
      where: { id: take.id },
      data: { isSelected: true, status: "SELECTED" },
    }),
    prisma.shot.update({
      where: { id: take.shotId },
      data: {
        videoUrl: displayPath,
        ...(take.mediaKind === "STILL"
          ? { sourceImagePath: localPath, status: "REVIEW" as const }
          : {}),
        ...(take.mediaKind === "PREVIEW"
          ? { previewVideoPath: localPath, status: "REVIEW" as const }
          : {}),
        ...(take.mediaKind === "FINAL"
          ? { finalVideoPath: localPath, status: "APPROVED" as const }
          : {}),
      },
    }),
  ]);
}
