# skill-market

Codename for **Brewdex** (`brewdex.app`): a labour-market board for Australian university students, plus 20-minute coffee chats with practitioners. Code reads the product name from `APP_NAME` (default `skill-market`; the release build sets `Brewdex`).

**Current state**: an interactive prototype with a deterministic synthetic market engine and browser-localStorage demo users. No Supabase, real job data or real email is connected yet. See `docs/PROGRESS.md`.

## Documents

| File | Purpose |
|---|---|
| `docs/PRD.md` | Sole source of requirements |
| `docs/GLOSSARY.md` | Required terminology for UI copy and code |
| `docs/ARCHITECTURE.md` | Target architecture, data pipeline, decisions |
| `docs/MILESTONES.md` | M0–M8 plan and acceptance |
| `docs/DESIGN.md` | Visual and interaction specification |
| `docs/PROGRESS.md` | Current state, open decisions, log |
| `docs/SETUP.md` | Accounts, keys and human-only steps |
| `docs/API_CONTRACT.md` | `src/lib/contract` backend boundary |
| `docs/CLOUDFLARE_DEPLOYMENT.md` | Production release on Cloudflare |
| `docs/reviews/` | Review records per milestone and frontend round |
| `docs/research/` | Research evidence (read-only) |

## Local development

Use Node.js 22 (`.nvmrc`) and pnpm 10.32.1.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`; `/` redirects to `/market`. The prototype needs no cloud account or database.

UI checks: `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build`. End-to-end: `pnpm exec playwright install chromium && pnpm test:e2e` (production build, 375px and 1280px, axe).

### Database (M0 foundation)

The local Supabase stack (Docker) holds the `profiles` table, RLS and pgTAP tests:

```sh
pnpm db:start
pnpm db:reset   # rebuilds only this project's local database
pnpm types:gen
pnpm verify     # lint, types, unit, database permission tests, build
```

Copy `.env.example` to `.env.local` and fill in values from `supabase status`. Never commit real keys. `/api/health` returns 503 without a configured database and 200 when connected. Default ports: API 54321, DB 54322, Studio 54323, inbox 54324.

## Branches and releases

- `main` is the only long-lived branch. Work happens on short branches (`m{n}-…`, `fe-r{n}`, `feat/…`, `fix/…`, `chore/…`) merged by PR after CI.
- Merging into `main` does not deploy. Pushing a `v*` tag on a `main` commit runs `.github/workflows/deploy-cloudflare.yml`, which validates and deploys to Cloudflare Workers (OpenNext) at `brewdex.app`. See `docs/CLOUDFLARE_DEPLOYMENT.md`.
- Vercel builds PR previews only; it is not production.
- Database migrations run only through `.github/workflows/migrate.yml` once `ENABLE_DATABASE_MIGRATIONS=true` is set; production migrations are manual from `main` with user approval.

## Scope and sources

Skill-level data will come only from the public job APIs of Greenhouse, Lever and Ashby; role-level data and coverage calibration from JSA IVI; classification from ASC and ANZSCO. No scraping of LinkedIn, SEEK or other platforms that prohibit it. Licence checks are tracked in `docs/SETUP.md` §6.
