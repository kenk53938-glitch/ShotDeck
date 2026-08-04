import type { ParsedShot, ParseResult } from "@/lib/shotParser";
import type { AiProviderConfig } from "@/lib/settings";

const INSTRUCTIONS =
  "Parse the following shot list into structured shots, preserving the " +
  "original order. Each shot has: an identifying label as it appears in " +
  "the text (e.g. '01', '3', '12b'); an optional short title; an optional " +
  "duration converted to seconds as a number; an optional tool or medium " +
  "used (AI model, art style, etc.); a required prompt describing the " +
  "shot; and an optional negative prompt. This may describe video shots, " +
  "comic panels, or static image sequences — not every shot will have a " +
  "duration or tool.\n\n" +
  "Respond with ONLY a single JSON object in this exact shape, no " +
  "markdown code fences, no explanation:\n" +
  '{"shots": [{"shotLabel": string, "title": string|null, ' +
  '"durationSeconds": number|null, "tool": string|null, "prompt": ' +
  'string, "negativePrompt": string|null}]}\n\n' +
  "Text:\n\n";

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

/**
 * AI-assisted parser that calls any OpenAI-compatible chat completions
 * endpoint (OpenRouter, Groq, OpenAI itself, etc.) using settings saved
 * on the Settings page. Callers should catch errors and fall back to
 * the rule-based parser in shotParser.ts.
 */
export async function parseShotListWithAi(
  input: string,
  config: AiProviderConfig,
): Promise<ParseResult> {
  const { apiBaseUrl, apiKey, modelName } = config;
  if (!apiBaseUrl || !apiKey || !modelName) {
    throw new Error("AI provider is not fully configured");
  }

  const url = `${apiBaseUrl.replace(/\/+$/, "")}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: "user", content: INSTRUCTIONS + input }],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI provider error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("AI provider returned no content");
  }

  let parsed: { shots?: unknown };
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    throw new Error("AI provider returned invalid JSON");
  }

  if (!Array.isArray(parsed.shots)) {
    throw new Error("AI provider response missing shots array");
  }

  const shots: ParsedShot[] = [];
  const errors: string[] = [];

  parsed.shots.forEach((raw, index) => {
    if (typeof raw !== "object" || raw === null) return;
    const r = raw as Record<string, unknown>;
    const shotLabel =
      typeof r.shotLabel === "string" && r.shotLabel.trim()
        ? r.shotLabel.trim()
        : String(index + 1);
    const prompt = typeof r.prompt === "string" ? r.prompt.trim() : "";

    if (!prompt) {
      errors.push(`Shot ${shotLabel}: missing prompt — skipped.`);
      return;
    }

    shots.push({
      shotLabel,
      title:
        typeof r.title === "string" && r.title.trim() ? r.title.trim() : null,
      durationSeconds:
        typeof r.durationSeconds === "number" ? r.durationSeconds : null,
      tool: typeof r.tool === "string" && r.tool.trim() ? r.tool.trim() : null,
      prompt,
      negativePrompt:
        typeof r.negativePrompt === "string" && r.negativePrompt.trim()
          ? r.negativePrompt.trim()
          : null,
    });
  });

  if (shots.length === 0 && errors.length === 0) {
    errors.push("AI provider did not return any shots.");
  }

  return { shots, errors };
}
