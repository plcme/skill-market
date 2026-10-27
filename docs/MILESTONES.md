# MILESTONES — `skill-market`

| Item | Details |
|---|---|
| Status | v0.1 — phase 1 output, awaiting product owner approval |
| Basis | `docs/PRD.md` §5 scope, §7 FRs, `docs/ARCHITECTURE.md` |
| Maintainer | Main session |

> Every milestone delivers a runnable, demonstrable increment with acceptance checks runnable locally in one command. Sizes: S ≈ half a day, M ≈ 1–2 days, L ≈ 2–4 days of continuous implementer-subagent work. Create `m{n}-<slug>` from main, then merge via PR (integration only; release requires an authorised `v*` tag push). **MVP launch follows M8.**

## Overview

| # | Name | Size | Main FRs | Human prerequisites |
|---|---|---|---|---|
| M0 | Repository, CI, infrastructure | S | NFR-5/10/11 | SETUP §§1, 2, 3 |
| M1 | Data foundations: taxonomy, ATS public API + JSA IVI ingestion, extraction, metrics, coverage, signals, job runtime | L | D1–D7, X3 | SETUP §6 (JSA permissions) |
| M2 | Public board: ticker cards, metrics, rule filters, compare | L | M1–M6, F1–F5, D2–D5 | — |
| M3 | Accounts, onboarding, skill profiles, watchlist | M | A1–A3, A8, O1–O6, W1–W3, F6 | SETUP §§4, 5 |
| M4 | Gap diagnosis, privacy, deletion/export, legal pages | M | G1–G3, A4–A6, C11 (model) | — |
| M5 | Practitioner registration, work-email verification, slots, review queue | M | P1–P6, X2 | — |
| M6 | Full coffee-chat lifecycle: candidates, requests, state machine, timeouts, email, reminders, attendance | L | C1–C10, R2, W4 (signal alerts) | SETUP §4 (Resend can reach test addresses) |
| M7 | Debrief, reporting/blocking, administration, reliability, security hardening | M | R1, A7, X1, X4, C10 | — |
| M8 | Launch: domain, production configuration, observability, performance/accessibility audit, runbooks, supply gate | M | NFR-1/3/7/8 | All SETUP §7 plus domain, Sentry, uptime monitoring, Vercel commercial-use decision |

**Current position (2026-10-23)**: M0 complete locally. Seven frontend prototype rounds (FE-R1–FE-R7; `docs/PROGRESS.md`) followed, so most M2–M7 interfaces already have prototypes using synthetic market data and a browser demo backend. Start real-data integration at M1 (ATS public APIs + JSA IVI), then connect each page to Supabase.

Dependencies: M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8. M4 and M5 are independent and may swap; M5 can start immediately after M3.

---

## M0 — Repository, CI, infrastructure (S)

**Goal**: an application shell running locally, in CI, and in Vercel previews, with a complete toolchain and quality gates.

**Coverage**: NFR-5, NFR-10, NFR-11; FR-A8 (i18n skeleton).

**In scope**
- Initialise Next.js 16 + TypeScript strict + pnpm + Tailwind v4 + shadcn/ui; `output: 'standalone'`.
- Export `APP_NAME` from `src/config/app.ts` (read `APP_NAME`, default `skill-market`; `brewdex.app` release uses `Brewdex`); ESLint prohibits literal product names elsewhere in `src/`.
- Single-locale `next-intl`; `messages/en.json`; scoped `react/jsx-no-literals` rule prohibits inline English JSX copy.
- Zod environment validation in `src/env.ts`, separated into server/client groups.
- Supabase CLI: `supabase init`, local `supabase start`, first migration (profiles, `handle_new_user` trigger, RLS, `is_admin()`), type-generation script.
- Test skeletons: Vitest example, pgTAP positive/negative profiles RLS cases, Playwright homepage + axe.
- Scripts: `pnpm verify`, `pnpm test:db`, `pnpm test:e2e`, `pnpm db:reset`, `pnpm types:gen`.
- Actions: `ci.yml`, `migrate.yml` (manual: PR branch → project 2; main → production environment approval).
- `/` displays `APP_NAME` and "coming soon"; `/api/health`.
- Local startup instructions in `README.md`.

