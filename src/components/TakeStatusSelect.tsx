"use client";

import { useRef, useTransition } from "react";
import { updateTakeStatus } from "@/app/actions";
import type { TakeStatus } from "@/generated/prisma/enums";

const STATUS_OPTIONS: TakeStatus[] = [
  "GENERATING",
  "READY",
  "REJECTED",
  "SELECTED",
];

export function TakeStatusSelect({
  takeId,
  shotId,
  projectId,
  status,
}: {
  takeId: string;
  shotId: string;
  projectId: string;
  status: TakeStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form ref={formRef} action={updateTakeStatus} className="inline-block">
      <input type="hidden" name="id" value={takeId} />
      <input type="hidden" name="shotId" value={shotId} />
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
            {option}
          </option>
        ))}
      </select>
    </form>
  );
}
