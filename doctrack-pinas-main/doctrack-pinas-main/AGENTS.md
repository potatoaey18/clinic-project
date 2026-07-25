# Agent notes

This is a TanStack Start (React 19 + Vite + Nitro) app deployed on Vercel,
backed by Supabase (Postgres, Auth, Storage). See `README.md` for local setup
and deployment steps.

- Routes live in `src/routes` (file-based routing via TanStack Router).
- Supabase clients: `src/integrations/supabase/client.ts` (browser, anon key),
  `client.server.ts` (server-only, service role — never import outside
  `*.server.ts` files), and `auth-middleware.ts` (verifies bearer tokens on
  server functions).
- Database schema changes go in `supabase/migrations/`.
- Keep the branch in a deployable state — pushes to `main` trigger a Vercel
  deployment.
