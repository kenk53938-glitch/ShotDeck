import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { removeStorageFile, saveImageFile } from "@/lib/storage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ success: false, error: "Project not found." }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Choose an image to upload." }, { status: 400 });
    }

    const saved = await saveImageFile(file, ["projects", id, "reference"], "reference" + (file.name.match(/\.[^.]+$/)?.[0] || ".png"));
    await removeStorageFile(project.referenceImagePath);
    await prisma.project.update({
      where: { id },
      data: { referenceImagePath: saved.relativePath, referenceImageUrl: saved.url },
    });
    return NextResponse.json({ success: true, url: saved.url, path: saved.relativePath });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ success: false, error: "Project not found." }, { status: 404 });
  await removeStorageFile(project.referenceImagePath);
  await prisma.project.update({ where: { id }, data: { referenceImagePath: null, referenceImageUrl: null } });
  return NextResponse.json({ success: true });
}
