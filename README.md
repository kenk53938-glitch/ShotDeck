# ShotDeck

Shot-level production tracker for AI-generated YouTube videos.

![ShotDeck screenshot](./docs/screenshot.png)

## Why I built this

I run production for a YouTube channel where each video has 40+ shots,
and every shot needs its own prompt, AI tool, and take history tracked
separately. Spreadsheets broke down fast — no per-shot take history,
no easy way to see what's still in progress vs. approved, and prompts
buried in cells nobody could search. ShotDeck replaces that with a
proper shot board: each shot moves through a status pipeline, and every
generation attempt (take) is logged with its own model, seed, cost, and
outcome so I can pick the best one without losing track of the rest.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Turbopack)
- [Tailwind CSS](https://tailwindcss.com) v4
- [Prisma](https://www.prisma.io) 7 + SQLite (via the `better-sqlite3` driver adapter)

## Data model

`Project` → `Shot` → `Take`. A project has an ordered list of shots; each shot
can have multiple AI-generation takes (model, seed, cost, status), since
AI video generation usually needs several attempts before one is selected.

See [`prisma/schema.prisma`](./prisma/schema.prisma) for the full schema.

## Importing shots

Shots can be bulk-imported from pasted text or an uploaded file on each
project's board, instead of adding them one by one. See
[`docs/shot-format.md`](./docs/shot-format.md) for the expected format
(works for video, comics, or any other shot-by-shot medium) and for how
to enable optional AI-assisted parsing via a free Gemini API key.

## Getting started

```bash
cp .env.example .env
npm ci
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app. The
dev server binds to `127.0.0.1` only — this app has no auth and is meant
to run locally, not be exposed on your network.

## Other scripts

```bash
npm run build       # production build
npm run db:migrate  # create/apply a Prisma migration
npm run db:studio   # browse the database in Prisma Studio
```
