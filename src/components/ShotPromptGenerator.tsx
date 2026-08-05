"use client";

import { useState } from "react";
import { buttonPrimary, buttonSecondary, cardPadded, fieldBase, fieldLabel, sectionLabel } from "@/lib/styles";

export function ShotPromptGenerator({
  shotId,
  initialPositivePrompt,
  initialNegativePrompt,
}: {
  shotId: string;
  initialPositivePrompt: string | null;
  initialNegativePrompt: string | null;
}) {
  const [positivePrompt, setPositivePrompt] = useState(initialPositivePrompt ?? "");
  const [negativePrompt, setNegativePrompt] = useState(initialNegativePrompt ?? "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visionWarning, setVisionWarning] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setMessage(null);
    setError(null);
    setVisionWarning(null);
    try {
      const response = await fetch(`/api/shots/${shotId}/generate-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persist: false }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Prompt generation failed.");
      setPositivePrompt(data.prompts.positivePrompt);
      setNegativePrompt(data.prompts.negativePrompt);
      setVisionWarning(data.visionWarning ?? null);
      setMessage("Draft generated. Review and edit it, then save when ready.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Prompt generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/shots/${shotId}/prompts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positivePrompt, negativePrompt }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Could not save prompts.");
      setMessage("Prompts saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save prompts.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={cardPadded}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={sectionLabel}>Image prompt workspace</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Generates a still-image draft only. Nothing is saved until you press Save prompts.
          </p>
        </div>
        <button type="button" onClick={generate} disabled={generating || saving} className={buttonPrimary}>
          {generating ? "Generating…" : "Generate prompt"}
        </button>
      </div>
      <div className="flex flex-col gap-4">
        <label className={fieldLabel}>
          Positive prompt
          <textarea rows={8} value={positivePrompt} onChange={(event) => setPositivePrompt(event.target.value)} className={`${fieldBase} mt-1.5`} />
        </label>
        <label className={fieldLabel}>
          Negative prompt
          <textarea rows={5} value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} className={`${fieldBase} mt-1.5`} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={saving || generating || !positivePrompt.trim() || !negativePrompt.trim()} className={buttonSecondary}>
            {saving ? "Saving…" : "Save prompts"}
          </button>
          {message && <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
        {visionWarning && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">{visionWarning}</p>}
      </div>
    </section>
  );
}
