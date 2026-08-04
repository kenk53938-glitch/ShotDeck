/**
 * Sensible free/cheap default model per known provider, keyed by a
 * substring of the provider's API base URL. Used when Model Name is
 * left blank on the Settings page.
 */
const PROVIDER_DEFAULT_MODELS: { match: string; model: string }[] = [
  { match: "generativelanguage.googleapis.com", model: "gemini-2.0-flash" },
  { match: "api.groq.com", model: "llama-3.1-70b-versatile" },
  { match: "integrate.api.nvidia.com", model: "meta/llama-3.1-70b-instruct" },
  { match: "bigmodel.cn", model: "glm-4-flash" },
  { match: "openrouter.ai", model: "openai/gpt-4o-mini" },
];

const GENERIC_FALLBACK_MODEL = "gpt-4o-mini";

export function detectDefaultModel(apiBaseUrl: string): string {
  const url = apiBaseUrl.trim().toLowerCase();
  const match = PROVIDER_DEFAULT_MODELS.find((p) => url.includes(p.match));
  return match ? match.model : GENERIC_FALLBACK_MODEL;
}
