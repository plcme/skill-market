# GLOSSARY — Terminology

> Maps product, interface, and code terminology. Every agent must consult this before writing copy, naming variables, or discussing requirements.
> Maintained by the main session; updated after user decisions. Entries marked undecided must not be introduced as UI concepts without approval.

## 1. Instruments (targets)

| Concept | UI wording | Code / data | Explanation | Status |
|---|---|---|---|---|
| Instrument | target (prefer the specific type name in public copy) | instrument, type `instrument_type` | A trackable, watchable entity | Decided |
| Skill | Skill | `instrument_type = 'skill'` + `skill_layer` | Specific learnable, verifiable capability. Two ASC layers: **Technology tool** (`technology_tool`, e.g. SQL, Excel, AutoCAD) and **Specialist task** (`specialist_task`, e.g. data analysis, project management) | Prototype (2026-10-06, based on ASC) |
| Core competency | Core competency | `competencies.ts` (not an instrument) | ASC's 10 general capabilities, including Oral communication and Teamwork. Used in every job; **no demand tracking or metrics**. Role pages show intensity from 1–10 only. Communication belongs here | Prototype (2026-10-06) |
| Role | Role | `instrument_type = 'role'` | Weighted skill basket (`RoleComponent.weight`), a "skill ETF"; ANZSCO code | Decided |
| Industry | Industry | `instrument_type = 'industry'` | ANZSIC Division level (19 divisions) | Decided (2026-09-26) |
| Sub-industry | Sub-industry | `instrument_type = 'industry'` + `parent_id` | Next ANZSIC level; reserved in the model, not shown in UI | Granularity undecided |
| Employer / credential | Employer / Credential | `'employer'` / `'credential'` | Reserved types only, no UI | Post-MVP |
| Component holdings | Top holdings | `RoleComponent[]` | Component skills and weights on role pages | Decided |

## 2. Board dimensions

| Concept | UI wording | Code | Definition |
|---|---|---|---|
| Filter | Filter | `FilterSpec` (`rules[]`, seniority, `work_rights`) | Scope affecting **the whole table**: location, work mode, seniority, work rights. Changing filters changes the denominator. Editable only through detail-page titles; `/market` has no filters and uses the default scope (FE-R7, 2026-10-22) |
| Y-axis variable / measure | Measure; dropdown at the chart's top left ("Job ads ▾"), called **Y axis** in Filter | `MetricKey` (`src/lib/metrics/registry.ts`); one detail parameter `?metric=` (legacy `?y=ads\|salary` rewrites to `metric=ad_count\|salary_median`); `chartPlanFor` in `src/features/market/logic.ts` maps measures to charts | Number shown for each instrument. Detail "Right now" and chart always share a measure (2026-10-22). Y axis offers level measures with weekly series (`CHART_SERIES`): Job ads, Median salary (not industry), Entry-level share, No PR stated, Employers hiring, Remote or hybrid, Contract share. Change measures are not options, but their charts must be correct when selected: 4-week change → Job ads, 3M, shade two four-week windows and show from → to; 12-month change → Job ads, 2Y, shade two 12-month windows; Volatility → Job ads, 1Y; Salary range/Skill premium → Median salary |
| `Statistics` | `Statistics` | `Statistics` (`src/features/market/instrument-sections.tsx`) | Detail grid listing all measures, titled "`Statistics`" in large serif with no kicker. The active measure's whole cell is tinted and outlined in ink; selecting a cell changes the measure. Formerly Fundamentals, no longer used in UI (2026-10-22) |
| Breakdown / distribution | Breakdown; UI **Split by** | `?by=experience\|rights\|mode` (absent = none; legacy `by=none` removed, FE-R6 2026-10-22); registry `breakdown: 'stack'\|'lines'\|null` | Split one measure by **one** dimension. **Editable only in the Filter panel opened from the title** (2026-10-22), with no chart breakdown controls. Dimensions: Experience, Work rights, Work mode; location is not one. Disable fixed dimensions with "Fixed by your filter": Entry-level/Graduate fixes Experience, No PR stated fixes Work rights, one work mode fixes Work mode. Splitting a share by its own dimension is meaningless (e.g. Entry-level share × Experience): disable with "Not for this measure". Remove fixed by from URL. Title/readback adds "· by experience" only when split. **Additive measures use stacked areas; non-additive medians, shares, and employer counts use multiple lines.** DESIGN §6.3 |
| Experience band | Entry / Mid / Senior / Expert | experience: 0–2 / 3–5 / 6–9 / 10+ years | Expert means the user's "master level" (10+ years); avoid Master to prevent confusion with a master's degree |
| Location | Places + "Also include remote jobs anywhere in Australia" | `FilterSpec.rules` (OR) | Whole-table filter; toggle appends `{remote, au}`. Australia only: All Australia (au) is the fixed, non-selectable, non-removable base; narrow to states/cities/regions; removing the last selection restores it (2026-10-21). Detail title's "in …" summarises the entire filter, e.g. "SQL in [Sydney + remote · Entry-level ▾]". Location first, then only narrowing conditions separated by " · "; multiple rules use "custom places". Opens Filter; smaller than instrument name (2026-10-21, replacing the 10-17 location popup/removable chips) |
| Sorting | Sort | sort: value / change | By measure or change only; no A–Z |
| View | View | view: list / cards | List or cards |
| Watched tab | Watching (first `/market` tab) | `?type=watching` (`MarketTab`, `boardForTab`, `watchedSlugs`, `src/features/market/logic.ts`; `WatchingBoard`) | Order: **Watching** ｜ All · Skills · Roles · Industries (FE-R6, 2026-10-22). Watching uses a bookmark icon, text, and small grey count, then a thin vertical divider and four serif tabs. Default remains All. Content = All restricted to watchlist instruments (held and watching; deduplicate different filters for one instrument). Same controls/sorting as All; no board filters. Count matches rows. Signed out: no count, "Sign in to see what you watch." + Sign in. Empty signed-in: "Nothing watched yet." + "Browse all". Tabs scroll horizontally at 375px |
| `Signal` | `Signal` | `Signal` (rise / fall / `entry_open` / `since_added`) | Significant threshold-crossing change; does not imply an obligation to learn |

