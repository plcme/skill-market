# DESIGN — Visual and interaction specification

> The sole frontend design reference. Read this before building any page, component, or chart, followed by `docs/GLOSSARY.md` and PRD §10 UX principles.
> Maintained by the main session after user decisions. **Actual token values live in `src/styles/theme.css`**; this document explains usage. Resolve inconsistencies in `theme.css` first, then update this file.
> v1 (2026-10-06), consolidated from implementation, adding chart-series colours and breakdown rules. Do not implement undecided items without approval.

## 0. One sentence

**A market table printed by a newsroom.** Warm paper, ink, fine rules, large serif numbers, small monospace labels. A newspaper's financial pages rather than trading software or a SaaS dashboard: calm, credible, with defensible numbers.

The audience is anxious students. Design should **reduce anxiety and improve judgement**; restraint matters more than stimulation.

## 1. Principles

1. **Every number explains itself**: definition, window, sample, source, one click away in `MetricInfo`, without leaving the page (PRD §10, FR-D2).
2. **Restrained colour**: ink plus cobalt accent; fluorescent yellow reserved for signals. Green/red changes always include arrows and text.
3. **Colour is never the only cue**: pair it with shape, text, position, or pattern.
4. **No rankings or scores**: no student ranks, percentiles, or scores. Ordering instruments by a measure is sorting, not a leaderboard.
5. **Honesty before beauty**: label estimates; leave insufficient samples blank, without interpolation or embellishment; label inferences as suggestions with confidence.
6. **Always a next step**: a clickable destination on every page, empty state, and error.
7. **Usable on phones**: no horizontal overflow at 375px; touch targets ≥ 44px.
8. **Motion serves data**: communicate changes, not decoration (§7).

## 2. Colours

### 2.1 Foundation tokens

Every token has light/dark values. Components use tokens, **never hardcoded hex colours**. Tailwind names match tokens: `bg-paper`, `text-ink-2`, `border-rule`.

| Token | Purpose | Rule |
|---|---|---|
| paper | Page background | Warm paper; near-black warm grey in dark mode |
| surface | Cards, popovers, inputs | Slightly brighter than paper; one elevation level |
| sunken | Recessed skeletons, headers, hover | Not for large backgrounds |
| ink / `ink-2` | Primary / secondary body text | Body defaults to `ink-2`; headings/numbers use ink |
| muted / faint | Labels/explanations / weaker support and unstated data | Never faint for essential body text |
| rule / `rule-strong` | Fine dividers / heavier section-top rule | Separate with rules, not shadows |
| accent (`-hover`, `-soft`, `-ink`) | Links, interactions, selection, second comparison series | **Only UI accent colour**; no decoration |
| signal (`-soft`, `-ink`) | Highlighter for signals, `.hl`, text selection | **Signals only**; more than three instances per screen is excessive |
| up / down (`-soft`) | Increase/decrease | Always arrow/text, e.g. "▲ +38% (120 → 166)". Direction follows the displayed sign: positive ▲ up, negative ▼ down; grey ■ only when rounded to 0.0%. No ±2% neutral band (2026-10-22) |
| warn (`-soft`) | Thin samples, delayed data, attention | Errors use down instead |
| `src-official` / `src-ads` / `src-practitioner` | `SourceMark` | Fixed source colours; no other use |
| night / `night-ink` | Inverted blocks such as ticker tape | At most one per page |
| overlay, `shadow-float` | Modal backdrop, floating shadows | **Only floating layers get shadows** |

### 2.2 Chart-series colours

Light/dark values in `theme.css` for breakdowns and multiseries charts.

| Token | Purpose | Light | Dark |
|---|---|---|---|
| `series-ord-1..4` | **Ordered** Experience, Entry → Expert, light to dark | `#7486dd #5068d6 #2f45b8 #1b2a7a` | `#5263c2 #7385e6 #9fb0ff #cdd6ff` |
| `series-cat-1..3` | **Unordered** Work rights / Work mode | `#2a45d0 #b0761c #2c7a74` | `#9daeff #e0aa52 #6cc4bb` |
| faint | Not stated buckets | Always grey | Always grey |