**Out of scope**: business tables and components beyond the UI library.

**Tasks**
1. Scaffold and lock dependencies; `.nvmrc` / engines.
2. Tailwind semantic theme tokens, light/dark modes.
3. Local Supabase and migrations; enable `pg_cron`, `pg_net` in `supabase/config.toml`.
4. Three testing layers and scripts.
5. CI and branch-protection instructions (user configures GitHub; implementer documents steps in README).
6. Session refresh in `proxy.ts`; `src/lib/supabase/{server,client,admin}.ts`.

**Dependencies**: none.

**Acceptance**
- Local `pnpm verify` passes with zero errors (lint, typecheck, unit, pgTAP, build).
- `pnpm test:e2e`: homepage 200, title includes `APP_NAME`, no serious/critical axe issues.
- PR `ci.yml` green; Vercel preview homepage accessible.
- `grep -rn "skill-market" src/` finds only the default in `src/config/app.ts`.
- `supabase test db` passes after `supabase db reset`.

**Human prerequisites**: SETUP §1 GitHub, §2 Supabase (Sydney projects `skill-market`, `skill-market-dev`), §3 Vercel; add §2 variables to `.env.local` and Vercel; add `APP_NAME`, `NEXT_PUBLIC_APP_URL`, `JOBS_SECRET` to `.env.example` (PROGRESS.md).

---

## M1 — Data foundations (L)

**Goal**: ingest ads and official series from fixtures and real sources, extract features, calculate metrics by cell, and detect signals through the job runtime; expose pipeline status to admins. **Enable daily production collection immediately on completion**, building snapshots from day one.

**Coverage**: FR-D1, FR-D4 (threshold), FR-D5 (source types), FR-D6, FR-D7; FR-X3.

**In scope**
- Migrations: instruments (five-type enum), `instrument_aliases`, `instrument_relations`, locations, `metric_cells`, `metric_definitions`, `metric_points`, `data_sources`, employers, `ingestion_runs`, `job_ads`, `job_ad_skills`, `job_runs`, global signals, `feature_flags`; RLS on all.
- Seeds: ~150 `skills.yaml`, ~25 ANZSCO `roles.yaml`, `locations.yaml` (AU country/states/capitals/major cities; Australia only), `data_sources`; `pnpm seed`.
- `src/lib/metrics/registry.ts`, `pnpm metrics:sync`, CI consistency check.
- Source adapter interface, `FixtureSource`, `AtsAdsSource` (Greenhouse / Lever / Ashby; lightweight list polls, details for new IDs, new/closed detection), `JsaIviSeries` (download/parse CSV/XLSX), `AscTaxonomy` (initial role weights); no initial NERO / SPL.
- Hourly `poll-ats`, `fetch-ats-details`; adapt cadence by employer posting rate λ (`employers.post_rate`, `next_poll_at`); identifiable User-Agent, staggering, 429 backoff (architecture §6.7).
- Employer registry/seeds: ASX 200, Big Four, banks, universities, government, Australian tech firms; record ATS and public endpoint.
- `compute-coverage`: compare ANZSCO4 × state × month with IVI for `coverage_ratio`; reweight skill `share_of_ads` (§6.8).
- Versioned seniority / work_mode / work_rights / dictionary extraction; ~500 `fixtures/ads/*.json`, 200 manually labelled ads, regressions.
- SQL: `assign_metric_cell`, `compute_metric_points(date)`, `compute_relations()`, `detect_signals()` for global default cells.
- Job runtime: `/api/jobs/[job]`, leases, shard cursors, `pnpm job <name>`; `pg_cron` migration using Vault URL/secret.
- `/admin/pipeline`: ingestion/job runs, last `compute-metrics`, highlighted failures; repeated-failure email (create outbox now, log mailer until M6).
- Add pipeline freshness to `/api/health`.

**Out of scope**: student UI, watchlist-level signals (M3), NZ data.

