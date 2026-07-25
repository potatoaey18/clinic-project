# DocTrack Pinas (MedFolio)

A clinic management system for Filipino clinics and private practices —
patients, consultations, prescriptions, lab results, scheduling, and billing.

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19 + Vite + Nitro), SSR
- [TanStack Router](https://tanstack.com/router) file-based routing (`src/routes`)
- [Supabase](https://supabase.com) — Postgres, Auth, Row Level Security
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) components
- Deployed on [Vercel](https://vercel.com)

## Local development

Requires Node.js 20+.

```sh
npm install
cp .env.example .env   # fill in your Supabase project values
npm run dev
```

The app runs at `http://localhost:3000` by default.

## Demo data

`supabase/seed-demo.sql` seeds a sample clinic ("Bayanihan Family Clinic")
with ~8 Filipino patients, consultations, vitals, prescriptions, and a
week of appointments — useful for trying the app out locally without
typing everything by hand.

Because every table is scoped by Row Level Security to your own user,
this can't be auto-seeded before you exist. Steps:

1. `npm run dev`, go to `/auth`, and sign up once (any email/password).
2. Grab your user id: Supabase Dashboard → **Authentication → Users** →
   copy the UUID (or run `select id, email from auth.users;` in the SQL editor).
3. Open `supabase/seed-demo.sql`, replace `REPLACE_WITH_YOUR_USER_ID` near
   the top with that UUID.
4. Run the whole file in the Supabase SQL Editor (or
   `supabase db execute -f supabase/seed-demo.sql --linked`).
5. Refresh the app — the clinic, patients, and appointments will be there.

Safe to re-run: it deletes and recreates the same demo clinic each time.

## Key workflows

- **Consultations** have their own dedicated screen at `/consultations/new`
  (two-column: patient context + vitals + history on the left, SOAP notes +
  prescription on the right) rather than a modal. Entry points: the
  "New consultation" button on `/consultations` or a patient's record (asks
  you to search for a patient first), or "Start consultation" on a
  checked-in/scheduled appointment in `/appointments` — which also marks
  that appointment `completed` once you save.
- **Search**: press `⌘K` / `Ctrl+K` anywhere (or use the search box in the
  top bar) to jump to any patient, consultation, appointment, or clinic.
  The dashboard also has its own quick-search box for patients, and the
  patients/consultations/audit-log list pages each have an inline filter.
- **Dashboard analytics** (appointments over the last 14 days, your
  consultations by type) are computed from real rows in your database —
  there's no mock/sample data baked into the charts, so they'll be empty
  until you have appointments/consultations recorded (see "Demo data" below
  to populate some).

## Database (Supabase)

Schema changes live as SQL migrations in `supabase/migrations/`. If you use
the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started):

```sh
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste each migration file into the SQL editor in the Supabase dashboard
in order.

You'll need two Supabase clients' worth of credentials from
**Project Settings → API**:

| Variable | Where it's used | Exposed to browser? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | `src/integrations/supabase/client.ts` | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | anon/publishable key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/integrations/supabase/client.server.ts` (admin ops, bypasses RLS) | **No — server only** |

## Deploying to Vercel

TanStack Start builds on [Nitro](https://nitro.build), which Vercel detects
automatically — no `vercel.json` or preset needed.

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Vercel, **Add New Project** → import the repo. Vercel should detect
   the TanStack Start framework preset automatically.
3. Add the environment variables from the table above under
   **Project Settings → Environment Variables** (all three `VITE_*` values,
   plus `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the server-only
   `SUPABASE_SERVICE_ROLE_KEY`).
4. Deploy. Every push to your production branch redeploys automatically.

To build and run the production server locally (useful for debugging a
deploy):

```sh
npm run build
npm run start   # serves .output/server/index.mjs
```

## Project structure

```
src/
  routes/                 File-based routes (TanStack Router)
    _authenticated/       Logged-in app shell + pages (dashboard, patients, ...)
    auth.tsx              Sign in / sign up
  components/
    ui/                   shadcn/ui primitives
    app-sidebar.tsx        Persistent navigation sidebar
  integrations/supabase/  Supabase clients + auth middleware
  lib/                    Shared utilities (formatting, PDF export, audit log, ...)
supabase/migrations/      SQL schema migrations
```
