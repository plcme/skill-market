# Review — fix/perf-quick-wins

Scope: behaviour-preserving CPU reductions for Cloudflare Workers Error 1102 (hoisted Intl formatters, lazy palette suggestions, bounded `getBoard` memo). Reviewed `git diff main...fix/perf-quick-wins` (main cf4ecd6, head b623ebd) plus the consumers of the changed functions.

## Round 1 — Pass

Acceptance command results:
- `pnpm lint` — exit 0, no findings.
- `pnpm typecheck` — exit 0.
- `pnpm test:unit` — 40 files, 448 passed, 13 todo, 0 failed.
- Ad-hoc measurement (temporary test, not committed): every unsearched board combination = 126 entries (matches the comment), ≈7.5 MB heap delta in Node, All board ≈153 KB serialised. Within a 128 MB Workers isolate.

Verified:
- Formatters: `COUNT_FORMAT` / `AUD_FORMAT` use the same locale and options as before, so output is identical. Time-zone cache: an invalid zone throws `RangeError` in the constructor before `cache.set`, so it still throws on every call and is never cached. Case variants of valid zones get their own entries, give the same output as before, and are capped at 64.
- Board key completeness: `buildBoard` reads only `query.type`, `query.filter`, the resolved metric, sort, normalised layer, needle and aliases. All of these are in the key. `as_of` is the build-time constant `DATA_AS_OF`, and the engine has no mutable module state. Aliases only affect results when the needle is non-empty, and `searchInstruments` treats `[]` the same as `undefined`, so using `0` in both cases is correct. `FilterSpec` holds only strings and string arrays. `JSON.stringify` therefore cannot make two different filters collide, and a key-order difference only causes a cache miss. `detectSignal` already uses the same JSON as the signal identity. Server callers (`/market`, `/people`) always pass `DEFAULT_FILTER`.
- Alias ids: these are monotonic WeakMap ids and are never reused, so a GC'd alias array leaves at most a dead entry that the cap evicts. `useSearchAliases` returns a fresh parsed array whenever the content changes and never mutates one in place. This is the same identity assumption `catalog.ts` already makes for `aliasSearches`.
- Shared state: no consumer mutates a board or snapshot object (`searchable-board.tsx`, `watching-board.tsx` via `watchedRows`, `board.tsx`, `people/page.tsx`). Server boards reach the client as serialised copies. `searchable-board.tsx` is a client component, so a second bounded cache lives in the browser. It only fills with searched boards when aliases exist, and that is fine.
- Palette: Radix `Portal`/`Content` is not mounted while the palette is closed. SSR and the first client render are both closed, so there is no hydration risk. While the palette is open, `list`, `go(i)`, the Enter/Arrow index arithmetic and `aria-activedescendant` see exactly the list they saw before. Nothing used the suggestions while the palette was closed.

### Required fixes (blocking)

None.

### Suggestions (non-blocking)

1. `src/lib/queries/market.ts:82-86`: eviction is FIFO, not LRU, and the 126 unsearched boards already fill 126 of the 128 slots. Each distinct `?q=` value (user typing, link previews, crawlers) therefore evicts the oldest hot board. A burst of searches flushes the cache back to today's per-request cost. This does not affect correctness, and the result is never worse than main. Fix: on a hit, `boardCache.delete(key); boardCache.set(key, board)` (LRU). Better still, keep searched boards (`needle !== ''`) in their own small bounded map, so the finite set of unsearched boards is never evicted.
2. `src/lib/queries/market.ts:88`: the comment "the cached board itself never escapes" is only half true. The `InstrumentSnapshot` objects in `rows`, including `signal.filter`, which references the first caller's filter object, are shared across requests in the isolate. Nothing mutates them today. To keep it that way, say so in the comment ("rows are shared; treat snapshots as read-only"). Optionally, type the cached rows as `readonly`/`Readonly<InstrumentSnapshot>`, or `Object.freeze` them in development.
3. `src/lib/queries/market.ts:52-55`: the cache is valid only while the board comes from the deterministic fixture engine. When `getBoard` moves to `metric_points` (the production path described at the top of this file), this memo has to go or be keyed and invalidated on data refresh. A `TODO` naming that dependency would stop it surviving the contract-first refactor by accident.
4. `tests/board-cache.test.ts:11-16`: "returns equal boards for repeated queries" compares one cached result with another, so it would pass even if the first build were wrong. Content correctness is still covered by the existing `market-pages-logic`, `fuzzy-search`, `industry` and `contract-demo` tests, so this is not blocking. A test-only `clearBoardCache()` (or comparing against an uncached `buildBoard`) would make cache-vs-fresh equivalence explicit.
