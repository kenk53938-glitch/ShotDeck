"use client";

export function ConfirmDeleteButton({
  label = "Delete",
  confirmMessage = "Are you sure?",
  className,
}: {
  label?: string;
  confirmMessage?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}
