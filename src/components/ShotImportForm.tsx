"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { importShots, type ImportShotsResult } from "@/app/actions";

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
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Import shots
        </h2>
        <span className="rounded bg-black/[.04] px-2 py-0.5 text-xs text-zinc-500 dark:bg-white/[.06]">
          {aiEnabled ? "Using AI parsing" : "Using rule-based parser"}
        </span>
      </div>
      <p className="text-xs text-zinc-500">
        Paste a shot list or upload a text file. Each shot needs a{" "}
        <code className="rounded bg-black/[.04] px-1 dark:bg-white/[.06]">
          Shot XX:
        </code>{" "}
        line and a{" "}
        <code className="rounded bg-black/[.04] px-1 dark:bg-white/[.06]">
          Prompt:
        </code>{" "}
        line — see{" "}
        <code className="rounded bg-black/[.04] px-1 dark:bg-white/[.06]">
          docs/shot-format.md
        </code>{" "}
        in the repo for the full format.
        {!aiEnabled && (
          <>
            {" "}
            Configure an AI provider in{" "}
            <Link href="/settings" className="underline">
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
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 font-mono text-sm dark:border-white/[.145]"
        />
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {isPending ? "Importing…" : "Import"}
          </button>
        </div>
      </form>
      {result && (
        <div className="flex flex-col gap-2 rounded-lg border border-black/[.08] p-3 text-sm dark:border-white/[.145]">
          <p>
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