**Tasks**
1. Taxonomy/location migrations, seeds, `resolve_instrument(text)` alias normalisation.
2. Adapter interface and fixtures; run the complete fixture pipeline.
3. Three ATS adapters: polling, cross-source deduplication, new/closed detection, adaptive cadence, backoff, personal-information removal, `ingestion_runs.stats`.
4. Extraction rules, labelled set, precision/recall report `pnpm extraction:report`.
5. Cell assignment and `compute_metric_points`; pgTAP fixture values for `share_of_ads`, `entry_level_share`, `no_pr_required_share`, `employer_concentration`, `change_4w`.
6. IVI → monthly role `metric_points`; ASC → `role_has_skill`; coverage and reweighting.
7. Job runtime, `pg_cron`, Vault; `job_runs` idempotency tests.
8. Global `detect_signals()` and threshold flag.
9. Admin pipeline page guarded by `is_admin()`.

**Dependencies**: M0.

**Acceptance**
- `pnpm verify` passes.
- `pnpm job poll-ats --source=fixture && pnpm job fetch-ats-details --source=fixture && pnpm job extract-features && pnpm job compute-metrics` succeeds on an empty local DB; `select count(*) from metric_points` > 0.
- `pnpm test:db`: hand-calculated fixture values equal `compute_metric_points` for at least 5 metrics × 3 cell combinations.
- Running a job twice leaves `job_ads` and `metric_points` row counts unchanged.
- `pnpm extraction:report` reports rule precision/recall; seniority and work_rights precision ≥ 0.85 on the labelled set.
- `pnpm metrics:sync --check` confirms registry/`metric_definitions` consistency.
- `pnpm job poll-ats --max-employers=5` reports real ATS HTTP statuses and job counts (counts only).
- Unit tests schedule high-activity fixture employers hourly, low-activity employers daily.
- Fixture `coverage_ratio` matches manual values; low-coverage cells generate no signals.
- `/admin/pipeline` shows recent runs to admins; returns 404 otherwise.
- Production `select jobname from cron.job` lists jobs; the user verifies new `ingestion_runs` the next day in Supabase.

**Human prerequisites**: pre-M1 SETUP §6 (JSA dataset URLs/licences); add `jobs_url`, `jobs_secret` to Vault (implementer supplies SQL; user executes).

---

## M2 — Public board (L)

**Goal**: anonymous board browsing, search, full skill/role pages, metrics, rule filters with natural-language readback, and two-instrument comparison; every number has definitions and sources.

**Coverage**: FR-M1–M6, FR-F1–FR-F5, FR-D2–FR-D5; NFR-1, 2, 3; PRD §10 principles 1, 2, 5, 7, 9.

**In scope**
- `/`, `/market`, `/s/[slug]`, `/r/[slug]`, `/compare`, `/search`, `/metrics/[key]`, `/sources`.
- `TickerRow` / `TickerCard` / `TickerPage`, `ChangeBadge`, `MetricDefinitionPopover`, `SourceBadge`, `MetricSwitcher`, `FilterRuleBuilder` + `FilterReadback`, `SparklineSvg`, `TrendChart` + table, `SampleWarning`, `CompositionList`.
- `expandFilterToCells`, `aggregateForFilter`, `describeFilter`, `filterHash`; all filter state in URLs.
- Role fundamentals (component/co-occurring skills; NERO/SPL later).
- Real job events in ticker and instrument "new today"; timestamps on all data surfaces (architecture §6.7, DESIGN §8).
- ISR + `revalidateTag('market')` after `compute-metrics`.
- Compare: same metric, shared/unique co-occurring skills, entry-level share, sample sizes; textual rules for relevance/transferability/effort, no scores.
- Cookie `ui_mode` switches terminology.
- Anonymous `analytics_events`: `market_viewed`, `instrument_viewed`, `metric_switched`, `filter_changed`, `definition_opened`.

**Out of scope**: auth, watchlist, functional chat booking (until M6, show explanation and practitioner recruitment link).

