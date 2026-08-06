import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createProject } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { EmptyState } from "@/components/EmptyState";
import {
  badge,
  buttonPrimary,
  card,
  cardEnter,
  cardPadded,
  fieldBase,
  fieldLabel,
  pageShell,
  sectionLabel,
} from "@/lib/styles";

const PROJECT_STATUS_STYLES: Record<string, string> = {
  PLANNING: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  PUBLISHED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  ARCHIVED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};

export default async function Home() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { shots: true } } },
  });

  return (
    <div className={`${pageShell} flex flex-col gap-10`}>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          ShotDeck
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          <span className="typewriter">Shot-level production tracker for AI-generated YouTube videos.</span>
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className={sectionLabel}>New project</h2>
        <form
          action={createProject}
          className={`${cardPadded} flex flex-col gap-4 sm:flex-row sm:items-end`}
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="title" className={fieldLabel}>
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              placeholder="e.g. Episode 12 - Neon City"
              className={fieldBase}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="description" className={fieldLabel}>
              Description
            </label>
            <input
              id="description"
              name="description"
              placeholder="Optional"
              className={fieldBase}
            />
          </div>
          <SubmitButton pendingText="Creating…" className={`h-fit ${buttonPrimary}`}>
            Create
          </SubmitButton>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={sectionLabel}>Projects</h2>
        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create one above to get started."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className={`${card} ${cardEnter} group flex items-center justify-between gap-4 p-4 transition-shadow hover:shadow-md sm:p-5`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-zinc-900 transition-colors group-hover:text-indigo-600 dark:text-zinc-50 dark:group-hover:text-indigo-400">
                      {project.title}
                    </span>
                    {project.description && (
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {project.description}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {project._count.shots} shots
                    </span>
                    <span
                      className={`${badge} ${PROJECT_STATUS_STYLES[project.status]}`}
                    >
                      {project.status.replace("_", " ")}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
