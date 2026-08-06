"use client";

import { useRef, useTransition } from "react";
import { updateTakeStatus } from "@/app/actions";
import type { TakeStatus } from "@/generated/prisma/enums";
import { selectCompact } from "@/lib/styles";

const STATUS_OPTIONS: TakeStatus[] = ["GENERATING", "READY", "REJECTED"];

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
        key={`${takeId}-${status}`}
        name="status"
        defaultValue={status}
        disabled={isPending || status === "SELECTED"}
        onChange={() => {
          startTransition(() => {
            formRef.current?.requestSubmit();
          });
        }}
        className={selectCompact}
        aria-label={`Status for take ${takeId}`}
        title={
          status === "SELECTED"
            ? "Select another take before changing this selected take's status."
            : "Change take status"
        }
      >
        {status === "SELECTED" && (
          <option value="SELECTED" disabled>
            SELECTED
          </option>
        )}
        {STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </form>
  );
}
