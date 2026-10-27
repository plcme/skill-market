# PROGRESS

> Progress ledger; resume here after interruption/context compaction. Maintained by the main session.
> Order: current state → milestones → open decisions → pre-main requirements → frontend rounds → log.

## Further onboarding changes: signup first and separated steps (2026-10-25, `fe-r9`)

- User explicitly requires signup before personalisation: anonymous Get started and direct onboarding go to `/auth/login?next=%2Fonboarding`. Existing preview email-link flow precedes Basics → Skills → Your board, retaining clickable steps. Supersedes no-account direction; still browser demo accounts, no claim of real email/Supabase.
- Step 2 only Skills you probably have, bookmark Watch/red removal per row, WatchAllButton beside section title. Step 3 only Roles that ask for these/Close to what you have, each own Watch all; Market right of main title, final signup/save card removed.
- 357 units/lint/types/production compilation passed. Eight mobile/tablet checks: signup/preview return, steps, three All watched bulk states, delete focus/Undo, content separation, overflow, axe. Initial axe sampled translucent entrance frame; finite-animation wait before audit yielded8/8.
- Independent desktop verified right-side Market/link/no runtime errors; screenshots `/private/tmp/onboarding-skills-separated.png` and `/private/tmp/onboarding-recommendations-separated.png`. User browser control disabled; no claim their tab refreshed.3019 now latest build.
- Flow edits since 869621a not additionally committed/pushed/merged.

## Onboarding flow update (2026-10-25, `fe-r9`)

- Three steps per preview feedback: Basics → Skills → Your board. Skills standalone step 2, degree title; clickable top steps, Skills disabled without basics.
- Units page/entry/explanations removed. No Job ads heading/count; existing WatchButton and red-bordered remove. Old me/skills units link returns basics.
- User removed course selection, so UI no longer implements FR-O2; user-owned PRD not rewritten. Course data, existing unit_codes, contract operations remain; contract UI map marks no entry.
- Lint/types357 units/six mobile-tablet onboarding checks passed; isolated build exit0, same3019 updated/visually checked. Previous50 responsive passes belong to previous commit; this round reran six related cases only.
- Uncommitted/unpushed/unmerged; earlier copy reduction committed869621a.

## Current state (2026-10-24)

- Fuzzy integration synchronised menus/Watch all/trunk rules; await green PR CI before merge, unreleased. Original verification in `docs/FUZZY_SEARCH_IMPLEMENTATION.md`.
- M0 locally complete, cloud pending SETUP. FE-R1–R7 integrated main and released on `brewdex.app`/Cloudflare.
- **Git since 2026-10-23**: only main long-lived; branch→PR→authorised integration merge→separate authorised v* release push. dev discontinued, fully included in main.
- FE-R8 branch/PR20 unmerged: remove homepage, root→market, entry-decided opening/wordmark return, instant page flip; follow-up passed after two returns.
- Interactive prototype, synthetic numbers, browser localStorage users, **no Supabase**.
- **Sources decided2026-10-23**: skills Greenhouse/Lever/Ashby public APIs, roles/coverage JSA IVI; no Adzuna/Workday. No explicit licences from three APIs/IVI; written responses/legal review before commercialisation, SETUP6.
- Daily metric settlement, hourly light polling/adaptive Poisson employer λ; intraday ticker/new-today; Updated today,2:14am surfaces, architecture6.7/DESIGN8.
- Product `Brewdex` confirmed2026-10-23, `brewdex.app` purchased.
- Mac cannot full DB; Windows bridge for DB/pgTAP, CLAUDE local environment.
- User chooses further frontend feedback or real-data M1 next.

## Milestones

| Milestone | State | Notes |
|---|---|---|
| M0 repository/CI/infrastructure | Local done, cloud pending | Draft PR https://github.com/plcme/skill-market/pull/1 |
| M1 data foundations | Not started | SETUP6 JSA permissions,2 Vault |
| M2–M7 | UI prototype, no backend | FE-R1–R7; replace demo data page by page |
| M8 launch | Not started | SETUP7 |

## Pending decisions (open only)

