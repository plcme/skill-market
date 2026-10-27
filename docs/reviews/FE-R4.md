# FE-R4 review: homepage/market/people cleanup, whole-cell Fundamentals links, primary Watch

Scope dev...fe-r4-cleanup,8 commits e500a13..85012e4; eight user requests, DESIGN, PRD10/NFR-3 WCAG2.2AA, CLAUDE. No E2E per user preference.

## Round 1 — Return for changes

lint/typecheck/unit passed:23 files/243 tests, zero errors. next-env unchanged, clean worktree.

Passing:
- Market PageHeader/SignalsStrip removed, sr-only h1 retained; `getSignalsNow`/test:189 remains; strip file/no references, `useSignalMove`/`SignalTag` used elsewhere.1px sr-only still passes visible-heading test.
- Hero kicker/date import removed; What we won't do and People How it works keys/references removed; `Home.howKicker` retained.
- Shared PractitionerJoinCard `People.join*`/`PractitionerCta` routes existing practitioners to desk, h2 correct.
- Movers one h3 stretched-link/name, after focus/hover, prev/next, reduced-motion no rotation, focus/hover pause with `relatedTarget`, live unchanged.
- Fundamentals absolute link per cell, Show metric at top label includes visible metric, `aria-current`/inset; ⓘ relative z10, no nested interactions/positioned MetricValue/SourceBadge. scroll-mt24 respected. `onClick` scroll before Link `preventDefault`/transition; scroll false prevents segment/hash competition, `pushState` no scroll. No `loading.tsx`, old UI/now persists until RSC; metric-independent header stabilises target. Current cell hash-only no server; modifier clicks no scroll.
- Watch defaults identical dev size/variant108px/chevron/icon; prominent accent unwatched/outline watched, skill flex1/cn padding.
- Header375 full-width single column/wrapping links; lg auto/sm340px. Talk label starts visible text, existing industry E2E regex matches; global focus rings; `talkNote` removed.
- New `talkShort`/`showMeasureLabel` central; dates removed but windows behind ⓘ, Sources and method retained; no ranking/deficit.

### Required fixes (blocking)

1. movers-carousel.tsx:71–80 touch cannot stop eight-second autoplay after pause button removal; hover absent, iOS taps do not focus, violates WCAG2.2.2 and NFR-3. Without restoring button: auto only hover:hover/pointer:fine (with reduced motion/`useSyncExternalStore`), or stop for session after any pointerdown/prev/next. If user explicitly accepts risk, record decision before downgrading.
2. `frontend.spec.ts`:214–223 still expects removed `Resume rotation` at 219, guaranteed future full-suite failure. Replace with reduced-motion/static, Next advances, h3 link correct s/r/i. Suggested Fundamentals E2E metric URL/now visible/`aria-current`.

### Suggestions (non-blocking)

1. measure-cell-link:53–57 scrolls now but focus remains below, next Tab returns, readers miss update. Focus now-h tabindex−1 `preventScroll` after navigation, or live announce measure.
2. instrument-view:610–617 13px links~20px, spacing exception2.5.8 valid but small; py1/min-h6.
3. measure-cell-link:9–16 duplicates reduced-motion helper; share in lib, cleanup only.
4. practitioner-join-card:6 unused `className` prop optional cleanup.

## Round 2 — Pass

Scope 85012e4..fe-r4-cleanup,10 commits e247e26..650e6cf. Lint/types clean. Initial auth5s timeout at load 5.7 in unchanged file; isolated6/6, full rerun24 files/251 passed, load flake. No E2E by preference, specs synced. next-env unchanged.

Blockers:
1. Autoplay only fine hover/no reduced motion; SSR false. Pointerdown/keydown/prev/next permanently stops session, hover/focus pause, stopped live polite announces manual flips. Mouse/keyboard pause, touch no rotation, compliant.
2. Resume expectation removed; h3 href s/r/i checked.

Suggestions adopted: focus now-h `preventScroll`/tabindex−1, link py1, shared prefersReducedMotion.

New scope:
- `TitleFilter`/FilterBar label "{in + sentence}. Change filter", visible-name compliant; Radix popup/expanded/controls. React19 ref passes rest to button. Apply closes/refocuses stable title before transition; no filter-key remount or searchParams Suspense reentry; Esc/close same.375 inline-block wraps with h1 `break-words`; E2E updated.
- `useSetParams` copies parameters, changes f only, retaining metric/y/by; E2E Reset+Apply preserves salary/mode.
- Market button variant unchanged; no regression.
- Sticky readback anchored `SheetContent` overflow-y-auto px5/py5; negative top/margins compensated by padding, matching surface/z10 hides underlying text. Shared phone/desktop; only FilterBar/watchlist callers, both sheets.
- Order rights→level→places/mode/remote→Advanced. Unnarrowed fixed All Australia pill/Narrow to state or city; narrowed chips/Add another place. Last removal returns au in simple/advanced, `placeRequired` safely gone. `PICKABLE_LOCATIONS` AU states/cities/areas tested.
- NZ removed from locations/weights/salaries/seeds (Brisbane)/time zones, no supabase/scripts/messages remnants. Old nz IDs filtered; empty rule normalises default safely.
- `fixedSplitDimensions`: seniority without other fixes experience; single rights fixes rights; all pairs one mode fixes mode. `effectiveSplit` unsplits conflicts; disabled with reason. Unit entry/graduate/single/two modes/remote/npr. `graduateOnly` obsolete and removed.
- No references to removed `isAllAustralia`/`clearScopeCondition`/`resetPlaces`/instrument-places/`ScopeChips`/places keys/scope/graduateBucket/`filteredToGraduate`/`placeRequired`/`addPlace`. `levels.country` removed; unused `INDENT` country harmless. Six work-mode copy combinations complete.

### Required fixes (blocking)

None.

### Suggestions (non-blocking)

1. User decide npr Work-rights split. Two remaining `not_stated`/`sponsorship_ok` buckets semantically valid, `filtered_to` works, but sponsorship6% (engine157) often thin, effectively one band. Keep or disable npr rights with Fixed by your filter; pending decision.
2. `titleFilterLabel` says Sydney + remote · On-site or hybrid for `oh.au-nsw-sydney*r.au_entry_npr`, contradictory. Put modes before places or omit mode segment with remote-anywhere.
3. filter-builder251 hardcoded `SheetContent` padding negatives fragile elsewhere; fixed readback slot or document sheet-only.
4. chart70 invalid by stays in URL: effective next/by both null so selecting None cannot clear mode; broadening filters revives split. Could treat as feature or canonicalise `by=none`.
