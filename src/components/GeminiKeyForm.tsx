"use client";

import { useRef, useState, useTransition } from "react";
import { saveGeminiApiKey, clearGeminiApiKey } from "@/app/actions";

export function GeminiKeyForm({
  hasKey,
  maskedKey,
  source,
}: {
  hasKey: boolean;
  maskedKey: string | null;
  source: "settings" | "env" | "none";
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [justCleared, setJustCleared] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm">
        {source === "settings" && (
          <p className="text-zinc-600 dark:text-zinc-400">
            Current key: <span className="font-mono">{maskedKey}</span>
          </p>
        )}
        {source === "env" && (
          <p className="text-zinc-600 dark:text-zinc-400">
            Using <span className="font-mono">GEMINI_API_KEY</span> from
            your <span className="font-mono">.env</span> file (
            <span className="font-mono">{maskedKey}</span>). Saving a key
            here will take precedence over it.
          </p>
        )}
        {source === "none" && (
          <p className="text-zinc-500">No key configured.</p>
        )}
      </div>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await saveGeminiApiKey(formData);
            if (result.success) {
              setError(null);
              setJustSaved(true);
              setJustCleared(false);
              formRef.current?.reset();
            } else {
              setError(result.error ?? "Something went wrong.");
            }
          });
        }}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="apiKey" className="text-xs text-zinc-500">
            {hasKey ? "Replace key" : "Gemini API key"}
          </label>
          <input
            id="apiKey"
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder="AIza..."
            className="rounded border border-black/[.08] bg-transparent px-3 py-2 font-mono text-sm dark:border-white/[.145]"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="h-fit rounded bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          Save
        </button>
        {source === "settings" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await clearGeminiApiKey();
                setJustCleared(true);
                setJustSaved(false);
                setError(null);
              });
            }}
            className="h-fit rounded border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Clear
          </button>
        )}
      </form>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {justSaved && !error && (
        <p className="text-xs text-green-700 dark:text-green-400">
          Key saved.
        </p>
      )}
      {justCleared && (
        <p className="text-xs text-zinc-500">Key cleared.</p>
      )}
    </div>
  );
}
