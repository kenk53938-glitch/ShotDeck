"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type {
  ProjectStatus,
  ShotStatus,
  TakeStatus,
} from "@/generated/prisma/enums";

export async function createProject(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const description = String(formData.get("description") ?? "").trim();

  const project = await prisma.project.create({
    data: {
      title,
      description: description || null,
    },
  });

  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!id || !title) return;

  const description = String(formData.get("description") ?? "").trim();
  const youtubeUrl = String(formData.get("youtubeUrl") ?? "").trim();
  const status = String(formData.get("status") ?? "") as ProjectStatus;

  await prisma.project.update({
    where: { id },
    data: {
      title,
      description: description || null,
      youtubeUrl: youtubeUrl || null,
      ...(status ? { status } : {}),
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
  const title = String(formData.get("title") ?? "").trim();
  if (!projectId || !title) return;

  const prompt = String(formData.get("prompt") ?? "").trim();
  const aiTool = String(formData.get("aiTool") ?? "").trim();

  const lastShot = await prisma.shot.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
  });

  await prisma.shot.create({
    data: {
      projectId,
      title,
      prompt: prompt || null,
      aiTool: aiTool || null,
      order: (lastShot?.order ?? 0) + 1,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateShot(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!id || !projectId || !title) return;

  const description = String(formData.get("description") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const aiTool = String(formData.get("aiTool") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const durationRaw = String(formData.get("durationSeconds") ?? "").trim();
  const durationSeconds = durationRaw ? Number(durationRaw) : null;

  await prisma.shot.update({
    where: { id },
    data: {
      title,
      description: description || null,
      prompt: prompt || null,
      aiTool: aiTool || null,
      notes: notes || null,
      durationSeconds:
        durationSeconds !== null && !Number.isNaN(durationSeconds)
          ? durationSeconds
          : null,
    },
  });

  revalidatePath(`/projects/${projectId}/shots/${id}`);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateShotStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const status = String(formData.get("status") ?? "") as ShotStatus;
  if (!id || !projectId || !status) return;

  await prisma.shot.update({
    where: { id },
    data: { status },
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
  const cost = costRaw ? Number(costRaw) : null;

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
      cost: cost !== null && !Number.isNaN(cost) ? cost : null,
    },
  });

  revalidatePath(`/projects/${projectId}/shots/${shotId}`);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateTakeStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const shotId = String(formData.get("shotId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const status = String(formData.get("status") ?? "") as TakeStatus;
  if (!id || !shotId || !projectId || !status) return;

  await prisma.take.update({
    where: { id },
    data: { status },
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
