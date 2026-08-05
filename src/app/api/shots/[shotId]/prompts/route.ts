import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_PROMPT_LENGTH } from "@/lib/validation";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ shotId: string }> },
) {
  const { shotId } = await params;
  try {
    const body = await request.json();
    const positivePrompt = String(body.positivePrompt ?? "").trim();
    const negativePrompt = String(body.negativePrompt ?? "").trim();
    if (!positivePrompt || !negativePrompt) {
      throw new Error("Both positive and negative prompts are required.");
    }
    if (positivePrompt.length > MAX_PROMPT_LENGTH || negativePrompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(`Prompts must be ${MAX_PROMPT_LENGTH.toLocaleString()} characters or fewer.`);
    }
    const shot = await prisma.shot.update({
      where: { id: shotId },
      data: {
        positivePrompt,
        stillPrompt: positivePrompt,
        prompt: positivePrompt,
        negativePrompt,
        status: "PROMPTING",
      },
    });
    return NextResponse.json({ success: true, shot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save prompts.";
    return NextResponse.json({ success: false, error: message }, { status: /not found/i.test(message) ? 404 : 400 });
  }
}
