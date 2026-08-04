"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateTakeStatus } from "@/app/actions";
import type { TakeStatus } from "@/generated/prisma/enums";
import { selectCompact } from "@/lib/styles";

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
  const [value, setValue] = useState(status);

  useEffect(() => {
    setValue(status);
  }, [status]);

  return (
    <form ref={formRef} action={updateTakeStatus} className="inline-block">
      <input type="hidden" name="id" value={takeId} />
      <input type="hidden" name="shotId" value={shotId} />
      <input type="hidden" name="projectId" value={projectId} />
      <select
        name="status"
        value={value}
        disabled={isPending}
        onChange={(e) => {
          setValue(e.target.value as TakeStatus);
          startTransition(() => {
            formRef.current?.requestSubmit();
          });
        }}
        className={selectCompact}
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