**Tasks**
1. `InstrumentSnapshot` and query layer (≤ 3 queries/page).
2. Three ticker sizes and `ChangeBadge` with mandatory absolute counts.
3. Registry-driven metric selector, available-window checks, definition popover.
4. Rule filters: location tree, progressive disclosure, readback.
5. Dynamically loaded Recharts trends, SVG sparklines, tables, insufficient samples.
6. Reciprocal role/skill navigation and fundamentals.
7. Compare page.
8. Alias-normalised search.
9. ISR/revalidation; non-blocking Lighthouse CI.
10. 375px layouts and axe fixes.

**Dependencies**: M1 data.

**Acceptance**
- `pnpm verify`, `pnpm test:e2e` pass. Journey: anonymous `/market` → `/s/python` → switch metric → second filter rule → correct readback → role → skill, within two hops.
- Unit tests: cell hierarchy expansion, union deduplication, empty rules; ≥ 6 `describeFilter` snapshots; registry validity (`salary_median` unavailable for skills).
- Every percentage has ⓘ; e2e counts `[data-metric-value]` == `[data-metric-definition]`.
- For `sample_n < min_sample`, no `<svg data-trend>`; show `SampleWarning`.
- Mobile `/s/[slug]` LCP < 2.5s with local `next start` and simulated 4G.
- Zero serious/critical axe issues across six pages.
- Archive 375px e2e screenshots.

**Human prerequisites**: none.

---

## M3 — Accounts, onboarding, skill profiles, watchlist (M)

**Goal**: students sign in, complete ten-second Tier 0 and sixty-second Tier 1, manage inferences, and watch instrument + filter entries with since-added changes and signals.

**Coverage**: FR-A1, FR-A2, FR-A3, FR-A8; FR-O1–FR-O6; FR-W1–FR-W3; FR-F6; PRD §10 principles 3, 4.

**In scope**
- Supabase magic links + Google; `/auth/login`, `/auth/callback`, `/auth/signout`; age 18+ checkbox and consents.
- Migrations: `student_profiles`, `student_skills`, universities, `course_units`, `course_unit_skills`, `degree_skill_priors`, `watchlist_items`, `signals.watchlist_item_id`, consents, `email_preferences` (used M6); RLS/pgTAP.
- USYD Eng&IT degrees and ~60–80 unit-skill mappings (`units.yaml`).
- `/onboarding` Tier 0 (anonymous cookie draft) → Tier 1; always skippable.
- Degree × year priors + unit maps → `student_skills(source=inferred, confidence)`.
- `/me/skills`: confirmed / suggested / next steps; one-click confirmation/removal; FR-O6 empty state.
- `/me`: watchlist rows, since-added changes, signals, chat placeholder.
- Watchlist actions; item-level `detect_signals()`.
- Preview Supabase Auth SMTP through Resend.

**Out of scope**: visibility/export/deletion (M4), email alerts (M6).

**Tasks**
1. Auth/session guards; Inbucket magic links in e2e.
2. Student profile/skill tables and RLS.
3. Unit seeds and pure inference functions; prior/confidence/deduplication tests.
4. Two-tier onboarding and cookie-draft merge.
5. Skills page and empty state.
6. Watchlist actions, `/me`, baseline and since-added calculations.
7. Watchlist signals and highlighting.

**Dependencies**: M2.

**Acceptance**
- `pnpm verify`, `pnpm test:db`, `pnpm test:e2e` pass. Journey: anonymous Tier 0 → Suggested skills → sign in → merge draft → select three Tier 1 units → remove inference → watch with two filter rules → `/me` entry/readback.
- pgTAP: A cannot read B's skills/watchlist; anonymous users read no profiles.
- Unit tests: confidence [0,1], confirmation sets `source=confirmed`, removal prevents reinference via dismissed record.
- `/me/skills` DOM contains no `%`, rank, or score (e2e).
- User manually verifies Google test-account sign-in in preview once.

**Human prerequisites**: SETUP §4 Resend key/SMTP; §5 Google OAuth Testing with test addresses.

---

## M4 — Gap diagnosis, privacy, deletion/export, legal pages (M)

