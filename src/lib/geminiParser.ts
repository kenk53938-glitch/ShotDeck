import type { ParsedShot, ParseResult } from "@/lib/shotParser";

const DEFAULT_MODEL = "gemini-2.5-flash";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    shots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          shotLabel: { type: "string" },
          title: { type: "string", nullable: true },
          durationSeconds: { type: "number", nullable: true },
          tool: { type: "string", nullable: true },
          prompt: { type: "string" },
          negativePrompt: { type: "string", nullable: true },
        },
        required: ["shotLabel", "prompt"],
      },
    },
  },
  required: ["shots"],
};

const INSTRUCTIONS =
  "Parse the following shot list into structured shots, preserving the " +
  "original order. Each shot has: an identifying label as it appears in " +
  "the text (e.g. '01', '3', '12b'); an optional short title; an optional " +
  "duration converted to seconds as a number; an optional tool or medium " +
  "used (AI model, art style, etc.); a required prompt describing the " +
  "shot; and an optional negative prompt. This may describe video shots, " +
  "comic panels, or static image sequences — not every shot will have a " +
  "duration or tool. Text:\n\n";

/**
 * AI-assisted parser using the Gemini API. Only called when an API key
 * is configured (via the Settings page or GEMINI_API_KEY in .env);
 * callers should catch errors and fall back to the rule-based parser
 * in shotParser.ts.
 */
export async function parseShotListWithGemini(
  input: string,
  apiKey: string,
): Promise<ParseResult> {
  if (!apiKey) {
    throw new Error("No Gemini API key configured");
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: INSTRUCTIONS + input }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Gemini returned no content");
  }

  let parsed: { shots?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  if (!Array.isArray(parsed.shots)) {
    throw new Error("Gemini response missing shots array");
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
    errors.push("Gemini did not return any shots.");
  }

  return { shots, errors };
}
