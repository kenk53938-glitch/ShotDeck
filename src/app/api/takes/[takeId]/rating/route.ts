import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ takeId: string }> },
) {
  const { takeId } = await params;
  try {
    const body = await request.json();
    const expectedShotId = String(body.shotId ?? "");
    const rawRating = body.rating;
    const rating = rawRating === "" || rawRating == null ? null : Number(rawRating);
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 10)) {
      return NextResponse.json({ success: false, error: "Rating must be a whole number from 1 to 10." }, { status: 400 });
    }
    const take = await prisma.take.findUnique({ where: { id: takeId } });
    if (!take) return NextResponse.json({ success: false, error: "Take not found." }, { status: 404 });
    if (!expectedShotId || take.shotId !== expectedShotId) {
      return NextResponse.json({ success: false, error: "This take does not belong to the requested shot." }, { status: 409 });
    }
    await prisma.take.update({ where: { id: takeId }, data: { rating } });
    return NextResponse.json({ success: true, rating });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not save the rating." }, { status: 500 });
  }
}