Rules:
- **Every series contrasts ≥ 3:1 against surface** (WCAG 1.4.11 graphical objects), enforced by unit tests. Even the lightest band must be visible; gradients never justify lost readability.
- Ordered dimensions use sequential shades, unordered dimensions categorical colours; **do not mix**.
- At most four series; combine excess into Other or use a table.
- Single series uses ink; comparisons use ink versus accent.
- Heatmaps use separate colour-blind-safe blue/orange diverging `heat-dn2 … heat-up2`, with per-band text colours meeting AA. Missing data uses hatched `heat-na`. Classify by sign: below 10% uses the lighter directional band; ≥ 10% the darker one. `heat-0` is exactly 0.0% only; omit a neutral legend band. Grey hatching means insufficient samples only.

### 2.3 Light and dark modes

- `html[data-theme]`, set by `ThemeScript` before first paint, prevents flashing.
- **Follow the system by default**. Header exposes sun/moon only; remember manual choice, with no System option (GLOSSARY §4).
- New colours require dark equivalents and a dark-mode screenshot check.

## 3. Typography

| Font | Variable | Purpose |
|---|---|---|
| **Newsreader**, variable serif, self-hosted | `font-serif`, `.display`, `.serif-num` | Page/section headings and large numbers |
| **Geist Sans** | `font-sans` (default) | Body, buttons, forms |
| **Geist Mono** | `font-mono`, `.kicker` | Symbols (PY, SQL), uppercase labels, column headers |

### Type scale

Use only these sizes; do not invent new ones.

| Role | Size | Implementation |
|---|---|---|
| Opening headline | 46 / 64 / 76 px (phone / sm / lg) | `.display` |
| Page h1 | 40 / 56 px | `PageHeader` |
| Main-card number | 56 / 64 px | `.serif-num`, `leading-[0.9]` |
| Major h2 (detail Statistics) | 32 / 40 px | `SectionHeader size="lg"` |
| Section h2 | 26 px | `SectionHeader` |
| Statistic | 28 px | `Stat` |
| Card heading | 22 px | `font-serif` |
| Lede | 17 px | `text-ink-2`, `leading-relaxed` |
| Body | 15 px | Body default, line-height 1.55 |
| Secondary/table | 13–14 px | |
| Kicker | 11 px monospace, uppercase, 0.08em tracking | `.kicker` |

Rules:
- All numbers use `tabular-nums` (`.num` / `.serif-num`) for column alignment.
- Headings use `text-wrap: balance`, paragraphs pretty, already in global styles.
- One h1 per page; never skip heading levels.

## 4. Layout and spacing

- **`Container`**: `Container`, maximum 1240px; horizontal padding 16px phone, 24px sm, 40px lg.
- **Sections**: `mt-16` separation, each starting with `SectionHeader` and a 2px `rule-strong` above. This newspaper rule is the visual backbone.
- **Alignment**: left aligned, no centred marketing layouts.
- **Whitespace**: err toward generous space; tables provide density rather than compressed spacing.
- **Corners**: 3–5px controls, `rounded-md` 6px cards, `rounded-full` pills/avatars; no oversized radii.
- **Separators**: fine `border-rule`, not shadows or colour blocks.
- **Grid**: detail first screen uses 5:7 number/chart regions at lg, stacked on phones.
- **Opening** (FE-R8, revised 2026-10-25): no separate homepage; `/` → `/market`. Parameter-free `/market` always opens with one screen of headline, lede, industry heatmap for everyone, regardless of login or visit count. "Explore the market" flips to board; secondary "Personalise". Fit within the viewport minus ticker/header/mobile tab bar, exposing board tabs at the bottom so scrolling reaches the board. Hide heatmap if it cannot fit. Deep links with type/q/etc. omit the opening. Wordmark always returns to opening top; Market nav goes to `/market#board`. No duplicate signals/mover previews outside the board; no board metric dropdown or "N skills… · M with signals" count line; fixed Demand.

## 5. Components

Available components are defined in `src/components/ui/*`, `src/components/market/*`, `src/features/*`. Usage rules:

- **Button hierarchy**:
  - At most one primary solid-ink action per view.
  - Accent for conversion, such as booking a chat.
  - Detail header's only large button is `WatchButton prominent`: accent solid when unwatched, outline Watching when watched. Compare with… and Talk to someone are icon/text links beneath.
  - Other actions use subtle, outline, ghost.
  - Signal buttons only for signal-related entries.
  - Destructive actions use danger and require confirmation.
