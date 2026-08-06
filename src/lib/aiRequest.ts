/**
 * Shared HTTP layer for OpenAI-compatible chat completions calls
 * (prompt generation, shot-list AI parsing). Centralizes retry/backoff
 * and turns raw HTTP failures into messages that distinguish
 * per-minute rate limiting from exhausted quota/billing, since those
 * need very different user action.
 */

export type AiProviderErrorKind = "rate_limit" | "quota" | "auth" | "server" | "network" | "other";

export class AiProviderError extends Error {
  kind: AiProviderErrorKind;
  status?: number;

  constructor(message: string, kind: AiProviderErrorKind, status?: number) {
    super(message);
    this.name = "AiProviderError";
    this.kind = kind;
    this.status = status;
  }
}

const DASHBOARD_LINKS: { match: string; label: string; url: string }[] = [
  {
    match: "generativelanguage.googleapis.com",
    label: "Google AI Studio",
    url: "https://aistudio.google.com/app/apikey",
  },
  { match: "openrouter.ai", label: "OpenRouter", url: "https://openrouter.ai/settings/keys" },
  { match: "api.groq.com", label: "Groq Console", url: "https://console.groq.com/keys" },
];

function dashboardHint(apiBaseUrl: string) {
  const url = apiBaseUrl.toLowerCase();
  const match = DASHBOARD_LINKS.find((provider) => url.includes(provider.match));
  return match ? `${match.label} (${match.url})` : "your provider's dashboard";
}

async function classifyHttpError(response: Response, apiBaseUrl: string) {
  const status = response.status;
  const body = await response.text().catch(() => "");
  const hint = dashboardHint(apiBaseUrl);

  if (status === 429) {
    const isQuota = /quota|insufficient_quota|billing|exceeded.*(plan|quota)/i.test(body);
    if (isQuota) {
      return new AiProviderError(
        `Quota exhausted (HTTP 429) — this API key has used up its plan/quota. Note: a Google AI Pro or ChatGPT Plus consumer subscription is separate from that provider's developer API billing. Check usage or enable billing at ${hint}, or switch to a different saved key in Settings.`,
        "quota",
        429,
      );
    }
    return new AiProviderError(
      `Rate limited (HTTP 429) — too many requests in a short window. This is usually temporary; ShotDeck already retried automatically. Wait a bit and try again, or switch to a different saved key in Settings. Check limits at ${hint}.`,
      "rate_limit",
      429,
    );
  }
  if (status === 401 || status === 403) {
    return new AiProviderError(
      `The provider rejected this API key (HTTP ${status}). Confirm the key is correct and active at ${hint}.`,
      "auth",
      status,
    );
  }
  if (status >= 500) {
    return new AiProviderError(
      `The AI provider had a server-side error (HTTP ${status}). ShotDeck already retried automatically; this usually clears up on its own.`,
      "server",
      status,
    );
  }
  return new AiProviderError(
    `AI provider returned HTTP ${status}.${body ? ` ${body.slice(0, 200)}` : ""}`,
    "other",
    status,
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POSTs to an OpenAI-compatible endpoint with retry-with-backoff on
 * 429/5xx (3 attempts total, starting at ~2s, doubling each time).
 * Non-retryable failures (4xx other than 429, network errors after
 * exhausting retries) throw immediately with a classified message.
 */
export async function fetchAiProvider(
  url: string,
  buildInit: () => RequestInit,
  apiBaseUrl: string,
  { retries = 2, baseDelayMs = 2000 }: { retries?: number; baseDelayMs?: number } = {},
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, buildInit());
    } catch (err) {
      lastError = new AiProviderError(
        `Could not reach the AI provider (network error)${err instanceof Error ? `: ${err.message}` : "."}`,
        "network",
      );
      if (attempt < retries) {
        await delay(baseDelayMs * 2 ** attempt);
        continue;
      }
      throw lastError;
    }

    if (response.ok) return response;

    const classified = await classifyHttpError(response, apiBaseUrl);
    const retryable = classified.status === 429 || (classified.status ?? 0) >= 500;
    if (retryable && attempt < retries) {
      lastError = classified;
      await delay(baseDelayMs * 2 ** attempt);
      continue;
    }
    throw classified;
  }

  throw lastError;
}
