import Link from "next/link";
import { listAiProviderProfiles, maskApiKey } from "@/lib/settings";
import { AiProviderProfilesManager } from "@/components/AiProviderProfilesManager";
import { FreeApiKeyHelp } from "@/components/FreeApiKeyHelp";
import { cardPadded, linkMuted, pageShellNarrow, sectionLabel } from "@/lib/styles";

export default async function SettingsPage() {
  const profiles = await listAiProviderProfiles();
  const serialized = profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    apiBaseUrl: profile.apiBaseUrl,
    modelName: profile.modelName,
    isActive: profile.isActive,
    maskedApiKey: maskApiKey(profile.apiKey),
  }));

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
          <h2 className={sectionLabel}>AI providers</h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Optional. When at least one provider is active, shot-list imports and AI prompt generation use it
            instead of the built-in rule-based parser. Works with any OpenAI-compatible chat completions API —
            for example{" "}
            <a
              href="https://openrouter.ai"
              target="_blank"
              className="underline transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              OpenRouter
            </a>{" "}
            (base URL <span className="font-mono">https://openrouter.ai/api/v1</span>, model e.g.{" "}
            <span className="font-mono">google/gemini-2.0-flash-exp</span>) or{" "}
            <a
              href="https://groq.com"
              target="_blank"
              className="underline transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              Groq
            </a>{" "}
            (base URL <span className="font-mono">https://api.groq.com/openai/v1</span>, model e.g.{" "}
            <span className="font-mono">llama-3.1-70b-versatile</span>). Leave Model Name blank and a sensible
            default is picked based on the base URL you enter.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            You can save multiple named providers — handy if you have API access across several accounts — and
            switch which one is &quot;active&quot; at any time. If a key hits a rate limit or quota wall, switch to
            another saved provider instead of waiting.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            ShotDeck is a local-only app with no user accounts, so keys are stored as plain text in your local
            SQLite database (<span className="font-mono">dev.db</span>) rather than encrypted — there&apos;s no
            separate secret store to encrypt them with. They&apos;re never sent anywhere except in requests to
            your chosen provider&apos;s API from your own machine.
          </p>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            A Google AI Pro or ChatGPT Plus consumer subscription is a <strong>separate system</strong> from that
            provider&apos;s developer API billing. Having a paid consumer subscription does not raise your API
            quota — API keys default to a free tier unless you explicitly enable billing in{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              className="underline hover:text-amber-900 dark:hover:text-amber-200"
            >
              Google AI Studio
            </a>{" "}
            or the Google Cloud Console.
          </p>
        </div>

        <FreeApiKeyHelp defaultOpen={serialized.length === 0} />

        <AiProviderProfilesManager profiles={serialized} />
      </section>
    </div>
  );
}
