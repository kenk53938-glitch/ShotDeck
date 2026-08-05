import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createTake, deleteTake } from "@/app/actions";
import { ShotStatusSelect } from "@/components/ShotStatusSelect";
import { TakeStatusSelect } from "@/components/TakeStatusSelect";
import { SelectTakeButton } from "@/components/SelectTakeButton";
import { TakeRatingControl } from "@/components/TakeRatingControl";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ShotEditForm } from "@/components/ShotEditForm";
import { ShotPromptGenerator } from "@/components/ShotPromptGenerator";
import { SubmitButton } from "@/components/SubmitButton";
import { badge, buttonPrimary, cardPadded, fieldBase, fieldLabel, iconButtonDanger, linkMuted, pageShellNarrow, sectionLabel } from "@/lib/styles";

const TAKE_STATUS_STYLES: Record<string, string> = {
  GENERATING: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  READY: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  SELECTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
};

type ShotDetailProps = { params: Promise<{ id: string; shotId: string }> };

export default async function ShotDetail({ params }: ShotDetailProps) {
  const { id: projectId, shotId } = await params;
  const shot = await prisma.shot.findUnique({ where: { id: shotId }, include: { project: true, takes: { orderBy: { versionNumber: "desc" } } } });
  if (!shot || shot.projectId !== projectId) notFound();
  const positivePrompt = shot.positivePrompt ?? shot.stillPrompt ?? shot.prompt;
  const selectedStill = shot.takes.find((take) => take.isSelected && take.mediaKind === "STILL") ?? shot.takes.find((take) => take.mediaKind === "STILL");
  const selectedStillUrl = selectedStill?.fileUrl ?? (shot.sourceImagePath?.startsWith("/api/media/") ? shot.sourceImagePath : null);

  return <div className={`${pageShellNarrow} flex flex-col gap-8`}>
    <header className="flex flex-col gap-3"><Link href={`/projects/${projectId}`} className={`w-fit ${linkMuted}`}>← {shot.project.title}</Link><div className="flex items-start justify-between gap-4"><div className="flex-1"><ShotEditForm shot={shot} projectId={projectId} /></div><ShotStatusSelect shotId={shot.id} projectId={projectId} status={shot.status} /></div></header>

    <ShotPromptGenerator shotId={shot.id} initialPositivePrompt={positivePrompt} initialNegativePrompt={shot.negativePrompt} />

    {selectedStillUrl && <section className={cardPadded}><h2 className={`mb-3 ${sectionLabel}`}>Selected still image</h2><img src={selectedStillUrl} alt={shot.title ?? "Shot still"} className="max-h-96 w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800" /></section>}

    <section className={cardPadded}><h2 className={`mb-4 ${sectionLabel}`}>New take</h2><form action={createTake} className="flex flex-col gap-4"><input type="hidden" name="shotId" value={shot.id} /><input type="hidden" name="projectId" value={projectId} /><div className="grid gap-4 sm:grid-cols-2"><label className={fieldLabel}>Model<input name="model" placeholder="e.g. ChatGPT Image or WAN 2.2" className={`${fieldBase} mt-1.5`} /></label><label className={fieldLabel}>Seed<input name="seed" className={`${fieldBase} mt-1.5`} /></label></div><label className={fieldLabel}>File URL / path<input name="fileUrl" className={`${fieldBase} mt-1.5`} /></label><label className={fieldLabel}>Notes<input name="notes" className={`${fieldBase} mt-1.5`} /></label><SubmitButton pendingText="Adding…" className={`w-fit ${buttonPrimary}`}>Add take</SubmitButton></form></section>

    <section className="flex flex-col gap-3"><h2 className={sectionLabel}>Takes</h2>{shot.takes.length === 0 ? <div className={cardPadded}><p className="text-sm text-zinc-500 dark:text-zinc-400">No takes yet. Upload stills from the project review page or log a generation attempt above.</p></div> : <ul className="flex flex-col gap-3">{shot.takes.map((take) => <li key={take.id} className={`${cardPadded} flex flex-col gap-3`}><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="text-sm font-medium">Take #{take.versionNumber}</span><span className={`${badge} ${TAKE_STATUS_STYLES[take.status]}`}>{take.status}</span>{take.mediaKind && <span className={badge}>{take.mediaKind}</span>}</div><div className="flex items-center gap-2"><TakeStatusSelect takeId={take.id} shotId={shot.id} projectId={projectId} status={take.status} />{take.status === "READY" && <SelectTakeButton takeId={take.id} shotId={shot.id} />}<form action={deleteTake}><input type="hidden" name="id" value={take.id} /><input type="hidden" name="shotId" value={shot.id} /><input type="hidden" name="projectId" value={projectId} /><ConfirmDeleteButton label="✕" confirmMessage={`Delete take #${take.versionNumber}?`} className={iconButtonDanger} /></form></div></div><div className="flex flex-wrap gap-3 text-xs text-zinc-500">{take.model && <span>Model: {take.model}</span>}{take.seed && <span>Seed: {take.seed}</span>}<span>{take.createdAt.toLocaleString()}</span></div><TakeRatingControl takeId={take.id} shotId={shot.id} initialRating={take.rating} />{take.fileUrl && <a href={take.fileUrl} target="_blank" className="w-fit text-xs text-indigo-600 underline">{take.originalFileName ?? take.fileUrl}</a>}{take.notes && <p className="text-sm text-zinc-600 dark:text-zinc-400">{take.notes}</p>}</li>)}</ul>}</section>
  </div>;
}
