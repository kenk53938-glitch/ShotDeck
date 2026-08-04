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
import {
  buttonDangerOutlineSm,
  buttonPrimary,
  card,
  cardPadded,
  chip,
  fieldBase,
  fieldLabel,
  iconButtonDanger,
  linkMuted,
  pageShellWide,
  sectionLabel,
} from "@/lib/styles";

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
    <div className={`${pageShellWide} gap-8`}>
      <header className="flex flex-col gap-3">
        <Link href="/" className={`w-fit ${linkMuted}`}>
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
              className={buttonDangerOutlineSm}
            />
          </form>
        </div>
      </header>

      <section className={cardPadded}>
        <h2 className={`mb-4 ${sectionLabel}`}>Add shot</h2>
        <form
          action={createShot}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="projectId" value={project.id} />
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="title" className={fieldLabel}>
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              placeholder="e.g. Wide shot - skyline"
              className={fieldBase}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="aiTool" className={fieldLabel}>
              AI tool
            </label>
            <input
              id="aiTool"
              name="aiTool"
              placeholder="e.g. Runway Gen-3"
              className={fieldBase}
            />
          </div>
          <div className="flex flex-[2] flex-col gap-1.5">
            <label htmlFor="prompt" className={fieldLabel}>
              Prompt
            </label>
            <textarea
              id="prompt"
              name="prompt"
              rows={1}
              placeholder="Optional"
              className={fieldBase}
            />
          </div>
          <SubmitButton pendingText="Adding…" className={`h-fit ${buttonPrimary}`}>
            Add
          </SubmitButton>
        </form>
      </section>

      <section className={cardPadded}>
        <ShotImportForm projectId={project.id} aiEnabled={!!aiConfig} />
      </section>

      <section className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => (
          <div
            key={column.status}
            className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-zinc-100/60 p-3 dark:bg-zinc-900/40"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {column.label}
              </h3>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-200 px-1.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {shotsByStatus[column.status].length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {shotsByStatus[column.status].map((shot) => (
                <div
                  key={shot.id}
                  className={`${card} flex flex-col gap-2 p-3 transition-shadow hover:shadow-md`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/projects/${project.id}/shots/${shot.id}`}
                      className="text-sm font-medium text-zinc-900 transition-colors hover:text-indigo-600 dark:text-zinc-50 dark:hover:text-indigo-400"
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
                        className={iconButtonDanger}
                      />
                    </form>
                  </div>
                  {shot.prompt && (
                    <p className="line-clamp-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {shot.prompt}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {shot.aiTool && <span className={chip}>{shot.aiTool}</span>}
                    <Link
                      href={`/projects/${project.id}/shots/${shot.id}`}
                      className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
                    >
                      {shot._count.takes}{" "}
                      {shot._count.takes === 1 ? "take" : "takes"}
                    </Link>
                    {shot.videoUrl && (
                      <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
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
                <p className="px-1 text-xs text-zinc-400 dark:text-zinc-600">
                  No shots
                </p>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
