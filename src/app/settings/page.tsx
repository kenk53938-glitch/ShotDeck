import { getGeminiKeySource, maskApiKey } from "@/lib/settings";
import { GeminiKeyForm } from "@/components/GeminiKeyForm";

export default async function SettingsPage() {
  const { key, source } = await getGeminiKeySource();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-8 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Settings
        </h1>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Gemini API key
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Optional. When set, shot-list imports use Gemini to parse the
            text instead of the built-in rule-based parser. Get a free key
            at{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              className="underline"
            >
              Google AI Studio
            </a>
            .
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            ShotDeck is a local-only app with no user accounts, so the key
            is stored as plain text in your local SQLite database (
            <span className="font-mono">dev.db</span>) rather than
            encrypted — there's no separate secret store to encrypt it
            with. It's never sent anywhere except in requests to Google's
            Gemini API from your own machine.
          </p>
        </div>

        <GeminiKeyForm
          hasKey={source === "settings"}
          maskedKey={key ? maskApiKey(key) : null}
          source={source}
        />
      </section>
    </div>
  );
}
