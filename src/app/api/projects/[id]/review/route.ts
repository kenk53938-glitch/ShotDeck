import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const shotIds = Array.isArray(body.shotIds) ? body.shotIds.map(String) : [];
  const action = String(body.action ?? "");
  if (shotIds.length === 0) return NextResponse.json({ success: false, error: "Select at least one shot." }, { status: 400 });
  if (!['approve', 'rework'].includes(action)) return NextResponse.json({ success: false, error: "Unknown review action." }, { status: 400 });

  const count = await prisma.shot.count({ where: { id: { in: shotIds }, projectId: id } });
  if (count !== shotIds.length) return NextResponse.json({ success: false, error: "One or more selected shots do not belong to this project." }, { status: 409 });

  if (action === "approve") {
    const withoutImage = await prisma.shot.count({ where: { id: { in: shotIds }, projectId: id, sourceImagePath: null } });
    if (withoutImage > 0) return NextResponse.json({ success: false, error: `${withoutImage} selected shot(s) have no selected image.` }, { status: 409 });
  }

  await prisma.shot.updateMany({
    where: { id: { in: shotIds }, projectId: id },
    data: { status: action === "approve" ? "APPROVED" : "NEEDS_REWORK" },
  });
  return NextResponse.json({ success: true, updated: shotIds.length });
}
