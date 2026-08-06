"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TakeMedia } from "@/components/TakeMedia";
import { EmptyState } from "@/components/EmptyState";
import { SHOT_STATUS_STYLES, badge, buttonPrimary, buttonSecondary, card, cardEnter, cardPadded, sectionLabel } from "@/lib/styles";

type Job = { id: string; type: string; status: string; progress: number; errorMessage: string | null; outputPath: string | null; createdAt: string };
type Take = { id: string; mediaKind: string | null; fileUrl: string | null; localPath: string | null; originalFileName: string | null; versionNumber: number; status: string; createdAt: string };
type Shot = { id: string; order: number; title: string | null; status: string; sourceImagePath: string | null; positivePrompt: string | null; negativePrompt: string | null; motionPrompt: string | null; previewVideoPath: string | null; finalVideoPath: string | null; jobs: Job[]; takes: Take[] };

const STATUS_ORDER = ["PLANNED", "PROMPTING", "GENERATING", "REVIEW", "NEEDS_REWORK", "APPROVED"];

export function ProductionProjectPanel({ project }: { project: { id: string; title: string; shots: Shot[] } }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeJobs = useMemo(() => project.shots.flatMap((shot) => shot.jobs).filter((job) => ["QUEUED", "RUNNING"].includes(job.status)), [project.shots]);
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const shot of project.shots) counts.set(shot.status, (counts.get(shot.status) ?? 0) + 1);
    return STATUS_ORDER.map((status) => ({ status, count: counts.get(status) ?? 0 }));
  }, [project.shots]);

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action); setMessage(null); setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/production`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Action failed.");
      const failures = Array.isArray(data.results) ? data.results.filter((item: { ok: boolean }) => !item.ok) : [];
      const warnings = Array.isArray(data.results) ? data.results.filter((item: { warning?: string | null }) => item.warning) : [];
      if (failures.length) setError(`${failures.length} job(s) failed:\n${failures.map((item: { error?: string }) => item.error ?? "Unknown error").join("\n")}`);
      else if (warnings.length) setError(`${warnings.length} render(s) completed with output-path warnings:\n${warnings.map((item: { warning?: string }) => item.warning).join("\n")}`);
      else if (data.approved === "FINAL") setMessage("Final 1080p clip approved.");
      else if (data.approved === "PREVIEW") setMessage("Preview approved and ready for upscale.");
      else setMessage(action === "poll-jobs" ? "Render status refreshed." : "Action completed.");
      router.refresh();
      return data;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Action failed."); throw caught; }
    finally { setBusy(null); }
  }

  useEffect(() => {
    if (activeJobs.length === 0) return;
    const timer = window.setInterval(() => { void run("poll-jobs").catch(() => undefined); }, 5000);
    return () => window.clearInterval(timer);
  }, [activeJobs.length]);

  async function createExport() {
    setBusy("export"); setMessage(null); setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/final-export`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Export failed.");
      setMessage(`Exported ${data.exportedShots} approved shot(s) to ${data.exportPath}${data.warnings.length ? ` · ${data.warnings.length} warning(s)` : ""}.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Export failed."); }
    finally { setBusy(null); }
  }

  const selectedIds = [...selected];
  const allSelected = project.shots.length > 0 && selected.size === project.shots.length;
  function toggle(id: string) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }

  return <div className="flex flex-col gap-8">
    <section className={cardPadded}><h2 className={sectionLabel}>Pipeline status</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{project.shots.length} shots total across the whole project.</p><div className="mt-3 flex flex-wrap gap-2">{statusCounts.map(({ status, count }) => <span key={status} className={`${badge} ${SHOT_STATUS_STYLES[status] ?? SHOT_STATUS_STYLES.PLANNED}`}>{status.replaceAll("_", " ")}: {count}</span>)}</div></section>

    <section className={cardPadded}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className={sectionLabel}>Batch controls</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">ComfyUI queues jobs sequentially. Generate 768×432 previews first, approve them, then upscale approved clips to 1920×1080.</p></div><Link href={`/projects/${project.id}/review`} className={buttonSecondary}>Still review</Link></div><div className="mt-4 flex flex-wrap gap-2"><button disabled={busy !== null} onClick={() => run("queue-animation", { shotIds: selectedIds }).catch(() => undefined)} className={buttonPrimary}>{busy === "queue-animation" ? "Queueing…" : `Queue animation${selectedIds.length ? ` (${selectedIds.length})` : ""}`}</button><button disabled={busy !== null} onClick={() => run("queue-upscale", { shotIds: selectedIds }).catch(() => undefined)} className={buttonSecondary}>{busy === "queue-upscale" ? "Queueing…" : `Queue upscale${selectedIds.length ? ` (${selectedIds.length})` : ""}`}</button><button disabled={busy !== null || activeJobs.length === 0} onClick={() => run("poll-jobs").catch(() => undefined)} className={buttonSecondary}>{busy === "poll-jobs" ? "Checking…" : `Refresh renders (${activeJobs.length})`}</button><a href={`/api/projects/${project.id}/export`} className={buttonSecondary}>Export animation CSV</a><button disabled={busy !== null} onClick={createExport} className={buttonSecondary}>{busy === "export" ? "Exporting…" : "Organize approved assets"}</button></div>{message && <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}{error && <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</pre>}</section>

    <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className={sectionLabel}>Shot render queue</h2><p className="mt-1 text-sm text-zinc-500">{project.shots.length} shots · {activeJobs.length} active jobs</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(project.shots.map((shot) => shot.id)))} /> Select all</label></div>{project.shots.length === 0 ? <EmptyState title="No shots yet" description="Import a script from the project page first." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{project.shots.map((shot) => { const latest = shot.jobs[0]; const latestPreview = shot.takes.find((take) => take.mediaKind === "PREVIEW" && take.fileUrl); const latestFinal = shot.takes.find((take) => take.mediaKind === "FINAL" && take.fileUrl); const canAnimate = shot.status === "APPROVED" && Boolean(shot.sourceImagePath && shot.positivePrompt && shot.negativePrompt); const canUpscale = shot.status === "APPROVED" && Boolean(shot.previewVideoPath); const reviewingFinal = shot.status === "REVIEW" && Boolean(shot.finalVideoPath); const reviewingPreview = shot.status === "REVIEW" && !shot.finalVideoPath && Boolean(shot.previewVideoPath); return <article key={shot.id} className={`${card} ${cardEnter} p-4`}><div className="flex items-start justify-between gap-3"><label className="flex min-w-0 items-start gap-3"><input type="checkbox" className="mt-1" checked={selected.has(shot.id)} onChange={() => toggle(shot.id)} /><span><span className="block truncate font-medium text-zinc-900 dark:text-zinc-50">{String(shot.order).padStart(2, "0")} · {shot.title ?? "Untitled"}</span><span className={`${badge} mt-1 ${SHOT_STATUS_STYLES[shot.status] ?? SHOT_STATUS_STYLES.PLANNED}`}>{shot.status.replaceAll("_", " ")}</span></span></label><Link href={`/projects/${project.id}/shots/${shot.id}`} className="text-xs text-indigo-600 hover:underline">Open</Link></div><div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]"><div className={`rounded-lg p-2 ${shot.sourceImagePath ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"}`}>Still<br />{shot.sourceImagePath ? "Ready" : "Missing"}</div><div className={`rounded-lg p-2 ${shot.previewVideoPath ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"}`}>Preview<br />{shot.previewVideoPath ? "Ready" : "Missing"}</div><div className={`rounded-lg p-2 ${shot.finalVideoPath ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"}`}>1080p<br />{shot.finalVideoPath ? "Ready" : "Missing"}</div></div>{latest && <div className="mt-3 rounded-lg border border-zinc-200 p-3 text-xs dark:border-zinc-800"><div className="flex justify-between"><span>{latest.type.replaceAll("_", " ")}</span><span>{latest.status}</span></div>{["QUEUED", "RUNNING"].includes(latest.status) && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full bg-indigo-600" style={{ width: `${latest.progress}%` }} /></div>}{latest.errorMessage && <p className="mt-2 text-red-600 dark:text-red-400">{latest.errorMessage}</p>}{latest.status === "FAILED" && <button type="button" disabled={busy !== null} onClick={() => run("retry-job", { jobId: latest.id }).catch(() => undefined)} className="mt-2 text-indigo-600 hover:underline">Retry failed job</button>}</div>}{(latestPreview || latestFinal) && <div className="mt-3 flex gap-2">{latestPreview && <a href={latestPreview.fileUrl ?? undefined} target="_blank" className="block h-16 w-28 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800" title="Open preview"><TakeMedia take={latestPreview} controls={false} className="h-full w-full object-cover" /></a>}{latestFinal && <a href={latestFinal.fileUrl ?? undefined} target="_blank" className="block h-16 w-28 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800" title="Open final"><TakeMedia take={latestFinal} controls={false} className="h-full w-full object-cover" /></a>}</div>}<div className="mt-3 flex flex-wrap gap-2">{reviewingFinal && <button type="button" disabled={busy !== null} onClick={() => run("approve-final", { shotId: shot.id }).catch(() => undefined)} className={buttonPrimary}>{busy === "approve-final" ? "Approving…" : "Approve final 1080p"}</button>}{reviewingPreview && <button type="button" disabled={busy !== null} onClick={() => run("approve-preview", { shotId: shot.id }).catch(() => undefined)} className={buttonPrimary}>{busy === "approve-preview" ? "Approving…" : "Approve preview"}</button>}<span className={`rounded-md px-2 py-1 text-[10px] ${canAnimate ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>{canAnimate ? "Animation ready" : "Animation blocked"}</span><span className={`rounded-md px-2 py-1 text-[10px] ${canUpscale ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>{canUpscale ? "Upscale ready" : "Upscale blocked"}</span></div></article>; })}</div>}</section>
  </div>;
}
