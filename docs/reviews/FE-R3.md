# FE-R3 review: single detail chart, title places, skill salary

Scope dev...fe-r3-chart, base65367fb, commits abd3d7a/5e9a0db/f3ed4e8; GLOSSARY2026-10-17, DESIGN, PRD10, CLAUDE.

## Round 1 — Return for changes

Lint/typecheck zero errors. Of21 files/200 units, community-chat pauses-a-practitioner-after-two-no-shows timed out5s at load~7; isolated19/19 passed, unchanged file, load flake. Reviewer omitted build/full E2E due load; implementer reported build and131 E2E passed/one unchanged onboarding axe flake with workers1. Reviewer keyboard-tested split/Y/scope focus on dev3003, curl compare, and inspected artifacts/fe-r3 desktop light/dark375/menu screenshots.

Passing:
- y only recognises salary, otherwise ads; `resolveChartMeasure` validates types, mining salary→ads-only/static label. by none→null, invalid/default→experience; codec roundtrips tested. Chart fully independent of metric; salary metric may chart ads/stack, tested.
- Place changes preserve seniority/rights; last removal→au; All Australia empty selector, new place replaces. Remote toggle appends remote/au, disabled/on when redundant. Complex rules custom places with readback/reset, retaining seniority/rights but resetting inseparable modes, acceptable. Chips individually removable, unit/E2E.
- Unsplit ad series equals total/latest headline; salary last equals `computeMetric`,1000-rounded base then500 wave matches; same rounded-sample gate, tested. Split sums within rounding; unsplit `filtered_to` null. Thin split gaps; overall thin `SampleWarning`/no chart.
- `deriveSkillSalary` deterministic weighted means/default if no roles, tested; other types unaffected, salary range/skills-per-ad role-only. Four metric examples, copy updated; no roles-only in src/messages.
- Definitions/source/window/salary samples, estimated experience/rights/methods; no dual axes, stack zero baseline, dashed lines, token `fill-ink/[0.07]`, dark screenshots,375 no overflow, sheets/44px options. Central copy/no hardcoded name.

### Required fixes (blocking)

1. `compare-view.tsx:156` and removed market-pages key: raw `InstrumentPage.chartCaption` rendered. curl compare confirms; untyped intl keys bypass type/unit tests, breaking existing accessible chart name/copy. Restore `{metric} · 4-week rolling, weekly to {end}` or move to `Compare` namespace/call. Add missing-message throw in tests or static-key checker.
2. `instrument-chart.tsx`:123–162/139, instrument-places.tsx:107: keyboard Enter Stop splitting, choose Work mode, remove Entry-level chip all leave `BODY` focus; Y-axis returns correctly. Split branches mount separate popovers/triggers; removed buttons/chips unmount. Violates WCAG2.4.3, forces retabbing from top and explicit focus requirement. Use stable split trigger, refocus after clear/URL effect, move removed-chip focus to next or places button, add activeElement-not-body E2E.

### Suggestions (non-blocking)

1. abd3d7a alone fails types: nullable by precedes consumer deletion in next commit. HEAD fine; no history rewrite, group type/consumer changes next time.
2. registry:57/market.json:157/DESIGN:208: unsplit skill median appears board/Right now/Fundamentals, SQL$117k screenshot, contradicts old DESIGN no-skill-salary. Default chart Experience mitigates chart only; caveat about senior disclosures misses role/seniority composition versus learning returns. Add skill caveat, update DESIGN, user decide numbers on board/headline.
3. PRD:185 and architecture:646 still deny skill salary; user/main owners update via pending decisions.
4. filter-builder:150 compact redundant remote disabled/on lacks explanation; show Already included or `aria-describedby`.
5. places:52 accessible label All Australia does not imply changing; add Places/change wording like axis/split.
6. chart:139 28px clear expands44, overlaps trigger~8px; add8px gap or limit expansion.
7. market-pages:126 No PR required chip overpromises no-stated requirement; use No PR stated or filter wording.
8. adaptive-popover:35 autofocus Close; prefer selected option.
9. queries:138 `detail.series` no longer consumed but still computed; remove if unused.

## Round 2 — Pass

Scope 178fa60..cdd3c19, eeba0fb/cdd3c19. Lint/types clean;22 files/202 units including i18n-keys; port 3161 detail-chart workers1:10/10, five/device including keyboard. BUILD_ID15:40 newer than files≤15:39:13, current build. Dev3003 curl compare shows proper rolling caption, no raw keys.

Blockers fixed:
1. `ComparePage.chartCaption` added/called. i18n-key tests resolve scoped use/`getTranslations`, check>500 static keys, parser self-test prevents deleting used keys.
2. One `splitTrigger` ref/DOM with changing content/style/label. Clear separate44×40 segment avoids overlap; refocus before URL; Radix returns same trigger. Chips focus next or `PLACES_TRIGGER_ID` before removal; desktop/mobile assert exact targets, not body.

Suggestions4/5/7 fixed: Already included remote, visible-label-first change-places aria (2.5.3), No PR or citizenship stated; frontend specs synced. Other logic unchanged.

### Required fixes (blocking)

None.

### Suggestions (non-blocking)

1. places:58 button aria extends h1 to SQL in All Australia. Change places; acceptable, could move action to description.
2. places:104–111 removing last chip while earlier remain goes to title, usable but previous chip smoother.
3. Round-one1/2/3/8/9 remain; unsplit skill salary on board/headline/Fundamentals awaiting user.