| # | Question | Proposal/current state | Needed |
|---|---|---|---|
| 2 | Sentry EU/error monitoring, PII scrub? | Adopt | Before M8 |
| 3 | Daily schema/public artifact, weekly encrypted full dump? | Accept | Before M8 |
| 4 | Hobby no commercial use: USD20/month Pro or Cloudflare? | Hobby during development, decide at launch | M8 |
| 5 | Low ATS coverage construction/retail/care: disclose or wait for SME sources? | Launch with disclosure | Before M2 launch |
| 6 | Add `NEXT_PUBLIC_APP_URL` `https://brewdex.app`, `ATS_USER_AGENT` contact, `MIN_SAMPLE_N`, optional `SENTRY_DSN`; `JOBS_SECRET` exists | User/Codex update env.example | Before M1 |
| 7 | Unsplit skill median may imply learning returns | Salary-specific split default or caveat | Next frontend |
| 8 | Watching includes held skill/role? | Currently yes | Next frontend |
| 9 | Onboarding default entry-level/no-PR board scope? | — | Next frontend |
| 10 | Role12m official headline versus Job ads chart | Decide after real data | M1/M2 |
| 11 | Demand since-added includes market-wide changes; migrate old `share_of_ads` entries/reset baseline | During backend | M3 |
| 12 | ANZSIC Subdivision or Group | — | Next frontend |
| 13 | Unscheduled opening animation, LinkedIn certificates, Twitter bookmarks, >2 comparison | — | When user requests |
| 14 | Opening only bare entry, deep links results directly | FE-R8 implemented | After preview |
| 15 | Movers UI removed, `getMovers`/`pickMovers`/tests retained | Keep for potential board use | Next frontend |
| 16 | FR-M4: user removes board selector, fixed Demand, detail-only switch; metric legacy links valid | Amend PRD to detail selector | User PRD edit |
| 17 | Bare market Maximum update depth exceeded, dehydrated Suspense, preexisting `bec4f18`, not follow-up; `codex/fix-r8-watch-hydration` may fix | Await Codex, verify before merge | Before PR20 merge |
| 18 | Signed-in dismissed inference returns after degree/unit reinference: `removeSkill` hard-deletes, no rejection record | Accept page-session scope, or add slug-only `student_skill_dismissals`, clearable in settings/skipped reinference. Anonymous `removed_skills` already excluded at merge | Before M3 backend |

Decided, removed from open list: root→market; always-present opening/no seen-cookie/login gate, wordmark top, Market#board; instant directional flip/intercept only opening-board (DESIGN7); no board metric/count line FE-R8,2026-10-25; `Brewdex`/domain, `APP_NAME` default `skill-market`/domain release `Brewdex`; sources ATS+IVI, paid negotiations after customers; polling/update format; future Poisson signals; architecture PRD defaults approved; master level10+ called Expert; skill salary PRD updated; unsplit detail default; npr disables rights split; Watching first; ticker pause button removed.

## Required before main

- [ ] Sync/full E2E `frontend.spec.ts`:90/103–121/196, round 2:35–58, detail-chart, responsive; changed E2E sinceR4 not run.
- [ ] Add `.claude/worktrees/**` `globalIgnores` to `eslint.config.mjs`, avoid scanning nested worktrees.
- [ ] Cleanup merged branches/worktrees after user confirms list.
- [x] SETUP Git updated main+PR previews; Supabase dev retained.
- [ ] FE-R8 opening/flip/nav and responsive opening E2E not locally run; iOS real-device overflow-hidden inertia unverified.
- [ ] User approval before main merge.

Known non-blocking leftovers: all-thin copy/plot mismatch breakdown-section92; disabled storage theme choice fails; one thin bucket inferable; sources `bg-signal-soft`; Watching count reader label, name-filter count mismatch, full All client payload until server filtering; sign-in loses query;375 tab-scroll no cue; contradictory title; fixed by cannot clear URL.

## Frontend rounds