**Goal**: at most three explained next steps for a target role; field visibility; export/deletion; privacy, terms, conduct, reliability pages.

**Coverage**: FR-G1, FR-G2, FR-G3(S); FR-A4, FR-A5, FR-A6; FR-C11 data model.

**In scope**
- `/me/gap?role=` compares components/profile; priority = weight × entry-level suitability × transferability × not-held; ≤ 3 explained items, unit-learning paths reverse-looked-up from `course_unit_skills`.
- `field_visibility` JSON and `/me/settings` controls; defaults architecture §12 #24.
- `requestExport`: JSON in private Storage bucket, 24h signed URL, outbox notice.
- `requestDeletion`: immediate soft-delete/anonymisation + `account_deletions`; SQL `purge()` and `pg_cron`; 30-day cancellation window.
- Four `/legal/*` pages drafted in English by implementer, marked "Legal review required"; purpose notices at collection points.
- Persist `ui_mode` to profile.

**Out of scope**: practitioner fields (M5).

**Tasks**
1. Pure gap diagnosis/tests, including few-skills and all-held cases.
2. Progress-framed gap UI without percentages.
3. Visibility model/settings.
4. Export/deletion, purge, pgTAP: no related personal records remain within 30 days.
5. Legal pages and purpose notices.

**Dependencies**: M3.

**Acceptance**
- `pnpm verify`, `pnpm test:db` pass.
- Unit tests produce ≤ 3 priorities, each with four reason fields.
- pgTAP purge of expired users removes their profiles, `student_*`, watchlist, signals, consents; unexpired users unaffected.
- E2E: visa field self-only → export includes it → request deletion → cancellation notice after sign-in.
- `/legal/privacy` lists all cross-border recipients from architecture §8.2.

**Human prerequisites**: none; legal review may wait until M8.

---

## M5 — Practitioner experience (M)

**Goal**: registration, work-email verification, skills/entry year/topics/monthly cap, weekly availability templates/pause, admin review queue.

**Coverage**: FR-P1–FR-P6; FR-X2.

**In scope**
- Migrations: `practitioner_profiles`, `practitioner_skills`, `practitioner_topics`, `work_email_verifications`, `availability_templates`, `availability_slots`, `rate_limits`, `check_rate_limit()`, `practitioner_cards` view; RLS/pgTAP.
- `/practitioner/join`: existing Auth → work-email code (Resend; free-provider denylist) → profile → availability template → meeting link.
- `generate-slots` SQL, `pg_cron`, time zones.
- `/practitioner`: status/pause/cap/templates; requests arrive M6.
- `/admin/review`: manual approve/reject for failed verification/denylisted domains.
- Codes limited to three/hour.

**Out of scope**: receiving requests (M6).

**Tasks**
1. Tables/views/RLS: `practitioner_cards` exposes allowlisted columns to authenticated users only.
2. Verification hashes/expiry/rate limits with unit/pgTAP tests.
3. Profile/topic forms; reuse alias search for skills.
4. Template-to-slot SQL and pgTAP: month boundaries, DST, expiry cleanup.
5. Dashboard/pause.
6. Admin queue.

**Dependencies**: M3 Auth; may run alongside M4.

**Acceptance**
- `pnpm verify`, `pnpm test:db` pass.
- E2E: register → Inbucket code → verify → profile → Tuesday 18:00–19:00 template → four weeks of slots → pause removes user from `practitioner_cards`.
- pgTAP: anonymous/unverified practitioners excluded; students cannot read verification records; fourth `check_rate_limit` returns false.
- Unit tests: gmail/outlook and other free domains rejected into review queue.

**Human prerequisites**: none; Resend configured in M3.

---

## M6 — Matching and complete coffee-chat lifecycle (L)

**Goal**: ≤ 3 explained candidates and starters from signals/instruments; requests, accept/reschedule/decline, quiet replacement after 72h, confirmation email/ics/reminders, attendance/reliability, empty-match fallback, signal email.

**Coverage**: FR-C1–FR-C10, FR-R2, FR-W4 signal alerts; PRD §8.2 failure paths; §10 principles 6, 8.

