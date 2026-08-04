"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseShotList } from "@/lib/shotParser";
import { parseShotListWithGemini } from "@/lib/geminiParser";
import {
  MAX_PROMPT_LENGTH,
  MAX_TITLE_LENGTH,
  costSchema,
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

export async function updateProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const titleResult = titleSchema.safeParse(formData.get("title"));
  if (!id || !titleResult.success) return;

  const description = String(formData.get("description") ?? "").trim();
  const youtubeUrl = String(formData.get("youtubeUrl") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "");
  const statusResult = statusRaw
    ? projectStatusSchema.safeParse(statusRaw)
    : null;

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

export async function updateShot(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const titleResult = titleSchema.safeParse(formData.get("title"));
  if (!id || !projectId || !titleResult.success) return;

  const description = String(formData.get("description") ?? "").trim();

  const promptRaw = String(formData.get("prompt") ?? "").trim();
  const promptResult = promptRaw ? promptSchema.safeParse(promptRaw) : null;
  if (promptResult && !promptResult.success) return;

  const negativePromptRaw = String(
    formData.get("negativePrompt") ?? "",
  ).trim();
  const negativePromptResult = negativePromptRaw
    ? promptSchema.safeParse(negativePromptRaw)
    : null;
  if (negativePromptResult && !negativePromptResult.success) return;

  const aiTool = String(formData.get("aiTool") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const durationRaw = String(formData.get("durationSeconds") ?? "").trim();
  const durationResult = durationRaw
    ? durationSchema.safeParse(durationRaw)
    : null;
  if (durationResult && !durationResult.success) return;

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

export async function createTake(formData: FormData) {
  const shotId = String(formData.get("shotId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!shotId || !projectId) return;

  const model = String(formData.get("model") ?? "").trim();
  const fileUrl = String(formData.get("fileUrl") ?? "").trim();
  const seed = String(formData.get("seed") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const costRaw = String(formData.get("cost") ?? "").trim();
  const costResult = costRaw ? costSchema.safeParse(costRaw) : null;
  if (costResult && !costResult.success) return;

  const lastTake = await prisma.take.findFirst({
    where: { shotId },
    orderBy: { versionNumber: "desc" },
  });

  await prisma.take.create({
    data: {
      shotId,
      versionNumber: (lastTake?.versionNumber ?? 0) + 1,
      model: model || null,
      fileUrl: fileUrl || null,
      seed: seed || null,
      notes: notes || null,
      cost: costResult?.data ?? null,
    },
  });

  revalidatePath(`/projects/${projectId}/shots/${shotId}`);
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

export async function selectTake(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const shotId = String(formData.get("shotId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!id || !shotId || !projectId) return;

  const take = await prisma.take.findUnique({ where: { id } });
  if (!take) return;

  await prisma.$transaction([
    prisma.take.updateMany({
      where: { shotId, status: "SELECTED" },
      data: { status: "READY" },
    }),
    prisma.take.update({
      where: { id },
      data: { status: "SELECTED" },
    }),
    prisma.shot.update({
      where: { id: shotId },
      data: { videoUrl: take.fileUrl },
    }),
  ]);

  revalidatePath(`/projects/${projectId}/shots/${shotId}`);
  revalidatePath(`/projects/${projectId}`);
}

export interface ImportShotsResult {
  imported: number;
  errors: string[];
  parser: "gemini" | "rule-based";
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

  let parser: "gemini" | "rule-based" = "rule-based";
  let fellBack = false;
  let result;

  if (process.env.GEMINI_API_KEY) {
    try {
      result = await parseShotListWithGemini(text);
      parser = "gemini";
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

  for (const shot of result.shots) {
    const title = (shot.title ?? `Shot ${shot.shotLabel}`).slice(
      0,
      MAX_TITLE_LENGTH,
    );
    const prompt = shot.prompt.slice(0, MAX_PROMPT_LENGTH);
    const negativePrompt = shot.negativePrompt?.slice(0, MAX_PROMPT_LENGTH) ?? null;
    const durationSeconds =
      shot.durationSeconds !== null
        ? Math.min(3600, Math.max(0, shot.durationSeconds))
        : null;

    await prisma.shot.create({
      data: {
        projectId,
        order: nextOrder++,
        title,
        prompt,
        negativePrompt,
        aiTool: shot.tool,
        durationSeconds,
      },
    });
  }

  revalidatePath(`/projects/${projectId}`);

  return {
    imported: result.shots.length,
    errors: result.errors,
    parser,
    fellBack,
  };
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
