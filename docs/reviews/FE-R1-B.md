# FE-R1-B review (`fe-industry`, 9dce296, against dev)

## Round 1 — Pass

Acceptance results:
- `pnpm lint`/typecheck: zero errors.
- Unit suite: 11 of157 initially failed with 5s `student-auth`/privacy timeouts while another review ran. Separate rerun10/10; industry19/19; attributed to load.
- Build passed.
- E2E port 3140 occupied; E2E_PORT3147:62 passed,2 skipped,2 sample-student desk/skills/gap failures, one per device. Isolated rerun2/2 passed, attributed to load.

### Required fixes (blocking)

None.

### Checks

- squarify proportional areas, last row/column absorbs floating remainder, no overflow; discards nonpositive/nonfinite; stable input-order ties/deterministic; proportion/overlap/edge/determinism tests.
- Heat bands <2 neutral,2–10 medium,≥10 strong; colour-blind orange/blue, grey hatch thin samples; `HEAT_BANDS` drives legend; source/window/table, phone grid.
- Movers require ok/from≥minimum, excluding small-base spikes. Absolute relative change acceptable with baseline≥30 and visible rule.
- Carousel role description, pause/play `aria-pressed`, hover/focus pause, no reduced-motion autoplay, live off playing/polite paused, no focus trap, APG compliant.
- Prefix s/r unchanged; industry cannot held in API/button; matching componentsOf; no industry salaries, concrete skills only.

### Suggestions (non-blocking)

1. home.json `leadKicker`/Why/In/Talk unused, removable; `leadOpen` still used.
2. `HeatmapLegend` passes industry type to skill-change `MetricInfo` in industry_skills; select by kind.
3. Homepage `moversRule` uses `MIN_SAMPLE_DEFAULT`, filtering uses per-reading minimum; future divergence possible, derive from data.
4. Industry rejection still `rolesCannotBeHeld`; inaccurate industry copy.

### Potential merge conflicts

With `fe-responsive`: app/page.tsx replaced hero, theme heat tokens, home.json, market*.json, frontend.spec.ts. playwright.config unchanged here.
