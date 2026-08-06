import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createShot, deleteShot, deleteProject } from "@/app/actions";
import { ShotStatusSelect } from "@/components/ShotStatusSelect";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ProjectEditForm } from "@/components/ProjectEditForm";
import { ShotImportForm } from "@/components/ShotImportForm";
import { ProjectAiWorkspace } from "@/components/ProjectAiWorkspace";
import { SubmitButton } from "@/components/SubmitButton";
import { getAiProviderConfig } from "@/lib/settings";
import type { ShotStatus } from "@/generated/prisma/enums";
import { buttonDangerOutlineSm, buttonPrimary, buttonSecondary, card, cardEnter, cardPadded, chip, fieldBase, fieldLabel, iconButtonDanger, linkMuted, pageShellWide, sectionLabel } from "@/lib/styles";

const COLUMNS: { status: ShotStatus; label: string }[] = [
  { status: "PLANNED", label: "Planned" }, { status: "PROMPTING", label: "Prompting" }, { status: "GENERATING", label: "Generating" }, { status: "REVIEW", label: "Review" }, { status: "NEEDS_REWORK", label: "Needs Rework" }, { status: "APPROVED", label: "Approved" },
];

type ProjectBoardProps = { params: Promise<{ id: string }> };

export default async function ProjectBoard({ params }: ProjectBoardProps) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, include: { shots: { orderBy: { order: "asc" }, include: { _count: { select: { takes: true } } } } } });
  if (!project) notFound();
  const aiConfig = await getAiProviderConfig();
  const shotsByStatus = COLUMNS.reduce<Record<ShotStatus, typeof project.shots>>((acc, column) => { acc[column.status] = project.shots.filter((shot) => shot.status === column.status); return acc; }, {} as Record<ShotStatus, typeof project.shots>);

  return <div className={`${pageShellWide} gap-8`}>
    <header className="flex flex-col gap-3"><Link href="/" className={`w-fit ${linkMuted}`}>← All projects</Link><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><ProjectEditForm project={project} /></div><div className="flex flex-wrap gap-2"><Link href={`/projects/${id}/review`} className={buttonSecondary}>Review images</Link><Link href={`/production/${id}`} className={buttonSecondary}>Production</Link><form action={deleteProject}><input type="hidden" name="id" value={project.id} /><ConfirmDeleteButton label="Delete project" pendingLabel="Deleting…" confirmMessage={`Delete "${project.title}" and all its shots?`} className={buttonDangerOutlineSm} /></form></div></div></header>

    <ProjectAiWorkspace project={project} shots={project.shots.map((shot) => ({ id: shot.id, order: shot.order, title: shot.title, status: shot.status, hasPrompt: Boolean(shot.positivePrompt?.trim() || shot.negativePrompt?.trim()) }))} />

    <section className={cardPadded}><h2 className={`mb-4 ${sectionLabel}`}>Add shot</h2><form action={createShot} className="flex flex-col gap-4 sm:flex-row sm:items-end"><input type="hidden" name="projectId" value={project.id} /><label className={`flex flex-1 flex-col gap-1.5 ${fieldLabel}`}>Title<input name="title" required placeholder="e.g. Shot 12, s2 — bored reaction" className={fieldBase} /></label><label className={`flex flex-1 flex-col gap-1.5 ${fieldLabel}`}>AI tool<input name="aiTool" placeholder="e.g. ChatGPT Image" className={fieldBase} /></label><label className={`flex flex-[2] flex-col gap-1.5 ${fieldLabel}`}>Description / narration<textarea name="prompt" rows={2} placeholder="What must happen in this shot?" className={fieldBase} /></label><SubmitButton pendingText="Adding…" className={`h-fit ${buttonPrimary}`}>Add</SubmitButton></form></section>

    <section className={cardPadded}><ShotImportForm projectId={project.id} aiEnabled={!!aiConfig} /></section>

    <section aria-label="Shot status board" className="flex gap-4 overflow-x-auto pb-4">{COLUMNS.map((column) => <div key={column.status} className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-zinc-100/60 p-3 dark:bg-zinc-900/40"><div className="flex items-center justify-between px-1"><h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{column.label}</h3><span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-200 px-1.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{shotsByStatus[column.status].length}</span></div><div className="flex flex-col gap-3">{shotsByStatus[column.status].map((shot) => <article key={shot.id} className={`${card} ${cardEnter} flex flex-col gap-2 p-3 transition-shadow hover:shadow-md`}><div className="flex items-start justify-between gap-2"><Link href={`/projects/${project.id}/shots/${shot.id}`} className="text-sm font-medium text-zinc-900 hover:text-indigo-600 dark:text-zinc-50 dark:hover:text-indigo-400">{String(shot.order).padStart(2, "0")} · {shot.title ?? "Untitled"}</Link><form action={deleteShot}><input type="hidden" name="id" value={shot.id} /><input type="hidden" name="projectId" value={project.id} /><ConfirmDeleteButton label="✕" confirmMessage={`Delete shot "${shot.title}"?`} className={iconButtonDanger} /></form></div>{(shot.positivePrompt || shot.prompt) && <p className="line-clamp-3 text-xs text-zinc-500 dark:text-zinc-400">{shot.positivePrompt ?? shot.prompt}</p>}<div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">{shot.aiTool && <span className={chip}>{shot.aiTool}</span>}<span>{shot._count.takes} {shot._count.takes === 1 ? "take" : "takes"}</span>{shot.sourceImagePath && <span className="text-emerald-600">image ✓</span>}{shot.motionPrompt && <span className="text-indigo-600">motion ✓</span>}</div><ShotStatusSelect shotId={shot.id} projectId={project.id} status={shot.status} /></article>)}{shotsByStatus[column.status].length === 0 && <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-5 text-center text-xs text-zinc-400 dark:border-zinc-800">No shots here</p>}</div></div>)}</section>
  </div>;
}