- **Whole-card links**: stretched link (relative card plus `after:absolute after:inset-0`, or full-card absolute link with `aria-label`); only one accessible link. Inner ⓘ buttons use `relative z-10`. Provide hover/focus. Statistics cells follow this: selecting changes Right now and scrolls back. Active cells use full `bg-picked` plus 2px inner ink border, not just a top rule; body contrast on `--picked` ≥ 4.5:1 and large change numbers ≥ 3:1 (`tests/theme-contrast.test.ts`). Other cells hover with `bg-sunken/50` only.
- **Symbol box**: `InstrumentMark` (`src/components/market/instrument-mark.tsx`). Skills and tools with a recognisable logo show it, monochrome in ink, in the symbol box; everything else keeps letters. Logos identify the technology only (nominative use), never brand colours; drop a logo if its owner objects. Simple Icons (CC0), mapping `src/lib/market/logos.ts`, only technologies actually in that set. Roles/industries always letters. Decorative `aria-hidden`; name always alongside.
- **Numbers**: render through `MetricValue` and `MetricInfo`, never bare values.
- **Changes**: `ChangeBadge` always includes raw from → to counts.
- **Filters**: whole-table scope. `/market` has none: All Australia, All levels, any work rights. Redirect away legacy `?f=` (FE-R7, 2026-10-22). No visible Measure label on the board dropdown, only `aria-label`. Detail title's "in …" is the filter entry, no separate button: "SQL in [Sydney · Entry-level · by experience ▾]". Panel order: sticky Currently showing → detail-only Y axis + Split by → Work rights → Level → Places + Work mode + remote toggle → Advanced. Y axis syncs with chart selector; Split by only here, default None with no by; disable dimensions fixed by filter/measure and explain why. Apply commits all together. Title/readback adds "· by experience" when split, never Y axis. With remote-anywhere plus limited work modes, put modes in parentheses after place: "Sydney (on-site or hybrid) + remote", avoiding contradiction. Places has non-removable All Australia base, narrowed to states/cities/regions.
- **Detail measure**: one `?metric=` drives both Right now and chart. No Right now dropdown; change via chart top-left or Statistics cells.
- Design **loading, empty, and error** states:
  - `Skeleton` matches final content shape.
  - `EmptyState` offers a next step.
  - `Notice` errors offer retry.
- **Phones**: onboarding/long selections use `SheetContent` bottom sheets; navigation uses bottom tabs.

## 6. Data visualisation

### 6.1 Choose by question

| Question | Chart |
|---|---|
| One instrument over time | `TrendChart` line with table toggle |
| Per-row trend | Axis-free sparkline for shape |
| Compare two instruments | Ink/accent lines, shared y-axis |
| Split additive counts | **Stacked areas** summing to total |
| Split non-additive medians/shares | **Multiple lines**, one per bucket |
| Industry skills by size/change | Treemap: area = size, colour = change |
| Ad locations | Horizontal bars |
| Core competency intensity, 1–10 | Horizontal bars with adjacent numbers |

### 6.2 Mandatory rules

1. **Count/area y-axes start at zero.** Share/median lines may use nonzero baselines with clear ticks.
2. **No dual y-axes.** Separate different units into separate charts.
3. **One split dimension at a time.** One detail chart. Header: plain medium-weight ink "Job ads ▾" left, no Y axis label/pill; only 3M/6M/1Y/2Y range pills right. Same row at 375px, truncate long selector labels. `?by=` editable only in title-opened Filter.
4. **Change metrics show both windows**: 4-week change plots Job ads, default 3M, lightly shades latest/previous four weeks, labels from/to; 12-month change plots Job ads, default 2Y, shades two 12-month windows.
5. **Direct labels before legends**: line/area ends when space permits; otherwise below-chart legend with latest value/share.
6. **Insufficient sample = gap**: no line/interpolation; explain via `SampleWarning`.
7. **Label estimates**: text-derived experience/work rights marked estimated; definition popover explains method/error.
8. **Filter first**: show only in-scope breakdown buckets and "Filtered to …".
9. **Every chart has a table alternative** using the same data.
10. **Sources on charts**: `SourceMark`, data window, update time.
11. Main lines 1.75–2px, sparkline 1.5px, rounded caps/joins; 1px surface outlines between stacked bands.

### 6.3 Breakdown dimensions (v1 prototype)

