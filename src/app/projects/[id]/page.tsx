import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createShot, deleteShot, deleteProject } from "@/app/actions";
import { ShotStatusSelect } from "@/components/ShotStatusSelect";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ProjectEditForm } from "@/components/ProjectEditForm";
import { ShotImportForm } from "@/components/ShotImportForm";
import { SubmitButton } from "@/components/SubmitButton";
import { getAiProviderConfig } from "@/lib/settings";
import type { ShotStatus } from "@/generated/prisma/enums";

const COLUMNS: { status: ShotStatus; label: string }[] = [
  { status: "PLANNED", label: "Planned" },
  { status: "PROMPTING", label: "Prompting" },
  { status: "GENERATING", label: "Generating" },
  { status: "REVIEW", label: "Review" },
  { status: "NEEDS_REWORK", label: "Needs Rework" },
  { status: "APPROVED", label: "Approved" },
];

export default async function ProjectBoard({
  params,
}: PageProps<"/projects/[id]">) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      shots: {
        orderBy: { order: "asc" },
        include: { _count: { select: { takes: true } } },
      },
    },
  });

  if (!project) notFound();

  const aiConfig = await getAiProviderConfig();

  const shotsByStatus = COLUMNS.reduce<
    Record<ShotStatus, typeof project.shots>
  >(
    (acc, column) => {
      acc[column.status] = project.shots.filter(
        (shot) => shot.status === column.status,
      );
      return acc;
    },
    {} as Record<ShotStatus, typeof project.shots>,
  );

  return (
    <div className="flex min-h-screen flex-col gap-8 px-8 py-10">
      <header className="flex flex-col gap-3">
        <Link href="/" className="w-fit text-sm text-zinc-500 hover:underline">
          ← All projects
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <ProjectEditForm project={project} />
          </div>
          <form action={deleteProject}>
            <input type="hidden" name="id" value={project.id} />
            <ConfirmDeleteButton
              label="Delete project"
              pendingLabel="Deleting…"
              confirmMessage={`Delete "${project.title}" and all its shots?`}
              className="rounded border border-red-200 px-3 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            />
          </form>
        </div>
      </header>

      <section className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Add shot
        </h2>
        <form
          action={createShot}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="projectId" value={project.id} />
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="title" className="text-xs text-zinc-500">
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              placeholder="e.g. Wide shot - skyline"
              className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="aiTool" className="text-xs text-zinc-500">
              AI tool
            </label>
            <input
              id="aiTool"
              name="aiTool"
              placeholder="e.g. Runway Gen-3"
              className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
          <div className="flex flex-[2] flex-col gap-1">
            <label htmlFor="prompt" className="text-xs text-zinc-500">
              Prompt
            </label>
            <textarea
              id="prompt"
              name="prompt"
              rows={1}
              placeholder="Optional"
              className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
          <SubmitButton
            pendingText="Adding…"
            className="h-fit rounded bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Add
          </SubmitButton>
        </form>
      </section>

      <section className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
        <ShotImportForm
          projectId={project.id}
          aiEnabled={!!aiConfig}
        />
      </section>

      <section className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => (
          <div
            key={column.status}
            className="flex w-72 shrink-0 flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {column.label}
              </h3>
              <span className="text-xs text-zinc-500">
                {shotsByStatus[column.status].length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {shotsByStatus[column.status].map((shot) => (
                <div
                  key={shot.id}
                  className="flex flex-col gap-2 rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/projects/${project.id}/shots/${shot.id}`}
                      className="text-sm font-medium text-black hover:underline dark:text-zinc-50"
                    >
                      {shot.title}
                    </Link>
                    <form action={deleteShot}>
                      <input type="hidden" name="id" value={shot.id} />
                      <input
                        type="hidden"
                        name="projectId"
                        value={project.id}
                      />
                      <ConfirmDeleteButton
                        label="✕"
                        confirmMessage={`Delete shot "${shot.title}"?`}
                        className="text-xs text-zinc-400 transition-colors hover:text-red-500"
                      />
                    </form>
                  </div>
                  {shot.prompt && (
                    <p className="line-clamp-3 text-xs text-zinc-500">
                      {shot.prompt}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    {shot.aiTool && (
                      <span className="rounded bg-black/[.04] px-1.5 py-0.5 dark:bg-white/[.06]">
                        {shot.aiTool}
                      </span>
                    )}
                    <Link
                      href={`/projects/${project.id}/shots/${shot.id}`}
                      className="hover:underline"
                    >
                      {shot._count.takes}{" "}
                      {shot._count.takes === 1 ? "take" : "takes"}
                    </Link>
                    {shot.videoUrl && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700 dark:bg-green-900 dark:text-green-300">
                        take selected
                      </span>
                    )}
                  </div>
                  <ShotStatusSelect
                    shotId={shot.id}
                    projectId={project.id}
                    status={shot.status}
                  />
                </div>
              ))}
              {shotsByStatus[column.status].length === 0 && (
                <p className="text-xs text-zinc-400">No shots</p>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