**In scope**
- Migrations: `chat_requests`, `chat_request_events`, `attendance_confirmations`, `reliability_records`, `waitlist_entries`, blocks (create now), `notifications_outbox` (extend if present); `transition_chat_request()`, `expire_chat_requests()`, `schedule_reminders()`, `pg_cron`.
- `findCandidates`, scoring/reasons, adjacent-skill → waitlist fallback; `generateStarters`.
- Four-step `/chat/new`; `createRequest` validates slot/cap/blocks/rate limit/`booking_enabled`; snapshot `student_visible_fields`.
- Two perspectives in `/chat/[id]`; practitioner accept/decline/propose reschedule; student accept reschedule/cancel.
- React Email templates × 8: request_received, accepted, still_looking, reschedule_proposed, reminder_24h, `post_chat_debrief`, attendance_l2, waitlist_available, signal_alert; `dispatch-outbox`, Resend adapter, daily quota queue.
- ics generation, preparation templates.
- Both-party attendance → completed / `no_show_*` → `reliability_records` → pause rules.
- Practitioner request list and `/me/requests`.
- Signal toggle in `email_preferences`; digest Post-MVP.

**Out of scope**: L0 UI (M7; post-chat email already links there), reports (M7).

**Tasks**
1. Requests/events/state-machine SQL plus pure equivalent and shared-transition-table cross-checks.
2. Matching/fallback tests: every factor, cap, blocks, pause, adjacent skills, empty → waitlist.
3. Starter templates/tests.
4. Request UI.
5. Practitioner actions/UI and rescheduling.
6. Outbox/dispatch/Resend/templates (`pnpm email:preview`).
7. Timeout/reminder SQL, `pg_cron`, pgTAP with injected `set_config('app.now')` time.
8. Attendance/reliability.
9. Waitlist and booking gate.

**Dependencies**: M5, M4 visibility.

**Acceptance**
- `pnpm verify`, `pnpm test:db`, `pnpm test:integration`, `pnpm test:e2e` pass.
- E2E: `/s/python` → Talk to someone → three seeded candidates → slot/question → request → practitioner accepts → both Inbucket confirmations include ics → student sees confirmed.
- Decline immediately shows alternatives without "declined" / "rejected" copy. `pnpm job expire-requests --now=<+73h>` expires pending requests, opens slots, queues still_looking.
- pgTAP rejects illegal transitions such as `declined → accepted`; students cannot accept their own requests; practitioners see only request visibility snapshots, not student profiles.
- Unit tests: ≤ 3 candidates; exclude capped/blocked practitioners; empty result has `fallback.kind = 'waitlist'`.
- Integration: mock Resend failures retry/back off; emails beyond 100/day remain queued.
- Reviewer checks reassuring pending copy against §10 principle 8.

**Human prerequisites**: verify preview Resend reaches the user's own mailbox under onboarding-domain restrictions; supply two test practitioner addresses (aliases on one domain allowed).

---

## M7 — Debrief, reporting/blocking, administration, security (M)

**Goal**: one-click L0, reporting/blocking, admin report handling/suspension, funnel dashboard, published no-show/conduct rules, complete rate limits/CSP.

**Coverage**: FR-R1, FR-A7, FR-X1, FR-X4(S), FR-X5(S, alias maintenance), FR-C10 published rules; NFR-5.

**In scope**
- `debrief_votes`, `/chat/[id]` voting, personal instrument history ("You chatted on {date} · More interested").
- reports/blocks actions on requests/candidates; matching excludes blocked users (reserved in M6).
- `/admin/reports` handling/suspension/restoration; `/admin/metrics` SQL views for activation/matching/attendance/North Star; `/admin/taxonomy` alias editing.
- `/legal/conduct`, `/legal/reliability` copy and entry points.
- CSP/security headers, all Server Action rate limits, `pnpm audit` threshold, gitleaks.

**Out of scope**: L1/L3 and aggregate sentiment (Post-MVP).

**Tasks**
1. Votes/RLS/UI/personal history.
2. Reporting/blocking flows and pgTAP.
3. Three admin pages.
4. Security headers/rate-limit audit; execute `security-review` checklist.

