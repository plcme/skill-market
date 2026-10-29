# FE-R11 review

Scope `fe-r10...fe-r11`, two commits 66d1511 and 7512c85: the shared `src/components/ui/stepper.tsx` replaces the hand-rolled steppers in coffee-chat request (4 steps), student onboarding (3 steps) and practitioner join (5 steps). The stepper is pinned under the header, aligned to the gutters, has a dashed track with an ink fill, and nodes that pop in. The design was approved by the user, so this review does not reopen it. No E2E or browser run (CI runs E2E).

## Round 1 — Return for changes

Acceptance command results: `pnpm lint` and `pnpm typecheck` clean. `pnpm exec vitest run` under load had 10 tests across 6 files time out at 5000 ms (community-chat, contract-demo, onboarding-board-skills, student-auth). Each file passed when re-run alone: 19, 8 (+13 todo), 8 and 6 tests. The diff touches no unit tests or the code under them.

Verified:
- **Step-selection rules.** These match the old code except that the current step is now disabled. In the old code, clicking it did nothing.
  - Onboarding: `canSelect = STEPS[i] !== 'start' || hasBasics`. Same as the old `disabled={target === 'start' && !hasBasics}`.
  - New chat: the default rule `i < current` matches the old `reachable`.
  - Practitioner join: `i <= indexOf(derived) && not done/agree`. Same as the old rule.
  - The `fuzzy-search.spec.ts:144` `/Your profile/` click still matches the new name "3 Your profile". The fixture practitioner is verified, has a profile and availability, and holds the persona, so `derived = 'done'` and the button is enabled.
- **A11y.**
  - `nav` labels are preserved: "Setup progress" and "Step n of N".
  - `aria-current="step"` is on the button.
  - Button names are always `n Label` through `aria-label`, so labels hidden on phones no longer drop the name. Before, the new-chat name on a phone was just the number.
  - Done steps get "(done)" when `completeLabel` is passed.
- **Sticky layering.**
  - The site header is `h-16` plus a 1px rule at every breakpoint, so `top-[65px]` is right on mobile too.
  - The stepper's z-30 sits below the header (z-40), dialogs and popovers (z-50) and toasts (z-60), and above combobox lists (z-20).
  - Its containing block is `main` (ClientPage is only a Suspense, RequireSession is a fragment), so it stays pinned for the whole page.
- **Phone layout at 375px.** The content is 343px wide. Edge labels are anchored to their node. Middle labels are centred and short ("Work email", "Availability", "Choose someone", "Pick a time"), so none crosses a gutter. The 44px hit area reaches 8.5px into the 16px gutter, with no overflow.
- **Motion.** Animations sit behind `motion-safe:`, and the global reduced-motion rule also stops the width transition. Tailwind v4's `translate` property does not clash with the `transform` keyframes.
- **JSX splits.** The PageHeader, Stepper (`mb-8`) and body Container keep the old spacing.

### Required fixes (blocking)

1. **[e2e/responsive.spec.ts:175] The final step-click in the onboarding test will fail.** It runs `progress.getByRole('button', { name: '2 Skills', exact: true }).click()` while the current step is "Your board". Skills is done at that point, so its name is now "2 Skills (done)". The old `aria-label` overrode the sr-only "(done)" span, which is why this passed before. The exact match finds nothing, and the test times out in CI. Fix: change it to `'2 Skills (done)'`. Line 158 was already updated, but this one was missed.
2. **[src/features/community/new-chat.tsx:230] The sticky context card is partly hidden behind the stepper on desktop.** The card is `sticky top-24` (96px), but the stepper now stays pinned from 65px to 149px at z-30 with an opaque `bg-paper`. On the question, time and review steps at `lg`, the card's top ~53px stays hidden for the whole scroll. That covers its "contextTitle" kicker and the start of the market context. Fix: lower its offset to below the stepper, e.g. `top-[165px]` (65 + 84 + 16). It is better still to export the stepper's height from `stepper.tsx` and derive the offset from it, so the two cannot drift apart.

