# Operly

AI-powered business operating platform for small businesses. Manage customers, sales, tasks and quotations in one workspace, with an AI assistant that handles the busywork.

## Stack

Next.js, TypeScript, Tailwind CSS, Neon (PostgreSQL), Better Auth, deployed on Vercel. Planned: Vercel Blob for files.

## Development

```bash
npm install
npm run dev
```

## Status

Done: landing page, sign-up and login, business onboarding, dashboard shell with live data, per-business data isolation. Next: Customer Hub, Sales Hub, tasks, AI assistant.

## Environment

Copy `.env.example` and fill in the values. On Vercel, `DATABASE_URL` comes from the Neon integration and `BETTER_AUTH_SECRET` is set as a project variable. The schema in `db/schema.sql` is applied automatically before each build.