**Dependencies**: M6.

**Acceptance**
- `pnpm verify`, `pnpm test:db`, `pnpm test:e2e` pass.
- E2E: completed request → email link → one-click vote → history on `/s/python`; report practitioner → admin suspends → excluded from candidates.
- pgTAP: own votes/reports only; non-admins cannot change `reports.status`.
- Production-build `curl -I` includes CSP, HSTS, X-Frame-Options.
- Seeded `/admin/metrics` funnel nonempty.

**Human prerequisites**: none.

---

## M8 — Launch preparation (M)

**Goal**: public-ready production: domain/email/Google Production, observability, backups, performance/accessibility audits, runbooks, supply gate, checklist. **Completion marks MVP launch; merging main requires user approval.**

**Coverage**: NFR-1, 3, 4, 7, 8, 9, 11; FR-X3 alerts.

**In scope**
- Sentry if approved, scrubbing, pino field conventions.
- Vercel `syd1`, domain/`NEXT_PUBLIC_APP_URL`, Resend SPF/DKIM, production Supabase SMTP/redirects.
- `backup.yml`; `docs/runbooks/` for deployment, rollback, breaches, pipeline failures, deletion requests.
- Blocking Lighthouse CI, full axe, 375px walkthrough.
- SEO/OG, `robots.txt` disallowing `/me`, `/chat`, `/admin`; public-instrument sitemap.
- Admin booking gate/home copy; recruitment and waitlist while disabled.
- `docs/LAUNCH_CHECKLIST.md`: legal review, Google Production, Vercel commercial-use decision (Pro/migration), monitoring, alert address.
- `CHANGELOG.md`.

**Out of scope**: new features.

**Tasks**
1. Observability/alerts.
2. Production/domain switches (code changes limited to environment/configuration instructions).
3. Backups/runbooks.
4. Performance/accessibility fixes.
5. SEO/robots.
6. Checklist/supply gate.

**Dependencies**: M7.

**Acceptance**
- `pnpm verify` and all tests pass; blocking mobile Lighthouse LCP < 2.5s in CI.
- Production `/api/health` 200; `/s/python` mobile Lighthouse ≥ 90 performance, 100 accessibility.
- Production magic-link email arrives from owned domain, SPF/DKIM pass (user checks).
- All production `cron.job` enabled, successful `job_runs` within 24h.
- User confirms every launch-checklist item.
- Backup workflow succeeds at least once.

**Human prerequisites**: all SETUP §7 (domain, Resend DNS, Google Production, Sentry), free uptime monitoring, Vercel commercial-use decision, legal review; enable booking at ≥ 30 practitioners.

---

## ▶ Public MVP launch (M8 complete, user approves merge into main)

---

## Post-MVP iterations (order may change)

| # | Name | Size | Main FRs | Human prerequisites |
|---|---|---|---|---|
| M9 | Weekly/monthly digests and watchlist alerts | S | FR-W4 | Outbox exists; add templates/preferences |
| M10 | L1 debrief prompts and aggregate sentiment | M | FR-R3, R4 | Hide aggregates below threshold; instrument analyst-view panel |
| M11 | Seasonal/application-period defaults | M | seasonality; ≥ 2 years, IVI enables roles first | Role version possible immediately using IVI |
| M12 | ~~NZ and international markets (shallow)~~ Deferred | — | PRD §5.2 | Australia-only user decision, 2026-10-21 |
| M13 | Resume Tier 2 and progressive Tier 3 | M | FR-O7 | Manual confirmation and PII removal |
| M14 | Industry/employer/credential instruments | L | PRD §5.2 | Model supports them; new sources/page variants needed |
| M15 | Async Q&A fallback (C), L3 semi-public summaries | M | FR-C6(C), R5 | Mutual consent |
| M16 | LinkedIn sign-in, institutional career-centre edition | L | PRD §5.2 | Company page and partnership agreements |
| M17 | Vercel → Cloudflare / containers if not upgrading to Pro | S | NFR-11 | OpenNext or standalone |
