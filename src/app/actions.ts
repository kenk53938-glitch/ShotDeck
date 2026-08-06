"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseShotList } from "@/lib/shotParser";
import { parseShotListWithAi } from "@/lib/aiParser";
import { detectDefaultModel } from "@/lib/aiProviders";
import { getAiProviderConfig } from "@/lib/settings";
import {
  MAX_PROMPT_LENGTH,
  MAX_TITLE_LENGTH,
  durationSchema,
  projectStatusSchema,
  promptSchema,
  shotStatusSchema,
  takeStatusSchema,
  titleSchema,
} from "@/lib/validation";

export async function createProject(formData: FormData) {
  const titleResult = titleSchema.safeParse(formData.get("title"));
  if (!titleResult.success) return;

  const description = String(formData.get("description") ?? "").trim();

  const project = await prisma.project.create({
    data: {
      title: titleResult.data,
      description: description || null,
    },
  });

  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function updateProject(
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { success: false, error: "Missing project id." };

  const titleResult = titleSchema.safeParse(formData.get("title"));
  if (!titleResult.success) {
    return {
      success: false,
      error: titleResult.error.issues[0]?.message ?? "Invalid title.",
    };
  }

  const description = String(formData.get("description") ?? "").trim();
  const youtubeUrl = String(formData.get("youtubeUrl") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "");
  const statusResult = statusRaw
    ? projectStatusSchema.safeParse(statusRaw)
    : null;
  if (statusResult && !statusResult.success) {
    return { success: false, error: "Invalid status." };
  }

  await prisma.project.update({
    where: { id },
    data: {
      title: titleResult.data,
      description: description || null,
      youtubeUrl: youtubeUrl || null,
      ...(statusResult?.success ? { status: statusResult.data } : {}),
    },
  });

  revalidatePath(`/projects/${id}`);
  revalidatePath("/");

  return { success: true };
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.project.delete({ where: { id } });

  revalidatePath("/");
  redirect("/");
}

export async function createShot(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const titleResult = titleSchema.safeParse(formData.get("title"));
  if (!projectId || !titleResult.success) return;

  const promptRaw = String(formData.get("prompt") ?? "").trim();
  const promptResult = promptRaw ? promptSchema.safeParse(promptRaw) : null;
  if (promptResult && !promptResult.success) return;

  const aiTool = String(formData.get("aiTool") ?? "").trim();

  const lastShot = await prisma.shot.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
  });

  await prisma.shot.create({
    data: {
      projectId,
      title: titleResult.data,
      prompt: promptResult?.data ?? null,
      aiTool: aiTool || null,
      order: (lastShot?.order ?? 0) + 1,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateShot(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!id || !projectId) {
    return { success: false, error: "Missing shot or project id." };
  }

  const titleResult = titleSchema.safeParse(formData.get("title"));
  if (!titleResult.success) {
    return {
      success: false,
      error: titleResult.error.issues[0]?.message ?? "Invalid title.",
    };
  }

  const description = String(formData.get("description") ?? "").trim();

  const promptRaw = String(formData.get("prompt") ?? "").trim();
  const promptResult = promptRaw ? promptSchema.safeParse(promptRaw) : null;
  if (promptResult && !promptResult.success) {
    return {
      success: false,
      error: `Prompt: ${promptResult.error.issues[0]?.message ?? "invalid."}`,
    };
  }

  const negativePromptRaw = String(
    formData.get("negativePrompt") ?? "",
  ).trim();
  const negativePromptResult = negativePromptRaw
    ? promptSchema.safeParse(negativePromptRaw)
    : null;
  if (negativePromptResult && !negativePromptResult.success) {
    return {
      success: false,
      error: `Negative prompt: ${
        negativePromptResult.error.issues[0]?.message ?? "invalid."
      }`,
    };
  }

  const aiTool = String(formData.get("aiTool") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const durationRaw = String(formData.get("durationSeconds") ?? "").trim();
  const durationResult = durationRaw
    ? durationSchema.safeParse(durationRaw)
    : null;
  if (durationResult && !durationResult.success) {
    return {
      success: false,
      error: durationResult.error.issues[0]?.message ?? "Invalid duration.",
    };
  }

  await prisma.shot.update({
    where: { id },
    data: {
      title: titleResult.data,
      description: description || null,
      prompt: promptResult?.data ?? null,
      negativePrompt: negativePromptResult?.data ?? null,
      aiTool: aiTool || null,
      notes: notes || null,
      durationSeconds: durationResult?.data ?? null,
    },
  });

  revalidatePath(`/projects/${projectId}/shots/${id}`);
  revalidatePath(`/projects/${projectId}`);

  return { success: true };
}

export async function updateShotStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const statusResult = shotStatusSchema.safeParse(formData.get("status"));
  if (!id || !projectId || !statusResult.success) return;

  await prisma.shot.update({
    where: { id },
    data: { status: statusResult.data },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteShot(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!id || !projectId) return;

  await prisma.shot.delete({ where: { id } });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateTakeStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const shotId = String(formData.get("shotId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const statusResult = takeStatusSchema.safeParse(formData.get("status"));
  if (!id || !shotId || !projectId || !statusResult.success) return;

  await prisma.take.update({
    where: { id },
    data: { status: statusResult.data },
  });

  revalidatePath(`/projects/${projectId}/shots/${shotId}`);
}

export interface ImportShotsResult {
  imported: number;
  errors: string[];
  parser: "ai" | "rule-based";
  fellBack: boolean;
}

export async function importShots(
  formData: FormData,
): Promise<ImportShotsResult> {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) {
    return {
      imported: 0,
      errors: ["Missing project."],
      parser: "rule-based",
      fellBack: false,
    };
  }

  const file = formData.get("file");
  let text = String(formData.get("text") ?? "");
  if (file instanceof File && file.size > 0) {
    text = await file.text();
  }
  text = text.trim();

  if (!text) {
    return {
      imported: 0,
      errors: ["Paste some shot text or upload a file first."],
      parser: "rule-based",
      fellBack: false,
    };
  }

  let parser: "ai" | "rule-based" = "rule-based";
  let fellBack = false;
  let result;

  const aiConfig = await getAiProviderConfig();

  if (aiConfig) {
    try {
      result = await parseShotListWithAi(text, aiConfig);
      parser = "ai";
    } catch (err) {
      fellBack = true;
      const fallback = parseShotList(text);
      result = {
        shots: fallback.shots,
        errors: [
          `AI parsing failed (${
            err instanceof Error ? err.message : "unknown error"
          }), used the rule-based parser instead.`,
          ...fallback.errors,
        ],
      };
    }
  } else {
    result = parseShotList(text);
  }

  const lastShot = await prisma.shot.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
  });
  let nextOrder = (lastShot?.order ?? 0) + 1;

  let imported = 0;

  for (const shot of result.shots) {
    if (shot.prompt.length > MAX_PROMPT_LENGTH) {
      result.errors.push(
        `Shot ${shot.shotLabel}: prompt exceeds ${MAX_PROMPT_LENGTH.toLocaleString()} characters — skipped.`,
      );
      continue;
    }
    if (
      shot.negativePrompt &&
      shot.negativePrompt.length > MAX_PROMPT_LENGTH
    ) {
      result.errors.push(
        `Shot ${shot.shotLabel}: negative prompt exceeds ${MAX_PROMPT_LENGTH.toLocaleString()} characters — skipped.`,
      );
      continue;
    }

    const title = (shot.title ?? `Shot ${shot.shotLabel}`).slice(
      0,
      MAX_TITLE_LENGTH,
    );
    const durationSeconds =
      shot.durationSeconds !== null
        ? Math.min(3600, Math.max(0, shot.durationSeconds))
        : null;

    await prisma.shot.create({
      data: {
        projectId,
        order: nextOrder++,
        title,
        prompt: shot.prompt,
        negativePrompt: shot.negativePrompt,
        aiTool: shot.tool,
        durationSeconds,
      },
    });
    imported++;
  }

  revalidatePath(`/projects/${projectId}`);

  return {
    imported,
    errors: result.errors,
    parser,
    fellBack,
  };
}

function validateProviderFields(apiBaseUrl: string, apiKey: string, modelName: string, name: string): string | null {
  if (!apiBaseUrl || !apiKey) return "API Base URL and API Key are required.";
  try {
    new URL(apiBaseUrl);
  } catch {
    return "Enter a valid URL, e.g. https://api.openai.com/v1";
  }
  if (apiBaseUrl.length > 500) return "URL is too long.";
  if (apiKey.length > 300) return "That doesn't look like a valid key.";
  if (modelName.length > 200) return "Model name is too long.";
  if (name.length > 100) return "Name is too long.";
  return null;
}

export async function createAiProviderProfile(
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim() || "Untitled provider";
  const apiBaseUrl = String(formData.get("apiBaseUrl") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const modelNameRaw = String(formData.get("modelName") ?? "").trim();
  const modelName = modelNameRaw || (apiBaseUrl ? detectDefaultModel(apiBaseUrl) : "");

  const validationError = validateProviderFields(apiBaseUrl, apiKey, modelName, name);
  if (validationError) return { success: false, error: validationError };

  const existingCount = await prisma.aiProviderProfile.count();
  await prisma.aiProviderProfile.create({
    data: { name, apiBaseUrl, apiKey, modelName, isActive: existingCount === 0 },
  });

  revalidatePath("/settings");
  revalidatePath("/");

  return { success: true };
}

export async function updateAiProviderProfile(
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { success: false, error: "Missing profile id." };

  const existing = await prisma.aiProviderProfile.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Profile not found." };

  const name = String(formData.get("name") ?? "").trim() || existing.name;
  const apiBaseUrl = String(formData.get("apiBaseUrl") ?? "").trim() || existing.apiBaseUrl;
  const apiKeyRaw = String(formData.get("apiKey") ?? "").trim();
  const apiKey = apiKeyRaw || existing.apiKey;
  const modelNameRaw = String(formData.get("modelName") ?? "").trim();
  const modelName = modelNameRaw || existing.modelName;

  const validationError = validateProviderFields(apiBaseUrl, apiKey, modelName, name);
  if (validationError) return { success: false, error: validationError };

  await prisma.aiProviderProfile.update({
    where: { id },
    data: { name, apiBaseUrl, apiKey, modelName },
  });

  revalidatePath("/settings");
  revalidatePath("/");

  return { success: true };
}

export async function deleteAiProviderProfile(
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { success: false, error: "Missing profile id." };

  const existing = await prisma.aiProviderProfile.findUnique({ where: { id } });
  if (!existing) return { success: true };

  await prisma.aiProviderProfile.delete({ where: { id } });

  if (existing.isActive) {
    const next = await prisma.aiProviderProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (next) {
      await prisma.aiProviderProfile.update({ where: { id: next.id }, data: { isActive: true } });
    }
  }

  revalidatePath("/settings");
  revalidatePath("/");

  return { success: true };
}

export async function setActiveAiProviderProfile(
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { success: false, error: "Missing profile id." };

  const existing = await prisma.aiProviderProfile.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Profile not found." };

  await prisma.$transaction([
    prisma.aiProviderProfile.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.aiProviderProfile.update({ where: { id }, data: { isActive: true } }),
  ]);

  revalidatePath("/settings");
  revalidatePath("/");

  return { success: true };
}

export async function deleteTake(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const shotId = String(formData.get("shotId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!id || !shotId || !projectId) return;

  const take = await prisma.take.findUnique({ where: { id } });
  if (!take) return;

  await prisma.take.delete({ where: { id } });

  if (take.status === "SELECTED" && take.fileUrl) {
    await prisma.shot.updateMany({
      where: { id: shotId, videoUrl: take.fileUrl },
      data: { videoUrl: null },
    });
  }

  revalidatePath(`/projects/${projectId}/shots/${shotId}`);
  revalidatePath(`/projects/${projectId}`);
}
