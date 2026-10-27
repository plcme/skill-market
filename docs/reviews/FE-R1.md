# FE-R1 review (frontend feedback round 1, batch A, `fe-feedback-r1`)

## Round 1 — Return for changes

Scope: `git diff dev...fe-feedback-r1`, HEAD89e7c8f,4 commits/34 files. A1–A9 from main session; GLOSSARY, PRD§10, CLAUDE quality requirements.

`pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build && pnpm test:e2e` passed in one run, exit0. Lint/types zero errors;15 files/137 unit tests; build passed; Playwright44 passed/2 intentionally skipped desktop-only nav/avatar cases on mobile, no serious axe. DB omitted as requested, needs Supabase.

Production start manual checks at 390/700/900/1280: market name column minimum 175px, no collapse; from→to never truncated. Demand popup issue below.

### Required fixes (blocking)

1. metric-info.tsx:45–55, `board.tsx`:42/49, app/page.tsx:90: column/section Demand popup shows an unowned percentage. `BoardColumnHeader` and homepage Most asked-for skills pass first row reading, producing "That’s 30.0% of all 12,604 ads in this filter (share of ads)." On production skill-board/header and homepage,30% belongs to Communication, but it is unnamed.
   - New number appears to describe the entire column/market, violating PRD10.1/FR-D2 numerator explanation. Auxiliary share text must not mislead (GLOSSARY3).
   - Distinguish generic definitions from instrument-specific ones. Optional subject; only show numeric `shareLine` with subject, naming it, otherwise `ad_count.shareLineGeneric` or omit reading. Copy in market.json; test no concrete percentage in column popup.

### Suggestions (non-blocking)

1. Homepage1024 truncates "job ads in28 days" to "job ads in…" in68px columns, four instances, metric-value truncate. Unit/title remain but window lost. `text-pretty` or wider `@xl` value column.
2. Client compare state survives All/Skills/Roles navigation. A selected skill then Roles disables all rows by type while selection is hidden; only Clear helps. Key provider by type or show selected names. compare-select.tsx:35.
3. COMPARE_MAX2 matches a/b route, mixed types prevented, max explained by title, filter retained. Disabled-checkbox title inaccessible to keyboard/readers; put `compareBlockedType`/Max in bottom `aria-live`.
4. `ThemeToggle` SSR light label briefly incorrect on dark systems before effect; CSS icon avoids flash, correct after hydration, minor.
5. Existing unrelated leftovers, non-blocking: mini-board Share of ads; `sample.ts`:27–30 watchlist `share_of_ads` unavailable in selector; outdated API report category/categories/name sorting. Next batch use sample `ad_count` to avoid inaccessible measures.
6. All `share_of_ads` silently defaults to `ad_count`; skill retains unselected share. Both acceptable but inconsistent; document.

### Verified items

- A1: default All, canonical `boardTypeParam`, skill/role valid, explicit skill breadcrumbs.
- A2: filter condition count tested; nondefault readback/Reset; f encoding retained.
- A3/A4: cat/categories/name removed; az/name→value; search first, `sm:w-80`.
- A5: skill default `ad_count`; share selectable false but legacy/detail readings supported; same universeCounts denominator; central messages.
- A6: name minmax150/160; narrow Watch label `sr-only` retains accessible name; axe passes.
- A7: stored system treated unset; `systemDark` ignored for explicit choice; synced protects first paint; theme script extracted/tested; no System/Monitor UI.
- A8/A9: Market/People only, footer Data & safety; compare/sources routes retained; desk absent avatar menu, deduplicated mobile desk tested.

## Round 2 — Pass

Scope: `git diff 89e7c8f..a80ad14`, one commit `fix(market): name the instrument behind Demand's share line and tidy review follow-ups`, related files.

Same full acceptance command exit0: lint/types clean;15 files/138 unit tests including `demandShare`; build;46 e2e passed/2 intended skips. New popup test confirms no unowned percentages.

Round-one handling:
- Blocker fixed: `demandShare`(reading,subject) null without subject, wrong metric/non-ok/zero denominator. Column/home/onboarding/compare headings pass no subject, generic text. Instrument hero/stats/Fundamentals/watchlist pass matching subject and reading; numeric copy names numerator. Unit/e2e covered.
- Suggestion1 `text-pretty`, no truncation.
- Suggestion2 `CompareSelectionProvider` keyed by type resets selection.
- Suggestion3 `aria-describedby` links `sr-only` disabled reason.
- Suggestion5 sample/onboarding Demand/`ad_count`.
- Suggestion6 board/detail accept selectable metrics only; share links default consistently on all three types, tested.

Specific check: does selectable-only behaviour mismatch watchlist values/destinations?
- watchlist.tsx:179/223/232 use instrumentPath without metric already, so links unchanged.
- Rows still compute stored metric, engine supports old share entries.
- Nondefault links already landed on defaults in dev. Old-share mismatch came from A5, not this fix; named share remains one click away in Demand. Non-blocking.

### Required fixes (blocking)

None.

### Suggestions (non-blocking)

1. Old localStorage/future Supabase share entries show percentage then land on count. Either include selectable metric in links or migrate share→`ad_count` and reset baseline; keys alone cannot convert incomparable baselines.
2. metrics/[key]/page.tsx:118 share example still links metric=`share_of_ads`; discarded now,4.1% card lands on count. Link defaults and explain Share of ads is explained under Demand on detail/index; otherwise index presents standalone common measure.
3. Raw-count since-added includes whole-market movement, unlike share. Record product decision: follow Demand or calculate share internally.
