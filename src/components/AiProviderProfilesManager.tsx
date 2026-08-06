"use client";

import { useState } from "react";
import {
  createAiProviderProfile,
  deleteAiProviderProfile,
  setActiveAiProviderProfile,
  updateAiProviderProfile,
} from "@/app/actions";
import { detectDefaultModel } from "@/lib/aiProviders";
import { Toast } from "@/components/Toast";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import {
  badge,
  buttonDangerOutlineSm,
  buttonPrimary,
  buttonSecondary,
  buttonSecondarySm,
  card,
  fieldBase,
  fieldLabel,
} from "@/lib/styles";

type Profile = {
  id: string;
  name: string;
  apiBaseUrl: string;
  modelName: string;
  isActive: boolean;
  maskedApiKey: string;
};

function ProviderFields({
  defaultName,
  defaultBaseUrl,
  defaultModelName,
  apiKeyPlaceholder,
}: {
  defaultName?: string;
  defaultBaseUrl?: string;
  defaultModelName?: string;
  apiKeyPlaceholder: string;
}) {
  const [liveBaseUrl, setLiveBaseUrl] = useState(defaultBaseUrl ?? "");
  const suggestedModel = detectDefaultModel(liveBaseUrl);

  return (
    <div className="flex flex-col gap-3">
      <label className={fieldLabel}>
        Name
        <input
          name="name"
          placeholder="e.g. Gemini (personal account)"
          defaultValue={defaultName}
          className={`${fieldBase} mt-1.5`}
        />
      </label>
      <label className={fieldLabel}>
        API Base URL
        <input
          name="apiBaseUrl"
          placeholder="e.g. https://openrouter.ai/api/v1"
          defaultValue={defaultBaseUrl}
          onChange={(event) => setLiveBaseUrl(event.target.value)}
          className={`${fieldBase} mt-1.5 font-mono`}
        />
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className={`flex-1 ${fieldLabel}`}>
          API Key
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={apiKeyPlaceholder}
            className={`${fieldBase} mt-1.5 font-mono`}
          />
        </label>
        <label className={`flex-1 ${fieldLabel}`}>
          Model Name
          <input
            name="modelName"
            placeholder="e.g. google/gemini-2.0-flash-exp"
            defaultValue={defaultModelName}
            className={`${fieldBase} mt-1.5 font-mono`}
          />
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Leave blank to use: <span className="font-mono">{suggestedModel}</span>
          </p>
        </label>
      </div>
    </div>
  );
}

function ProfileRow({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false);
  const [settingActive, setSettingActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div className={`${card} p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{profile.name}</span>
          {profile.isActive && (
            <span className={`${badge} bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300`}>
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!profile.isActive && (
            <button
              type="button"
              disabled={settingActive}
              className={buttonSecondarySm}
              onClick={async () => {
                setSettingActive(true);
                setError(null);
                try {
                  const formData = new FormData();
                  formData.set("id", profile.id);
                  const result = await setActiveAiProviderProfile(formData);
                  if (!result.success) setError(result.error ?? "Could not set active.");
                  else setToast(`${profile.name} is now active.`);
                } finally {
                  setSettingActive(false);
                }
              }}
            >
              {settingActive ? "Switching…" : "Set active"}
            </button>
          )}
          <button type="button" className={buttonSecondarySm} onClick={() => setEditing((current) => !current)}>
            {editing ? "Cancel" : "Edit"}
          </button>
          <form
            action={async (formData) => {
              setError(null);
              const result = await deleteAiProviderProfile(formData);
              if (!result.success) setError(result.error ?? "Could not delete.");
            }}
          >
            <input type="hidden" name="id" value={profile.id} />
            <ConfirmDeleteButton
              label="Delete"
              confirmMessage={`Delete provider "${profile.name}"?`}
              className={buttonDangerOutlineSm}
            />
          </form>
        </div>
      </div>

      {!editing ? (
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-3">
          <div>
            <dt className="uppercase tracking-wide">Base URL</dt>
            <dd className="mt-0.5 truncate font-mono text-zinc-700 dark:text-zinc-300">{profile.apiBaseUrl}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide">Model</dt>
            <dd className="mt-0.5 truncate font-mono text-zinc-700 dark:text-zinc-300">{profile.modelName}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide">API Key</dt>
            <dd className="mt-0.5 font-mono text-zinc-700 dark:text-zinc-300">{profile.maskedApiKey}</dd>
          </div>
        </dl>
      ) : (
        <form
          className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800"
          action={async (formData) => {
            setSaving(true);
            setError(null);
            try {
              const result = await updateAiProviderProfile(formData);
              if (!result.success) {
                setError(result.error ?? "Could not save.");
              } else {
                setToast("Saved.");
                setEditing(false);
              }
            } finally {
              setSaving(false);
            }
          }}
        >
          <input type="hidden" name="id" value={profile.id} />
          <ProviderFields
            defaultName={profile.name}
            defaultBaseUrl={profile.apiBaseUrl}
            defaultModelName={profile.modelName}
            apiKeyPlaceholder="Leave blank to keep current key"
          />
          <button type="submit" disabled={saving} className={`w-fit ${buttonPrimary}`}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export function AiProviderProfilesManager({ profiles }: { profiles: Profile[] }) {
  const [adding, setAdding] = useState(profiles.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {profiles.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No AI provider configured yet. Shot-list imports and AI prompt generation are disabled until you add one.
        </p>
      )}

      {profiles.map((profile) => (
        <ProfileRow key={profile.id} profile={profile} />
      ))}

      {!adding ? (
        <button type="button" className={`w-fit ${buttonSecondary}`} onClick={() => setAdding(true)}>
          + Add another provider
        </button>
      ) : (
        <div className={`${card} p-4`}>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {profiles.length === 0 ? "Add a provider" : "Add another provider"}
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Useful if you have Gemini access across multiple Google accounts, or want a fallback ready when one key hits a quota wall.
          </p>
          <form
            className="mt-4 flex flex-col gap-3"
            action={async (formData) => {
              setSaving(true);
              setError(null);
              try {
                const result = await createAiProviderProfile(formData);
                if (!result.success) {
                  setError(result.error ?? "Could not save.");
                } else {
                  setToast("Provider added.");
                  if (profiles.length > 0) setAdding(false);
                }
              } finally {
                setSaving(false);
              }
            }}
          >
            <ProviderFields apiKeyPlaceholder="Paste your API key" />
            <button type="submit" disabled={saving} className={`w-fit ${buttonPrimary}`}>
              {saving ? "Saving…" : "Add provider"}
            </button>
          </form>
          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
