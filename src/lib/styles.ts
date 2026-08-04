// Shared Tailwind class strings so buttons, inputs, and cards look the
// same everywhere instead of each page inventing its own variant.

export const card =
  "rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export const cardPadded = `${card} p-5 sm:p-6`;

export const pageShell = "mx-auto w-full max-w-4xl px-6 py-10 sm:px-8";
export const pageShellNarrow = "mx-auto w-full max-w-2xl px-6 py-10 sm:px-8";
export const pageShellWide = "flex w-full flex-col px-6 py-10 sm:px-8";

export const sectionLabel =
  "text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

export const fieldLabel =
  "text-xs font-medium text-zinc-600 dark:text-zinc-400";

export const fieldBase =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20";

export const selectCompact =
  "rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20";

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50";

export const buttonPrimary = `${buttonBase} bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400`;

export const buttonSecondary = `${buttonBase} border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`;

export const buttonDanger = `${buttonBase} border border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950`;

const buttonSmBase =
  "inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50";

export const buttonSecondarySm = `${buttonSmBase} border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`;

export const buttonDangerOutlineSm = `${buttonSmBase} border border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950`;

export const linkMuted =
  "text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100";

export const linkSubtle =
  "text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100";

export const iconButtonDanger =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950 dark:hover:text-red-400";

export const badge =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";

export const chip =
  "inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
