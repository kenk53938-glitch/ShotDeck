export interface ParsedShot {
  shotLabel: string;
  title: string | null;
  durationSeconds: number | null;
  tool: string | null;
  prompt: string;
  negativePrompt: string | null;
}

export interface ParseResult {
  shots: ParsedShot[];
  errors: string[];
}

const SHOT_HEADER_RE = /^\s*shot\s+([A-Za-z0-9._-]+)\s*:?\s*(.*)$/i;
const FIELD_RE =
  /^\s*(duration|tool|medium|prompt|negative(?:\s*prompt)?)\s*:\s*(.*)$/i;

type FieldKey = "duration" | "tool" | "prompt" | "negative";

function normalizeFieldKey(label: string): FieldKey {
  const normalized = label.toLowerCase().trim();
  if (normalized === "duration") return "duration";
  if (normalized === "tool" || normalized === "medium") return "tool";
  if (normalized === "prompt") return "prompt";
  return "negative";
}

/**
 * Rule-based parser for the ShotDeck universal shot list format.
 * See docs/shot-format.md for the documented format. Only a "Shot XX"
 * header and a "Prompt:" field are required per shot.
 */
export function parseShotList(input: string): ParseResult {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const errors: string[] = [];

  const rawBlocks: { label: string; title: string; lines: string[] }[] = [];
  let current: { label: string; title: string; lines: string[] } | null =
    null;

  for (const line of lines) {
    const headerMatch = line.match(SHOT_HEADER_RE);
    if (headerMatch) {
      if (current) rawBlocks.push(current);
      current = { label: headerMatch[1], title: headerMatch[2].trim(), lines: [] };
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }
  if (current) rawBlocks.push(current);

  if (rawBlocks.length === 0) {
    errors.push(
      'No shots found. Make sure each shot starts with a line like "Shot 01:".',
    );
    return { shots: [], errors };
  }

  const shots: ParsedShot[] = [];

  for (const block of rawBlocks) {
    const fields: Record<FieldKey, string[]> = {
      duration: [],
      tool: [],
      prompt: [],
      negative: [],
    };
    let activeField: FieldKey | null = null;

    for (const line of block.lines) {
      const fieldMatch = line.match(FIELD_RE);
      if (fieldMatch) {
        const key = normalizeFieldKey(fieldMatch[1]);
        activeField = key;
        const rest = fieldMatch[2].trim();
        if (rest) fields[key].push(rest);
        continue;
      }
      if (activeField && line.trim()) {
        fields[activeField].push(line.trim());
      }
    }

    const prompt = fields.prompt.join(" ").trim();
    if (!prompt) {
      errors.push(`Shot ${block.label}: missing required "Prompt:" field — skipped.`);
      continue;
    }

    const durationRaw = fields.duration.join(" ").trim();
    const durationMatch = durationRaw.match(/(\d+(?:\.\d+)?)/);

    shots.push({
      shotLabel: block.label,
      title: block.title || null,
      durationSeconds: durationMatch ? parseFloat(durationMatch[1]) : null,
      tool: fields.tool.join(" ").trim() || null,
      prompt,
      negativePrompt: fields.negative.join(" ").trim() || null,
    });
  }

  return { shots, errors };
}
