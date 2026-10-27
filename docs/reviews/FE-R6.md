# FE-R6 review: unsplit default, No PR stated fixes rights, Watching tab

Scope dev...fe-r6,31e63ed/2411119; three approved changes, GLOSSARY/DESIGN/PRD10/CLAUDE. No E2E or build per user preference.

## Round 1 — Pass

lint/typecheck/unit exit0,26 files/281 tests. next-env unchanged, no new tracked code changes.

Findings:
- `parseBreakdownBy` missing/none/unknown→null; `breakdownParam` returns as-is. canonical query removes only none/invalid by, preserves others; salary example tested. Reapplication null, no redirect loops; valid experience/default filter untouched. Server redirect307. Fixed splits removed by `nextByParam`/`chosenByParam`, tested. Title/readback already conditional, no default by suffix; no other by link generators.
- npr added to `fixedSplitDimensions`, `splitBlockers` rights filter, panel reason, remove URL rights, effective null, tested.
- Watching parse/typeParam only used market page, metadata/reset/resetFilter/provider tab key correct; `useSetParams` preserves type. DB `useSyncExternalStore` server null, first-client skeleton/no count, no mismatch. No name query: watched slugs count equals rows because same `getInstrument`/catalogue, default All drops none, tested. Client imports contain no `server-only`/intl-server/headers. Central market-pages copy, minimal empty heading/button. Glossary salary matches behaviour.

### Required fixes (blocking)

None.

### Suggestions (non-blocking)

1. market144/watching400 count label reads Watching3 without meaning; sr-only separator/watched wording in messages.
2. watching440 queried rows fewer than total tab count; matching-q explains, document total-count semantics if retained.
3. market180 sends full100-row All,~150KB JSON,41KB instrument metadata including blurb/aliases/anzsco. Acceptable preview, filter server-side/minimise fields after Supabase.
4. watching51 login return fixed Watching loses f/metric/sort/view/q; preserve current query like WatchButton.
5. market133 hides tab scrollbar with no375 cue; focus scroll works, non-blocking; edge fade suggested.
6. Product: held included, consistent glossary but Watching wording excludes mastered/worked literally; user confirm/exclude/rename. Default unsplit skill salary loses Experience safeguard; user approved None, optional definition hint to split by Experience without extra labels.
