# Data and page API contract

This branch uses `CONTRACT`, `InputOf`, `OutputOf`, and `Backend` from `src/lib/contract/index.ts` as its interface entry points. They describe the boundary between the future backend and the current prototype. No real ATS, JSA, Supabase, or email sending is connected in this change. Each operation's delta and the todos at the end of `tests/contract-demo.test.ts` preserve unimplemented differences; passing schema checks does not mean the real data pipeline is complete.

## Feature alignment with main

- The branch is synchronised with the latest main. The default name is `skill-market`; only the brewdex.app release configuration uses Brewdex.
- `watchAllItems({ slugs, filter })` returns `{ added }`. It deduplicates by normalised filters, preserves existing held/watching states and baselines, and uses each instrument's default metric for new items. Exceeding the 30-item capacity fails the whole batch; there are no partial writes.
- Search results support fuzzy in via; queries are limited to 80 characters. Exact, prefix, and substring matches take precedence over conservative typo tolerance. Short abbreviations, numeric codes, and technical punctuation do not receive spelling expansion. Type, layer, and other restrictions apply before result truncation.

## Data job boundaries

- Skill job sources are the public ATS APIs of Greenhouse / Lever / Ashby. JSA IVI provides monthly role history and role coverage estimates. Source terms and commercial-use permissions remain outstanding as recorded in SETUP.
- `pollAts` checks due employers hourly on a staggered schedule and queues new or changed jobs. A job may be marked closed only when confirmed absent from a successful, complete employer snapshot. Timeouts, 429s, errors, and incomplete pagination preserve the previous state and record a failure.
- `fetchAtsDetails` retrieves queued job descriptions, removes contact personal information, and deduplicates them. `extractFeatures` records the rule version. Employer, source job ID, occupation, state, month, and source timestamp must remain traceable.
- `computeMetrics` settles daily; `as_of` is the last successful settlement time. `polled_at` only indicates successful intraday collection and cannot replace the metric settlement time. Failures do not refresh success timestamps.
- IVI coverage aligns on ANZSCO4 × state × month and records the numerator, denominator, source, and method version. Skill coverage is an estimate derived from role mappings; do not claim IVI validates skill counts. Default `min_sample=30`. Insufficient samples, zero denominators, or missing corresponding cells must not produce reliable coverage or trend signals.
- The prototype retains existing fixed-threshold signals. Implement the architecture's Poisson test when connecting real data. No new statistical implementation is added here.

## Acceptance and next steps

Run lint, type checking, unit tests, and PR CI. Contract tests also verify actual prototype return values, particularly typo results and bulk-watch operations. Unconnected production fields remain explicitly marked as differences. Push this branch for review without merging main yet; release requires separate explicit authorisation to push a v* tag.
