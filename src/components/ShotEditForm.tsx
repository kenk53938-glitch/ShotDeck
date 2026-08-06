"use client";

import { useState } from "react";
import { buttonPrimary, buttonSecondary, cardPadded, chip, fieldBase, fieldLabel, linkSubtle } from "@/lib/styles";

type EditableShot = {
  id: string;
  title: string | null;
  description: string | null;
  positivePrompt: string | null;
  prompt: string | null;
  stillPrompt: string | null;
  negativePrompt: string | null;
  motionPrompt: string | null;
  aiTool: string | null;
  durationSeconds: number | null;
  notes: string | null;
  seed: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
};

export function ShotEditForm({ shot }: { shot: EditableShot; projectId: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const positive = shot.positivePrompt ?? shot.stillPrompt ?? shot.prompt;

  if (!isEditing) {
    return <div className="flex flex-col gap-2">
      <input name="shot-title-shadow" type="hidden" value={shot.title ?? "Shot"} readOnly />
      <div className="flex items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{shot.title ?? "Untitled shot"}</h1><button onClick={() => { setError(null); setIsEditing(true); }} className={linkSubtle}>Edit</button></div>
      {shot.description && <p className="text-zinc-600 dark:text-zinc-400">{shot.description}</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">{shot.aiTool && <span className={chip}>{shot.aiTool}</span>}{shot.durationSeconds !== null && <span>{shot.durationSeconds}s</span>}{shot.seed && <span>Seed {shot.seed}</span>}{shot.width && shot.height && <span>{shot.width}×{shot.height}</span>}{shot.fps && <span>{shot.fps} fps</span>}</div>
      {positive && <p className="mt-2 line-clamp-4 text-sm text-zinc-600 dark:text-zinc-400"><span className="font-medium">Image prompt:</span> {positive}</p>}
      {shot.motionPrompt && <p className="line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400"><span className="font-medium">Motion:</span> {shot.motionPrompt}</p>}
      {shot.notes && <p className="text-sm text-zinc-500 dark:text-zinc-400">Notes: {shot.notes}</p>}
    </div>;
  }

  return <form onSubmit={async (event) => {
    event.preventDefault(); setIsSaving(true); setError(null);
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch(`/api/shots/${shot.id}/details`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Could not save the shot.");
      setIsEditing(false); window.location.reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save the shot."); }
    finally { setIsSaving(false); }
  }} className={`${cardPadded} flex flex-col gap-4`}>
    <label className={fieldLabel}>Title<input name="title" required defaultValue={shot.title ?? ""} className={`${fieldBase} mt-1.5`} /></label>
    <label className={fieldLabel}>Description / narration<textarea name="description" rows={3} defaultValue={shot.description ?? ""} className={`${fieldBase} mt-1.5`} /></label>
    <label className={fieldLabel}>Positive image prompt<textarea name="positivePrompt" rows={7} defaultValue={positive ?? ""} className={`${fieldBase} mt-1.5`} /></label>
    <label className={fieldLabel}>Negative image prompt<textarea name="negativePrompt" rows={4} defaultValue={shot.negativePrompt ?? ""} className={`${fieldBase} mt-1.5`} /></label>
    <label className={fieldLabel}>Motion prompt <span className="font-normal text-zinc-400">(animation stage only)</span><textarea name="motionPrompt" rows={4} defaultValue={shot.motionPrompt ?? ""} className={`${fieldBase} mt-1.5`} /></label>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className={fieldLabel}>AI tool<input name="aiTool" defaultValue={shot.aiTool ?? ""} className={`${fieldBase} mt-1.5`} /></label><label className={fieldLabel}>Duration (s)<input name="durationSeconds" type="number" step="0.1" defaultValue={shot.durationSeconds ?? ""} className={`${fieldBase} mt-1.5`} /></label><label className={fieldLabel}>Seed<input name="seed" defaultValue={shot.seed ?? ""} className={`${fieldBase} mt-1.5`} /></label><label className={fieldLabel}>FPS<input name="fps" type="number" defaultValue={shot.fps ?? ""} className={`${fieldBase} mt-1.5`} /></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className={fieldLabel}>Width<input name="width" type="number" defaultValue={shot.width ?? ""} className={`${fieldBase} mt-1.5`} /></label><label className={fieldLabel}>Height<input name="height" type="number" defaultValue={shot.height ?? ""} className={`${fieldBase} mt-1.5`} /></label></div>
    <label className={fieldLabel}>Notes<input name="notes" defaultValue={shot.notes ?? ""} className={`${fieldBase} mt-1.5`} /></label>
    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    <div className="flex gap-2"><button disabled={isSaving} className={buttonPrimary}>{isSaving ? "Saving…" : "Save"}</button><button type="button" disabled={isSaving} onClick={() => { setError(null); setIsEditing(false); }} className={buttonSecondary}>Cancel</button></div>
  </form>;
}
