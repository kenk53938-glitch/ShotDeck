import { getAiProviderSettingsRow, maskApiKey } from "@/lib/settings";
import { AiSettingsForm } from "@/components/AiSettingsForm";

export default async function SettingsPage() {
  const settings = await getAiProviderSettingsRow();
  const configured = !!(
    settings?.apiBaseUrl &&
    settings?.apiKey &&
    settings?.modelName
  );

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
            AI provider
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Optional. When configured, shot-list imports use this AI
            provider to parse the text instead of the built-in rule-based
            parser. Works with any OpenAI-compatible chat completions API
            — for example{" "}
            <a
              href="https://openrouter.ai"
              target="_blank"
              className="underline"
            >
              OpenRouter
            </a>{" "}
            (base URL <span className="font-mono">https://openrouter.ai/api/v1</span>,
            model e.g. <span className="font-mono">google/gemini-2.0-flash-exp</span>)
            or{" "}
            <a
              href="https://groq.com"
              target="_blank"
              className="underline"
            >
              Groq
            </a>{" "}
            (base URL{" "}
            <span className="font-mono">https://api.groq.com/openai/v1</span>,
            model e.g. <span className="font-mono">llama-3.1-70b-versatile</span>).
            Leave Model Name blank and a sensible default is picked based
            on the base URL you enter.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            ShotDeck is a local-only app with no user accounts, so the key
            is stored as plain text in your local SQLite database (
            <span className="font-mono">dev.db</span>) rather than
            encrypted — there's no separate secret store to encrypt it
            with. It's never sent anywhere except in requests to your
            chosen provider's API from your own machine.
          </p>
        </div>

        <AiSettingsForm
          configured={configured}
          apiBaseUrl={settings?.apiBaseUrl ?? null}
          modelName={settings?.modelName ?? null}
          maskedApiKey={settings?.apiKey ? maskApiKey(settings.apiKey) : null}
        />
      </section>
    </div>
  );
}
