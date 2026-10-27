# FE-R2 review (A2 · C3 · B2 · B1)

Scope `git diff f5da9fc..fe-r2`,6 commits; DESIGN dev@c5e9a2c, GLOSSARY, PRD10, CLAUDE.

## Round 1 — Return for changes

Acceptance: lint/types clean;19 files/182 units; build passed. E2E_PORT3150 round 2/responsive:53 passed/1 mobile onboarding axe contrast #radix-_r_2_ during sheet animation; isolated2/2 passed, judged unrelated flake. Port 3151 screenshots salary/experience light-dark1440/375, health-care rights/no-PR,375 filter; all scrollWidth375.

Passing areas:
- A2 no Adzuna in src/messages/`e2e`, fixture `job-ads-fixture` renamed consistently.
- C3 communication removed catalogue/components/priors/seeds/`FIRST_STEPS`; all skills layered, other types null. Ten competencies not instruments/no metrics, ASC order/no ranking, Illustrative/scale-not-person-judgement/attribution. Legacy alias redirects; sanitise load/storage events; chat text fallback; unknown compare/chat safe.
- B2 simple/full/URL roundtrip, remote-first recognised, redundant remote absorbed, unrepresentable opens Advanced, encoding stable; empty modes/places disables Apply without rewriting.
- B1 stack sum matches total within rounding; mode `keepModes`, rights weights1, experience entry+other split correctly partition filter cells; Filtered to visible buckets. Role-only salary12m n-gating, gaps/no interpolation; fallback Job ads explained; estimated/methods, table/keyboard/live/source/window, zero-area-axis, dashed differentiation.
- Central messages/no product names/no hex in components.

### Required fixes (blocking)

1. theme.css:45–46/85–86, breakdown-chart.tsx:18–21: ordinal1/2 contrast against surface below WCAG1.4.11 minimum 3:1. Light1.46/2.53, dark1.50/2.94. Entry salary line nearly invisible both modes, Mid faint, confirmed screenshots; particularly important for students. Violates DESIGN9/explicit series requirement; axe misses SVG strokes. Implementation follows DESIGN2.2 but specification values are wrong.
   - Adjust both ordinal palettes, preserving order: light1 e.g.#7486dd3.27, dark1#5263c2 3.33 or stronger. Theme first, main session sync DESIGN.
   - Add pure test parsing themes/all series≥3. A separate line palette could retain light areas but breaks dimension consistency, not recommended.

### Suggestions (non-blocking)

1. engine.ts:614 salary breakdown says4,712/10,711 versus main4,713/10,712 due rounded bucket sums. Reuse computeMetric numerator/denominator; share0.44 constant with line337.
2. engine.ts:584/chart: thin stack bucket legend says Not enough ads yet area/table exposes values, e.g. sponsorship health-care rights. Explain count-below-threshold or mark table too.
3. breakdown-section.tsx:82 graduate filter says Entry0–2, actually graduates only; use Graduate roles only.
4. command-palette.tsx:57 prefix competencies pro→Problem solving before Project management/Product manager, rea→Reading before React; exact-only priority like full search.
5. metrics/page.tsx:100 target signal-soft anchor violates signals-only; `accent-soft`.
6. Chart:152 no direct labels below520; legend order helps, consider numbered swatches/outlines.
7. Add ASC CC BY4.0 licence/link beside attribution.

## Round 2 — Pass

Scope aa1a235..fe-r2,10 commits e715e72…2c8c33a.

Acceptance: main-session lint/types clean and186/186 units; reviewer targeted contrast/breakdown/competencies21/21; build passed. Full round 2/responsive/frontend port 3150:61 passed/60 failed/1 skipped in51.9 min at load 82, all timeouts/`frame.evaluate`/teardown. Two-worker retry49 passed/10 timeouts; one-worker remainder10/10 in40s. No real failures; new dark-hydration test passed on retry.

Manual port 3150:
- Salary/experience1440 light/dark Entry/Mid clear.
- Both salary cards4,713/10,712.
- Python Darwin experience all-thin shows Too few ads, four Not enough ads/hatched swatches.
- Data-analyst graduate filter readback/legend/end labels correctly Graduate.
- Dark device defaults dark; header changes light, stores `sm-theme=light`, correct aria, persists reload; no console errors.

Findings:
1. Contrast fixed: palette matches DESIGN; parser checks seven series plus faint≥3 in both themes, WCAG-formula validation; asserts seven tokens so additions require updates.
2. Salary sample fixed: reuse computeMetric, shared `SALARY_STATED_SHARE`, exact-equality test.
3. Thin stacks fixed: insufficient populated/tested; hatch, no end label, legend hatch/Not enough ads; table/tooltips suppress thin values on consistent rolling4w basis; all-thin replaces axes with text.
4. Graduate copy fixed readback/legend/end/header.
5. Exact-only competencies via shared/tested `isExactCompetencyHit` in palette/search.
6. Metrics/readback `accent-soft`; remaining signal cards/watchlist/ticker/badges legitimate.
7. Dark hydration root fix: `useSyncExternalStore` outside context, matchMedia/storage/custom events; server light. Prepaint script prevents page flash; `AppProvider` subscribes `applyTheme` after mount for system/tabs. Verified system/manual/header/dark-market console. Icon changes after hydration only, acceptable.
8. README neutral sources.
- Extra8f7164b: `niceTicks` loops until final≥max, positive finite steps, even min>max ends at second tick; stack minStep1 avoids fractional counts; allThin copy reasonable.

### Required fixes (blocking)

None.

### Suggestions (non-blocking)

1. breakdown-section.tsx:92/`Breakdown.thin` still describes hatched bands when allThin draws none; separate copy or omit.
2. theme-store.ts:59–67 disabled localStorage: failed write then reread restores system, manual choice ignored despite page-only comment; memory override fallback.
3. One thin bucket inferable from total minus others; ad counts not personal data, consistency issue only; disclose method.
4. sources/page.tsx:99 existing `cellsExample` signal-soft should `accent-soft`, outside round.
5. No mixed-thin fixture page found (health-care sponsorship now67), mixed hatch/solid only code-reviewed, not screenshot-verified; fixed-filter `e2e` suggested.
