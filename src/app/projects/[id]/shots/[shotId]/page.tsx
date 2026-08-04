import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createTake, deleteTake, selectTake } from "@/app/actions";
import { ShotStatusSelect } from "@/components/ShotStatusSelect";
import { TakeStatusSelect } from "@/components/TakeStatusSelect";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ShotEditForm } from "@/components/ShotEditForm";
import { SubmitButton } from "@/components/SubmitButton";
import {
  badge,
  buttonPrimary,
  buttonSecondarySm,
  card,
  cardPadded,
  fieldBase,
  fieldLabel,
  iconButtonDanger,
  linkMuted,
  pageShellNarrow,
  sectionLabel,
} from "@/lib/styles";

const TAKE_STATUS_STYLES: Record<string, string> = {
  GENERATING: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  READY: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  SELECTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
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
    <div className={`${pageShellNarrow} flex flex-col gap-8`}>
      <header className="flex flex-col gap-3">
        <Link href={`/projects/${projectId}`} className={`w-fit ${linkMuted}`}>
          ← {shot.project.title}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <ShotEditForm shot={shot} projectId={projectId} />
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
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
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            Selected clip:{" "}
            <a
              href={shot.videoUrl}
              className="underline transition-colors hover:text-emerald-950 dark:hover:text-emerald-100"
              target="_blank"
            >
              {shot.videoUrl}
            </a>
          </div>
        )}
      </header>

      <section className={cardPadded}>
        <h2 className={`mb-4 ${sectionLabel}`}>New take</h2>
        <form action={createTake} className="flex flex-col gap-4">
          <input type="hidden" name="shotId" value={shot.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="model" className={fieldLabel}>
                Model
              </label>
              <input
                id="model"
                name="model"
                placeholder="e.g. Runway Gen-3"
                className={fieldBase}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="seed" className={fieldLabel}>
                Seed
              </label>
              <input id="seed" name="seed" placeholder="Optional" className={fieldBase} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fileUrl" className={fieldLabel}>
              File URL / path
            </label>
            <input
              id="fileUrl"
              name="fileUrl"
              placeholder="Optional"
              className={fieldBase}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className={fieldLabel}>
              Notes
            </label>
            <input id="notes" name="notes" placeholder="Optional" className={fieldBase} />
          </div>
          <SubmitButton
            pendingText="Adding…"
            className={`h-fit w-fit ${buttonPrimary}`}
          >
            Add take
          </SubmitButton>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={sectionLabel}>Takes</h2>
        {shot.takes.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No takes yet. Log a generation attempt above.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {shot.takes.map((take) => (
              <li key={take.id} className={`${cardPadded} flex flex-col gap-2`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      Take #{take.versionNumber}
                    </span>
                    <span className={`${badge} ${TAKE_STATUS_STYLES[take.status]}`}>
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
                        <input type="hidden" name="projectId" value={projectId} />
                        <SubmitButton
                          pendingText="Selecting…"
                          className={buttonSecondarySm}
                        >
                          Select
                        </SubmitButton>
                      </form>
                    )}
                    <form action={deleteTake}>
                      <input type="hidden" name="id" value={take.id} />
                      <input type="hidden" name="shotId" value={shot.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <ConfirmDeleteButton
                        label="✕"
                        confirmMessage={`Delete take #${take.versionNumber}?`}
                        className={iconButtonDanger}
                      />
                    </form>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {take.model && <span>Model: {take.model}</span>}
                  {take.seed && <span>Seed: {take.seed}</span>}
                  <span>{take.createdAt.toLocaleString()}</span>
                </div>
                {take.fileUrl && (
                  <a
                    href={take.fileUrl}
                    target="_blank"
                    className="w-fit text-xs text-blue-600 underline transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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
