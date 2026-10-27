# CLAUDE.md — `skill-market`

## About the project

A commercial web product for Australian university students: it presents labour-market demand as a trackable market board (with skill and role instruments), then uses market signals to match students with employed practitioners who hold those skills for 20-minute coffee chats. The product name is **Brewdex** (confirmed 2026-10-23); the repository codename is `skill-market`. The domain `brewdex.app` was purchased on 2026-10-23. Never hardcode the domain; read `NEXT_PUBLIC_APP_URL` for all absolute links.

**The sole source of requirements is `docs/PRD.md`.** Research evidence lives in `docs/research/`. **Use the terminology in `docs/GLOSSARY.md`** (required reading for every agent; use it for UI copy, variable names, and requirements discussions). The PRD takes precedence over research. Where the PRD is unclear, make a reasonable assumption and record it under "Pending decisions" in `docs/PROGRESS.md`; do not stop to ask.

This is not coursework. Build to standards appropriate for a real launch, real users, and real compliance.

## Language and naming conventions

- **All conversations with the user must be in Chinese** (including updates, questions, and summaries); leave code blocks, commands, and file paths unchanged.
- Repository documentation, instructions, code, comments, and UI copy use English. Commit messages are outside the scope of the repository translation; retain their existing convention below.
- Code, code comments, and commit messages use English.
- Product UI copy defaults to English and is centrally managed rather than hardcoded in components, allowing future i18n.
- Read the product name only from the `APP_NAME` configuration constant; never hardcode it.

## Agreed constraints (do not overturn without explaining why under "Pending decisions")

- Stack: Next.js (TypeScript), Supabase (Postgres, Auth, Storage; ap-southeast-2 Sydney), Vercel, Resend, and GitHub Actions.
- **Use free tiers throughout**; the only paid item is the domain (`brewdex.app`, already purchased).
- Vercel Hobby prohibits commercial use. Avoid Vercel-specific dependencies and preserve portability to platforms such as Cloudflare.
- Use only sources whose licences permit the intended use. Do not scrape platforms that prohibit scraping, such as LinkedIn and SEEK.
- Initial data sources: skill-level data uses only the public job APIs from Greenhouse, Lever, and Ashby; role-level data and coverage calibration use JSA IVI; classification uses ASC and ANZSCO. Do not integrate Adzuna or Workday (no public API). Add other ATS sources only after checking their terms (architecture §§6.2, 6.7, 6.8). The user will negotiate paid partnerships with Adzuna, Indeed, and others after acquiring customers.
- Comply with the Australian Privacy Act / APPs; store personal data in Australia.
- Any party may pay (PRD §12.1), but revenue must never influence market data or its presentation. The MVP excludes paid features and employer-facing features.

## Workflow (the main session coordinates; all subagents use Opus)

The user has authorised the main session to use subagents in the workflow below without asking each time.

### Phase 1: Architecture (handled by the main session)

1. Read `docs/PRD.md` and `docs/research/`.
2. Write `docs/ARCHITECTURE.md` and `docs/MILESTONES.md` (requirements are in the launch prompt).
3. Update `docs/PROGRESS.md`.
4. **Stop and wait for the user to approve the architecture.** Do not enter phase 2 without approval.

### Phase 2: Iterate through milestones

For each milestone M{n} in `docs/MILESTONES.md`, in order:

1. **Prerequisites**: check whether its "Human prerequisites" are complete in `docs/SETUP.md`, maintained by the user and Codex. If incomplete, stop, provide a step-by-step checklist, and wait for completion.
2. **Implementation**: assign an implementer subagent (Opus) only this milestone. It works on branch `m{n}-<slug>` created from main.
3. **Review**: assign a reviewer subagent (Opus) to review the branch against main.
4. **Outcome**:
   - Pass: push the branch and open a PR (CI and Vercel previews run automatically), update `docs/PROGRESS.md`, and **ask for merge approval if this session has not already authorised it; do not ask again when approval exists**. After merging, create the next branch from the updated main.
   - Return for changes: give the implementer the issue list in `docs/reviews/M{n}.md`, then review again.
   - **After three returns for the same milestone, stop and consult the user.**
