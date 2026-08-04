import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createProject } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

const PROJECT_STATUS_STYLES: Record<string, string> = {
  PLANNING: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  ARCHIVED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};

export default async function Home() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { shots: true } } },
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-8 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          ShotDeck
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Shot-level production tracker for AI-generated YouTube videos.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          New project
        </h2>
        <form
          action={createProject}
          className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145] sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="title" className="text-xs text-zinc-500">
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              placeholder="e.g. Episode 12 - Neon City"
              className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="description" className="text-xs text-zinc-500">
              Description
            </label>
            <input
              id="description"
              name="description"
              placeholder="Optional"
              className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
          <SubmitButton
            pendingText="Creating…"
            className="h-fit rounded bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Create
          </SubmitButton>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Projects
        </h2>
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No projects yet. Create one above to get started.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-black/[.08] p-4 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:hover:bg-white/[.03]"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-black dark:text-zinc-50">
                      {project.title}
                    </span>
                    {project.description && (
                      <span className="text-sm text-zinc-500">
                        {project.description}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-500">
                      {project._count.shots} shots
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        PROJECT_STATUS_STYLES[project.status]
                      }`}
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