| Round | Date | Branch | Content | Review |
|---|---|---|---|---|
| R1 |09-26| `fe-feedback-r1`,`fe-industry`,`fe-responsive` | Glossary, Market/People nav, Demand/Job ads, industry/i,375/768, neutrality | A one return then pass; B/C2 first pass |
| R2 |10-15| `fe-r2` | DESIGN1, neutral sources, ASC layers, places/AU remote, breakdown | One contrast return then pass |
| R3 |10-21| `fe-r3-chart`,`fe-r3-colours` | Single detail chart/title places/Y/Split, colours/monochrome logo/tagline | Chart one return; colours direct user-approved merge |
| R4 |10-22| `fe-r4-cleanup` | Remove headers/explanations, panel/title filter, AU only | One touch-carousel/E2E return then pass |
| R5 |10-22| `fe-r5` | metric drives headline/chart, Statistics, logos, avatar/My desk, Worked role,11 copy notes | Three rounds; one-line postR3 fix not rereviewed |
| R6 |10-22| `fe-r6` | Unsplit/npr rights fixed/Watching | First pass |
| R7 |10-22| `fe-r7` | No board Filter/f/MEASURE label | One breadcrumb/search f return then pass |
| R8 |10-25| `fe-r8` | No homepage, opening tagline/heatmap, entry-based deep-link omission, wordmark, instant flip, `APP_NAME` docs | Two returns then pass; user-trial follow-up also two returns then pass |
| R9 |10-25| `fe-r9` | Saved card one button, dev `copy-review-v2`/43 onboarding-login entries, removable/Undo/local removed skills, next/role Watch | Pending |

See `docs/reviews/FE-R*.md` and git log.

## Log (newest first)

- 2026-10-25: R8 follow-up passed after two returns (zoom/noncancelable wheel/query removal; streamed late opening/clear-query insertion). New `force-dynamic` market layout owns opening; Tailwind excludes docs. Lint/types382 units/build passed, no E2E.
- 2026-10-25: R8 passed after two returns; merged latest main fuzzy/watch-all/contract-v1; root release check307→market. Lint/types362 units passed, no E2E by preference.
- 2026-10-23: R8 feedback: users lost scrolling homepage, signals distract, Market looked like unused nav detour. Remove homepage, root board, first-visit opening/snap. `NEXT_PUBLIC_APP_NAME`→`APP_NAME` docs, server/`AppProvider`.
- 2026-10-23: Retire dev, branch/PR/main integration/v* release. Sync CLAUDE/architecture3.3/10/milestones/agent definitions; CI no dev, Dependabot main, migrations manual.
- 2026-10-23: Verify ATS/JSA terms: no explicit licence/prohibition in three APIs, no Workday public API, IVI unspecified. Narrow sources; cadence/light polls/adaptive/Poisson/intraday/Updated/bot; domain recorded.
- 2026-10-23: Docs cleanup: remove `product-working-doc-original.md`, `FRONTEND_V2_BRIEF.md`, local coda-feedback; combine SETUP_CHECKLIST/STATUS; remove budget tracking; ATS+IVI sync PRD/architecture/milestones/glossary; routes throughR7; API report FE-R2 snapshot; local-only Windows bridge scripts/docs in CLAUDE.
- 2026-10-22: R5/R6/R7 merged dev/pushed, lint/types280→282 units/build; no E2E by preference. Windows DB ready,13 pgTAP passed.
- 2026-10-22: R4 merged dev/pushed, lint/types251 units/build.
- 2026-10-21: Two R3 branches merged dev; E2E workers1 134 passed/2 skipped. Fable unavailable, all subagents Opus.
- 2026-10-15: R2 merged dev4794852; merged worktrees/branches cleaned.
- 2026-09-27: Data-source research: Adzuna free commercial aggregates prohibited, ATS+IVI proposed.
- 2026-09-26: R1 merged devd63e6b7; user allows any payer, neutrality firewall in PRD/CLAUDE.
- 2026-09-24: `frontend-v2` rebuild interactive design/synthetic engine/all pages; API report.
- 2026-09-22: Local M0 db reset/verify/13pgTAP/integration/Playwright+axe passed; draftPR1.
- 2026-09-19: Initialise; phase1 architecture/milestones done, phase2 after user approval.
