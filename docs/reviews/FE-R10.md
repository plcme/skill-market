# FE-R10 review

Scope main...`fe-r10`, single commit 6e80e44. A: searchable University/Degree `Combobox` (fixed lists, no free text, `inline` in phone sheets), Year stays native select; B: `step=done` layout rebalance (CTA under content, skipped-basics "Personalise your board" panel, "Good first steps" heading when no step has `because`). PRD §10/CLAUDE frontend rules. No E2E per user preference.

## Round 1 — Return for changes

Acceptance command results: `tsc --noEmit -p .` clean; `eslint src e2e` clean; `vitest run` 445–447 passed / 13 todo with 1–3 intermittent 5 s timeouts in `tests/contract-demo.test.ts` and `tests/community-chat.test.ts` (demo-store API tests, nothing in this diff is imported by them); both files pass 27/27 with `--testTimeout=60000`. Load-related flake on this machine, not a regression. E2E not run.

Verified:
- `onChange` is only reachable through `pick(o)` with an option from `options`; typed text lives in local `query` and is discarded on blur/Escape/pick, so the field always shows the selected label or empty. No free text can reach `values`.
- ArrowDown when closed with nothing selected: `matches.indexOf(undefined)` = -1, clamped to 0 by `Math.max(0, …)`. ArrowDown on an empty match list sets `active` to -1; `matches[-1]` is undefined, Enter is a no-op, `aria-activedescendant` is omitted. No crash.
- Option `onMouseDown` preventDefault keeps focus in the input so blur does not close the list before `onClick` picks. Typing resets `active` to 0.
- `aria-expanded`, `aria-controls` (listbox always in DOM, `hidden` when closed), `aria-autocomplete="list"`, `aria-activedescendant` only while open; option ids built from slug ids (`usyd`, …) are valid. Field `label htmlFor` names the input; `aria-describedby`/`aria-invalid`/`autoFocus` forwarded.
- Tokens only (`bg-surface`, `bg-sunken`, `border-rule`, `text-ink`, `text-muted`); chevron SVG matches existing `Select`. New copy (`search`, `noMatches`) in `messages/en/student.json`; `firstTitle` already existed.
- MiniBoard grid only goes two-column when roles exist; skipped-basics panel reuses existing `basicsKicker`/`basicsTitle`/`startOver` keys with no new explanatory text; `toMarket` CTA now under content; "Review my skills" only with basics.
- `e2e/responsive.spec.ts` updated from `selectOption` to click/option for the two comboboxes; Year still uses `selectOption`. No other e2e spec drives these fields.

### Required fixes (blocking)

1. src/components/ui/form.tsx:91–97 — the `role="listbox"` has no accessible name. ARIA 1.2 requires an author-supplied name for `listbox`, and axe `aria-input-field-name` (serious) flags it whenever the list is open; current e2e axe only runs while the list is `hidden`, so it passes by accident. Screen readers announce an unnamed list on open. Fix: give the `Field` label an id (e.g. `${id}-label`) and set `aria-labelledby` on the `ul` to it (or accept a `label` prop and use `aria-label`).
2. src/components/ui/form.tsx:112 — when the query has no matches, the open listbox contains only a `role="presentation"` `<li>`. That is a listbox with no owned `option` (axe `aria-required-children`, critical), and "No matches" is not announced because presentation content inside a listbox is not exposed as status. Fix: render the empty text outside the `ul` (sibling element, ideally `role="status"`/`aria-live="polite"`) and keep the `ul` empty/hidden, or hide the listbox and set `aria-expanded={false}` when `matches` is empty.

### Suggestions (non-blocking)

