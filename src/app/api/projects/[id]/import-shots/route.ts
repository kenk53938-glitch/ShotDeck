import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseShotList } from "@/lib/shotParser";
import { parseShotListWithAi } from "@/lib/aiParser";
import { getAiProviderConfig } from "@/lib/settings";
import { MAX_PROMPT_LENGTH, MAX_TITLE_LENGTH } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ success: false, error: "Project not found." }, { status: 404 });

  const formData = await request.formData();
  const uploaded = formData.get("file");
  let input = String(formData.get("text") ?? "");
  if (uploaded instanceof File && uploaded.size > 0) input = await uploaded.text();
  input = input.trim();
  if (!input) return NextResponse.json({ success: false, error: "Paste a script or upload a text/Markdown file." }, { status: 400 });
  if (input.length > 2_000_000) return NextResponse.json({ success: false, error: "The import file is too large." }, { status: 400 });

  const useAi = String(formData.get("useAi") ?? "false") === "true";
  let parser: "rule-based" | "ai" = "rule-based";
  let fellBack = false;
  let parsed;
  const parserWarnings: string[] = [];

  if (useAi) {
    const config = await getAiProviderConfig();
    if (!config) return NextResponse.json({ success: false, error: "AI parsing was selected, but no provider is configured in Settings." }, { status: 409 });
    try {
      parsed = await parseShotListWithAi(input, config);
      parser = "ai";
    } catch (error) {
      fellBack = true;
      parsed = parseShotList(input);
      parserWarnings.push(`AI parsing failed and ShotDeck used the rule-based parser instead: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  } else {
    parsed = parseShotList(input);
  }

  parserWarnings.push(...parsed.errors);
  const lastShot = await prisma.shot.findFirst({ where: { projectId: id }, orderBy: { order: "desc" } });
  let nextOrder = (lastShot?.order ?? 0) + 1;
  const successes: { shotLabel: string; title: string; shotId: string; order: number }[] = [];
  const failures: { shotLabel: string; reason: string }[] = [];

  for (const shot of parsed.shots) {
    const label = shot.shotLabel || String(nextOrder);
    try {
      if (!shot.prompt?.trim()) throw new Error("Missing Prompt field.");
      if (shot.prompt.length > MAX_PROMPT_LENGTH) throw new Error(`Prompt exceeds ${MAX_PROMPT_LENGTH.toLocaleString()} characters.`);
      if (shot.negativePrompt && shot.negativePrompt.length > MAX_PROMPT_LENGTH) throw new Error(`Negative prompt exceeds ${MAX_PROMPT_LENGTH.toLocaleString()} characters.`);
      const title = (shot.title?.trim() || `Shot ${label}`).slice(0, MAX_TITLE_LENGTH);
      const order = nextOrder++;
      const created = await prisma.shot.create({
        data: {
          projectId: id,
          order,
          title,
          description: shot.title?.trim() || null,
          prompt: shot.prompt.trim(),
          positivePrompt: shot.prompt.trim(),
          stillPrompt: shot.prompt.trim(),
          negativePrompt: shot.negativePrompt?.trim() || null,
          aiTool: shot.tool?.trim() || null,
          durationSeconds: shot.durationSeconds == null ? null : Math.min(3600, Math.max(0, shot.durationSeconds)),
          status: "PROMPTING",
        },
      });
      successes.push({ shotLabel: label, title, shotId: created.id, order });
    } catch (error) {
      failures.push({ shotLabel: label, reason: error instanceof Error ? error.message : "Could not create this shot." });
    }
  }

  return NextResponse.json({ success: true, parser, fellBack, successes, failures, warnings: parserWarnings });
}
