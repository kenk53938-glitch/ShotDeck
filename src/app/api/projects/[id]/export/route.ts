import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildProjectCsv } from "@/lib/production";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const csv = await buildProjectCsv(id);
  const safe = project.title.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "shotdeck";
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${safe}-approved-shots.csv"` } });
}
