"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { importShots, type ImportShotsResult } from "@/app/actions";
import { buttonPrimary, chip, fieldBase, sectionLabel } from "@/lib/styles";

export function ShotImportForm({
  projectId,
  aiEnabled,
}: {
  projectId: string;
  aiEnabled: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportShotsResult | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={sectionLabel}>Import shots</h2>
        <span className={chip}>
          {aiEnabled ? "Using AI parsing" : "Using rule-based parser"}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Paste a shot list or upload a text file. Each shot needs a{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          Shot XX:
        </code>{" "}
        line and a{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          Prompt:
        </code>{" "}
        line — see{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          docs/shot-format.md
        </code>{" "}
        in the repo for the full format.
        {!aiEnabled && (
          <>
            {" "}
            Configure an AI provider in{" "}
            <Link
              href="/settings"
              className="underline transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              Settings
            </Link>{" "}
            for AI-assisted parsing.
          </>
        )}
      </p>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await importShots(formData);
            setResult(res);
            if (res.imported > 0) {
              formRef.current?.reset();
            }
          });
        }}
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <textarea
          name="text"
          rows={6}
          placeholder={
            "Shot 01: Wide shot - skyline\nPrompt: Drone pullback over a neon skyline, cinematic, dusk lighting"
          }
          className={`${fieldBase} font-mono`}
        />
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="text-sm text-zinc-600 dark:text-zinc-400"
          />
          <button
            type="submit"
            disabled={isPending}
            className={buttonPrimary}
          >
            {isPending ? "Importing…" : "Import"}
          </button>
        </div>
      </form>
      {result && (
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-zinc-700 dark:text-zinc-300">
            {result.imported > 0
              ? `Imported ${result.imported} ${
                  result.imported === 1 ? "shot" : "shots"
                }.`
              : "No shots imported."}
            {result.fellBack && " (AI parsing failed, used rule-based parser.)"}
          </p>
          {result.errors.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-amber-700 dark:text-amber-400">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
