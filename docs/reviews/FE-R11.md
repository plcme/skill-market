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