5. After each milestone, briefly report what was completed, the review outcome, and any pending decisions.

Frontend feedback rounds (FE-R{n}) follow the same implement → review → merge workflow, using branch `fe-r{n}` and review record `docs/reviews/FE-R{n}.md`.

### When to stop and consult the user

- After completing phase 1 architecture, to obtain approval.
- When an account, key, domain purchase, or other action requiring human identity is needed.
- Before merging into main without authorisation in the current session, or before creating/pushing a release tag without release authorisation.
- After three review returns for one milestone.
- Before an irreversible or externally visible action: deleting data, changing the production database, sending real email to non-test users, or changing DNS.
- When an agreed constraint must be overturned.

### Conserve usage

- The main session does not write large implementations itself. Give subagents complete, self-contained tasks to avoid repeated exploration. Reviews inspect only the diff and relevant files, rather than rereading the entire repository.

## Local development environment

The user's 8GB Mac cannot run the full local Supabase stack. Database work, pgTAP / RLS tests, integration tests, and other heavy tasks run in Docker on the Windows development machine through the Mac → Windows bridge. The Mac handles editing, lint, type checking, unit tests, and frontend previews.

- `bash scripts/windows-backend status|start|stop|test|build`: manage the isolated Windows development database (test = pgTAP + health check).
- `bash scripts/remote-dev probe|ready|status|run`: low-level bridge.
- Remote code is not synchronised automatically; sync changes before testing them.
- See `docs/REMOTE_DEVELOPMENT.md` for directories, ports, and caveats. These three files are local only, excluded through `.git/info/exclude`, and must not be committed.

## Git conventions

- There is one long-lived branch, main: **branch → PR → main (integration only) → push a `v*` tag with user authorisation → release**. dev has been discontinued since 2026-10-23.
- Merging into main neither deploys nor creates a tag. Only pushing a `v*` tag pointing to a commit in main history makes the `Brewdex release` workflow validate and deploy to Cloudflare (`brewdex.app`). Manual workflow runs validate only.
- Merging a PR into main **requires user authorisation; within the scope already authorised in the same session, proceed without asking again**.
- Use one short-lived branch per task, created from main: `m{n}-<slug>` for milestones, `fe-r{n}` for frontend rounds, and `feat/…`, `fix/…`, or `chore/…` otherwise. After merging, list branches and worktrees proposed for cleanup and obtain approval before deleting them.
- Vercel is used only for PR previews, not production.
- Keep commits small and clear, with English conventional commit messages (`feat:`, `fix:`, `chore:`, etc.).
- Never commit `.env*` except `.env.example`; never print secrets.

## File ownership (avoid conflicts with Codex)

| Files | Owner |
|---|---|
| `docs/PRD.md` | User; agents may only propose changes under "Pending decisions" |
| `docs/ARCHITECTURE.md`, `docs/MILESTONES.md`, `docs/PROGRESS.md`, `docs/DESIGN.md`, `docs/GLOSSARY.md` | Main session |
| `docs/reviews/*.md` | Reviewer |
| `docs/SETUP.md`, `.env.example` | User + Codex; other agents read only and propose new environment variables in PROGRESS.md |
| `docs/research/*`, `docs/FRONTEND_API_REPORT.md` | Read-only snapshots; refresh the API report before backend integration |
| Code | Implementer |

## Quality requirements

- TypeScript strict mode; zero lint and type-checking errors.
- Automated tests for core logic: metric calculation, filtering, matching, request timeouts, and permissions.
- RLS enabled and tested for every Supabase table.
- Each milestone's acceptance checks must run locally with one command.
- UX follows `docs/PRD.md` §10: every number has a definition and source, no rankings, and inferences are suggestions.
- Frontend: **Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.** Put definitions and sources behind a one-click control such as ⓘ rather than spreading explanatory text across the interface.
