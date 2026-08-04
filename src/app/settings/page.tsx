import Link from "next/link";
import { getAiProviderSettingsRow, maskApiKey } from "@/lib/settings";
import { AiSettingsForm } from "@/components/AiSettingsForm";
import { cardPadded, linkMuted, pageShellNarrow, sectionLabel } from "@/lib/styles";

export default async function SettingsPage() {
  const settings = await getAiProviderSettingsRow();
  const configured = !!(
    settings?.apiBaseUrl &&
    settings?.apiKey &&
    settings?.modelName
  );

  return (
    <div className={`${pageShellNarrow} flex flex-col gap-8`}>
      <header className="flex flex-col gap-3">
        <Link href="/" className={`w-fit ${linkMuted}`}>
          ← Back to projects
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
      </header>

      <section className={`${cardPadded} flex flex-col gap-4`}>
        <div>
          <h2 className={sectionLabel}>AI provider</h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Optional. When configured, shot-list imports use this AI
            provider to parse the text instead of the built-in rule-based
            parser. Works with any OpenAI-compatible chat completions API
            — for example{" "}
            <a
              href="https://openrouter.ai"
              target="_blank"
              className="underline transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              OpenRouter
            </a>{" "}
            (base URL{" "}
            <span className="font-mono">https://openrouter.ai/api/v1</span>,
            model e.g.{" "}
            <span className="font-mono">google/gemini-2.0-flash-exp</span>)
            or{" "}
            <a
              href="https://groq.com"
              target="_blank"
              className="underline transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              Groq
            </a>{" "}
            (base URL{" "}
            <span className="font-mono">https://api.groq.com/openai/v1</span>,
            model e.g. <span className="font-mono">llama-3.1-70b-versatile</span>
            ). Leave Model Name blank and a sensible default is picked
            based on the base URL you enter.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
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
