# Site-wide fuzzy-search research

Research date: 2026-10-23, Sydney. Baseline: main `ec02399f1c4507e90e37169c50bd5aa3fe281b01`.

Implementation is complete; see [implementation and verification](FUZZY_SEARCH_IMPLEMENTATION.md). This document preserves the original findings and candidates.

Use Fuse.js initially as a shared matcher with entry-specific policies. Preserve exact names, abbreviations, and aliases while adding typo tolerance. Keep business sorting on the board and stricter course-code, short-abbreviation, and admin policies.

All existing text-search/filter inputs are covered, including the boundaries of full-text, subsequence, database similarity, and semantic search. This research change added documentation only: no dependencies, product changes, or services. Candidates have not yet been benchmarked against project data.

## Existing search inputs

Paths are relative to this worktree. Header/mobile buttons share one command palette, counted once.

| Input | Location | Current rules | Recommendation |
| --- | --- | --- | --- |
| Header/mobile/⌘K/`/` palette | `src/components/shell/command-palette.tsx:57`; `src/lib/market/catalog.ts:329` | Exact name/symbol/alias, name/alias prefix, name substring; max eight | Shared matcher; exact first, fuzzy supplement; preserve keys/full-results navigation |
| `/search` | `src/app/search/page.tsx:73`; `src/lib/queries/market.ts` search/`searchWithSnapshots` | Shared catalogue, global 40 then skill/role/industry groups; separate competencies | Shared rules, groups/filters/snapshots; distinguish global/group limits |
| Board/Watching text | `src/features/market/board-controls.tsx:40`; `src/lib/queries/market.ts:51`; `src/features/market/watching-board.tsx` | Name/alias substring, exact symbol; type/layer first; value/change sort; watched intersection | Shared candidates, existing sorting/subset; URL/clear/280ms debounce |
| Compare picker | `src/features/market/instrument-picker.tsx:33` | Global 40, then same type/exclusions, final ten | Restrict legal candidates before matching/limit |
| Student add skill | `src/features/student/skills/add-skill.tsx:29` | Global 20 then skills | Skills first; preserve added/duplicate rules |
| Course picker | `src/features/student/onboarding/onboarding-flow.tsx:195`; `src/lib/demo/education.ts:117` | Selected-university code/title substring | University first; exact/prefix codes, typo titles; normalise `DATA 3406`/`DATA3406`, never silently fix digits |
| Places | `src/components/market/filter-builder.tsx:82`; `src/lib/filters/locations.ts` | Selectable name/short-name substring; no country | Conservative typos, exact `NSW` priority; hierarchy/disabled selections/IDs unchanged |
| Practitioner skills | `src/features/community/profile-form.tsx:44` | Skill-name substring; selected always retained | Names/aliases/symbols; selected remain visible |
| Admin aliases | `src/features/admin/taxonomy.tsx:33`; `src/lib/api/admin.ts:224` | Alias/owner-name substring; static/browser overrides | Literal default; clearly marked approximate suggestions, preserving conflict checks |

Core competencies are separate results in the first two entries: `src/lib/market/competencies.ts:105` supports exact/prefix aliases, minimum three characters. Fuzzy hits must still link to `/metrics#competency-…`, never invent tradable skills or metrics. Exact competency aliases precede catalogue hits.

Other university/degree/role/profile-place native selects have no custom search. Future comboboxes may reuse domain policies, but this research does not justify changing every control. No separate chat/legal/message text-search input was found; do not create a new whole-site index for them.

## Gaps

1. **No typo tolerance**: catalogue/course/place/profile rules cannot recover pyhton/javascrpt.
2. **Inconsistent rules**: board aliases support arbitrary substring, catalogue aliases prefix only, profiles names only; results differ by entry.
3. **Limits before domain restrictions lose results**: compare/add-skill search globally then restrict types; full results limit before groups. Fuzzy expansion worsens loss.
4. **Admin overrides disconnected**: `selectAliases` reads `DemoDB.alias_overrides`; public search uses static aliases only. Define browser-preview versus future server scope; never imply local overrides reached servers.
5. **English UI is not cross-language search**: `src/i18n/request.ts` fixes en, catalogue fields mostly English. Chinese queries need reviewed labels/aliases; fuzzy algorithms do not translate the Chinese phrase for data analysis.

## Open-source candidates

Capabilities from official sources; fit is a project-specific recommendation, not a project benchmark based on vendor claims.

