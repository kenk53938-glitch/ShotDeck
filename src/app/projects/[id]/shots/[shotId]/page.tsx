import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createTake, deleteTake, selectTake } from "@/app/actions";
import { ShotStatusSelect } from "@/components/ShotStatusSelect";
import { TakeStatusSelect } from "@/components/TakeStatusSelect";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ShotEditForm } from "@/components/ShotEditForm";

const TAKE_STATUS_STYLES: Record<string, string> = {
  GENERATING: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  READY: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  SELECTED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

export default async function ShotDetail({
  params,
}: PageProps<"/projects/[id]/shots/[shotId]">) {
  const { id: projectId, shotId } = await params;

  const shot = await prisma.shot.findUnique({
    where: { id: shotId },
    include: {
      project: true,
      takes: { orderBy: { versionNumber: "desc" } },
    },
  });

  if (!shot || shot.projectId !== projectId) notFound();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-8 py-10">
      <header className="flex flex-col gap-3">
        <Link
          href={`/projects/${projectId}`}
          className="w-fit text-sm text-zinc-500 hover:underline"
        >
          ← {shot.project.title}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <ShotEditForm shot={shot} projectId={projectId} />
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span>
                {shot.takes.length} {shot.takes.length === 1 ? "take" : "takes"}
              </span>
            </div>
          </div>
          <ShotStatusSelect
            shotId={shot.id}
            projectId={projectId}
            status={shot.status}
          />
        </div>
        {shot.videoUrl && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            Selected clip:{" "}
            <a href={shot.videoUrl} className="underline" target="_blank">
              {shot.videoUrl}
            </a>
          </div>
        )}
      </header>

      <section className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          New take
        </h2>
        <form action={createTake} className="flex flex-col gap-3">
          <input type="hidden" name="shotId" value={shot.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="model" className="text-xs text-zinc-500">
                Model
              </label>
              <input
                id="model"
                name="model"
                placeholder="e.g. Runway Gen-3"
                className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="seed" className="text-xs text-zinc-500">
                Seed
              </label>
              <input
                id="seed"
                name="seed"
                placeholder="Optional"
                className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="fileUrl" className="text-xs text-zinc-500">
              File URL / path
            </label>
            <input
              id="fileUrl"
              name="fileUrl"
              placeholder="Optional"
              className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="notes" className="text-xs text-zinc-500">
              Notes
            </label>
            <input
              id="notes"
              name="notes"
              placeholder="Optional"
              className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
          <button
            type="submit"
            className="h-fit w-fit rounded bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Add take
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Takes
        </h2>
        {shot.takes.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No takes yet. Log a generation attempt above.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {shot.takes.map((take) => (
              <li
                key={take.id}
                className="flex flex-col gap-2 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-black dark:text-zinc-50">
                      Take #{take.versionNumber}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        TAKE_STATUS_STYLES[take.status]
                      }`}
                    >
                      {take.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TakeStatusSelect
                      takeId={take.id}
                      shotId={shot.id}
                      projectId={projectId}
                      status={take.status}
                    />
                    {take.status === "READY" && (
                      <form action={selectTake}>
                        <input type="hidden" name="id" value={take.id} />
                        <input type="hidden" name="shotId" value={shot.id} />
                        <input
                          type="hidden"
                          name="projectId"
                          value={projectId}
                        />
                        <button
                          type="submit"
                          className="rounded border border-black/[.08] px-2 py-1 text-xs hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
                        >
                          Select
                        </button>
                      </form>
                    )}
                    <form action={deleteTake}>
                      <input type="hidden" name="id" value={take.id} />
                      <input type="hidden" name="shotId" value={shot.id} />
                      <input
                        type="hidden"
                        name="projectId"
                        value={projectId}
                      />
                      <ConfirmDeleteButton
                        label="✕"
                        confirmMessage={`Delete take #${take.versionNumber}?`}
                        className="text-xs text-zinc-400 hover:text-red-500"
                      />
                    </form>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                  {take.model && <span>Model: {take.model}</span>}
                  {take.seed && <span>Seed: {take.seed}</span>}
                  <span>{take.createdAt.toLocaleString()}</span>
                </div>
                {take.fileUrl && (
                  <a
                    href={take.fileUrl}
                    target="_blank"
                    className="w-fit text-xs text-blue-600 underline dark:text-blue-400"
                  >
                    {take.fileUrl}
                  </a>
                )}
                {take.notes && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {take.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
