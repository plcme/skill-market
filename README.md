# skill-market

M0: the Next.js application, local Supabase database, and quality checks. The product name continues to use `APP_NAME`; it has not been renamed.

## Local development

Use Node.js 22 (`.nvmrc`) and pnpm 10.32.1. Start Docker Desktop first.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm db:start
pnpm db:reset
pnpm types:gen
pnpm dev
```

Open `http://localhost:3000`. The homepage is available without a cloud account. `/api/health` returns 503 when the database is not configured and 200 once it is configured and connected.

Copy `.env.example` to `.env.local`, then fill in the URL and anonymous/publishable key from the local Supabase status. Store real keys only in local files or platform secrets; never commit them or send them in chat. Default Supabase ports: API 54321, database 54322, Studio 54323, and email inbox 54324. `db:reset` **rebuilds only this project's local database** and clears its test data.

```sh
pnpm verify
pnpm exec playwright install chromium
pnpm test:e2e
```

verify runs lint, type checking, unit tests, database permission tests, and a production build. E2E tests use the production build to check the homepage and accessibility at 375px and 1280px. For UI-only development, start with `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build`; this does not replace database acceptance checks.

## Cloud setup

- Import the repository into Vercel with build command `pnpm build`, framework Next.js, and Node.js 22. main is Production; other branches are Preview. The homepage can still be previewed without Supabase variables.
- Preview connects only to the Sydney development project; Production connects only to the Sydney production project.
- A direct Supabase GitHub connection is optional. Migrations are managed by `.github/workflows/migrate.yml`. Do not enable two automatic migration paths at once.
- Create GitHub environments named development and production, each with `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, and `SUPABASE_DB_PASSWORD`. First verify that manual production approvals are actually available. If the current private-repository plan does not support them, keep production deployment manual; manual triggering is not equivalent to approval protection.
- After configuration, set repository variable `ENABLE_DATABASE_MIGRATIONS=true`. Until then, migration jobs are skipped and do not touch cloud databases. Development migrations run on dev; production migrations may only be triggered manually from main, with user approval before release.
- Recommended branch protection: prohibit force pushes and deletion on main, and require CI plus human review; require CI on dev. If the platform plan does not support protection, record that limitation accurately rather than claiming it is active.

## Scope and sources

This milestone creates only the profiles business table. Authenticated users can read their own profile and update ordinary fields. Column permissions protect `is_admin`, user IDs, deletion flags, and similar fields. User metadata never grants administrator access. Administrator functions use a fixed empty `search_path`. The privileged server client is marked `server-only`.

Local configuration disables Realtime, Edge Runtime, Analytics, Storage, and Studio, which M0 does not use, to reduce memory usage. Enable Storage/Studio in `supabase/config.toml` and restart local services when needed. Enable `pg_cron` and `pg_net` through SQL migrations, rather than inventing extension settings in `config.toml`. The homepage uses system fonts; builds do not depend on external font downloads.

Supabase clients and session refresh follow the [official SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs). UI foundations use local [shadcn/ui](https://ui.shadcn.com/) components, Radix Slot, and Tailwind CSS. M0 includes no business forms or market pages.

M1 will initially use synthetic test data. Real collection and retention policies will be decided after verifying the licences for job-ad sources and JSA/ABS data.
