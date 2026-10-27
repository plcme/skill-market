# FE-R9 review

Scope main...`fe-r9`, seven commits bae3d5c–1dfef5d. A: signed-in saved card one button; B: dev-only `?review=copy`, new `copy-review-v2`, explanatory onboarding/login copy only; C: removable mini-board suggestions, existing `WatchButton` for next steps/roles. FR-O4/PRD10/CLAUDE. No E2E per user preference.

## Round 1 — Return for changes

Lint/types clean;33 files 348 unit passed/13 todo. Existing13:50 `.next` build includes365cacf, verified no catalogue strings. Static output lacks `copy-review-v2`/`Copy decisions`/`Not seen yet`/`Onboarding · Basics`/`data-review-id`/`sessionStorage`: overlay/catalogue tree-shaken. Passthrough `ReviewText` ID literals and RSC manifest paths remain, acceptable.

Verified:
- Saved title/Go to my desk only; `savedBody`/`reviewSkills` removed/unreferenced.
- `removed_skills` backward-compatible parser tolerates missing/nonarray/nonstring/nonobject; shared read/hook parser tested.
- Anonymous hide/unhide idempotent, storage/notifies; Tier0 changes retain removals.
- Login reinfer excludes removed; deletes corresponding inferred only, held preserved by source check; clears storage, tested.
- Signed-in remove/restore original row/ID; slug key unmounts without stale row state.
- `removeName`/removed/undo central; dev overlay English confined removable directory; login name configured.
- Flow skeleton until DB/anon ready; review server false, production passthrough, hydration safe.
- Four onboarding steps including phone-sheet hints plus login/callback/signout explanations/notices covered; source/catalogue IDs tested one-to-one.

### Required fixes (blocking)

1. mini-board88/108–112, flow310: answered students deleting all suggestions (either identity) or confirming all (signed-in) see Good first steps/Tell us your degree and done You can start anywhere/No answers, no problem, despite answers. Confirming in me/skills then returning reproduces because inferred-only reads. False UI, PRD10, blocking despite main-session query. Separate answered (hasBasics or unit_codes length) from remaining suggestions; title/lede from answered, empty answered list hide `firstBody`/skills or truthful short key, retain next steps, test.
2. flow292/mini-board79–80: suggestions inferred-only also used anchors/owned; confirmed/self-reported skills omitted, next steps recommend owned skills with Watch/I have, roles undercount. Main full inference at least retained confirmed, regression FR-O6. Pass held/all `db.skills` separately; list inferred only but anchors all with source so held weight1; pure boardSkills selector/tests exclude held next steps.
3. mini-board103/150/flow335/copy-store49/53/54/60 wraps forbidden labels/data/headings: suggestionBadge, suggestionConfidence band/pct, nextEffort data, nextUnitsTitle heading. Delete decisions could remove required FR-O4 marks/confidence. `SuggestionMeta` reason-only; remove four wrappers/catalogue IDs; update copy-review.test64 `Badge`/`Confidence`/`Reason` expansion.

### Suggestions (non-blocking)

- Remove X unmounts focus to body, Undo hard to reach; existing skill page same, non-blocking; next-row X/last heading tabindex−1.
- Signed-in void `restoreSkill` swallows conflict; warning toast.
- flow200 added counts unfiltered anonymous removed skills; filter both sides.
- Anonymous recovery only toast, disappears; revisit decision14.
- Icon Watch labels lack skill names; existing shared issue, add name.
- 375 not browser-tested; grid/container/sr classes appear safe, run responsive before merge.

## Round 2 — Return for changes

Scope f3ab002..`fe-r9`, d22e641/e276b98; no E2E/browser, main session checks3009. Lint/types clean;34 files 355 passed/13 todo, new onboarding-board-skills.

Round 1 fixed:
1. `selectBoardSkills`.answered independent of count; done copy truthful; answered empty `startColumn` none hides list/body, next Broad and quick to start. Confirm-all/delete-all tested.
2. Anchors all `db.skills` with source; owned includes held, role weight1; confirmed/self next exclusion tested.
3. `Reason`-only review; four entries/wrappers removed, literal-ID and negative tests.

Suggestions: `addedByUnits` excludes removals/tested; Undo warn. Anonymous focus correct, signed-in defect below.

### Required fixes (blocking)

1. mini-board59–64/84–96 `onRemoved` too late: `removeSkill` transact emits synchronously, external-store SyncLane flush microtask and passive effect before await continuation. `rowKeys` effect sees undefined target, then `onRemoved` writes target without later row change. Delete leaves body (disabled pending already lost focus); Undo changes keys and stale target steals focus from toast to another X, next delete may use previous target. Anonymous `onRemoved` before hide unaffected. New accidental focus movement worse than none. Call before await for both; cancel target on failure/null, consume once/clear Undo/effect. Keyboard3009 first-X Enter→next, Undo no jump.

### Suggestions (non-blocking)

- flow199 memo ineffective because `selectOnboarding` creates state object each render; field dependencies or remove.
- Answered-empty Your starting point has no starting list, only summary/next; truthful/acceptable, optional rename.

## Round 3 — Pass

