# FE-R8 review

Scope ec02399...`fe-r8`, five commits, changed files only. No E2E/Playwright per main-session request.

## Round 1 — Return for changes

Lint zero errors/warnings, next typegen/tsc passed; vitest maxWorkers2 307/307 including market-intro tests `shouldShowIntro`/`isBareEntry`/`hasSessionCookie`/`introSeenCookie`/`hasIntroCookie`/`flipTarget`/`marketEntryHref`. Protected nav-model/watch-button/desk-view/common.json/community.json absent from diff.

Verified:
- Root307 via `marketEntryHref`, queries preserved (first array value), f removed in same hop; market canonical null, no double hop/loops even empty f/array.
- Server cookies/`isBareEntry` gate prevents flash; session-cookie presence excludes code-verifier, recognises chunks; constant1 values, no input injection. Deep links no cookie; refresh existing or preview signed-in only.
- Pager/refresh access document/window only effects and render null; useDB SSR/hydration null affects effect only.
- Own scroll pending±2px, edge1px, interrupted smooth recalculation, clamped browser stops events, no loops. Passive listeners fully removed/timer cleared.120ms fallback without scrollend, iOS inertia resets; no snap while touching; reduced motion instant; oversized band disables via null anchor.
- Heading order sr-h1/bandh2/heath3/boardh2; real anchor CTA works no JS, board scroll margin65 matches calculation. Fixed CSS band height, rise transform/opacity no layout shift.
- Home messages only, no orphan deleted/remaining keys or hardcoded name; movers removed, shared recruitment/`AUTO_ADVANCE_QUERY` retained legitimately.

### Required fixes (blocking)

1. intro-pager62–77/35–41: keyboard-induced scrolling corrected by snap, obscuring focus; CTA does not transfer focus. Tab from top into exposed board controls scrolls tens/100px, less than half anchor, settle returns0 and hides focused control (WCAG2.4.11/2.4.7); reverse ShiftTab similarly. `preventDefault` CTA leaves focus, next Tab Personalise drags back, unlike native anchor (2.4.3). Guard focused-main rectangle or recent key/focus period; CTA focus board tabindex−1 preventScroll; pure skip-snap tests.
2. intro69–73/pager73 half-only flip ignores direction, fights small wheel/arrow steps: anchor640 needs320, wheel100/arrow40 reset after~150ms, same upwards. Track last resting page; beyond min48px/10% anchor flip by direction, half fallback only no rest; `flipTarget`(y,anchor,`restedAt`), tests; update DESIGN's past-half rule.
3. intro-band19/45–47 phone/short-screen `sr-only` `HEAT_HEAD` includes hidden tabbable All industries, invisible focus2.4.7. Keep link visible or `focus:not-sr-only` at sensible position.

### Suggestions (non-blocking)

- Wordmark17/not-found16/signout40 still root, extra307; link market directly.
- Phone hides source but table remains readable without source/window; `sr-only` source or caption.
- No resize/orientation listener; intermediate rotation waits next scroll, optional settle.
- First-header query fragile; explicit site-header marker.

## Round 2 (Attempt 2) — Return for changes

Scope `origin/main`...`fe-r8`, merge-base/main2eb904e, changed only; no E2E. Lint/types exit0;32 files 354 passed/13 todo/zero failures.

Attempt 1:
- Focus fixed via tested `skipSnap`,600ms key/focus silence, focus-visible only; CTA board focus tabindex−1; pending arrival checked before skip.
- Direction functions/boundaries tested, including edge1px/degenerate/null half; rest maintenance defect below.
- Hidden-link focus styles distinct modifiers survive cn, focus higher priority.
- Direct market links, source table caption existing ads key, resize/orientation settle, site marker all implemented.

Other checks:
- Market merge only cookies/intro/Fragment/h1 move/band/board ID-tabindex-margin; `SearchableBoard`/provider/canonical/count match main, search inside board, band outside `Container`, no lost logic.
- iOS svh fixed despite toolbar; `innerHeight` fit guard only more permissive when toolbar hides; touch/inertia timers correct.
- Own arrival remembers target before pending; changed anchor rest-null converges.
- Release curl without-L redirect_url resolves relative Location, expected `307 https://brewdex.app/market` correct; bash-e command substitution fails on network, unexpected HTTP explicit exit1, quotes/tests correct.
- Central messages/name; root `searchParams` dynamic avoids build-fixed redirect.

### Required fixes (blocking)

1. pager80–84/94–112 stale `restedAt` after intermediate stop reverses intent. Example anchor640, band→100 starts smooth640, user interrupts350 upward to250; stale band sends640 unless retreat within 48. Same iOS drag200. Keyboard advances200 while skip then wheel up100 also sends640. Clear `rest.page` when skip/interruption leaves intermediate, half fallback sends250/100 to band; pure nextRest transition tests suggested.

### Suggestions (non-blocking)