| Dimension | Buckets | Palette |
|---|---|---|
| Experience | Entry (0–2 years, including graduate) · Mid (3–5) · Senior (6–9) · Expert (10+) | `series-ord-1..4` |
| Work rights | Requires PR/citizenship · Not stated · Sponsorship offered | cat-1 · faint · cat-2 |
| Work mode | Onsite · Hybrid · Remote | `series-cat-1..3` |

- Location is **not** a breakdown dimension; it filters the whole table with place selection plus "Also include remote jobs anywhere in Australia".
- Expert means the user's master level, 10+ years. Avoid Master to prevent confusion with master's degrees.

## 7. Motion

| Name | Duration/easing | Use |
|---|---|---|
| fade | 180ms ease-out | Popovers/notices |
| rise | 350ms `cubic-bezier(.2,.7,.2,1)`, 6px | First viewport entry |
| tape | 110s linear loop | Top ticker, **the only looping animation site-wide** |
| `live-dot` | 2s breathing | Data-updating dot |
| Button press | 150ms, `translate-y-px` | Press feedback |
| Page flip | ~420ms easeOutCubic, rAF tween | Opening ↔ board: wheel/trackpad movement flips immediately, one page per gesture, absorbing inertia during animation; phone release uses direction, flips after `min(48px, 10% distance)`, otherwise returns |

Rules:
- Animate data/state changes only: numbers, filtered charts, new signals.
- No parallax, meaningless scroll hijacking, or bounce. **Only exception: opening ↔ board page flip** (explicit user request, 2026-10-25). Intercept wheel only between those pages; board scrolling is native. Do not intercept touch dragging, only take over after release. Exclude zoom, horizontal gestures, overlays, internal scroll regions. No flip within 600ms of keyboard/focus movement; never scroll focus offscreen. Disable when opening exceeds viewport; reduced motion jumps directly.
- Honour `prefers-reduced-motion`; global animation disabling must not be bypassed.
- Round-one live-data animation, scroll effects, and Twitter-bookmark interactions await user references; add specifications then. **Pending**.

## 8. Copy and tone

- Plain, concrete, short sentences; British/Australian spelling (modelling, organisation); sentence-case headings.
- Follow GLOSSARY: Demand in selector, Job ads in columns.
- Describe observed demand rather than instructing students to learn a skill. Demand is one decision input.
- No anxiety or hype: avoid hot, skyrocketing, don't miss out.
- Declines/timeouts always framed as still looking, never rejected.
- Numbers include units/window, e.g. "Job ads, last 4 weeks".
- **Update times**: absolute data times on every surface: "Updated today, 2:14 am", or "Updated 21 Oct, 2:14 am" across days, in user time zone. Avoid "15 hours ago", which makes daily settlements look stale by evening. Put in source line, not a separate row. Exception: ticker job events use relative "2 h ago", because the events are new (user decision, 2026-10-23).
- Product name from `APP_NAME` / `useAppName()` only; UI strings in `messages/en/*.json`.
- Tagline/opening animation **pending**; candidates in PROGRESS.

## 9. Responsive and accessible

- Required widths: 375, 768, 1440. `e2e/responsive.spec.ts` guards against horizontal overflow.
- Hide secondary table columns on phones; replace with inline context such as Applies to.
- Touch/narrow-screen controls use `::after` for ≥ 44×44px targets (already centralised in `theme.css`).
- Focus ring: 2px accent, 2px offset; never remove.
- WCAG AA text contrast; `aria-live` asynchronous announcements; labels for every control.

## 10. Avoid

- Gradient backgrounds, glows, glassmorphism, emoji decoration, purple SaaS aesthetics.
- Card shadows (floating layers only), oversized corners, centred marketing layouts.
- Decorative fluorescent yellow, alternative direction colours, colour-only direction.
- Leaderboards, rankings, "Top 10 skills to learn".
- Dual axes, 3D charts, pies (use bars/stacked areas).

## 11. Poster

One page showing palette, type scale, ticker card, breakdown chart, and avoid list. **Wait for user approval of this document**, then generate using its tokens.

## 12. Pending

| Item | Status |
|---|---|
| Tagline/opening animation | Awaiting user decision |
| Live-data animation, scrolling, Twitter-bookmark interaction | Awaiting user reference links |
| Breakdown v1 | Prototype in development (`fe-r2`); finalise after preview |
| Three-level coverage-note visuals | Deferred by user on 2026-10-06; A3 not implemented yet |