## 3. Measure wording

| UI wording | Code | Definition |
|---|---|---|
| **Demand** (selector) / **Job ads** (column header and unit) | `ad_count` | Ads mentioning the instrument within the time window |
| Share of ads (supporting explanation in definition popovers only) | `share_of_ads` | Ads mentioning it ÷ all ads under the same filters; adjusts for market-wide movement |
| 4-week change | `change_4w` | Relative change, latest four weeks versus previous four; include raw from → to counts |
| 12-month growth | `growth_12m` | Year-on-year change |
| Entry-level share | `entry_level_share` | Text extraction; disclose method and error |
| No PR required | `no_pr_required_share` | Text extraction; disclose method and error |
| Median salary | `salary_median` | Roles and skills (user decision, 2026-10-17). Disclosed salaries only. To avoid confusing senior-role salaries with guaranteed learning outcomes, Experience is available under Split by (charts unsplit by default since FE-R6) |
| Coverage (ⓘ and coverage notes only, not selector) | `coverage_ratio` | Observed new ads ÷ JSA IVI new ads for the same occupation/state; approximate relative coverage. Add notes or suppress signals when insufficient (architecture §6.8) |
| Skill premium | `skill_premium` | Advanced, skills only; controlled comparison within a role with/without the skill |

## 4. Other product wording

| Concept | UI wording | Explanation |
|---|---|---|
| Personal workspace | My desk | Student `/me`; practitioner `/practitioner` |
| Tracking | Watch / Watchlist | Avoid portfolio holdings, returns, or position strength (PRD §10.7) |
| Existing skill | I have this skill (desk: "Held — skills you have") | Watch `status = 'held'`, `instrument_type = 'skill'`; already mastered, excluded from learning counts |
| Previous role experience | Worked in this role (desk: "Worked in this role") | Watch `status = 'held'`, `instrument_type = 'role'` (FE-R5, 2026-10-22). Shares held state with skills; copy depends on type. `canBeHeld` determines eligibility (not industry). Marking invites "Join as a practitioner" once on the role page, unless already a practitioner |
| Coffee conversation | Coffee chat | 20-minute asynchronous booking, not IM |
| Employed contributor | Practitioner | Opted-in employed person holding the skill |
| Sources and safety | Data & safety | Footer entry, includes data sources (formerly Sources page) |
| Theme | Light / Dark | Follow system by default; remember manual choice; no System state in UI |

## 5. Undecided concepts (do not introduce without approval)

- **What counts as a skill**: prototype ASC's three layers (§1), finalise after visual review.
- **Breakdown**: v3 (2026-10-22): one detail chart; measure top left, only 3M / 6M / 1Y / 2Y top right; Y axis and Split by in title-opened Filter (after Currently showing, before Work rights), committed with Apply. v2 prototype: https://claude.ai/artifact/72Ka23B5tHtKwUWCQfyE1V .
- **Sub-industry granularity**: ANZSIC Subdivision or Group.
