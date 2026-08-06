import { NextResponse } from "next/server";
import { selectTakeById } from "@/lib/takes";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ takeId: string }> },
) {
  const { takeId } = await params;
  const body = await request.json().catch(() => ({}));
  const shotId = String(body.shotId ?? "");

  try {
    await selectTakeById(takeId, shotId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Selection failed.";
    const status = /not found/i.test(message)
      ? 404
      : /only ready|does not belong/i.test(message)
        ? 409
        : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