| Candidate | Official capabilities | Fit |
| --- | --- | --- |
| [Fuse.js](https://github.com/krisk/Fuse) | Browser/Node, no dependencies, typos, weighted fields, match positions | First to validate; structured names/aliases, pure shared wrapper, no service. Repo shows Apache-2.0; verify selected version LICENSE |
| [MiniSearch](https://github.com/lucaong/minisearch) | MIT, memory index, prefixes/fuzzy/weights/suggestions, updates | Second choice; assess for multiword titles/descriptions/documents; preserve `C++`, C#, `Node.js`, course codes |
| [FlexSearch](https://github.com/nextapps-de/flexsearch) | Repo Apache-2.0; full-text/tokenisation/phonetic/Workers/character sets | Extension option, wider configuration; phonetic matching does not guarantee substitution/deletion/transposition recovery |
| [fuzzysort](https://github.com/farzher/fuzzysort) | MIT, editor-style subsequences, fields/highlighting | Good for command abbreviations; fuzzy name does not guarantee required typos; justify different rules if introduced |
| [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html) | Trigram similarity with GiST/GIN | Assess after DB migration; avoids separate service; punctuation/short symbols need exact paths |
| [Meilisearch](https://www.meilisearch.com/blog/typo-tolerance) | Per-field/length typo settings | Later if scale needs service; adds deployment/index sync/access controls |
| [Typesense](https://typesense.org/docs/28.0/api/search.html) | Field typos/prefix/filter, maximum typos/minimum lengths | Server alternative; verify version/licence/resources; not default deployment |

[Supabase full-text search](https://supabase.com/docs/guides/database/full-text-search) provides retrieval/ranking, not automatic typo tolerance. Design term search, name similarity, and permission filters separately.

Semantic search needs embeddings/retrieval architecture; it cannot replace exact `JS → JavaScript` aliases or course codes. Do not introduce it merely for typos.

## Fuse.js integration proposal

### Version and parameters

The inspected [releases](https://github.com/krisk/Fuse/releases) marked `v7.5.0` Latest and `v7.6.0-beta.0` prerelease. Recheck registry/tag and pin a validated stable version. Scoring fixes can reorder results; rerun ordering checks on upgrades.

Prototype with includeScore true, ignoreLocation true, threshold 0.30; tentative name/alias/symbol weights 0.6/0.3/0.1. These are assumptions, not achieved accuracy. Domain rules must handle exact codes/symbols first.

[Official docs](https://www.fusejs.io/) list token search and weighting; [token details](https://www.fusejs.io/token-search.html) describe strategies. Verify APIs on the chosen stable version; do not treat user input as extended syntax by default, lest punctuation/`C++` become operators.

### Shared logic and entry policies

Separate matcher/catalogue adapters in src/lib/search. Stable inputs: dataset, domain, query, limit, policy. Outputs: entity ID, match kind/field, optional highlight ranges. Keep `searchInstruments`/`searchCompetencies`/`searchUnits` compatibility wrappers and migrate callers gradually.

Order:

1. Trim/collapse whitespace, ignore case, consider field-specific Unicode normalisation; retain meaningful `C++`/C#/`.NET` punctuation.
2. Restrict visibility/university/type/layer/exclusions first. Fuzzy search must not broaden auth or domain scope.
3. Deterministic exact name/symbol/alias tiers, then existing prefix/substring, then fuzzy; deduplicate stable IDs.
4. Limit final legal candidates; compare/add-skill cannot limit before type filters.
5. Results/pickers sort relevance; boards use matching only to filter, preserving metric sorting. Add stable tie-breaks.

Unify retrieval, not every result count, empty-query behaviour, or business ordering. Preserve palette suggestions, results-page prompts, and course/place browsing independently.

### Tolerance boundaries

| Input | Policy |
| --- | --- |
| 1–2 chars, R, JS, QA, C#, `C++` | Existing exact/prefix/substring; no generic typo expansion |
| Medium/long English names/aliases | Conservative insertion/deletion/substitution; test transposition separately because distance definitions vary |
| Multiword | Assess AND matching across name/alias; define reversed-order behaviour; avoid broad single-word matches |
| Course codes | Case/space normalisation separately; differing digits are not the same course; label approximate suggestions |
| Place short names | Exact priority; longer-name typos with city/state context and user selection |
| Chinese/pinyin/cross-language | Explicit labels/aliases and dedicated queries; do not claim English library provides them |
| Admin conflicts/saving | Exact validation; approximate retrieval cannot change IDs, merge entities, or reassign aliases |

## Validation cases and acceptance

These are future targets, not completed results.

| Query/action | Target |
| --- | --- |
| `Python`/`PYTHON`/outer spaces | Same entity, exact priority |
| JS/`k8s`/r/`C++` | Exact aliases/symbols remain reachable, not buried |
| pyhton/javascrpt/kubernets | Correct entity top three; check irrelevant results, not just nonempty |
| `software enginer`/reversed words | Test actual names/aliases and multiword order |
| Multiple name/symbol/alias hits | Deduplicate; exact before approximate |
| communication/communciation | Exact competency first, typo reaches explanation, no fabricated metrics |
| Broad compare/add-skill | Legal candidates survive many other-type matches; exclusions persist |
| Board/Watching typo | Improved retrieval; preserve type/layer/watch set/value/change |
| Profile query changes | Selected skills visible and retained |
| `DATA 3406`/`DATA3406` | Same actual course within selected university; no silent digit correction |
| Place typo/`NSW` | IDs/hierarchy/selection preserved; exact abbreviation first |
| Override add/remove | Exact conflicts unchanged; scoped invalidation without pretending server sync |
| Empty/random/irrelevant short/too long | Existing empty/browse states, bounded false positives/cost, validated input cap |
| Keyboard/screen reader/Chinese IME | Arrows/Enter/Escape/focus/count/labels; no submission during composition |

Reuse `tests/market-pages-logic.test.ts`, market-competencies.test.ts, industry.test.ts, student-education.test.ts, and place tests. Assert entity, tier, scope, counterexamples, not vendor floating scores.

Benchmark current catalogue and reproducible 1K/10K synthetic records: build, median/P95 queries, heap delta, client size; record hardware/runtime/version/queries/cold-warm. Vendor README speeds are not project evidence. Cache static indexes, never rebuild on each key; consider Workers only after measured blocking. No Docker needed.

## Implementation order

1. Compare Fuse/MiniSearch on actual short-symbol/typo/multiword/punctuation queries; choose version/threshold.
2. Migrate catalogue/competencies, palette/full results/compare/add-skill, fix premature limits.
3. Board/profile adapters preserving order/selection.
4. Course/place adapters; admin literal default plus distinct approximate suggestions.
5. Resolve override source/invalidation and browser/server consistency separately.

Choose based on query quality and preserved behaviour. Reassess MiniSearch if multiword/long text dominates. Defer database/services until real-data architecture/resources are settled.
