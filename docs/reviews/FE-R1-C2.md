# FE-R1-C2 review (`fe-responsive` versus dev, final 6c38ad1)

## Round 1 — Pass

Acceptance:
- lint/typecheck/unit/build all passed.
- E2E_PORT3130:90 passed,2 skipped,2 failed at frontend.spec.ts:103, Reset filter URL assertion, desktop/mobile. This branch changes neither spec nor market/filter code; desktop1280 fine-pointer after-rule inactive. Independent1280 script hit the Reset anchor correctly via `elementFromPoint`, pointer coarse false, navigation worked. Market-board group8/8 passed. Load average~28; first isolated retry still failed. Judged pre-hydration clicking under load, not regression.

### Required fixes (blocking)

None.

### Suggestions (non-blocking)

1. theme.css:193–206 global44×44 after targets expand under coarse pointer or max-width767. Close controls overlap; later DOM wins, e.g. icon groups/pagination/chips. No e2e issue yet; check chip gaps≥8px or use local `min-h-11`. Zero-specificity where/base lets absolute/fixed/sticky utilities override relative, so positioning intact; stretched links use anchors and unaffected. Narrow desktop also applies, acceptable.
2. use-media-query.ts:14 SSR false briefly renders three desktop selects before phone sheet; useSyncExternalStore prevents mismatch but possible layout flash/autofocus keyboard. Skeleton before hydration or CSS dual structures could help.
3. playwright.config.ts:8 desktop excludes `responsive.spec`, so1024/1440 sanity lacks automation. Existing coverage retained: other specs desktop/mobile, responsive mobile/tablet; `E2E_PORT` still works.
4. Five keys now "No one can pay to change what the market shows", true for MVP, no future/employer-payment promise. `market-pages never.n2` conflict-disclosure promise should be recorded in PROGRESS and implemented when revenue exists.
