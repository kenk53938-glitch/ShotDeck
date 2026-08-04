"use client";

import { useState, useTransition } from "react";
import { updateShot } from "@/app/actions";
import {
  buttonPrimary,
  buttonSecondary,
  cardPadded,
  chip,
  fieldBase,
  fieldLabel,
  linkSubtle,
} from "@/lib/styles";

export function ShotEditForm({
  shot,
  projectId,
}: {
  shot: {
    id: string;
    title: string | null;
    description: string | null;
    prompt: string | null;
    negativePrompt: string | null;
    aiTool: string | null;
    durationSeconds: number | null;
    notes: string | null;
  };
  projectId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {shot.title ?? "Untitled shot"}
          </h1>
          <button
            onClick={() => {
              setError(null);
              setIsEditing(true);
            }}
            className={linkSubtle}
          >
            Edit
          </button>
        </div>
        {shot.description && (
          <p className="text-zinc-600 dark:text-zinc-400">
            {shot.description}
          </p>
        )}
        {shot.prompt && (
          <p className="text-zinc-600 dark:text-zinc-400">{shot.prompt}</p>
        )}
        {shot.negativePrompt && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Negative: {shot.negativePrompt}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          {shot.aiTool && <span className={chip}>{shot.aiTool}</span>}
          {shot.durationSeconds !== null && (
            <span>{shot.durationSeconds}s</span>
          )}
        </div>
        {shot.notes && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Notes: {shot.notes}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await updateShot(formData);
          if (result.success) {
            setError(null);
            setIsEditing(false);
          } else {
            setError(result.error ?? "Something went wrong.");
          }
        });
      }}
      className={`${cardPadded} flex flex-col gap-4`}
    >
      <input type="hidden" name="id" value={shot.id} />
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className={fieldLabel}>
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={shot.title ?? ""}
          className={fieldBase}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className={fieldLabel}>
          Description
        </label>
        <input
          id="description"
          name="description"
          defaultValue={shot.description ?? ""}
          className={fieldBase}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="prompt" className={fieldLabel}>
          Prompt
        </label>
        <textarea
          id="prompt"
          name="prompt"
          rows={3}
          defaultValue={shot.prompt ?? ""}
          className={fieldBase}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="negativePrompt" className={fieldLabel}>
          Negative prompt
        </label>
        <textarea
          id="negativePrompt"
          name="negativePrompt"
          rows={2}
          defaultValue={shot.negativePrompt ?? ""}
          className={fieldBase}
        />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="aiTool" className={fieldLabel}>
            AI tool
          </label>
          <input
            id="aiTool"
            name="aiTool"
            defaultValue={shot.aiTool ?? ""}
            className={fieldBase}
          />
        </div>
        <div className="flex w-40 flex-col gap-1.5">
          <label htmlFor="durationSeconds" className={fieldLabel}>
            Duration (s)
          </label>
          <input
            id="durationSeconds"
            name="durationSeconds"
            type="number"
            step="0.1"
            defaultValue={shot.durationSeconds ?? ""}
            className={fieldBase}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className={fieldLabel}>
          Notes
        </label>
        <input
          id="notes"
          name="notes"
          defaultValue={shot.notes ?? ""}
          className={fieldBase}
        />
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className={buttonPrimary}>
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsEditing(false);
          }}
          disabled={isPending}
          className={buttonSecondary}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
