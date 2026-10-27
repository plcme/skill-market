# Site-wide fuzzy search implementation and verification

Implementation date: 2026-10-23, Sydney time.

Branch `codex/fuzzy-search-research` was created from main at `ec02399f1c4507e90e37169c50bd5aa3fe281b01`. Worktree: `/Users/tongtianyi/.codex/worktrees/fuzzy-search-research/skill-market`. The implementation covers all nine text-search entry points identified in the research, preserving each one's business scope and ordering.

## Matching rules

The shared layer is `src/lib/search/matcher.ts`, with pinned dependency `fuse.js@7.5.0`. Exact names, exact codes or symbols, and exact aliases take precedence in that order; prefix and substring matches precede approximate matches. Deduplicate by entity and apply the result limit after type, skill-layer, and exclusion restrictions.

Fuzzy retrieval uses Fuse.js with location and field-length penalties disabled. Its candidate threshold is 0.34, tightened by word length: one ordinary edit for 4–8 letters and at most two for 9 or more. Adjacent-letter transpositions are supplemented separately by a single literal swap, avoiding a two-edit budget for `pyhton → Python` that would also return PyTorch. Multiword queries require every word to match, across fields and regardless of word order. Explicit match tiers replace the research's tentative 0.6/0.3/0.1 field weights, preserving exact name, symbol, and alias priority despite third-party score changes.

Words shorter than four letters, numeric codes, and technical punctuation do not receive automatic typo expansion; existing exact, prefix, and substring matches remain. Unicode compatibility forms, case, and whitespace are normalised, with an 80-character input limit. This does not automatically provide Chinese translation, pinyin, or semantic search; those require additional labels or aliases.

## Search coverage

| Entry point | Implementation and preserved behaviour |
| --- | --- |
| Header, mobile, and keyboard shortcut search | Shared catalogue and core-competency search; exact competency aliases first; arrow keys, Enter, Escape, focus restoration, and IME composition protection |
| Full search results | Up to 40 skills, roles, and industries each; core competencies still link to the explanation page; snapshots, filter parameters, empty states, and browsing suggestions preserved |
| Market board and Watching | Search determines candidates; value/change ordering, skill layers, and watched subsets remain; URL behaviour, clearing, 280ms debounce, and IME protection preserved |
| Compare picker | Restrict to the same type and exclude selected items before taking up to 12 matches; empty queries browse up to 40 items |
| Add skill | Restrict to skills and exclude existing skills before taking up to 20; inferred skills can still be confirmed |
| Course picker | Search only the selected university; titles tolerate typos, codes use literal matching and whitespace normalisation; `DATA 2002` equals `DATA2002`, while `DATA2003` is not replaced with another course |
| Place picker | Conservative name typo tolerance; exact short names first; preserve location IDs, hierarchy, non-selectable country, and disabled selected items |
| Practitioner profile skill filter | Names, symbols, and aliases supported; selected skills remain visible |
| Admin alias filter | Literal text filtering by default; `Include similar matches` adds results labelled `Similar match`; saving and conflict detection remain exact |

Core files: `src/lib/market/catalog.ts`, `src/lib/market/competencies.ts`, `src/lib/demo/education.ts`, `src/lib/queries/market.ts`, and the location, admin-alias, and browser-alias adapters under `src/lib/search/`.

## Browser-preview alias data boundaries

Admin alias overrides remain in the current browser's preview data. `useSearchAliases` extracts only aliases and their catalogue IDs and caches by content. After alias additions or removals, the same browser's search dialog, full results, market board, compare, add-skill, and profile filters use the updated index; other preview-data changes do not rebuild it.

Public pages first render static catalogue results on the server, then apply local aliases when the browser is ready. No alias cookies, copied login state, or server persistence were added. Other browsers and requests without client execution continue to use the public static catalogue. Replace this data source during backend integration.

## Verification results

- Full unit suite: 29 files, 320 tests passed, including 25 new search tests. Final command: `pnpm exec vitest run --maxWorkers=1 --testTimeout=10000`. Existing chat tests occasionally exceeded the default five seconds; this run used a ten-second limit without changing or skipping assertions.
- Type checking: `pnpm typecheck` passed.
- Lint: `pnpm lint` passed with zero errors and warnings.
- Production build: `NODE_OPTIONS=--max-old-space-size=2048 pnpm build` passed.
- Browser regression: 56 tests passed at desktop 1280×800 and mobile 375×812, covering every new search flow plus existing public pages, market board, compare, skill layers, and core-competency explanations. Checks include accessibility, URLs, IME, focus, selected items, and alias addition/removal. Search-dialog screenshots were inspected at both sizes.
- No database schema or persistent-data changes; Docker and database migrations were not run.

Browser command:

```sh
E2E_PORT=3219 pnpm exec playwright test e2e/fuzzy-search.spec.ts e2e/frontend.spec.ts e2e/round2.spec.ts --project=desktop --project=mobile --workers=1 --max-failures=2 --grep 'fuzzy-search.spec|public page|market board|searching "communication"|skills board narrows'
```

## Performance and library comparison

Node.js v24.1.0, macOS arm64. The real catalogue contains this branch's 100 records; synthetic data retains six technical-name fixtures and generates the remainder deterministically. Seven queries cover exact names, typos, reversed multiword input, technical punctuation, and no results; each ran ten times after warm-up. Heap deltas are process observations before and after index construction, not guarantees of production peak memory. Raw results: `FUZZY_SEARCH_BENCHMARK.json`.

| Dataset | Records | Build ms | Median query ms | P95 ms | Heap delta MiB |
| --- | --- | --- | --- | --- | --- |
| catalogue | 100 | 1.41 | 0.58 | 1.10 | 0.57 |
| fixtures | 6 | 0.11 | 0.02 | 0.03 | 0.02 |
| synthetic | 1000 | 1.85 | 2.76 | 5.66 | 3.15 |
| synthetic | 10000 | 21.81 | 27.54 | 58.70 | 16.48 |

The client output contains 73 JavaScript chunks totalling 2,209,790 bytes, or 698,666 bytes when individually gzipped. These are totals for the whole application, not the first-page download or this change's size delta. The installed full Fuse minified module is approximately 9 KB gzipped.

Fuse.js and MiniSearch 7.2.0 in a temporary directory both passed the seven small fixture queries; this does not establish either library's superiority on all datasets. Fuse.js is retained because the project primarily searches structured names and aliases, and the shared adapters have verified short symbols, exact-match priority, and domain restrictions. MiniSearch was not added as a production dependency.

Rerun the baseline synthetic benchmark:

```sh
node --expose-gc scripts/benchmark-search.mjs
```

For the real catalogue, use the project's existing esbuild to generate a temporary module and point `SEARCH_CATALOGUE_MODULE` at it. `MINISEARCH_MODULE` optionally points to a comparison module; it does not require a production dependency. No persistent search service is needed.
