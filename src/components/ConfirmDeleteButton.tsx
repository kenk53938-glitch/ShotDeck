"use client";

import { useFormStatus } from "react-dom";

export function ConfirmDeleteButton({
  label = "Delete",
  pendingLabel = "…",
  confirmMessage = "Are you sure?",
  className,
}: {
  label?: string;
  pendingLabel?: string;
  confirmMessage?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className ?? ""} disabled:opacity-50`}
      onClick={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
