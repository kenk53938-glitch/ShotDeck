import type { ReactNode } from "react";
import { cardPadded } from "@/lib/styles";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`${cardPadded} flex flex-col items-center gap-3 py-10 text-center`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="h-10 w-10 text-zinc-300 dark:text-zinc-700"
        aria-hidden="true"
      >
        <rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M6 32l10-10 8 8 6-6 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="18" r="2.5" fill="currentColor" />
      </svg>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
        {description && <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
