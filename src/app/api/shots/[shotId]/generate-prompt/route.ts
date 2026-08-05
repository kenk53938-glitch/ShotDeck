import { NextRequest, NextResponse } from "next/server";
import { generateImagePromptsForShot } from "@/lib/production";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shotId: string }> },
) {
  const { shotId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const result = await generateImagePromptsForShot(shotId, {
      persist: body.persist === true,
      overwrite: body.overwrite === true,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prompt generation failed.";
    const status = /not found/i.test(message)
      ? 404
      : /configured|already has/i.test(message)
        ? 409
        : 502;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