- board59 `outline-none` to avoid huge accent focus outline after keyboard CTA, consistent main.
- keyboardFocusRect36–41/115 includes fixed header/tabbar; projected scrolling wrongly blocks flip until focus leaves. Restrict main/nonsticky ancestors.
- focusin146 includes mouse click; tabindex−1 board/main focus suppresses snap600ms, minor. Check focus-visible or key only; rename accordingly.

## Round 3 (Attempt 3) — Pass

Scope 6b01d1a..`fe-r8`,`791586a`, changed files; no E2E. Lint/types exit0;32 files 362 passed/13 todo, first run.

### Attempt 2 blocker fixed

Pure `settleStep` checked:
- Interrupted pending farther than2px resets rest to null, half rule:250/200→band,400→board, symmetric upward, tested.
- Vetoed snap returns null rest; arrows40/200 then wheel100→band, tested; E2E step added for intermediate/up→0.
- Null anchor clears rest/pending; anchor changes invalidate old rest; touching returns unchanged until release.
- 2px tolerance pending-only assigns destination, imperceptible/no reflip; old anchor→intermediate→new half target once then converges.
- Mount `settle(false)` records edges/null middle without scrolling; browser restoration triggers normal settle.
- `registerFlip` mount/unmount; React passive unmount precedes mount, StrictMode/navigation no stale callback; one band/pager. CTA arrival before skip, interrupted CTA half rule.

### Attempt 1 no regression

`skipSnap`/tests unchanged. Focus rectangle excludes outside-main/fixed/sticky. focusin records only visible focus; Tab key still recorded. Board `outline-none` added.

### Required fixes (blocking)

None.

### Suggestions (non-blocking)

- pager57/156 unconditional `registerFlip`=null safe single pager; multiple future instances should check callback ownership.
- pager68 CTA already at anchor generates no scroll, pending until settle, next uses half once; compare distance>2 before registering.

## Integration recheck — 2026-10-24

- Original seven FE-R8 commits including18c5eb2 plus main; round-one findings historical.
- Keyboard quiet/focus-visible/CTA focus implemented, no obscured focus.
- Narrow/short link visible on focus, table caption sources; resize/orientation uses explicit header.
- Past-half still current product rule; slow wheel may return to opening, leave for user trial, no unsolicited interaction change.
- Release root health check follows redirect; fuzzy `SearchableBoard` and first-visit opening retained.
- Prototype cookie only display, not auth; real Supabase pending.
- Record local/CI results at handoff; incomplete browser checks never counted passed.

## Follow-up — instant flip & always-on landing — RETURN

Scope `bec4f18`..`fe-r8`,`14c0e48`..`875d5da`, four commits. Lint/types exit0;32 files 376 passed/13 todo. No E2E; read-only headless localhost3008 probes (127.0.0.1 assets blocked, no hydration):
- One wheel step band→anchor643; board native; up at anchor→0; ctrl-wheel no flip.
- Touch80px release→anchor, root overflow hidden then empty;30px returns. Touch during flip releases lock; touchcancel settle; route change restores.
- Five tabs share font/size/colour/weight/baseline at 1280/375.

### Required fixes (blocking)

1. pager215 wheel lacks page-zoom guard; after pinch ordinary trackpad pan becomes flip, traps low-vision readers unable to view lower band. Touch checks visualViewport.scale>1.01; wheel only `ctrlKey` excludes gesture itself. Add shared zoom check/native, `wheelStep` zoomed input/test.
2. pager218–221 noncancelable wheel starts tween/lock, competing with native inertia. If first wheel native, later cancelable false; `preventDefault` fails/intervention. Starting upward deep board passes native then crosses anchor, frame jumps oppose inertia and jitter near eased end. Noncancelable must remain native/no lock and settle fallback, or root lock carefully avoiding scrollbar shift; test cancelable input.
3. market/page50 and URL `router.replace`: always-on band disappears as board controls add deep query, shifts whole page. Probe search dat removes band, scroll643→32; Chrome/Firefox anchoring hides viewport shift, Safari/iOS unreliable, controls move~600px offscreen. Cookie removal makes every visit affected. Deep-link omission concerns entry, not in-page interaction. Preserve entry-bare state or compensate board viewport in layout effect/no-op if anchoring already did; test sort keeps tabs visible.

### Suggestions (non-blocking)

- Footer Market still landing unlike header/menu/tabbar board; unify `MARKET_BOARD_HREF` or intentional exception.
- Every wheel `boardAnchor` layout reads (rect/style/height), nonpassive whole-window waits main thread; Lighthouse won't flag because `preventDefault` used. Cache on resize/settle or skip reads deep-board downward.
- No global smooth; auto equals instant; old WebKit instant TypeError risk if supported.
- Locked events bypass `ownedElsewhere`, dialog/internal wheels swallowed~570ms+quiet, rare.
- Known deviation1 upward deep-board crossing flips direction-consistently, acceptable; after blocker2 native+settle likely, verify real trackpad.
- Known deviation2 `sr-only` live counts acceptable/helpful without visual noise.
- FR-M4 measure switching now detail-only, metric deep links still valid; record PROGRESS.

