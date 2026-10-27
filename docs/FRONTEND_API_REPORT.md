# Frontend API report (`frontend-v2`)

> **Snapshot through FE-R2, 2026-10-07.** Later FE-R3–R7 detail single-chart metric/by parameters, board filter removal, Statistics, Watching, and held changes are not reflected; code takes precedence. Refresh fully before M1/M2 backend integration.

| Item | Details |
|---|---|
| Branch/worktree | `frontend-v2`, `../skill-market-fe2`, based on `m0-foundation@a0428bd` |
| Scope | All M2–M7 UI: public board, students, chats, practitioners, admin, legal |
| Data | Deterministic synthetic market engine `src/lib/market/engine.ts`; user data browser `localStorage` `src/lib/demo/store.ts`. **No Supabase or email sending** |
| Purpose | Every frontend read, action, and job as contract for M1–M7 backend |
| Verification | lint/typecheck zero errors; 14 Vitest files/118 tests; build 45 routes; 32 Playwright, 16 each at 1280/375, axe no serious/critical |

> Independent of the uncommitted older frontend/report in `m0-foundation`. This branch rebuilt from M0; report describes this branch only.

---

## 1. Running/demonstrating

```sh
cd ../skill-market-fe2
pnpm install --frozen-lockfile
pnpm dev            # http://localhost:3000
pnpm test:unit && pnpm build && pnpm test:e2e
```

Bottom-right **Preview controls** (bottom-left on phone): Visitor/Student/`Practitioner`/Admin, load sample student, advance clock +1h/+24h/+72h/+7d for timeouts/reminders/debriefs, inspect would-be emails/outbox, reset.

## 2. Architecture contracts (swap backend without changing components)

