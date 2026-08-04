"use client";

import { useRef, useState, useTransition } from "react";
import { saveAiProviderSettings, clearAiProviderSettings } from "@/app/actions";
import { detectDefaultModel } from "@/lib/aiProviders";
import { Toast } from "@/components/Toast";
import { buttonDanger, buttonPrimary, fieldBase, fieldLabel } from "@/lib/styles";

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
  const [isSaving, startSaveTransition] = useTransition();
  const [isClearing, startClearTransition] = useTransition();
  const isPending = isSaving || isClearing;
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
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
          <p className="text-zinc-500 dark:text-zinc-400">Not configured.</p>
        )}
      </div>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startSaveTransition(async () => {
            const result = await saveAiProviderSettings(formData);
            if (result.success) {
              setError(null);
              setToast("Settings saved.");
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
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="apiBaseUrl" className={fieldLabel}>
            API Base URL
          </label>
          <input
            id="apiBaseUrl"
            name="apiBaseUrl"
            placeholder="e.g. https://openrouter.ai/api/v1 or https://api.groq.com/openai/v1"
            defaultValue={apiBaseUrl ?? ""}
            onChange={(e) => setLiveBaseUrl(e.target.value)}
            className={`${fieldBase} font-mono`}
          />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="apiKey" className={fieldLabel}>
              {configured ? "Replace API key" : "API Key"}
            </label>
            <input
              id="apiKey"
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder={configured ? "Leave blank to keep current key" : ""}
              className={`${fieldBase} font-mono`}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="modelName" className={fieldLabel}>
              Model Name
            </label>
            <input
              id="modelName"
              name="modelName"
              placeholder="e.g. google/gemini-2.0-flash-exp"
              defaultValue={modelName ?? ""}
              className={`${fieldBase} font-mono`}
            />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Leave blank to use:{" "}
              <span className="font-mono">{suggestedModel}</span>
            </p>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="flex gap-2">
          <button type="submit" disabled={isPending} className={buttonPrimary}>
            {isSaving ? "Saving…" : "Save"}
          </button>
          {configured && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                startClearTransition(async () => {
                  await clearAiProviderSettings();
                  setToast("Settings cleared.");
                  setError(null);
                });
              }}
              className={buttonDanger}
            >
              {isClearing ? "Clearing…" : "Clear"}
            </button>
          )}
        </div>
      </form>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
