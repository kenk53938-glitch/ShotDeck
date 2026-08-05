# ShotDeck

A local-only production control room for faceless, AI-assisted YouTube videos.

ShotDeck tracks a video at the **shot** level: script, still-image prompt, selected image, motion prompt, WAN render jobs, preview approval, upscale, and final delivery files. It is designed for creators processing 40–50 shots repeatedly without losing prompts, filenames, takes, or review decisions across ChatGPT, ComfyUI, and CapCut.

![ShotDeck screenshot](./docs/screenshot.png)

## What ShotDeck does

- Bulk-imports a structured shot list with clear per-shot success/failure reporting
- Optionally uses any configured OpenAI-compatible provider to parse messier scripts
- Stores a project-level style guide, fixed negative rules, and a character reference image
- Generates **still-image prompts only** per shot, with draft review before saving
- Generates missing prompts sequentially across a project with visible progress
- Bulk-uploads ChatGPT images and matches names such as `shot_01.png`, `shot01_s1.png`, and `shot1,s2.png`
- Tracks multiple Takes per shot and guarantees that selecting one Take deselects the previous Take on that shot
- Provides a grid/contact-sheet review workflow with bulk Approve and Needs Rework actions
- Exports the animation CSV format:

  ```csv
  shot_id,image_name,motion_prompt,duration
  ```

- Queues approved shots to local ComfyUI/WAN sequentially
- Polls ComfyUI history, surfaces render failures, attaches completed preview/final outputs as Takes, and supports retry
- Queues approved preview clips for 1920×1080 upscale
- Organizes approved assets into `stills/`, `previews/`, `final/`, and `manifest.csv`

## What remains intentionally manual

ShotDeck does **not** automate the ChatGPT website or replace CapCut.

- Still images remain manually generated in ChatGPT because one-by-one review currently gives better character consistency.
- Motion and upscale rendering are performed by the creator's local ComfyUI workflows.
- CapCut remains the final creative-editing step for pacing, sound design, subtitles, transitions, and export.

## Stack

- Next.js App Router + TypeScript
- React 19
- Tailwind CSS v4
- Prisma 7 + SQLite (`better-sqlite3` adapter)
- Local filesystem storage under `storage/`
- Optional OpenAI-compatible chat-completions provider
- Local ComfyUI HTTP API

## Data model

```text
Project
  └── Shot
       ├── Take
       └── GenerationJob
```

A Project contains reusable style and resolution defaults. A Shot keeps image prompts and animation fields separate. A Take records every uploaded or generated asset. A GenerationJob records ComfyUI queue, progress, error, and completion data.

See [`prisma/schema.prisma`](./prisma/schema.prisma).

## Local setup

Requirements:

- Node.js 20+
- npm
- Optional: ComfyUI running locally for animation/upscale integration

```bash
cp .env.example .env
npm ci
npx prisma migrate dev
npm run dev
```

Open `http://127.0.0.1:3000`.

ShotDeck binds to localhost only. It has no authentication and must not be exposed to the public internet.

## First production workflow

1. Create a project.
2. Paste or upload the shot script.
3. Add the project style guide and optional character reference image.
4. Generate or manually edit still-image prompts.
5. Generate the still images manually in ChatGPT.
6. Open **Review images**, upload all stills together, inspect matching, and approve selected shots.
7. Confirm each approved shot has both positive and negative prompts; keep the separate motion prompt populated for CSV export.
8. Open **Production**, queue WAN previews, and leave ShotDeck open to poll render status.
9. Approve good previews and queue the approved set for upscale.
10. Use **Organize approved assets** before moving to CapCut.

## AI provider settings

The Settings page accepts an API base URL, API key, and model name for an OpenAI-compatible `/chat/completions` endpoint.

Keys are stored server-side in the local SQLite database, displayed masked, never sent to client JavaScript, and never included in returned error messages. This is an explicitly local, single-user security model; encryption, authentication, and a secrets vault are out of scope.

## ComfyUI integration

Export working workflows from ComfyUI using **File → Export (API)** and configure separate WAN positive/negative prompt nodes plus prompt-free upscale input/output nodes in `.env`. Colon-containing subgraph IDs such as `129:93` are supported.

See [`docs/comfy-batch.md`](./docs/comfy-batch.md).

Recommended local production settings for modest hardware:

- Preview generation: 768×432, 24 fps
- Final upscale: 1920×1080, 24 fps
- Sequential queueing, not parallel rendering

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

A GitHub Actions workflow runs these checks on pushes and pull requests.

## Manual verification still required

The following depend on the creator's local files or hardware and must be verified on the target Windows machine:

- The exact WAN workflow node IDs, including colon-containing subgraph IDs
- Separate positive and negative prompt injection into the exported WAN workflow
- ComfyUI `/history/{prompt_id}` output shape for the installed custom nodes
- Absolute output paths produced by the creator's ComfyUI installation
- End-to-end 768×432 preview and 1920×1080 upscale rendering on the RTX 5060 8 GB setup

## License

MIT