### Suggestions (non-blocking)

- `messages/en/student.json:54` `Onboarding.progress.count` ("Step {n} of {total}") is no longer referenced anywhere in `src`. Delete it.
- New chat and practitioner join don't pass `completeLabel`, so screen readers can't tell finished steps from untouched ones on those flows. The check icon shows this only visually. This was also true before; pass a shared "(done)" key for consistency.
- Keyboard focus and validation targets can now land in the 149px under the header and stepper (WCAG 2.4.11). For example, the question textarea after `submitQuestion` fails, or form fields while tabbing. Consider `scroll-padding-top` (about 165px) on pages that render a Stepper, or `scroll-mt` on the focused targets.
- On a 375x667 phone, the header, stepper and tab bar together take about 213px (32%) of the height. The design is approved, so this is only flagged for a manual check on the longer forms (profile, availability).

## Round 2 — Return for changes

Scope `8e4927a..22737ef`, one commit (22737ef). No E2E or browser run. Acceptance command results: `pnpm lint` and `pnpm typecheck` clean. Unit tests per the coordinator: passed on the second run. 22737ef changes no unit tests or the logic under them.

Verified:
- Round 1 fix 2 is fixed. The context card now uses `style={{ top: STEPPER_STICKY_BOTTOM + 16 }}`, which is 165px. `STEPPER_STICKY_BOTTOM = 149` is exported next to the stepper's `top-[65px]` and `h-[84px]`.
- Suggestions taken:
  - `Onboarding.progress.count` is removed.
  - `stepDone` is added to both community namespaces and passed as `completeLabel`.
- No e2e test selects a new-chat or practitioner-join step button by an exact name. The only hit, `fuzzy-search.spec.ts:144`, uses the regex `/Your profile/`, which also matches "3 Your profile (done)". The `'Done'` match at `responsive.spec.ts:128` is the phone sheet, not a stepper.

### Required fixes (blocking)

1. **[e2e/responsive.spec.ts:160 and :175] Round 1 fix 1 went on the wrong line, so the onboarding test now fails in two places.**
   - Line 158 clicks "1 Basics (done)", so the current step is Basics. At line 160 Skills (index 1) is therefore not done, and its name is "2 Skills". The new `'2 Skills (done)'` exact match finds nothing.
   - Line 175 runs after "See my board", so the current step is "Your board" and Skills is done. It still uses `'2 Skills'`, which no longer matches.
   - Fix: change line 160 back to `'2 Skills'` and set line 175 to `'2 Skills (done)'`.

### Suggestions (non-blocking)

- None new.

## Round 3 — Pass

Scope `ee2a79a..48a1458`, one commit (48a1458). It changes only `e2e/responsive.spec.ts`. No E2E or browser run. Acceptance command results: lint and typecheck were clean in Round 2, and this commit touches only one e2e line pair, so they were not re-run.

I walked the onboarding test (lines 135–178) step by step. "Current" is the step the test is on at each line:

| Line | Current step | Button | Expected name | Matches |
|---|---|---|---|---|
| 140 | `start` | Skills, current | "2 Skills" | yes |
| 158 | `start` | Basics, done, enabled | "1 Basics (done)" | yes |
| 159 | `basics` | Basics, current | "1 Basics" | yes |
| 160 | `basics` | Skills, not done | "2 Skills" | yes |
| 163 | `done` | Your board, current | "3 Your board" | yes |
| 175 | `done` | Skills, done | "2 Skills (done)" | yes |

- Line 160: Skills is enabled because the sample student has basics.
- Line 175: Skills is enabled. The test then expects `step=start`.

Round 2 fix 1 is fixed. No other step-button names are matched by exact name in `e2e/`.

### Required fixes (blocking)

None.

### Suggestions (non-blocking)

- None new.
