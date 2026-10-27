# FE-R5 review: homepage cleanup, ticker, logos, account menu, copy review, signed direction, role held, unified detail measure

Scope dev...fe-r5,11 commits8b196e9..289ece6; nine approved changes, DESIGN/GLOSSARY/PRD10/NFR-3/CLAUDE. No E2E per preference.

## Round 1 — Return for changes

lint/typecheck/unit exit0,27 files/275 tests. Clean tree, next-env unchanged, no untracked code. Extra scratchpad production webpack build passed without touching repository `.next`. No `copy-review-v1`/active/`Copy decisions`/`data-review-id`/`Clear all copy review` in static/server: production tree-shaking confirmed. Only 25 mapped Simple Icons in~48KB client chunk, not whole library.

Passing:
- Homepage legend sentence removed, swatches/source/window remain; How-it-works and `Home.how*`/step* removed without references. Heatmap size/colour/`thinNote`/`parentName` removed.
- Ticker `AUTO_ADVANCE_QUERY` fine-hover/no reduced motion only; focus/hover pause, `relatedTarget` boundary; any pointer/key stops session; static horizontally scrollable otherwise; duplicate row hidden/tabindex−1. SSR query false, hydration safe; pause/play keys gone.
- Explicit named logo imports fail builds if upstream missing; `InstrumentMark`/`Monogram`/svg decorative hidden/focusable false/`currentColor`; roles/industries letters. CC0/trademarks/nominative documented; remove upon owner objection; mapping/type tests.
- One avatar/My desk/chevron trigger; phone sr-only label, avatar decorative; first menu item desk/current; hamburger primary links only, no duplicate account/signout.
- Review overlay dev-only NODE_ENV, absent production. Inactive `ReviewText` fragment unchanged; server snapshot false/hydration consistent; defensive storage tested.
- direction uses displayed0.1pp, grey only rounded0.0; heat zero exact, no neutral legend; `DirectionGlyph`/`WithGlyph` and reader words, tests.
- `canBeHeld` shared add/update/button/desk, role worked grouping, industry only denied. Role nudge dismissal stored, SSR initially dismissed no flash; role query validated; old role rejection removed/tests.
- Chart plan4w→ads3M, two shaded4w windows/from-to; points total[n−1−4]/total[n−1] match rolling `computeMetric`.12m→ads2Y/two52w, volatility1Y, range/premium→salary, unsupported series→ads. New weekly numerator/denominator slicing matches metrics, own-dimension filter override only; unsplit endpoint=headline tested, thin denominator null, shares0–1 formatted percent≤100.
- Share's own dimension unsplit/disabled Not for this measure. y folds into metric, explicit metric wins; fixed by none or remove Experience, preserve others, converges, tested307. Panel drafts reinitialise each open; Apply f/metric/by/remove y atomically; readback split suffix. Chart cleans by; Fundamentals retains split. Remote mode parentheses remove title contradiction, tested. `MetricSwitcher` still board-used.
- Central copy; hardcoded dev labels justified comment. Chart no Y-axis kicker/pill, only selector/ranges. No rank/deficit; source/window/salary notes retained.

### Required fixes (blocking)

1. instrument-chart123/92–99/111–117, breakdown-chart251: changing measure loses focus, WCAG2.4.3 regression. Trigger is `headerStart` inside `BreakdownChart` keyed metric/by/kind. Radix returns focus, URL detail changes key, unmounts figure/trigger to BODY; thin/normal branches also remount. Keyboard users retab; earlier stable split-trigger work lost; focus-return explicit requirement. Render header outside keyed subtree, or synchronise range without key; common parent position across thin/normal. Verify activeElement remains trigger after URL update.

### Suggestions (non-blocking)

