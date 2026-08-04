"use client";

import { useState, useTransition } from "react";
import { updateShot } from "@/app/actions";

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
  const [isPending, startTransition] = useTransition();

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {shot.title ?? "Untitled shot"}
          </h1>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-zinc-500 hover:underline"
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
          <p className="text-sm text-zinc-500">
            Negative: {shot.negativePrompt}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          {shot.aiTool && (
            <span className="rounded bg-black/[.04] px-1.5 py-0.5 dark:bg-white/[.06]">
              {shot.aiTool}
            </span>
          )}
          {shot.durationSeconds !== null && (
            <span>{shot.durationSeconds}s</span>
          )}
        </div>
        {shot.notes && (
          <p className="mt-1 text-sm text-zinc-500">Notes: {shot.notes}</p>
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
          await updateShot(formData);
          setIsEditing(false);
        });
      }}
      className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
    >
      <input type="hidden" name="id" value={shot.id} />
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-xs text-zinc-500">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={shot.title ?? ""}
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-xs text-zinc-500">
          Description
        </label>
        <input
          id="description"
          name="description"
          defaultValue={shot.description ?? ""}
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="prompt" className="text-xs text-zinc-500">
          Prompt
        </label>
        <textarea
          id="prompt"
          name="prompt"
          rows={3}
          defaultValue={shot.prompt ?? ""}
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="negativePrompt" className="text-xs text-zinc-500">
          Negative prompt
        </label>
        <textarea
          id="negativePrompt"
          name="negativePrompt"
          rows={2}
          defaultValue={shot.negativePrompt ?? ""}
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="aiTool" className="text-xs text-zinc-500">
            AI tool
          </label>
          <input
            id="aiTool"
            name="aiTool"
            defaultValue={shot.aiTool ?? ""}
            className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>
        <div className="flex w-40 flex-col gap-1">
          <label htmlFor="durationSeconds" className="text-xs text-zinc-500">
            Duration (s)
          </label>
          <input
            id="durationSeconds"
            name="durationSeconds"
            type="number"
            step="0.1"
            defaultValue={shot.durationSeconds ?? ""}
            className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-xs text-zinc-500">
          Notes
        </label>
        <input
          id="notes"
          name="notes"
          defaultValue={shot.notes ?? ""}
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          disabled={isPending}
          className="rounded border border-black/[.08] px-4 py-2 text-sm dark:border-white/[.145]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
