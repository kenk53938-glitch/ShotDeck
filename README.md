# ShotDeck

Shot-level production tracker for AI-generated YouTube videos.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Turbopack)
- [Tailwind CSS](https://tailwindcss.com) v4
- [Prisma](https://www.prisma.io) 7 + SQLite (via the `better-sqlite3` driver adapter)

## Data model

`Project` → `Shot` → `Take`. A project has an ordered list of shots; each shot
can have multiple AI-generation takes (model, seed, cost, status), since
AI video generation usually needs several attempts before one is selected.

See [`prisma/schema.prisma`](./prisma/schema.prisma) for the full schema.

## Getting started

Install dependencies and apply migrations:

```bash
npm install
npx prisma migrate dev
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

## Other scripts

```bash
npm run build       # production build
npm run db:migrate  # create/apply a Prisma migration
npm run db:studio   # browse the database in Prisma Studio
```
