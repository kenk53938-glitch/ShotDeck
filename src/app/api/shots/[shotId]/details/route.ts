import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_PROMPT_LENGTH, MAX_TITLE_LENGTH } from "@/lib/validation";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function optionalNumber(value: unknown, label: string, min: number, max: number) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
  return number;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ shotId: string }> },
) {
  const { shotId } = await params;
  try {
    const body = await request.json();
    const title = text(body.title);
    if (!title) throw new Error("Title is required.");
    if (title.length > MAX_TITLE_LENGTH) throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);

    const positivePrompt = text(body.positivePrompt);
    const negativePrompt = text(body.negativePrompt);
    const motionPrompt = text(body.motionPrompt);
    for (const [label, value] of [["Positive prompt", positivePrompt], ["Negative prompt", negativePrompt], ["Motion prompt", motionPrompt]] as const) {
      if (value.length > MAX_PROMPT_LENGTH) throw new Error(`${label} must be ${MAX_PROMPT_LENGTH.toLocaleString()} characters or fewer.`);
    }

    const updated = await prisma.shot.update({
      where: { id: shotId },
      data: {
        title,
        description: text(body.description) || null,
        positivePrompt: positivePrompt || null,
        stillPrompt: positivePrompt || null,
        prompt: positivePrompt || null,
        negativePrompt: negativePrompt || null,
        motionPrompt: motionPrompt || null,
        aiTool: text(body.aiTool) || null,
        durationSeconds: optionalNumber(body.durationSeconds, "Duration", 0, 3600),
        notes: text(body.notes) || null,
        seed: text(body.seed) || null,
        width: optionalNumber(body.width, "Width", 64, 8192),
        height: optionalNumber(body.height, "Height", 64, 8192),
        fps: optionalNumber(body.fps, "FPS", 1, 240),
      },
    });
    return NextResponse.json({ success: true, shot: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the shot.";
    return NextResponse.json({ success: false, error: message }, { status: /not found/i.test(message) ? 404 : 400 });
  }
}