- form.tsx:57–61 — `show()` calls `scrollIntoView` before the list is rendered/unhidden, so opening with ArrowDown on an existing selection (e.g. a university far down the list) highlights an off-screen option. Scroll in a `useEffect` keyed on `active`/`open`. Click-to-open also starts at index 0 rather than the selected option; consider `setActive(max(0, indexOf(selected)))` in `onClick`.
- form.tsx:63 — ArrowUp when closed opens at the stale `active - 1`; mirror ArrowDown (open at selected/last). Alt+ArrowDown/Home/End are not handled; optional per APG.
- form.tsx:80 — `onFocus` `select()` is undone by the mouseup in Chromium/Safari on click-focus; harmless, but if select-all on click is intended, also select on the first `mouseup`.
- Verify the inline sheet pick on a real iOS device (touch → synthetic mousedown preventDefault); Playwright mobile emulation uses mouse clicks.
- Vitest timeouts on `contract-demo`/`community-chat` are environment-sensitive; consider a per-file `testTimeout`.

## Round 2 — Pass

Scope `e8f97ea..fe-r10`: 111e855 (round 1 fixes) and b150a92 (new user-requested scope for the same round: paged /market board, sticky type tabs, trimmed landing band).

Acceptance command results: `tsc --noEmit -p .` clean; `eslint src e2e` clean; `vitest run --testTimeout=60000` 40 files, 448 passed / 13 todo. E2E not run.

Verified, round 1 fixes:
- The listbox is named via `aria-label={label}`, using the Field label passed from `BasicsSelect`.
- With no matches the listbox is `hidden` and `aria-expanded`/`aria-activedescendant` follow `listed`, so no option-less listbox is exposed. The always-mounted `role="status"` `<p>` (sr-only when idle) announces "No matches".
- Scroll-into-view runs in an effect after the list is shown. Click, ArrowDown and ArrowUp on a closed list open at the selected option (index 0 when there is none). While open, ArrowUp/ArrowDown still clamp.

Verified, b150a92:
- Hydration: the server passes `rows.slice(0, 24)` plus `total`. On first client render `shown` = 24 = `initial.rows.length`, so `full` is null and the client renders the same trimmed rows; the only remaining way the first client render differs is the alias search, which is unchanged from main. Without aliases, client `getBoard(query, [])` matches the server's alias-free `getBoard(query)` (same cache key), so "Show more" extends the same order.
- The derived-state reset (`setPage` during render when `JSON.stringify(query)` changes) is the documented React pattern. `shown` falls back to 24 in the same render, so a stale page is never painted. The watching tab is untrimmed and never paged.
- The sr-only live count shows the full board size (`total`, or `full.rows.length` when searching), not the page size, so the announced number matches the board's definition.
- Rows under the fade stay interactive (the overlay is `pointer-events-none`). Compare selections are held in context and survive paging; the per-tab provider key is unchanged. Hidden rows simply aren't rendered.
- E2E targets on /market stay inside the first page (checked against demo data): on skills, Python is row 0, SQL row 1, Java row 14; on tasks, Data analysis is row 2; industries has 10 rows.
- Sticky bar `z-30` sits under the site header (`z-40`) and the compare bar (`z-40`, fixed). Radix popovers and dialogs portal at `z-50`. Container negative margins match `Container` padding. The bar uses `data-site-header` `offsetHeight` (65), consistent with `scroll-mt-[65px]`. It only scrolls up, and honours reduced motion.
- The landing band drops the lede, arrow and Personalise CTA. `Home.lede`/`ctaStart` are no longer referenced anywhere, and no e2e spec still expects "Personalise" or the lede. The focus test now starts from "All industries". `showMore` copy is in `messages/en/market-pages.json`.

### Required fixes (blocking)

None.

### Suggestions (non-blocking)

- searchable-board.tsx "Show more": on the last page the button unmounts while focused, so focus drops to `<body>`. Move focus to the first newly revealed row (or the list) after each click.
- searchable-board.tsx: the full-width `-mt-6` button wrapper sits over the bottom 24px of the last row/card (in cards view, the lower edge of the footer Watch button). Add `pointer-events-none` to the wrapper and `pointer-events-auto` to the button.
- board-tabs-bar.tsx: modifier-clicks (Cmd/Ctrl/Shift, middle button) also scroll the current page. Skip the scroll when `e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0`.
- Round 1 suggestions about `onFocus` `select()` and the on-device iOS pick check still apply.
