"use client";

import { useRef, useTransition } from "react";
import { updateShotStatus } from "@/app/actions";
import type { ShotStatus } from "@/generated/prisma/enums";

const STATUS_OPTIONS: ShotStatus[] = [
  "PLANNED",
  "PROMPTING",
  "GENERATING",
  "REVIEW",
  "NEEDS_REWORK",
  "APPROVED",
];

export function ShotStatusSelect({
  shotId,
  projectId,
  status,
}: {
  shotId: string;
  projectId: string;
  status: ShotStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={updateShotStatus}
      className="inline-block"
    >
      <input type="hidden" name="id" value={shotId} />
      <input type="hidden" name="projectId" value={projectId} />
      <select
        name="status"
        defaultValue={status}
        disabled={isPending}
        onChange={() =>
          startTransition(() => {
            formRef.current?.requestSubmit();
          })
        }
        className="rounded border border-black/[.08] bg-transparent px-2 py-1 text-xs disabled:opacity-50 dark:border-white/[.145]"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option.replace("_", " ")}
          </option>
        ))}
      </select>
    </form>
  );
}
