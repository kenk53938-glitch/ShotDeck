import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ takeId: string }> },
) {
  const { takeId } = await params;
  const body = await request.json().catch(() => ({}));
  const expectedShotId = String(body.shotId ?? "");

  try {
    const take = await prisma.take.findUnique({ where: { id: takeId }, include: { shot: true } });
    if (!take) return NextResponse.json({ success: false, error: "Take not found." }, { status: 404 });
    if (!expectedShotId || take.shotId !== expectedShotId) {
      return NextResponse.json({ success: false, error: "This take does not belong to the requested shot." }, { status: 409 });
    }
    if (!['READY', 'SELECTED'].includes(take.status)) {
      return NextResponse.json({ success: false, error: "Only ready takes can be selected." }, { status: 409 });
    }

    const selectedPath = take.fileUrl ?? take.localPath;
    await prisma.$transaction([
      prisma.take.updateMany({
        where: { shotId: take.shotId, id: { not: take.id }, isSelected: true },
        data: { isSelected: false, status: "READY" },
      }),
      prisma.take.update({ where: { id: take.id }, data: { isSelected: true, status: "SELECTED" } }),
      prisma.shot.update({
        where: { id: take.shotId },
        data: {
          videoUrl: selectedPath,
          ...(take.mediaKind === "STILL" ? { sourceImagePath: selectedPath, status: "REVIEW" as const } : {}),
          ...(take.mediaKind === "PREVIEW" ? { previewVideoPath: selectedPath, status: "REVIEW" as const } : {}),
          ...(take.mediaKind === "FINAL" ? { finalVideoPath: selectedPath, status: "APPROVED" as const } : {}),
        },
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Selection failed." }, { status: 500 });
  }
}
