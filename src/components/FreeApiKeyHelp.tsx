"use client";

import { useState } from "react";
import { card, linkSubtle } from "@/lib/styles";

const LAST_CHECKED = "2026-08-06";

const OPTIONS: {
  name: string;
  note: string;
  baseUrl: string;
  model: string;
  signupUrl: string;
  signupLabel: string;
  billingNote: string;
}[] = [
  {
    name: "Google AI Studio — Gemini free tier",
    note: "Free tier available with generous per-minute/per-day limits for smaller models.",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.0-flash",
    signupUrl: "https://aistudio.google.com/app/apikey",
    signupLabel: "Get a key at Google AI Studio",
    billingNote:
      "A Google AI Pro subscription is separate from this — it does not raise your free-tier API limits.",
  },
  {
    name: "OpenRouter — free models",
    note: "Several community-hosted models are free to use; look for a \":free\" suffix on the model id.",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemini-2.0-flash-exp:free",
    signupUrl: "https://openrouter.ai/settings/keys",
    signupLabel: "Get a key at OpenRouter",
    billingNote: "No subscription required for free-tier models; some models require prepaid credits.",
  },
  {
    name: "Groq — free tier",
    note: "Fast inference on open models with a free daily request allowance.",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.1-70b-versatile",
    signupUrl: "https://console.groq.com/keys",
    signupLabel: "Get a key at Groq Console",
    billingNote: "No subscription required for the free tier.",
  },
];

export function FreeApiKeyHelp({ defaultOpen }: { defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`${card} p-4`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Don&apos;t have an API key yet? Get a free one
        </span>
        <span className="text-xs text-zinc-400">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            A few currently-reliable free/low-cost options, as of{" "}
            <span className="font-mono">{LAST_CHECKED}</span> — pricing and limits change, so this list is not
            checked in real time. Follow the link to each provider&apos;s own official page rather than trusting
            a third party for current terms.
          </p>
          <div className="flex flex-col gap-3">
            {OPTIONS.map((option) => (
              <div key={option.name} className="rounded-lg border border-zinc-200 p-3 text-xs dark:border-zinc-800">
                <p className="font-medium text-zinc-800 dark:text-zinc-200">{option.name}</p>
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">{option.note}</p>
                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-zinc-400">Base URL</dt>
                    <dd className="break-all font-mono text-zinc-700 dark:text-zinc-300">{option.baseUrl}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-zinc-400">Example model</dt>
                    <dd className="break-all font-mono text-zinc-700 dark:text-zinc-300">{option.model}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-amber-700 dark:text-amber-400">{option.billingNote}</p>
                <a
                  href={option.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-2 inline-block ${linkSubtle} underline`}
                >
                  {option.signupLabel} →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