### Verified

- Cookie/30 day/session/`IntroSeenRefresh`/`MetricSwitcher`/`SharedMetricSelect`/`signalCount`/metric-menu keys removed without references; query/test-used `metricsFor`/`sharedMetrics` retained.
- Client Wordmark pathname SSR/client same; prop name; modifier/middle/`defaultPrevented` native. Other route Next top, market pager tween else instant0; footer too.
- `isCurrent` shared desktop/sheet/account; tabbar isActive same results; hash without match not current, tested.
- Board65 margin matches header.
- Touch excludes multitouch/cancel/zoom/fixed/dialog; new touch/cleanup stop releases overflow; wheel only nonpassive, all cleanup.
- Tween ownership prevents old frames; settle inactive during tween, false afterward no loop; reduced motion jumps/no overflow lock.
- Watching uses common tab constants, measured identical.
- `wheelPixels`/`wheelFlipTarget`/`wheelStep`/`touchTarget`/`tweenAt`/`isCurrent`/`isBareEntry` unit tested.

### Attempt 2 — RETURN

Scope `git diff e8ab671..fe-r8 -- . ':!docs'`,`3a0b49c`/`8ceb7ac`/`b3b9252`. Lint/types exit0;32 files 380 passed/13 todo. No E2E; archive current/`bec4f18` scratchpad dev3028/3018, unchanged worktrees.

#### Previous blockers

1. Shared `isZoomed` fixes wheel/touch, zoom always native even locked, tested.
2. Noncancelable native/no flip/no lock, tested.
3. Landing board search now retains band/scroll643/search168, E2E added; reverse path below.

#### Required fixes (blocking)

1. market/layout13–15 Suspense streams async band at document end, invisible without JS, late shift with JS. SSR placeholder then hidden S:0; board byte17830, intro374853 after 357KB board, versus baseline intro17629. No-JS intro invisible (baseline visible), breaks plain-anchor design. JS briefly board at 97 before insertion, worse slow network; throttled local one such frame, contradicts never-flashes comment. Await band data/translations in layout, pass synchronous band; `StickyBand` `searchParams` dynamic no suspend, or restructure. Verify intro before board/no hidden wrapper/no-JS visible; add no-JS E2E.
2. intro.`keepBand`/sticky-band restores band when query becomes bare, pushing controls. Direct q=data, no band,scroll0/search200; clearing inserts band,search811 beyond800 viewport,tabs756. At top Chrome anchoring cannot help; sort/view/layer defaults also trigger. Decide only on entry/from other route/wordmark, preserve during in-page query; explicit show marker, or layout scroll compensation. Test deep-link clear keeps search visible.

#### Other checks

- Only market uses layout; h1 removed page, exactly one each state.
- Leaving unmounts state; people→role deep link no band; back to previously band-visible role loses band due remount, acceptable.
- People Market→#board643/tabs113; landing Roles retains band643; upward returns0, layout pager works.
- Footer board link, per-frame cached anchor, auto behaviour, locked-dialog native fixed.
- Maximum update depth exceeded preexists baseline bare once/load, same `updateDehydratedSuspenseComponent`/`enqueueConcurrentRenderForLane`; even hidden-band `intro_seen` baseline, not role/people. Dehydrated bare-All boundary updates, unrelated/no worsening, separate fix suggested, not blocker.

### Attempt 3 — PASS

Scope `git diff 880a62b..fe-r8 -- . ':!docs'`,`3949bb5`/`a0d705a`. Lint/types exit0;32 files 382 passed/13 todo. Read-only archive dev3038, closed afterwards. No E2E/build by reviewer; build passed per implementer.

#### Attempt 2 blockers fixed

1. HTML intro17711 before board39170, like baseline; no hidden wrapper, no deep-link band, no-JS visible, no throttled board-before-band frames.
2. Deep q=data clear→bare no insertion,scroll0/search200; landing search/clear band retained643/168.

#### Other checks

- `force-dynamic` market segment only, one page. Already per-request `searchParams`, unchanged caching; queries no fetch; OpenNext dynamic supported, existing health precedent. connection() equivalent unnecessary.
- showLanding client-effect listener registry cleaned, StrictMode one listener, no server request leak. Other-route wordmark returns before show, newly mounted bare layout shows. Deep-link wordmark shows/top, wheel→643; people wordmark band/top0.
- Previous checks retained: people Market board643; landing Roles keeps band/up0; deep-link Market board without band/tabs below header; one h1; zoom/noncancelable fixes/tests.
- Bare maximum-depth once/load persists like baseline, not introduced.

#### Required fixes (blocking)

None.

#### Suggestions (non-blocking)

- theme.css:1 Tailwind v4 scans unignored docs. Review's `[@media…]:focus:not-sr-only` at original line69 becomes invalid media class and CSS parse errors each dev compile. Docs must not influence CSS, and future reviews will quote classes. Add `@source not "../../docs";` after Tailwind import, here or separate chore; do not change review text merely to evade scanning.