1. Role growth headline official, chart ads with12m shading. Fixtures share origins; real series could oppose, source badge alone does not dispel implied same windows. Omit shading or chart official sequence later; pending.
2. formatChange0.0004 → ■ +0.0%; remove sign on displayed zero, matching direction.
3. Unused `InstrumentChart` type prop/caller.
4. Reader caption lost4w/12m rolling wording; visible days still available, non-blocking; restore.
5. Existing practitioners still Join nudge; hide or desk CTA.
6. Add Worked in this role ↔ held+role glossary and PRD proposal; existing definition skill-only.
7. Internal trademark note should appear sources: owners' logos identify technology; CC0 attribution not mandatory.
8. Keyboard users outside desktop ticker cannot stop without entering; consistent approved movers policy, non-blocking; reassess visible pause in formal audit.
9. Stale E2E pause/home-how/`MetricSwitcher`/y references before main.
10. Empty lines after imports in movers/watchlist/ticker, minor.

## Round 2 — Pass

Scope 289ece6..fe-r5,5 commits3bbbdda..d208550. Lint/types/unit exit0,27 files/278; next-env unchanged.

Blocker fixed: header selector/ranges outside keyed `BreakdownChart`, first outer child; shared thin/normal tree, only plot/`SampleWarning` replaced, trigger stable. Controlled range `syncChartRange` derived during render resets on metric/split, tested; old `headerStart`/`initialRange`/internal range removed.

Suggestions: signed removes sign if rendered text has no nonzero digits, `formatChange`/`formatPp` only, tests. type prop removed. `rollingWindow(window_days)` restores captions, tested. Existing `my_practitioner_id`/persona hides nudge. Glossary both held cases. Sources logo/trademark central copy. Role source question/stale E2E/empty lines remain non-blocking.

### Required fixes (blocking)

None.

### Suggestions (non-blocking)

1. logic121 How the detail chart shows the selected measure comment now on `ChartRangeState`, should precede `ChartPlan`.

## Round 3 — Return for changes

Scope 5380b80..fe-r5,5 commits6e05cc2..ec9550a. Lint/types/unit exit0,26 files/280; `copy-review` tests removed with overlay; next-env unchanged.

Passing:
- Dev directory removed, zero `ReviewText`/`CopyReview`/`copy-review`/features-dev references in src/tests/`e2e`; layout restored dev. Unwrapped texts match dev structure/keys: board count/orderNote, people rules, category/SignalTag, supplyDefinition, advancedNote, payRange/Caveat, locationsNote, two competencies paragraphs, demandIsOneInput, noAnzsco, compNote role/industry.
- Deleted `skillsKicker`/`rolesKicker`/`noSignal`/`nextBody`/`supplyAvailableDetail`/`compNote.skill`/`fund*`/Heatmap.band/legendLabel unreferenced; new `Common.aboutSection`/`statsTitle`/Action used; industry note not orphan.
- InfoPopover Radix Esc/focus restore/expanded; About section label, outside heading avoids name pollution, phone min360/100vw−24;20px circle with spacing qualifies2.5.8 like MetricInfo.
- Compare/Talk outline `auto-fit` wrap; Talk label includes visible words,2.5.3.
- Statistics consistent component/`stats-h`/copy/docs/comments; only intentional former-Fundamentals glossary mention; lg type matches.
- Picked full background/2px inner ink/current accessible, not colour-only. Tests ink/ink2/muted≥4.5 and up/down≥3 each theme; only ChangeBadge first span directional,32/40 large text, absolute counts muted.
- Heat tiles glyph/signed%, aria/desktop title4w/from-to, thin Too few ads or dash/title; list area/count and colour/change explanation; table alternative. Legend removal otherwise interpretable/accessible.

### Required fixes (blocking)

1. heatmap.tsx:56–67 `HeatmapSource` lost visible change-percentage definition. Old legend had change_4w MetricInfo, removed with swatches; only `ad_count` ⓘ remains. Industries this month/▲12% lacks visible4w numerator/window, phone no title. Top comment promises definitions one click away, now only size. Restore change_4w MetricInfo beside count, type/sample.change/filter; no swatches/new copy needed.

### Suggestions (non-blocking)

1. `Heatmap.adsShort`/tableToggle/`Home.sampleNote` unused in dev already, optional removal.
2. `PopoverContent` dialog has no accessible name; `aria-label` label, align MetricInfo.
