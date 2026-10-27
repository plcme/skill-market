# SETUP — Accounts, keys, and manual verification

> Tasks requiring human identity: creating accounts, entering keys, verifying terms, and purchasing domains. Maintained by the user and Codex; the main session reads this before each milestone to check prerequisites.
> Record resource names and status only, **never key values**. Keys belong only in `.env.local` (already in `.gitignore`); `.env.example` lists variable names only.
> Merged from `SETUP_CHECKLIST.md` (instructions) and `SETUP_STATUS.md` (status) on 2026-10-23.

## Status

| § | Service | Status | Resource name / identifier | Free allowance and limits | Notes |
|---|---|---|---|---|---|
| 1 | GitHub | 🟨 Partially complete (2026-09-22) | `plcme/skill-market` (private) | Approximately 2,000 Actions minutes/month | main is the only long-lived branch; dev is discontinued, awaiting cleanup; main protection pending |
| 2 | Supabase | 🟨 Local checks passed; cloud integration pending | Cloud `skill-market` (Sydney); local database on the Windows development machine | 2 projects, 500MB DB, 1GB storage, 50,000 MAU; pauses after 7 idle days | A second project, `skill-market-dev`, is still needed; CLI not logged into cloud |
| 3 | Vercel | 🟨 GitHub connected | `skill-market` / `skill-market-two.vercel.app` | Hobby; **commercial use prohibited** | Next.js / syd1 deployment configuration added |
| 4 | Resend | ⬜ Not started | | 3,000 emails/month, 100/day, 1 domain | Before M3 |
| 5 | Google OAuth | ⬜ Not started | | Free; Testing allows up to 100 test users | Before M3 |
| 6 | Data source permissions | ⬜ Not started | | | Check JSA before M1 and each ATS before launch |

## Rules for Codex

- When a step requires a human (registration, CAPTCHA, 2FA, web authorisation, pasting keys), stop and explain which page and controls to use.
- Modify only this file, `.env.example`, `.gitignore`, Git settings, and platform configuration; do not modify other `docs/` files, `CLAUDE.md`, or `.claude/`.
- Official websites determine free allowances and terms; update this document if it differs.

## §1 GitHub

- [x] Repository and main trunk; dev discontinued (confirm a separate deletion list).
- [ ] Protect main: prohibit force pushes and deletion.

## §2 Supabase

- [x] Cloud project `skill-market`, region **ap-southeast-2 (Sydney)**.
- [ ] Second project `skill-market-dev` (Sydney), for previews.
- [ ] `supabase login`, `supabase link`; fill `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DB_PASSWORD`; verify connectivity (output success/failure only).
- [ ] Add `jobs_url` and `jobs_secret` to Supabase Vault (M1; implementer supplies SQL).

## §3 Vercel

- [x] GitHub connected; PRs generate previews. Git uses only main; production releases use `v*` tags on Cloudflare (merges into main do not release).
- [ ] Add Supabase variables to Preview and Production environments.

## §4 Resend

- [ ] Register and generate an API key; add `RESEND_API_KEY` and `EMAIL_FROM` to `.env.example`.
- [ ] During development, use `onboarding@resend.dev` (can send only to the registered email address).

## §5 Google sign-in

- [ ] Create a Google Cloud project → OAuth consent screen (External; scopes limited to openid, email, profile) → OAuth Client ID (Web).
- [ ] Redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`; enter it under Supabase Auth → Providers → Google.

## §6 Data source permissions

Initial sources (confirmed 2026-10-23): **skill-level data uses only public job APIs from Greenhouse, Lever, and Ashby; role-level data and coverage calibration use JSA IVI**. These three APIs are public and require neither registration nor a key, but their official documentation provides **no explicit licence** (findings in architecture §6.2). Do not integrate Adzuna or Workday; do not scrape LinkedIn, SEEK, or Indeed. See `docs/research/data-sources.md` for evidence.

Before M1:

- [ ] JSA Internet Vacancy Index: download URL, update frequency, dataset licence (expected CC BY 4.0), and attribution text.
- [ ] Australian Skills Classification: same checks (NERO and Skills Priority List excluded from the first version).
- [ ] ABS (ANZSCO): licence and attribution.

Before commercialisation (sent by the user personally; the main session may draft):

- [ ] Email Greenhouse, Lever, and Ashby partnerships or legal contacts: explain student-facing aggregate statistics, no republication of source text, and links to employers; request written permission.
- [ ] Email JSA to confirm commercial use of IVI and required attribution.
- [ ] Ask an Australian lawyer to review data sources, copyright, and privacy.

Possible later sources: Workable, SmartRecruiters, Recruitee (check terms first); investigate public APIs for PageUp and SuccessFactors; APSJobs and state government job boards; paid partnerships with Adzuna, Indeed, Employment Hero, and others, negotiated by the user after acquiring customers.

For each source record rate limits, attribution requirements, and **whether commercial use is permitted**. Mark uncertainty as "Pending manual confirmation".

## §7 Before launch (M8)

- [x] Domain: `brewdex.app` (purchased 2026-10-23; product name confirmed as Brewdex).
- [ ] Contact email (e.g. `data@brewdex.app`) for `ATS_USER_AGENT` and the `/bot` page.
- [ ] Resend domain DNS (SPF / DKIM); switch Supabase Auth SMTP to Resend.
- [ ] Switch the Google consent screen from Testing to Production (requires a homepage and privacy policy on an owned domain).
- [ ] Vercel Hobby prohibits commercial use: upgrade to Pro or migrate to Cloudflare.
- [ ] Free uptime monitoring account (such as UptimeRobot), for health checks and preventing Supabase idle pauses.
- [ ] Sentry, if adopted.

Deferred: LinkedIn sign-in (requires a company page), PostHog, and Stripe (set up when charging begins; requires an ABN).