Scope fddfe98..`fe-r9`, f43a5b3 only. Reviewer no E2E/browser; main-session signed-in sample3009 verified Enter delete→next X, Undo no X focus, mouse last delete→previous.

Lint/types clean;34 files 357 passed/13 todo, two focus tests.

Blocker fixed:
- onStart synchronously records removed/target before either deletion. `resolveRemovalFocus` waits until removed gone, consumes once/clears pending.
- Pending rerender unchanged keys, no effect; transact removal triggers correct next focus, independent await timing.
- Undo target cleared, no stale focus.
- Failure/null cancelFocus clears own record only, not later actions.
- Last row column none unmounts `headingRef`, falls back mb-next.
- Anonymous top-limit refill keeps target valid, resolver handles.
- Pure tests next/previous/heading, wait removed disappears, missing target→heading.

Ineffective memo removed with explanation.

### Required fixes (blocking)

None.

### Suggestions (non-blocking)

Carry forward anonymous toast-only recovery pending14, icon Watch missing skill names, responsive375 before main.

## User copy decisions and premerge checks — 2026-10-25

Original worktree `skill-market-fe-r9`/branch `fe-r9`, HEAD3e40e74, initially clean. Implement exported onboarding/sign-in notes only where approved or explicitly annotated; unreviewed untouched, dev review retained.

- Twelve deletions: Basics universityHint/degreeHint/yearHint; board suggestionNote; Units unitsFrom/unitsNone; Your board emptyLede/saveBody; sign-in benefit2/free/emailHint/googleNote. Components/messages/catalogue removed together; catalogue test uses surviving entries.
- Two shortenings: basicsLede only "We use your degree to suggest skills you probably have."; `Auth.lede` only "{app} is free for students.", configured name.
- Exact JSON comparison:12 removed keys, only those two surviving values changed, zero additions.

Verification:
- Diff whitespace/ESLint/route generation/types passed.
- 34 files 357 passed/13 existing todo.
- Secret-free temp copy production build/prepare-standalone exit0. node_modules links original worktree, tracingRoot dependency warnings; compile verified, deployment package not verified. Production scripts no review/group strings.
- Independent production preview responsive:50 tests at 375×812/768×1024, overflow/axe/signed-in/mobile steps.
- Browser four onboarding steps/login: deleted absent, shortened correct, unreviewed retained, no runtime/missing-message errors; desktop/375 mini-board screenshots inspected.
- 375 signed-in keyboard first remove→next, Undo row/count restored.

Evidence boundary: original3009 HMR WebSocket handshake failed, onboarding/login stuck Loading; initial responsive attempt failed then stopped. Fifty passes from independent3019 production preview, not proof original process fixed. Original not stopped/restarted.

Merge assessment: no new blocker; Round 3 product/accessibility suggestions remain. Remote main `2eb904e96b5a08afefea673fe63afe7427a71747` equals local/ancestor of `fe-r9`, conflict-free integration possible. No remote `fe-r9`, edits uncommitted/unpushed, no covering PR/CI. Recommend commit then PR/CI merge; assessment/edits only, no merge/release.

## Preview feedback: three steps and skill-row actions — 2026-10-25

Baseline 869621a. Promote starting point to step 2 Skills, selected degree as title; remove units page/entry/copy/review candidates; retain Basics/Your board. Three native step buttons, aria-current; only Skills disabled without basics, saved answers retained for navigation.

Remove Job ads heading/count/unit, reuse `WatchButton`, danger full red-bordered removal;375 actions can wrap below text. Undo/focus retained. Fix me/skills deleted-page link; contract UI map explicitly no entry; underlying courses/API retained.

Lint/types/357 units/new build passed; six mobile/tablet onboarding checks: degree title, no ad data, Watch/red remove, keyboard next focus/Undo,1→2→3→2,overflow/axe. Visible3019 basics/step 2 operated, screenshot `/private/tmp/onboarding-step2-updated.png`. No unrelated full responsive rerun, package/live verification. Uncommitted/unmerged.

## Further feedback: signup first, separated content, Watch all — 2026-10-25

Continue original worktree including prior uncommitted flow. Anonymous Get started/direct onboarding go to login next=/onboarding using existing demo email/callback. Basics/Skills/Your board after login. Replace device-before-signup copy, remove final signup/save card. No real auth backend connected.

`MiniBoard` view skills/recommendations: step 2 suggestions only, step 3 roles/next skills only; each of three blocks uses WatchAllButton on own visible list. Optional `WatchButton` bookmarkOnly single icon, skill in accessible name, watched menu retained; other callers unchanged. Step 3 Market right of title, wraps on narrow phones.

357 units/lint/types passed; isolated build exit0, same symlink tracingRoot warning, not package verification. Eight mobile/tablet checks signup/return, three bulk states, delete focus/Undo, step navigation, separation,overflow/axe passed. Initial phone axe sampled translucent entrance frame; wait finite animation then audit stable view,8/8 without skipping axe. Independent desktop Market placement/navigation/no errors; second/third screenshots inspected. `/private/tmp/onboarding-skills-separated.png`, `/private/tmp/onboarding-recommendations-separated.png`, `/private/tmp/onboarding-signup-first.png`.3019 updated; user-side browser control disabled, cannot claim their tab refreshed. No additional commit/push/merge.