| Layer | Preview | Production architecture |
|---|---|---|
| Public reads | queries/market.ts, synchronous RSC fixture engine | RSC `metric_points` sums over expandFilterToCells, `revalidate=3600`/revalidateTag market |
| User reads | api/*.ts pure `select*(db, …)` | RSC Supabase/RLS |
| Writes | async Zod → latency → transact → Result | Same-name/schema/result Server Actions |
| Permissions | `guard(db, persona)`, api/client.ts, `RequireSession` | Route layouts/RLS/is_admin/is_verified_practitioner |
| Jobs | `runScheduledJobs(db, now)` before reads/writes | pg_cron → jobs/SQL |
| Email | `db.outbox` preview | `notifications_outbox` → Resend |

Return: `type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError }`; ApiError = code/message/fields?. Codes unauthenticated/forbidden/validation/not_found/conflict/`rate_limited`/unavailable. Message is an `Errors.*` key in `messages/en/*.json`, translated directly by UI; fields are field-error keys.

Entities in `src/lib/api/types.ts`: `DemoDB`, `Session`, `StudentProfile`, `StudentSkill`, `WatchlistItem`, `Practitioner`, `Slot`, `ChatRequest`, `ChatEvent`, `Report`, `Block`, `WaitlistEntry`, `OutboxEmail`, `PipelineRun`, `AliasOverride`. Market types in `src/lib/market/types.ts`: `FilterSpec`, `MetricReading`, `InstrumentSnapshot`, `Signal`, `SeriesPoint`, `DataSource`.

## 3. Routes

| Route | Identity | FRs | Data |
|---|---|---|---|
| / | Public | FR-M1, FR-R7 | `getIndustryHeatmap` hero, `getMovers` carousel, `getBoard`, `getTape` |
| `/market?type=all\|skill\|role\|industry&metric&f&sort=value\|change&view&q&layer=tool\|task` (layer for Skills only) | Public | FR-M1/FR-M2/FR-M4/FR-M6, FR-F1–FR-F5 | `getBoard`, `getSignalsNow` |
| `/s/[slug]`, `/r/[slug]`, `/i/[slug]`; by=experience/rights/mode; wrong type 308 to correct prefix; competency alias e.g. `/s/communication` 307 to `/metrics#competency-…`, otherwise unknown 404 | Public | FR-M2/FR-M3, FR-D2–FR-D5, FR-R1 own history | `getInstrumentDetail`, `selectDebriefsFor` |
| `/compare?a&b&f` | Public | FR-M5 | `getComparison` |
| `/search?q` | Public | FR-D6 | `searchWithSnapshots` |
| `/metrics`, `/metrics/[key]` | Public | FR-D2, FR-M4 | Registry/`getMetricExamples`; #core-competencies and `#competency-<slug>` |
| `/sources` | Public | FR-D1/FR-D5, §11 | `getSources` |
| `/people` | Public | §8.1, FR-R4 | `getBoard`, `selectSupply` |
| `/auth/login`, callback, signout | Public | FR-A1/FR-A2/FR-A6 | Auth actions |
| `/onboarding?step=start\|units\|done` | Public, merge after sign-in | FR-O1–FR-O6 | Onboarding actions |
| `/me` | Student | FR-M6, FR-W1–FR-W3 | `selectWatchlistGroups`, `selectSkillBoard`, `db.requests` |
| `/me/skills` | Student | FR-O4–FR-O6, US7 | `selectSkillBoard` |
| `/me/gap?role&f` | Student | FR-G1–FR-G3 | `diagnoseGap` |
| `/me/requests` | Student | FR-C7/FR-C8, FR-R5 | `selectStudentRequests` |
| `/me/settings` | Student | FR-A3–FR-A5, FR-W4, Q7 | Privacy actions |
| `/chat/new?instrument&f&signal` | Student | FR-C1–FR-C6, FR-C11 | `findCandidates`/`generateStarters`/`createRequest` |
| `/chat/[id]` | Student/practitioner | FR-C7–FR-C10, FR-R1/FR-R2, FR-A7 | `selectRequest`/chat/safety |
| `/practitioner/join` | Authenticated | FR-P1–FR-P3 | `Practitioner` actions |
| `/practitioner` | `Practitioner` | FR-P4–FR-P6 | `selectPractitionerInbox` etc. |
| `/admin/{reports,review,pipeline,metrics,taxonomy}` | Admin | FR-X1–FR-X5 | Admin selectors/actions |
| `/legal/{privacy,terms,conduct,reliability}` | Public | FR-A6, FR-C10 | Static drafts |

Build URLs through `src/lib/links.ts`: `chatHref(slug, filter?, signalKind?)`, `instrumentPath(type, slug, filter?)`, `loginHref(next)`.

## 4. `FilterSpec`/URL encoding

```ts
type FilterSpec = { rules: { work_modes: ('onsite'|'hybrid'|'remote')[]; location_ids: string[] }[]; seniority: 'all'|'entry'|'graduate'; work_rights: 'all'|'no_pr_required' };
```

- `encodeFilter`/`decodeFilter` ?f uses form-safe characters: `ohr.au-nsw-sydney*r.au.nz_entry_npr`; * separates rules, each work-mode letters.location IDs, suffix seniority/rights. Omit defaults.
- Union, max four `MAX_RULES`; `normaliseFilter` removes unknown IDs and ancestor/descendant duplication.
- expandFilterToCells → pairs leaf/mode, seniority buckets, rights buckets; architecture §6.3, reusable backend sums.
- `describeFilter(spec, copy)`, FR-F3, `messages/en/market.json` `Filter.readback`.
- `src/lib/filters/locations.ts`: AU eight states/territories + NZ; country/state/city/area, Sydney/Melbourne areas. Preserve IDs in seeds.

## 5. Public reads (`src/lib/queries/market.ts`)

| Function | Return | Notes |
|---|---|---|
| `getBoard({type: 'all'\|'skill'\|'role'\|'industry', metric?, filter, sort?: 'value'\|'change', q?, layer?: SkillLayer \| null})` | Board type/metric/sort/layer/rows `InstrumentSnapshot[]`/signals/as_of | No category or A–Z; legacy az/name → value. Invalid metrics default skill `ad_count`, role `growth_12m`, industry/all `ad_count`; All accepts sharedMetrics only |
| `getInstrumentDetail(slug, filter, metric?, by: BreakdownDimension = 'experience')` | InstrumentDetail or null | Breakdown §11.4, all valid readings, 104-week series, role/industry skill-weight composition or skill roles; industry-only heatmap else null; related/state locations/signal |
| `getComparison`(a,b,filter) | Comparison or null | 52-week Pearson correlation, overlap, `shared/onlyA/onlyB` |
| `search(q)`/`searchWithSnapshots`(q,filter) | Grouped skills/roles/industries, matched/via name/alias/symbol/prefix, competencies | FR-D6 alias normalisation; competencies explanations only |
| `getSignalsNow`(filter,limit=12) | `InstrumentSnapshot[]` | Current-filter signals by magnitude |
| `getTape(limit=16)` | `TapeEntry[]` | National four-week changes, signals first |
| `getIndustryHeatmap(filter)` | `Heatmap` kind industries | All industries by job ads descending |
| getIndustrySkillHeatmap(industrySlug,filter) | `Heatmap` kind industry_skills, parent | Area = industry ads mentioning skill |
| `getMovers`(filter,limit=4) | Mover instrument/`change_4w` reading/sparkline | All three types use `change_4w`; `from ≥ min_sample`; descending absolute relative change, tie larger from then slug, pure `pickMovers` |
| `getMetricExamples`(key,filter) | instrument/reading[] | Definition examples |
| `getSources()` | `DataSource[]` | Sources/admin |

**`MetricReading`, FR-D2**: metric, status ok/insufficient_sample/unavailable, value, numerator, denominator, `from/to`, low/high, sample_n/`min_sample`, window start/end/days, source official/ads/practitioner, source_id, updated_at.
- Thin value null, no trend, suggest broader filters (FR-D4).
- Changes require `from/to` (FR-D3).
- Registry: applicable types/default-common-advanced/windows/minimum 30/`available_after_days`/`text_derived`/ignores/source; `Metrics.<key>` copy. Generate DB definitions from same file (A6).
- **Industry**: ActiveInstrumentType skill/role/industry, ANZSIC Division letter in anzsic; `parent_id` reserved/null/hidden. All metrics except `salary_median`/p10_p90/`skill_premium`/`skills_per_ad`. Default Demand `ad_count`, `change_4w` signalMetric.
- **Industry skills**: INDUSTRY_COMPONENTS Record<industrySlug, `IndustryComponent`[]>; `RoleComponent`-shaped skill_slug/weight, fraction of industry ads 0–1. componentsOf handles both; industriesForSkill reverse. Suggested backend `instrument_components(parent_id, skill_id, weight, window)`.
- **Segment counts**, fixture approximation: industry weekly count × weight × skill-relative-market-share trend, normalised by eight-week mean. Real data sums industry ∩ skill cells. `industrySkillReadings` returns `ad_count` with industry denominator and `change_4w`.
- **`Heatmap`**: kind industries/industry_skills, parent string/null, tiles, as_of; tiles slug/type/name/symbol, ads `ad_count`, change `change_4w`. Area uses numerator even when thin value null. `heatStep` absolute change <2% neutral, 2–10 light, ≥10 dark, blue up/orange down; non-ok grey hatch. Pure squarify in `src/lib/market/treemap.ts`.
- Signals: rise/fall absolute change ≥25% and ≥10 ads; `entry_open` +10pp within eight weeks; sufficient samples. `since_added` only `selectWatchlist`.

## 6. Actions

Rows show input Zod → output → errors → architecture/table mapping. All actions guard first; unlisted errors only unauthenticated/forbidden/validation.

### 6.1 Auth (`src/lib/api/auth.ts`)

| Action | Input | Output | Errors | Mapping |
|---|---|---|---|---|
| `requestMagicLink` | email, age_confirmed true, privacy_acknowledged true, next? | email/token/`expires_at` | emailInvalid/ageRequired/privacyRequired; three/address/10 min | `signInWithOtp`, consents |
| `completeSignIn(token)` | token | redirect: next → onboarding if Tier0 incomplete → me | `linkInvalid`/Used/Expired, one hour | Callback, profiles/`student_profiles`, merge anonymous |
| `signInWithGoogle` | age/privacy/next | redirect | Same | OAuth |
| signOut | — | signed_out true | — | Signout |

### 6.2 Onboarding/skills (`onboarding.ts`, `skills.ts`)

| Action | Input | Output | Mapping |
|---|---|---|---|
| `completeTier0` | university_id/degree_id/year | saved_to_profile/suggestions | **Anonymous** `localStorage` sm-onboarding:v1, `mergeAnonymousOnboarding` on login; architecture cookie equivalent |
| `completeTier1` | unit_codes string[] | Same | Replace inferred only, preserve confirmed/self-reported |
| `skipOnboarding` | tier0/tier1/all | Tier states | FR-O3 |
| confirmSkill/removeSkill | id | `StudentSkill` | Hard removal, no rejection record, R7 |
| `addSkill` | skill_slug | `StudentSkill` | `instrumentNotFound`/`skillAlreadyAdded` |
| restoreSkill | Original row | `StudentSkill` | Undo |
| Reads: `selectSkillBoard` → confirmed/suggestions/next_steps/starting_out; `selectOnboarding`; `suggestNextSteps` | | | `student_skills` |

demo/education.ts: five universities, USyd 18 units, eight degrees; `inferSkillProfile` cap 0.9, discard below0.3. **Backend needs real universities/`course_units`/`course_unit_skills` seeds**; current mappings illustrative.

### 6.3 Watchlist (`watchlist.ts`)

| Action | Input | Output | Errors/notes |
|---|---|---|---|
| `addWatchlistItem` | instrument_slug/status held or watching/filter/metric? | `WatchlistItem`, `baseline_value` | `instrumentNotFound`, `rolesCannotBeHeld` (roles/industries; skill only held), `alreadyWatching` same instrument/filter, watchlistFull30 |
| `updateWatchlistItem` | id/status?/filter?/metric? | Item | Filter/metric resets baseline |
| remove/restoreWatchlistItem | id/item | | Undo |
| Reads: `selectWatchlist` → item/current/`since_added`/signal; `selectWatchlistGroups` → signals/held/watching; `findWatchItem` | | | `watchlist_items`/signals |

### 6.4 Gap (`gap.ts`, pure)

`diagnoseGap`(roleSlug,skills,filter=DEFAULT_FILTER,universityId?) → role/filter/priorities≤3/have/later or null. GAP_WEIGHTS relevance0.5/entry0.2/transfer0.15/effort0.15. Each priority includes relevance, entry share `MetricReading`, transferability, effort, traceable unit paths; project suggestions labelled unsourced. No readiness score.

### 6.5 Privacy/settings (`privacy.ts`)

| Action | Input | Output | Notes |
|---|---|---|---|
| `updateProfile` | display_name/university_id/degree_id/year/`visa_status` | `StudentProfile` | Education triggers reinference; optional visa FR-A3 |
| `updateFieldVisibility` | field/private or matched_practitioner | Visibility map | FR-A4/FR-C11 |
| `updateEmailPreferences` | digest?/signal_alerts? | `email_prefs` | Transactional request emails mandatory |
| setUiMode | market/plain | | Plain hides ticker, uses Track etc., Q7 |
| requestExport | — | `StudentExport` JSON Blob, `export_ready` outbox | Production private Storage/24h URL |
| `requestDeletion` | confirmation DELETE | requested_at/purge_after +30d | Cancel pending, clear personal data, signout, `deletion_scheduled`; `deleteConfirmMismatch` |
| Reads: `selectConsents`/`buildExport` | | | consents/`account_deletions`/`data_exports` |

### 6.6 Matching/chats (`matching.ts`, `starters.ts`, `chat.ts`)

`findCandidates({instrument_slug, filter, decision_question?, student_state?, student_id?, exclude_ids?}, db, now)` → candidates≤3, fallback null/adjacent/waitlist, architecture §7.1:
- Verified/unpaused/unsuspended, no mutual blocks, below monthly cap, open slot ≥48h.
- Holds skill, or ≥2 of top-five role components/current same role.
- `MatchReason` factors: holds40; 1–3 years25/4–6 years10; top role15; topic-keyword10; same state10; monthly load −5n.
- Fewer than three: co-occurrence≥0.3 adjacent skills labelled `adjacent_skill`; empty → waitlist/recruitment, never blank.

`generateStarters(ctx)` returns exactly three id/vars from 18 deterministic `Starters.*` templates, no LLM.

| Action | Input | Output | Errors |
|---|---|---|---|
| `createRequest` | instrument_slug/filter/signal/question15–500/practitioner_id/slot_id/starters1–3 each≤280/`shared_fields`/agree_conduct true | Held slot, expires min(created+72h,slot−12h), `request_received` | `slotTaken`/`candidateUnavailable`/`studentPaused`/`rateLimited` five/day |
| acceptRequest | id | accepted/booked/`request_accepted` | `chatStateChanged` |
| declineRequest | id, no reason | Quiet immediate replacement; still looking | |
| `proposeReschedule` | id/slot_id | `reschedule_proposed` | |
| accept/declineReschedule | id | accepted/cancelled | |
| `cancelRequest` | id/as student or practitioner | cancelled | `tooLateToCancel`, accepted ≥24h notice |
| `confirmAttendance` | id/as/attended boolean | Wait for other, or complete after 7d; absence `no_show_*` | `tooEarlyToConfirm` |
| `submitDebrief` | id/vote more_keen,no_change,less_keen/note≤140 | One-click L0 | |
| join/`leaveWaitlist` | instrument_slug/filter or id | `WaitlistEntry` | |

Reads: `selectStudentRequests`(db,now) → needs_you/upcoming/waiting/past, no rejection counts/reply rates; `selectPractitionerInbox`(db,practitionerId,now); `selectRequest`(db,id); `openRequestFor`; `selectDebriefsFor`(db,slug), own-only history; `canCancel`.

State machine `src/lib/chat/machine.ts` ↔ SQL `transition_chat_request`:

| From | Event | Actor | To |
|---|---|---|---|
| — | create | student, system | pending |
| pending | accept / decline / propose_reschedule | practitioner | accepted / declined / `reschedule_proposed` |
| pending | expire | system | expired |
| pending | cancel | student | cancelled |
| `reschedule_proposed` | accept_reschedule / decline_reschedule / cancel | student | accepted / cancelled / cancelled |
| `reschedule_proposed` | expire | system | cancelled |
| accepted | confirm_attended | student, practitioner | accepted, awaiting other |
| accepted | complete | system | completed |
| accepted | confirm_absent | practitioner / student | no_show_student / no_show_practitioner |
| accepted | cancel | student, practitioner | cancelled |

studentStatus maps declined/expired/practitioner cancellation to `still_looking` (C7/C8).

### 6.7 Practitioners (`practitioner.ts`)

| Action | Input | Notes |
|---|---|---|
| `joinAsPractitioner` | agree_18/agree_conduct true | Draft |
| `sendWorkEmailCode` | email | Six digits,10 min,30s resend; free domains denied/manual review. **Preview code in outbox**; production hash verification table |
| `verifyWorkEmailCode` | code /^\d{6}$/ | Three attempts; success verified |
| `requestManualReview` | email/linkedin_url/note? | `manual_review`/admin queue |
| `updatePractitionerProfile` | current_title/current_role_slug/employer/entry_year/location_id/skills1–12/topics1–5/path/bio?/https meeting_link or null | FR-P2 |
| `updateAvailabilityTemplate` | timezone/windows weekday1–7,start,end,≤14 | Each≥20 min, same-day non-overlap via `availabilityProblems`;28d slots |
| setPaused/updateCap | boolean/1–4 | FR-P6 |
| finishPractitionerSetup | — | Add/switch practitioner identity |
| setActingPractitioner | id | **Preview only** seeded identity |
| Reads | `selectMyPractitioner`, `selectActingPractitioner`, `joinStepFor`, `selectDeskStats` own-only, `selectPractitionerSlots` | |

### 6.8 Safety (`safety.ts`)

reportUser target_kind/target_id/request_id/reason harassment,inappropriate,no_show,spam,safety,other/details; other≥10 chars,10/day. blockUser target_id closes mutual pending requests, student still looking; `unblockUser(id)`; `selectMyBlocks`/`hasBlocked`. Exclude blocked candidates.

### 6.9 Administration (`admin.ts`, admin only)

resolveReport id/status resolved|dismissed/resolution; suspendUser practitioner_id/report_id for30d; liftSuspension; approvePractitioner; rejectPractitioner id/note; rerunJob; upsertAlias alias/instrument_slug, conflicts with existing names/aliases; removeAlias. Reads `selectReports`, `selectReviewQueue`, `selectPipeline`, selectFunnel(db,now) North Star/funnel definitions/numerators/denominators, warn n<10; `selectAliases`.

## 7. Jobs (`src/lib/api/jobs.ts`, `chat-jobs.ts`)

| Job | Rules | Production |
|---|---|---|
| `refreshSlots` | 28d of20 min template slots; remove expired/out-of-template open slots | Availability job |
| `runChatJobs` | Expire pending at `expires_at` and **quietly replace** next, skip `tried_practitioner_ids`, record `replaced_by`, `request_still_looking` email; unanswered reschedule72h cancels; once-only 24h reminder and +1h debrief/attendance; one-side attendance completes after 7d; ≥2 no-shows/30d suspends30d for both roles | SQL expiry/reminder/reliability jobs |

Constants REPLY_WINDOW_MS72h, EXPIRY_BEFORE_SLOT_MS12h, CANCEL_NOTICE_MS24h, AUTO_COMPLETE_MS7d, NO_SHOW_LIMIT2, NO_SHOW_PAUSE_MS30d.

## 8. Email outbox templates

`magic_link`, `work_email_code`, `request_received`, `request_accepted`, `request_rescheduled`, `request_still_looking`, `reminder_24h`, `debrief_prompt`, `attendance_prompt`, `waitlist_match`, `signal_alert`, digest, `export_ready`, `deletion_scheduled`. Subjects: common.json `Outbox.templates`; vars in enqueue calls.

## 9. Backend gaps/architecture differences, pending decisions

| # | Issue | Preview workaround | Proposal |
|---|---|---|---|
| 1 | Blocks lacks `blocker_id` | `Practitioner` encoded into `blk:<practitioner>:…` ID | Add `blocker_id uuid` |
| 2 | No shared-field snapshot | `Practitioner` reads live profile | `shared_snapshot jsonb` frozen by `shared_fields` at create, stricter C11 |
| 3 | Manual LinkedIn/note evidence | Extended `PractitionerRecord` | review_evidence jsonb or table |
| 4 | Student suspension | Only practitioner suspension; student no-shows pause requests | `profiles.suspended_until` |
| 5 | No cancellation template | Other party not notified | `request_cancelled` |
| 6 | Magic tokens/rate limits | Outbox vars | Supabase Auth/`rate_limits` |
| 7 | Skill growth | Fixture tracking starts2024-06, shows12m | Hide until available_after_days730, mechanism exists |
| 8 | ANZSCO | Eleven confident codes, others no single code | Verify M1 seeds |
| 9 | Effort/transferability | Editorial estimates disclosed as unmeasured | Manual maintenance/evidence |
| 10 | Env | None added | — |
| 11 | Industries | Ten Division fixtures,parent reserved | All19 at launch; Subdivision/Group pending |
| 12 | Industry/skill weights | Editorial fixture | ANZSIC ad industry × extraction |

## 10. Limitations

- Synthetic data, fictional people/employers and `.example` domains; no real auth/email/storage/server authorisation. Admin checks client only.
- One demo account/browser; signing in after deletion creates anew.
- All mixes four-week skill/industry and12m role changes, explained in header; homepage movers consistently four-week.
- Legal drafts require review.
- Figma not updated on this branch.

## 11. Frontend round two (`fe-r2`)

### 11.1 Neutral source copy (A2)
- SOURCE_IDS.ads = job-ads-fixture, formerly `adzuna-au-fixture`; `Sources.names` renamed, old key removed.
- Ads name Australian job ads (illustrative fixture), licence Sources and licences being finalised — see Data & safety. No named job-ad suppliers in src/messages/tests/`e2e`.

### 11.2 ASC skill layers (C3)
- Instrument.`skill_layer` SkillLayer|null, `technology_tool`/`specialist_task` (`SKILL_LAYERS`), roles/industries null. Activities/methods = tasks, named software/platform/language/framework = tools. catalog `SPECIALIST_TASKS`/skillLayerOf; backend needs column.
- Skills `?layer=tool|task`, `parseLayer`/`layerParam` logic.ts; `SkillLayerSwitch` board-controls, radio `Segmented`, All skills · Tools · Tasks. Detail kicker Skill · Technology tool · ….
- **communication removed as instrument** from catalogue/components/seeds/education/`FIRST_STEPS`; agile replaces final `FIRST_STEPS`.
- competencies.ts:
  - CORE_COMPETENCIES slug/aliases, ten ASC order; Competencies.items.<slug>.name/blurb.
  - competencyLevels(roleSlug) slug/level1–10[]|null, role only, **illustrative not ASC data**; COMPETENCY_SCALE_MAX10.
  - searchCompetencies(q,limit3), minimum 3, exact before prefix; competencyHref `/metrics`#competency-<slug>.
  - Role `CoreCompetencies` ASC order, no sorting, bars/n/10; search exact competency first, palette too; metrics explains every job uses these so demand untracked; attribution Framework: Australian Skills Classification, Jobs and Skills Australia wherever shown.
- Legacy `dropUnknownInstruments(db)`, demo/sanitize.ts: remove unknown watchlist/skills/waitlist/alias overrides/practitioner skills on `localStorage` load; `selectWatchlist` skips unknown; chat slug text retained.

### 11.3 Simple places/remote (B2)
- `FilterSpec`/encoding **unchanged**. filters/spec.ts:
  - REMOTE_ANYWHERE_RULE remote + au, isRemoteAnywhereRule.
  - SimpleFilter places/modes/includeRemoteAnywhere.
  - `toSimpleFilter` accepts one rule or main+AU remote in either order, otherwise null.
  - fromSimpleFilter(simple,{seniority,`work_rights`}) no normalisation, for form validation.
  - remoteAnywhereRedundant true when main covers AU remote; disable/explain.
  - Optional `FilterCopy.ruleRemoteAnywhere` reads later remote rules as remote roles anywhere in Australia.
- Panel: Places multiselect replacing ancestors/descendants → three mode checkboxes → remote toggle → Level → Work rights → readback data-testid filter-readback. Multi-rule editor in Advanced; unrepresentable URL auto-opens Advanced, cannot switch simple.
- Location not breakdown; state panel retained.

### 11.4 Breakdown prototype (B1)
- Types.ts BreakdownDimension experience/rights/mode, `BREAKDOWN_DIMENSIONS`; ExperienceBucket entry/mid/senior/expert,0–2/3–5/6–9/10+, UI Expert · 10+ yrs; `BreakdownBucketKey`.
  `Breakdown { by, kind: 'stack'|'lines', measure, requested, buckets: { key, series: SeriesPoint[], latest: MetricReading, share }[], total: SeriesPoint[] | null, filtered_to: BreakdownBucketKey[] | null, estimated, salary_stated: { with_salary, total } | null, insufficient: BreakdownBucketKey[] }`.
- MetricDefinition.breakdown stack/lines/null: `ad_count` stack, `salary_median` lines, others null with Breakdown shows Job ads.
- computeBreakdown(slug,metric,filter,by), `engine.ts`:
  - Stack four-week rolling buckets sum to total ±weekly rounding; latest `ad_count`, share fraction.
  - Role-only lines: rolling52w salary medians; disclosed n below minimum → null gaps, no interpolation; insufficient lists latest thin buckets.
  - `Seniority`/rights/actual modes restrict buckets; `filtered_to` displays Filtered to ….
  - `experienceSplit(entryShare)` divides other into mid/senior/expert, lower entry means more senior, fixture; `Seniority` unchanged.
  - Text-derived Experience/rights estimated true, Estimated/method popup.
- `BreakdownSection` under main chart, `section#breakdown`, all three types; `BreakdownChart` stacked/multiple lines, direct labels/right, legend latest/share, table. ?by omitted for default experience.
- Light/dark series-ord1..4 ordered experience; rights cat1/faint Not stated/cat2; mode cat1..3; fill/stroke/bg tools,1px surface boundaries, dashed line differentiation.
- Backend needs finer experience cells than graduate/entry_other/other and salary sample counts by bucket.
