# Shot list import format

ShotDeck can bulk-import shots from a plain-text shot list, pasted directly
or uploaded as a `.txt`/`.md` file. The format is intentionally minimal so
it works for video, comics, stickman/storyboard sequences, or any other
shot-by-shot medium — only two things are required per shot: a `Shot XX`
header and a `Prompt:` line.

## Fields

| Field      | Required | Meaning                                                        |
| ---------- | -------- | ---------------------------------------------------------------- |
| `Shot XX`  | Yes      | Starts a new shot. `XX` is any label — a number, `01`, `12b`, `3a`, etc. Text after the colon (if any) becomes the shot's title. |
| `Prompt`   | Yes      | The generation prompt / shot description. Can wrap across multiple lines. |
| `Duration` | No       | Length of the shot. Any text with a number works (`5s`, `4.5 sec`, `5`) — the unit is ignored and the number is stored as seconds. Skip it for shots with no duration, like comic panels. |
| `Tool`     | No       | The AI tool or medium used (`Runway Gen-3`, `Midjourney`, `hand-drawn`, `Procreate`, ...). `Medium:` is accepted as an alias. |
| `Negative` | No       | A negative prompt, if your tool supports one. `Negative Prompt:` is accepted as an alias. |

Rules:

- Fields can appear in any order after the `Shot XX` line.
- A field's value can span multiple lines — any line that isn't itself a
  recognized field label is treated as a continuation of the previous
  field.
- Anything before the first `Shot XX` line is ignored.
- A shot block with no `Prompt:` field is reported as an error and skipped
  — it will not be imported.

## Example: video shot

```
Shot 01: Wide shot - skyline at dusk
Duration: 5s
Tool: Runway Gen-3
Prompt: Drone pullback over a neon-lit skyline, cinematic, dusk lighting,
slow camera movement
Negative: blurry, low quality, daytime

Shot 02: Close-up - character reaction
Duration: 3s
Tool: Kling 1.5
Prompt: Macro shot of a character's eyes widening in shock, dramatic
lighting
```

## Example: comic panel

Comic panels usually have no duration, and the "tool" is really the art
style or medium — both are optional, so they can simply be left out.

```
Shot 01: Splash page
Prompt: Full-page splash panel, hero landing on a rooftop at night,
dynamic low-angle shot, ink and halftone comic style

Shot 02a: Panel - dialogue
Tool: Procreate, flat color style
Prompt: Two characters talking in a diner booth, medium shot, warm
interior lighting
```

## Parsers

ShotDeck parses the text in one of two ways:

1. **Rule-based (default, no setup required).** A deterministic parser
   that matches the fields above. This is what runs unless you configure
   Gemini.
2. **AI-assisted, via Google Gemini (optional).** If you set a
   `GEMINI_API_KEY` in your `.env` file, ShotDeck sends the pasted text to
   the Gemini API and asks it to extract the same fields. This is more
   forgiving of shot lists that don't follow the format exactly. If the
   Gemini API call fails for any reason (no key, bad key, network error,
   quota), ShotDeck automatically falls back to the rule-based parser —
   the Gemini key is never required.

To get a free Gemini API key, see
[Google AI Studio](https://aistudio.google.com/apikey). Add it to `.env`:

```
GEMINI_API_KEY="your-key-here"
```

`.env` is gitignored — the key is never committed.
