import { basename, extname, isAbsolute, join } from "node:path";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getAiProviderConfig } from "@/lib/settings";

export type ImagePromptDraft = {
  positivePrompt: string;
  negativePrompt: string;
};

export type PromptGenerationResult = {
  prompts: ImagePromptDraft;
  visionWarning: string | null;
  persisted: boolean;
};

type Workflow = Record<string, { inputs?: Record<string, unknown> }>;

const MAX_PROVIDER_OUTPUT = 50_000;

function extractJson(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : trimmed;
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function inferMime(path: string) {
  switch (extname(path).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "image/png";
  }
}

async function resolveVisionImage(project: {
  referenceImageUrl: string | null;
  referenceImagePath: string | null;
}) {
  const direct = project.referenceImageUrl?.trim();
  if (direct && /^(https?:|data:image\/)/i.test(direct)) return direct;

  const pathValue = project.referenceImagePath?.trim();
  if (!pathValue) return null;
  if (/^(https?:|data:image\/)/i.test(pathValue)) return pathValue;

  try {
    const localPath = isAbsolute(pathValue)
      ? pathValue
      : join(process.cwd(), pathValue.replace(/^\/+/, ""));
    const buffer = await readFile(localPath);
    return `data:${inferMime(localPath)};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function buildPromptInstruction(shot: {
  order: number;
  title: string | null;
  description: string | null;
  prompt: string | null;
  durationSeconds: number | null;
  project: {
    styleGuide: string | null;
    fixedNegativePrompt: string | null;
  };
}) {
  return `You create production-ready still-image prompts for one shot in a consistent faceless YouTube video.

Return ONLY a JSON object with exactly these two string keys:
{"positivePrompt":"...","negativePrompt":"..."}

Rules:
- Generate a STILL IMAGE prompt only. Do not describe animation, camera movement over time, frame rate, or video motion.
- Preserve every project character/style rule. Never invent extra characters, text, logos, or watermarks unless the shot explicitly requires them.
- Make the positive prompt self-contained and usable in an image generator.
- Merge the fixed negative rules with shot-specific failure prevention.
- Do not mention that a reference image was supplied; translate visible identity/style cues into useful prompt language.

PROJECT STYLE GUIDE:
${shot.project.styleGuide?.trim() || "No project-specific style guide. Use a clean, coherent, production-ready visual style."}

PROJECT FIXED NEGATIVE RULES:
${shot.project.fixedNegativePrompt?.trim() || "No extra fixed negative rules."}

SHOT:
Order: ${shot.order}
Title: ${shot.title?.trim() || `Shot ${shot.order}`}
Description / narration: ${shot.description?.trim() || shot.prompt?.trim() || "No description supplied."}
Duration context: ${shot.durationSeconds ?? 3} seconds (context only; still-image output required)`;
}

async function callPromptProvider(
  instruction: string,
  imageUrl: string | null,
) {
  const config = await getAiProviderConfig();
  if (!config) {
    throw new Error("No AI provider is configured. Open Settings and add an API base URL, key, and model.");
  }

  const { apiBaseUrl, apiKey, modelName } = config;
  const url = `${apiBaseUrl.replace(/\/+$/, "")}/chat/completions`;
  const textMessage = { role: "user", content: instruction };
  const visionMessage = imageUrl
    ? {
        role: "user",
        content: [
          { type: "text", text: instruction },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      }
    : textMessage;

  async function request(message: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [message],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      throw new Error(`AI provider returned HTTP ${response.status}. Check the configured endpoint, model, and account quota.`);
    }
    return response.json();
  }

  let payload: any;
  let visionWarning: string | null = null;
  if (imageUrl) {
    try {
      payload = await request(visionMessage);
    } catch (error) {
      visionWarning = `The configured provider did not accept the reference image, so ShotDeck retried with text-only context. ${safeErrorMessage(error)}`;
      payload = await request(textMessage);
    }
  } else {
    payload = await request(textMessage);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("The AI provider returned no prompt content.");
  }
  if (content.length > MAX_PROVIDER_OUTPUT) {
    throw new Error("The AI provider response was unexpectedly large and was rejected.");
  }

  let parsed: Partial<ImagePromptDraft>;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    throw new Error("The AI provider returned invalid JSON. Try again or use a model with JSON-output support.");
  }

  const positivePrompt =
    typeof parsed.positivePrompt === "string" ? parsed.positivePrompt.trim() : "";
  const negativePrompt =
    typeof parsed.negativePrompt === "string" ? parsed.negativePrompt.trim() : "";
  if (!positivePrompt || !negativePrompt) {
    throw new Error("The AI provider response did not contain both positivePrompt and negativePrompt.");
  }

  return { prompts: { positivePrompt, negativePrompt }, visionWarning };
}

export async function generateImagePromptsForShot(
  shotId: string,
  options: { persist?: boolean; overwrite?: boolean } = {},
): Promise<PromptGenerationResult> {
  const shot = await prisma.shot.findUnique({
    where: { id: shotId },
    include: { project: true },
  });
  if (!shot) throw new Error("Shot not found.");

  if (
    options.persist &&
    !options.overwrite &&
    (shot.positivePrompt?.trim() || shot.negativePrompt?.trim())
  ) {
    throw new Error("This shot already has a prompt. Confirm overwrite before replacing it.");
  }

  const imageUrl = await resolveVisionImage(shot.project);
  const generated = await callPromptProvider(buildPromptInstruction(shot), imageUrl);
  let persisted = false;

  if (options.persist) {
    await prisma.shot.update({
      where: { id: shot.id },
      data: {
        positivePrompt: generated.prompts.positivePrompt,
        stillPrompt: generated.prompts.positivePrompt,
        prompt: generated.prompts.positivePrompt,
        negativePrompt: generated.prompts.negativePrompt,
        status: "PROMPTING",
      },
    });
    persisted = true;
  }

  return { ...generated, persisted };
}

// Backward-compatible alias for the first production-pipeline draft.
export async function generatePromptsForShot(shotId: string) {
  return generateImagePromptsForShot(shotId, { persist: true, overwrite: false });
}

export function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function sanitizedShotId(shot: {
  order: number;
  title: string | null;
  description?: string | null;
}) {
  const source = `${shot.title ?? ""} ${shot.description ?? ""}`;
  const sceneMatch = source.match(/shot\s*0*(\d+)\s*[, _-]*s(?:cene)?\s*0*(\d+)/i);
  if (sceneMatch) return `shot${Number(sceneMatch[1])}_s${Number(sceneMatch[2])}`;
  const shotMatch = source.match(/shot\s*0*(\d+)/i);
  if (shotMatch) return `shot${Number(shotMatch[1])}`;
  return `shot${String(shot.order).padStart(2, "0")}`;
}

export async function buildProjectCsv(projectId: string) {
  const shots = await prisma.shot.findMany({
    where: {
      projectId,
      status: "APPROVED",
      motionPrompt: { not: null },
    },
    include: {
      takes: {
        where: { isSelected: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { order: "asc" },
  });

  const rows: unknown[][] = [
    ["shot_id", "image_name", "motion_prompt", "duration"],
  ];
  for (const shot of shots) {
    const selectedStill = shot.takes.find((take) => take.mediaKind === "STILL");
    const imagePath = selectedStill?.localPath || selectedStill?.fileUrl || shot.sourceImagePath;
    if (!imagePath || !shot.motionPrompt?.trim()) continue;
    rows.push([
      sanitizedShotId(shot),
      basename(imagePath),
      shot.motionPrompt.trim(),
      shot.durationSeconds ?? 3,
    ]);
  }
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function setNodeInput(
  workflow: Workflow,
  nodeId: string,
  inputName: string,
  value: unknown,
) {
  const node = workflow[nodeId];
  if (!node?.inputs) throw new Error(`ComfyUI workflow node ${nodeId} is missing.`);
  node.inputs[inputName] = value;
}

function setOptionalNodeInput(
  workflow: Workflow,
  nodeId: string | undefined,
  inputName: string,
  value: unknown,
) {
  if (nodeId) setNodeInput(workflow, nodeId, inputName, value);
}

async function fetchComfy(path: string, init?: RequestInit) {
  const comfyUrl = (process.env.COMFY_URL ?? "http://127.0.0.1:8188").replace(/\/+$/, "");
  try {
    return await fetch(`${comfyUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error(`ComfyUI is not reachable at ${comfyUrl}. Start ComfyUI and verify COMFY_URL.`);
  }
}

export async function queueShotInComfy(
  shotId: string,
  type: "IMAGE_TO_VIDEO" | "UPSCALE" = "IMAGE_TO_VIDEO",
) {
  const shot = await prisma.shot.findUnique({
    where: { id: shotId },
    include: { project: true },
  });
  if (!shot) throw new Error("Shot not found.");

  const workflowPath =
    type === "UPSCALE"
      ? process.env.COMFY_UPSCALE_WORKFLOW_PATH
      : process.env.COMFY_I2V_WORKFLOW_PATH;
  if (!workflowPath) {
    throw new Error(
      `Missing ${
        type === "UPSCALE"
          ? "COMFY_UPSCALE_WORKFLOW_PATH"
          : "COMFY_I2V_WORKFLOW_PATH"
      } in .env.`,
    );
  }

  const inputPath = type === "UPSCALE" ? shot.previewVideoPath : shot.sourceImagePath;
  if (!inputPath) {
    throw new Error(type === "UPSCALE" ? "No approved preview clip is attached." : "No selected source image is attached.");
  }
  if (type === "IMAGE_TO_VIDEO" && !shot.positivePrompt?.trim()) {
    throw new Error("No positive prompt is set for this shot.");
  }
  if (type === "IMAGE_TO_VIDEO" && !shot.negativePrompt?.trim()) {
    throw new Error("No negative prompt is set for this shot.");
  }

  let workflow: Workflow;
  try {
    workflow = JSON.parse(await readFile(workflowPath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read the configured ComfyUI workflow: ${safeErrorMessage(error)}`);
  }

  const prefix = `${type === "UPSCALE" ? "final" : "preview"}/${sanitizedShotId(shot)}`;

if (type === "IMAGE_TO_VIDEO") {
  const imageNode = process.env.COMFY_IMAGE_NODE;
  const positivePromptNode =
    process.env.COMFY_POSITIVE_PROMPT_NODE ?? process.env.COMFY_PROMPT_NODE;
  const negativePromptNode = process.env.COMFY_NEGATIVE_PROMPT_NODE;
  const outputNode = process.env.COMFY_OUTPUT_NODE;

  if (!imageNode || !positivePromptNode || !negativePromptNode || !outputNode) {
    throw new Error(
      "ComfyUI I2V node mapping is incomplete. Configure COMFY_IMAGE_NODE, COMFY_POSITIVE_PROMPT_NODE, COMFY_NEGATIVE_PROMPT_NODE, and COMFY_OUTPUT_NODE in .env.",
    );
  }

  // ComfyUI subgraph IDs such as "129:93" are JSON object keys. Keep them
  // as strings and address them directly instead of parsing them as integers.
  setNodeInput(
    workflow,
    imageNode,
    process.env.COMFY_IMAGE_INPUT ?? "image",
    inputPath,
  );
  setNodeInput(
    workflow,
    positivePromptNode,
    process.env.COMFY_POSITIVE_PROMPT_INPUT ??
      process.env.COMFY_PROMPT_INPUT ??
      "text",
    shot.positivePrompt.trim(),
  );
  setNodeInput(
    workflow,
    negativePromptNode,
    process.env.COMFY_NEGATIVE_PROMPT_INPUT ?? "text",
    shot.negativePrompt.trim(),
  );
  setOptionalNodeInput(
    workflow,
    process.env.COMFY_SEED_NODE,
    process.env.COMFY_SEED_INPUT ?? "seed",
    Number(shot.seed || Date.now() % 2_147_483_647),
  );
  setOptionalNodeInput(
    workflow,
    process.env.COMFY_WIDTH_NODE,
    process.env.COMFY_WIDTH_INPUT ?? "width",
    shot.width ?? shot.project.defaultWidth,
  );
  setOptionalNodeInput(
    workflow,
    process.env.COMFY_HEIGHT_NODE,
    process.env.COMFY_HEIGHT_INPUT ?? "height",
    shot.height ?? shot.project.defaultHeight,
  );
  setOptionalNodeInput(
    workflow,
    process.env.COMFY_FPS_NODE,
    process.env.COMFY_FPS_INPUT ?? "fps",
    shot.fps ?? shot.project.defaultFps,
  );
  setOptionalNodeInput(
    workflow,
    process.env.COMFY_DURATION_NODE,
    process.env.COMFY_DURATION_INPUT ?? "duration",
    shot.durationSeconds ?? 3,
  );
  setNodeInput(
    workflow,
    outputNode,
    process.env.COMFY_OUTPUT_INPUT ?? "filename_prefix",
    prefix,
  );
} else {
  const legacyVideoNode = process.env.COMFY_IMAGE_NODE;
  const legacyOutputNode = process.env.COMFY_OUTPUT_NODE;
  const videoNode =
    process.env.COMFY_UPSCALE_VIDEO_NODE ??
    (legacyVideoNode && workflow[legacyVideoNode]
      ? legacyVideoNode
      : undefined);
  const outputNode =
    process.env.COMFY_UPSCALE_OUTPUT_NODE ??
    (legacyOutputNode && workflow[legacyOutputNode]
      ? legacyOutputNode
      : undefined);

  if (!videoNode || !outputNode) {
    throw new Error(
      "ComfyUI upscale node mapping is incomplete. Configure COMFY_UPSCALE_VIDEO_NODE and COMFY_UPSCALE_OUTPUT_NODE in .env.",
    );
  }

  setNodeInput(
    workflow,
    videoNode,
    process.env.COMFY_UPSCALE_VIDEO_INPUT ?? "video",
    inputPath,
  );
  setOptionalNodeInput(
    workflow,
    process.env.COMFY_UPSCALE_WIDTH_NODE,
    process.env.COMFY_UPSCALE_WIDTH_INPUT ?? "width",
    1920,
  );
  setOptionalNodeInput(
    workflow,
    process.env.COMFY_UPSCALE_HEIGHT_NODE,
    process.env.COMFY_UPSCALE_HEIGHT_INPUT ?? "height",
    1080,
  );
  setOptionalNodeInput(
    workflow,
    process.env.COMFY_UPSCALE_FPS_NODE,
    process.env.COMFY_UPSCALE_FPS_INPUT ?? "frame_rate",
    shot.fps ?? shot.project.defaultFps,
  );
  setNodeInput(
    workflow,
    outputNode,
    process.env.COMFY_UPSCALE_OUTPUT_INPUT ?? "filename_prefix",
    prefix,
  );
}

  const response = await fetchComfy("/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!response.ok) {
    throw new Error(`ComfyUI rejected the job with HTTP ${response.status}.`);
  }
  const result = await response.json();
  const promptId = result.prompt_id ?? result.promptId;
  if (!promptId) throw new Error("ComfyUI accepted the request but returned no prompt ID.");

  const job = await prisma.generationJob.create({
    data: {
      shotId,
      type,
      status: "QUEUED",
      comfyPromptId: String(promptId),
      workflowPreset: workflowPath,
      inputPath,
      outputPath: prefix,
      progress: 0,
    },
  });
  await prisma.shot.update({ where: { id: shotId }, data: { status: "GENERATING" } });
  return { jobId: job.id, promptId: String(promptId), outputPrefix: prefix };
}

function findOutputFile(historyItem: any) {
  const outputs = historyItem?.outputs;
  if (!outputs || typeof outputs !== "object") return null;
  for (const nodeOutput of Object.values(outputs) as any[]) {
    for (const key of ["gifs", "videos", "images", "audio"]) {
      const files = nodeOutput?.[key];
      if (Array.isArray(files) && files[0]?.filename) {
        const file = files[0];
        return [file.subfolder, file.filename].filter(Boolean).join("/");
      }
    }
  }
  return null;
}

function findExecutionError(historyItem: any) {
  const messages = historyItem?.status?.messages;
  if (!Array.isArray(messages)) return null;
  for (const message of messages) {
    const text = JSON.stringify(message);
    if (/error|exception|cuda|out of memory/i.test(text)) return text.slice(0, 800);
  }
  return null;
}

export async function pollGenerationJob(jobId: string) {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: { shot: true },
  });
  if (!job) throw new Error("Generation job not found.");
  if (["COMPLETED", "FAILED", "CANCELED"].includes(job.status)) return job;
  if (!job.comfyPromptId) throw new Error("Generation job has no ComfyUI prompt ID.");

  const response = await fetchComfy(`/history/${encodeURIComponent(job.comfyPromptId)}`);
  if (!response.ok) {
    throw new Error(`ComfyUI history returned HTTP ${response.status}.`);
  }
  const history = await response.json();
  const item = history?.[job.comfyPromptId];
  const now = new Date();

  if (!item) {
    return prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "RUNNING", progress: Math.max(job.progress, 10), lastCheckedAt: now },
    });
  }

  const executionError = findExecutionError(item);
  if (executionError) {
    await prisma.shot.update({ where: { id: job.shotId }, data: { status: "NEEDS_REWORK" } });
    return prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        progress: 100,
        errorMessage: executionError,
        lastCheckedAt: now,
        completedAt: now,
      },
    });
  }

  const outputFile = findOutputFile(item);
  if (!outputFile) {
    return prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "RUNNING", progress: Math.max(job.progress, 60), lastCheckedAt: now },
    });
  }

  const lastTake = await prisma.take.findFirst({
    where: { shotId: job.shotId },
    orderBy: { versionNumber: "desc" },
  });
  const mediaKind = job.type === "UPSCALE" ? "FINAL" : "PREVIEW";
  const take = await prisma.take.create({
    data: {
      shotId: job.shotId,
      versionNumber: (lastTake?.versionNumber ?? 0) + 1,
      status: "READY",
      fileUrl: outputFile,
      localPath: outputFile,
      originalFileName: basename(outputFile),
      mediaKind,
      seed: job.shot.seed,
      model: job.type === "UPSCALE" ? "ComfyUI upscale" : "ComfyUI / WAN",
      notes: `Created from ComfyUI job ${job.comfyPromptId}`,
    },
  });

  await prisma.$transaction([
    prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        progress: 100,
        outputPath: outputFile,
        outputTakeId: take.id,
        errorMessage: null,
        lastCheckedAt: now,
        completedAt: now,
      },
    }),
    prisma.shot.update({
      where: { id: job.shotId },
      data:
        job.type === "UPSCALE"
          ? { finalVideoPath: outputFile, status: "REVIEW" }
          : { previewVideoPath: outputFile, status: "REVIEW" },
    }),
  ]);

  return prisma.generationJob.findUnique({ where: { id: job.id } });
}
