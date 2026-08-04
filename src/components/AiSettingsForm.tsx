"use client";

import { useRef, useState, useTransition } from "react";
import { saveAiProviderSettings, clearAiProviderSettings } from "@/app/actions";
import { detectDefaultModel } from "@/lib/aiProviders";

export function AiSettingsForm({
  configured,
  apiBaseUrl,
  modelName,
  maskedApiKey,
}: {
  configured: boolean;
  apiBaseUrl: string | null;
  modelName: string | null;
  maskedApiKey: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [justCleared, setJustCleared] = useState(false);
  const [liveBaseUrl, setLiveBaseUrl] = useState(apiBaseUrl ?? "");
  const suggestedModel = detectDefaultModel(liveBaseUrl);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm">
        {configured ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            Current API key:{" "}
            <span className="font-mono">{maskedApiKey}</span>
          </p>
        ) : (
          <p className="text-zinc-500">Not configured.</p>
        )}
      </div>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await saveAiProviderSettings(formData);
            if (result.success) {
              setError(null);
              setJustSaved(true);
              setJustCleared(false);
              const apiKeyInput =
                formRef.current?.querySelector<HTMLInputElement>(
                  'input[name="apiKey"]',
                );
              if (apiKeyInput) apiKeyInput.value = "";
            } else {
              setError(result.error ?? "Something went wrong.");
            }
          });
        }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="apiBaseUrl" className="text-xs text-zinc-500">
            API Base URL
          </label>
          <input
            id="apiBaseUrl"
            name="apiBaseUrl"
            placeholder="e.g. https://openrouter.ai/api/v1 or https://api.groq.com/openai/v1"
            defaultValue={apiBaseUrl ?? ""}
            onChange={(e) => setLiveBaseUrl(e.target.value)}
            className="rounded border border-black/[.08] bg-transparent px-3 py-2 font-mono text-sm dark:border-white/[.145]"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="apiKey" className="text-xs text-zinc-500">
              {configured ? "Replace API key" : "API Key"}
            </label>
            <input
              id="apiKey"
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder={configured ? "Leave blank to keep current key" : ""}
              className="rounded border border-black/[.08] bg-transparent px-3 py-2 font-mono text-sm dark:border-white/[.145]"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="modelName" className="text-xs text-zinc-500">
              Model Name
            </label>
            <input
              id="modelName"
              name="modelName"
              placeholder="e.g. google/gemini-2.0-flash-exp"
              defaultValue={modelName ?? ""}
              className="rounded border border-black/[.08] bg-transparent px-3 py-2 font-mono text-sm dark:border-white/[.145]"
            />
            <p className="text-xs text-zinc-400">
              Leave blank to use: <span className="font-mono">{suggestedModel}</span>
            </p>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
        {justSaved && !error && (
          <p className="text-xs text-green-700 dark:text-green-400">
            Settings saved.
          </p>
        )}
        {justCleared && <p className="text-xs text-zinc-500">Cleared.</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            Save
          </button>
          {configured && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await clearAiProviderSettings();
                  setJustCleared(true);
                  setJustSaved(false);
                  setError(null);
                });
              }}
              className="rounded border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
