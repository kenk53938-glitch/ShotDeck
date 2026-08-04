"use client";

import { useState, useTransition } from "react";
import { updateProject } from "@/app/actions";
import type { ProjectStatus } from "@/generated/prisma/enums";

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
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {project.title}
          </h1>
          <button
            onClick={() => {
              setError(null);
              setIsEditing(true);
            }}
            className="text-xs text-zinc-500 hover:underline"
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
            className="w-fit text-sm text-blue-600 underline dark:text-blue-400"
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
      className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
    >
      <input type="hidden" name="id" value={project.id} />
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-xs text-zinc-500">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={project.title}
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
          defaultValue={project.description ?? ""}
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="status" className="text-xs text-zinc-500">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={project.status}
            className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-[2] flex-col gap-1">
          <label htmlFor="youtubeUrl" className="text-xs text-zinc-500">
            YouTube URL
          </label>
          <input
            id="youtubeUrl"
            name="youtubeUrl"
            placeholder="Optional"
            defaultValue={project.youtubeUrl ?? ""}
            className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
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
          onClick={() => {
            setError(null);
            setIsEditing(false);
          }}
          disabled={isPending}
          className="rounded border border-black/[.08] px-4 py-2 text-sm dark:border-white/[.145]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
