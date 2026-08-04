"use client";

import { useState, useTransition } from "react";
import { updateProject } from "@/app/actions";
import type { ProjectStatus } from "@/generated/prisma/enums";
import {
  buttonPrimary,
  buttonSecondary,
  cardPadded,
  fieldBase,
  fieldLabel,
  linkSubtle,
} from "@/lib/styles";

const STATUS_OPTIONS: ProjectStatus[] = [
  "PLANNING",
  "IN_PROGRESS",
  "REVIEW",
  "PUBLISHED",
  "ARCHIVED",
];

export function ProjectEditForm({
  project,
}: {
  project: {
    id: string;
    title: string;
    description: string | null;
    status: ProjectStatus;
    youtubeUrl: string | null;
  };
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {project.title}
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
        {project.description && (
          <p className="text-zinc-600 dark:text-zinc-400">
            {project.description}
          </p>
        )}
        {project.youtubeUrl && (
          <a
            href={project.youtubeUrl}
            target="_blank"
            className="w-fit text-sm text-blue-600 underline transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {project.youtubeUrl}
          </a>
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
          const result = await updateProject(formData);
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
      <input type="hidden" name="id" value={project.id} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className={fieldLabel}>
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={project.title}
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
          defaultValue={project.description ?? ""}
          className={fieldBase}
        />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="status" className={fieldLabel}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={project.status}
            className={fieldBase}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-[2] flex-col gap-1.5">
          <label htmlFor="youtubeUrl" className={fieldLabel}>
            YouTube URL
          </label>
          <input
            id="youtubeUrl"
            name="youtubeUrl"
            placeholder="Optional"
            defaultValue={project.youtubeUrl ?? ""}
            className={fieldBase}
          />
        </div>
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
