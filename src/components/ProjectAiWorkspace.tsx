"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonDanger, buttonPrimary, buttonSecondary, cardPadded, fieldBase, fieldLabel, sectionLabel } from "@/lib/styles";

type ShotSummary = { id: string; order: number; title: string | null; status: string; hasPrompt: boolean };

export function ProjectAiWorkspace({ project, shots }: {
  project: { id: string; styleGuide: string | null; referenceImageUrl: string | null; referenceImagePath: string | null; fixedNegativePrompt: string | null; defaultWidth: number; defaultHeight: number; defaultFps: number };
  shots: ShotSummary[];
}) {
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [referenceUrl, setReferenceUrl] = useState(project.referenceImageUrl);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function saveSettings(formData: FormData) {
    setBusy("settings"); setMessage(null); setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/production`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-settings", ...Object.fromEntries(formData) }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Settings were not saved.");
      setMessage("Project AI settings saved.");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Settings were not saved."); }
    finally { setBusy(null); }
  }

  async function uploadReference() {
    const file = uploadRef.current?.files?.[0];
    if (!file) { setError("Choose a reference image first."); return; }
    setBusy("reference"); setMessage(null); setError(null);
    try {
      const formData = new FormData(); formData.set("file", file);
      const response = await fetch(`/api/projects/${project.id}/reference-image`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Upload failed.");
      setReferenceUrl(data.url); setMessage("Reference image updated.");
      if (uploadRef.current) uploadRef.current.value = "";
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Upload failed."); }
    finally { setBusy(null); }
  }

  async function removeReference() {
    setBusy("reference"); setMessage(null); setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/reference-image`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Could not remove the reference image.");
      setReferenceUrl(null); setMessage("Reference image removed.");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not remove the reference image."); }
    finally { setBusy(null); }
  }

  async function generateMissing(overwrite: boolean) {
    if (overwrite && !window.confirm("Overwrite existing prompts for eligible shots? Manual edits will be replaced.")) return;
    const eligible = shots.filter((shot) => ["PLANNED", "PROMPTING"].includes(shot.status) && (overwrite || !shot.hasPrompt));
    if (eligible.length === 0) { setMessage("No eligible shots need prompt generation."); return; }
    setBusy("generate"); setMessage(null); setError(null); setProgress({ done: 0, total: eligible.length });
    const failures: string[] = [];
    for (let index = 0; index < eligible.length; index++) {
      const shot = eligible[index];
      try {
        const response = await fetch(`/api/shots/${shot.id}/generate-prompt`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persist: true, overwrite }) });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error ?? "Generation failed");
      } catch (caught) { failures.push(`${shot.order}. ${shot.title ?? "Untitled"}: ${caught instanceof Error ? caught.message : "Generation failed"}`); }
      setProgress({ done: index + 1, total: eligible.length });
    }
    setBusy(null);
    router.refresh();
    if (failures.length) setError(`${failures.length} shot(s) failed:\n${failures.join("\n")}`);
    else setMessage(`Generated ${eligible.length} prompt set(s). Open each shot to review or edit.`);
  }

  return <section className={cardPadded}>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className={sectionLabel}>Project AI workspace</h2><p className="mt-1 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">Set reusable character and style context once, then generate consistent still-image prompts across the project.</p></div><Link href={`/production/${project.id}`} className={buttonSecondary}>Open production dashboard</Link></div>
    <form onSubmit={(event) => { event.preventDefault(); void saveSettings(new FormData(event.currentTarget)); }} className="flex flex-col gap-4">
      <label className={fieldLabel}>Style guide<textarea name="styleGuide" rows={8} defaultValue={project.styleGuide ?? ""} placeholder="Describe the mascot, clothing, face, outline style, palette, background rules, prohibited details, and consistency requirements." className={`${fieldBase} mt-1.5`} /></label>
      <label className={fieldLabel}>Fixed negative prompt<textarea name="fixedNegativePrompt" rows={4} defaultValue={project.fixedNegativePrompt ?? ""} placeholder="Rules appended to every shot, such as no hair, no extra characters, no gradients, no watermark." className={`${fieldBase} mt-1.5`} /></label>
      <div className="grid gap-3 sm:grid-cols-3"><label className={fieldLabel}>Preview width<input name="defaultWidth" type="number" min={64} defaultValue={project.defaultWidth} className={`${fieldBase} mt-1.5`} /></label><label className={fieldLabel}>Preview height<input name="defaultHeight" type="number" min={64} defaultValue={project.defaultHeight} className={`${fieldBase} mt-1.5`} /></label><label className={fieldLabel}>FPS<input name="defaultFps" type="number" min={1} max={240} defaultValue={project.defaultFps} className={`${fieldBase} mt-1.5`} /></label></div>
      <button disabled={busy !== null} className={`w-fit ${buttonPrimary}`}>{busy === "settings" ? "Saving…" : "Save AI settings"}</button>
    </form>
    <div className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"><h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Character reference image</h3><div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">{referenceUrl ? <img src={referenceUrl} alt="Project character reference" className="h-28 w-40 rounded-lg border border-zinc-200 object-contain dark:border-zinc-800" /> : <div className="flex h-28 w-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-400 dark:border-zinc-700">No reference image</div>}<div className="flex flex-1 flex-col gap-2"><input ref={uploadRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="text-sm text-zinc-600 dark:text-zinc-400" /><div className="flex flex-wrap gap-2"><button type="button" onClick={uploadReference} disabled={busy !== null} className={buttonSecondary}>{busy === "reference" ? "Working…" : referenceUrl ? "Replace image" : "Upload image"}</button>{referenceUrl && <button type="button" onClick={removeReference} disabled={busy !== null} className={buttonDanger}>Remove</button>}</div></div></div></div>
    <div className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"><h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Bulk prompt generation</h3><p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Runs sequentially and preserves existing prompts unless overwrite is explicitly confirmed.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => generateMissing(false)} disabled={busy !== null} className={buttonPrimary}>{busy === "generate" ? "Generating…" : "Generate missing prompts"}</button><button type="button" onClick={() => generateMissing(true)} disabled={busy !== null} className={buttonSecondary}>Regenerate eligible prompts</button></div>{progress && <div className="mt-3"><div className="mb-1 flex justify-between text-xs text-zinc-500"><span>Progress</span><span>{progress.done} of {progress.total}</span></div><div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} /></div></div>}</div>
    {message && <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}{error && <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</pre>}
  </section>;
}
