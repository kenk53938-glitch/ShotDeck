import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getAiProviderConfig } from "@/lib/settings";

export type GeneratedPrompts = {
  stillPrompt: string;
  motionPrompt: string;
  negativePrompt: string;
};

function extractJson(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : trimmed;
}

export async function generatePromptsForShot(shotId: string): Promise<GeneratedPrompts> {
  const shot = await prisma.shot.findUnique({ where: { id: shotId }, include: { project: true } });
  if (!shot) throw new Error("Shot not found");
  const config = await getAiProviderConfig();
  if (!config) throw new Error("Configure an AI provider in Settings first");
  const instruction = `You are preparing one shot for a consistent AI-assisted YouTube production pipeline.
Return only JSON with keys stillPrompt, motionPrompt, negativePrompt.
The still prompt must preserve the project style and character rules.
The motion prompt must describe subtle image-to-video motion suitable for WAN, without changing identity, clothing, composition, or adding characters.
The negative prompt must combine the project restrictions with shot-specific failure prevention.

PROJECT STYLE GUIDE:\n${shot.project.styleGuide ?? "Not provided"}
REFERENCE IMAGE PATH/NOTE:\n${shot.project.referenceImagePath ?? "Not provided"}
FIXED NEGATIVE RULES:\n${shot.project.fixedNegativePrompt ?? "Not provided"}
SHOT TITLE:\n${shot.title ?? `Shot ${shot.order}`}
SHOT DESCRIPTION/NARRATION:\n${shot.description ?? shot.prompt ?? "Not provided"}
DURATION:\n${shot.durationSeconds ?? 3} seconds`;
  const response = await fetch(`${config.apiBaseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.modelName, messages: [{ role: "user", content: instruction }], response_format: { type: "json_object" } }),
  });
  if (!response.ok) throw new Error(`AI provider error ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("AI provider returned no prompt content");
  const parsed = JSON.parse(extractJson(content)) as Partial<GeneratedPrompts>;
  if (!parsed.stillPrompt || !parsed.motionPrompt || !parsed.negativePrompt) throw new Error("AI provider returned incomplete prompt JSON");
  const prompts: GeneratedPrompts = { stillPrompt: parsed.stillPrompt.trim(), motionPrompt: parsed.motionPrompt.trim(), negativePrompt: parsed.negativePrompt.trim() };
  await prisma.shot.update({ where: { id: shot.id }, data: { ...prompts, prompt: prompts.stillPrompt, status: "PROMPTING" } });
  return prompts;
}

export function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function buildProjectCsv(projectId: string) {
  const shots = await prisma.shot.findMany({ where: { projectId, status: "APPROVED" }, orderBy: { order: "asc" } });
  const rows = [["shot_id", "image_name", "motion_prompt", "duration", "seed", "width", "height", "fps"], ...shots.map((shot) => [String(shot.order).padStart(2, "0"), shot.sourceImagePath ?? `shot_${String(shot.order).padStart(2, "0")}.png`, shot.motionPrompt ?? "", shot.durationSeconds ?? 3, shot.seed ?? "", shot.width ?? 768, shot.height ?? 432, shot.fps ?? 24])];
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function setNodeInput(workflow: Record<string, any>, nodeId: string, inputName: string, value: unknown) {
  const node = workflow[nodeId];
  if (!node?.inputs) throw new Error(`Workflow node ${nodeId} is missing`);
  node.inputs[inputName] = value;
}

export async function queueShotInComfy(shotId: string, type: "IMAGE_TO_VIDEO" | "UPSCALE" = "IMAGE_TO_VIDEO") {
  const shot = await prisma.shot.findUnique({ where: { id: shotId }, include: { project: true } });
  if (!shot) throw new Error("Shot not found");
  const workflowPath = type === "UPSCALE" ? process.env.COMFY_UPSCALE_WORKFLOW_PATH : process.env.COMFY_I2V_WORKFLOW_PATH;
  if (!workflowPath) throw new Error(`Missing ${type === "UPSCALE" ? "COMFY_UPSCALE_WORKFLOW_PATH" : "COMFY_I2V_WORKFLOW_PATH"}`);
  const workflow = JSON.parse(await readFile(workflowPath, "utf8"));
  const map = { imageNode: process.env.COMFY_IMAGE_NODE, imageInput: process.env.COMFY_IMAGE_INPUT ?? "image", promptNode: process.env.COMFY_PROMPT_NODE, promptInput: process.env.COMFY_PROMPT_INPUT ?? "text", seedNode: process.env.COMFY_SEED_NODE, seedInput: process.env.COMFY_SEED_INPUT ?? "seed", outputNode: process.env.COMFY_OUTPUT_NODE, outputInput: process.env.COMFY_OUTPUT_INPUT ?? "filename_prefix" };
  if (!map.imageNode || !map.promptNode || !map.outputNode) throw new Error("ComfyUI node mapping environment variables are incomplete");
  const inputPath = type === "UPSCALE" ? shot.previewVideoPath : shot.sourceImagePath;
  if (!inputPath) throw new Error(type === "UPSCALE" ? "No preview video attached" : "No source image attached");
  setNodeInput(workflow, map.imageNode, map.imageInput, inputPath);
  setNodeInput(workflow, map.promptNode, map.promptInput, type === "UPSCALE" ? "upscale while preserving frames and 24 fps" : shot.motionPrompt ?? "subtle idle motion");
  if (map.seedNode) setNodeInput(workflow, map.seedNode, map.seedInput, Number(shot.seed || Date.now() % 2147483647));
  const prefix = `${type === "UPSCALE" ? "final" : "preview"}/shot_${String(shot.order).padStart(2, "0")}`;
  setNodeInput(workflow, map.outputNode, map.outputInput, prefix);
  const comfyUrl = (process.env.COMFY_URL ?? "http://127.0.0.1:8188").replace(/\/+$/, "");
  const response = await fetch(`${comfyUrl}/prompt`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: workflow }) });
  if (!response.ok) throw new Error(`ComfyUI error ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const result = await response.json();
  const promptId = result.prompt_id ?? result.promptId ?? null;
  await prisma.generationJob.create({ data: { shotId, type, status: "QUEUED", comfyPromptId: promptId, workflowPreset: workflowPath, inputPath, outputPath: prefix } });
  await prisma.shot.update({ where: { id: shotId }, data: { status: "GENERATING" } });
  return { promptId, outputPrefix: prefix };
}
