# FE-R7 review

Scope dev...fe-r7,1c37d84/84a958e/8fdf97e; remove board Filter/legacy f, visible Measure label; DESIGN/GLOSSARY/PRD10/CLAUDE. No E2E by preference.

## Round 1 — Return for changes

lint/typecheck/unit clean,26 files/281 tests; next-env unchanged.

Verified:
- `canonicalMarketQuery` only nonempty f, removes it, preserves type/sort/view/metric/layer/q including Watching, no loops, tested.
- `DEFAULT_FILTER` everywhere, row links no f; type/reset/keep no f.
- Compare provider/href no f, tests updated; compare default `FilterBar` intact; detail title key independent removed `Filter.button` keys.
- Accessible Measure: Demand and `SharedMetricSelect` Measure label retained.
- Removed `sharedMetricHint`/`filterScopeLabel`/`Filter.button`/`buttonLabel`/`buttonLabelActive`/`scopeReset`/`activeConditionCount` have no references; home/desk/onboarding/not-found/signout/people links clean.

### Required fixes (blocking)

1. instrument-view57/59 breadcrumbs still hrefWith market f/type,f. Extra redirect after detail filters violates no-generated-f links. Use `/market` and type only.
2. search90/128/143 Browse-all/empty still market f. Use `/market`; retain search's own f at 84/95/114 for detail links.

### Suggestions (non-blocking)

- Stale E2E must update before main: frontend103–121 removed Filter/readback/Reset → assert legacy role/f redirects role only; round 2:35–58 remote/Advanced via detail/compare; frontend90/196 Measure regex needs optional colon; responsive38 f-only redirect redundant.
- market121/watching83 empty q still Clear name filter no-op; show only if q.
- watching31 page-filter comment obsolete, prop always default, can inline constant.
- logic225 empty `?f=` persists; canonicalise presence if desired.
- redirect307 could permanent308 for legacy canonicalisation.

## Round 2 — Pass

Scope 8fdf97e..fe-r7,2080a2f/c66bfa8. Clean lint/types,26 files/282 units; no E2E by preference.

Blockers fixed via `marketHref()`/`marketHref(type)` breadcrumbs and three search links; search f still only search/details.

All src market links searched, none f; remaining hrefWith only page43–44 keep without f and helper. `marketHref` tests default/all/role/watching. Clear-name only q, otherwise Nothing on this board right now.

### Required fixes (blocking)

None.

### Suggestions (non-blocking)

Round-one stale frontend103–121, round 2:35–58, frontend90/196 Measure regex remain before main. Old watching comment/empty f/optional308 remain, no result impact.
