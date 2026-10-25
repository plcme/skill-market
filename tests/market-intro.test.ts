import { describe, expect, it } from 'vitest';
import { BOARD_QUERY_KEYS, easeOutCubic, FLIP_MS, FLIP_THRESHOLD_MAX, flipTarget, flipThreshold, bandStep, isBareEntry, isBareSearch, isZoomed, KEYBOARD_QUIET_MS, restingPage, settleStep, skipSnap, touchTarget, tweenAt, UNKNOWN_REST, WHEEL_QUIET_MS, wheelFlipTarget, wheelPixels, wheelStep, type PagerState } from '@/features/market/intro';
import { marketEntryHref } from '@/features/market/logic';

describe('landing band', () => {
  it('shows on the bare entry only, for everyone: no board query keys (tracking params do not count)', () => {
    expect(isBareEntry({})).toBe(true);
    expect(isBareEntry({ utm_source: 'newsletter', ref: 'x' })).toBe(true);
    expect(isBareEntry({ type: '', q: '  ', sort: undefined, view: [] })).toBe(true);
    for (const key of BOARD_QUERY_KEYS) expect(isBareEntry({ [key]: 'x' }), key).toBe(false);
    expect(isBareEntry({ type: 'role' })).toBe(false);
    expect(isBareEntry({ q: ['', 'js'] })).toBe(false);
    expect(BOARD_QUERY_KEYS).toEqual(['type', 'q', 'sort', 'view', 'layer', 'metric']);
  });

  it('reads a live query string the same way', () => {
    expect(isBareSearch(new URLSearchParams(''))).toBe(true);
    expect(isBareSearch(new URLSearchParams('utm_source=x&q='))).toBe(true);
    expect(isBareSearch(new URLSearchParams('q=dat'))).toBe(false);
    expect(isBareSearch(new URLSearchParams('sort=change'))).toBe(false);
    expect(isBareSearch(new URLSearchParams('q=&q=js'))).toBe(false);
  });

  it('decides the band on entry only: bare entries get it, deep links do not', () => {
    for (const shown of [true, false]) {
      expect(bandStep(shown, { type: 'enter', bare: true })).toBe(true);
      expect(bandStep(shown, { type: 'enter', bare: false })).toBe(false);
    }
  });

  it('never adds or removes the band for in-place query changes, whichever way the query goes', () => {
    // Bare entry, then search, sort, a tab, and back to bare: the band stays.
    let shown = bandStep(false, { type: 'enter', bare: isBareSearch(new URLSearchParams('')) });
    for (let i = 0; i < 4; i++) {
      shown = bandStep(shown, { type: 'query' });
      expect(shown).toBe(true);
    }
    // Deep entry (/market?q=data), then clearing the search makes the query bare: still no band.
    shown = bandStep(true, { type: 'enter', bare: isBareSearch(new URLSearchParams('q=data')) });
    expect(shown).toBe(false);
    for (let i = 0; i < 4; i++) {
      shown = bandStep(shown, { type: 'query' });
      expect(shown).toBe(false);
    }
  });

  it('the wordmark always brings the band', () => {
    expect(bandStep(false, { type: 'wordmark' })).toBe(true);
    expect(bandStep(true, { type: 'wordmark' })).toBe(true);
    // And later query changes keep it.
    expect(bandStep(bandStep(false, { type: 'wordmark' }), { type: 'query' })).toBe(true);
  });
});

describe('flipTarget', () => {
  const anchor = 600; // threshold = min(48, 60) = 48

  it('caps the threshold at 48px, or a tenth of short distances', () => {
    expect(FLIP_THRESHOLD_MAX).toBe(48);
    expect(flipThreshold(600)).toBe(48);
    expect(flipThreshold(480)).toBe(48);
    expect(flipThreshold(300)).toBe(30);
  });

  it('leaves the band and the board alone, whatever was rested on', () => {
    for (const rested of ['band', 'board', null] as const) {
      expect(flipTarget(0, anchor, rested)).toBeNull();
      expect(flipTarget(1, anchor, rested)).toBeNull();
      expect(flipTarget(anchor - 1, anchor, rested)).toBeNull();
      expect(flipTarget(anchor - 0.5, anchor, rested)).toBeNull();
      expect(flipTarget(anchor, anchor, rested)).toBeNull();
      expect(flipTarget(anchor + 200, anchor, rested)).toBeNull();
    }
  });

  it('from the band: a threshold or more toward the board flips there, less snaps back', () => {
    expect(flipTarget(20, anchor, 'band')).toBe(0);
    expect(flipTarget(47, anchor, 'band')).toBe(0);
    expect(flipTarget(48, anchor, 'band')).toBe(anchor);
    expect(flipTarget(60, anchor, 'band')).toBe(anchor);
    expect(flipTarget(550, anchor, 'band')).toBe(anchor);
  });

  it('from the board: a threshold or more toward the band flips there, less snaps back', () => {
    expect(flipTarget(anchor - 20, anchor, 'board')).toBe(anchor);
    expect(flipTarget(anchor - 47, anchor, 'board')).toBe(anchor);
    expect(flipTarget(anchor - 48, anchor, 'board')).toBe(0);
    expect(flipTarget(anchor - 60, anchor, 'board')).toBe(0);
    expect(flipTarget(50, anchor, 'board')).toBe(0);
  });

  it('scales the threshold down for a short band', () => {
    expect(flipTarget(29, 300, 'band')).toBe(0);
    expect(flipTarget(30, 300, 'band')).toBe(300);
    expect(flipTarget(271, 300, 'board')).toBe(300);
    expect(flipTarget(270, 300, 'board')).toBe(0);
  });

  it('without a known resting page, the nearer page wins (exactly half goes back to the band)', () => {
    expect(flipTarget(60, anchor, null)).toBe(0);
    expect(flipTarget(299, anchor, null)).toBe(0);
    expect(flipTarget(300, anchor, null)).toBe(0);
    expect(flipTarget(301, anchor, null)).toBe(anchor);
    expect(flipTarget(540, anchor, null)).toBe(anchor);
  });

  it('does nothing without a band above the board', () => {
    for (const rested of ['band', 'board', null] as const) {
      expect(flipTarget(0, 0, rested)).toBeNull();
      expect(flipTarget(10, 0, rested)).toBeNull();
      expect(flipTarget(10, -50, rested)).toBeNull();
      expect(flipTarget(1, 2, rested)).toBeNull();
    }
  });
});

describe('restingPage', () => {
  it('names the page a settled offset rests on', () => {
    expect(restingPage(0, 600)).toBe('band');
    expect(restingPage(1, 600)).toBe('band');
    expect(restingPage(599, 600)).toBe('board');
    expect(restingPage(600, 600)).toBe('board');
    expect(restingPage(2000, 600)).toBe('board');
    expect(restingPage(2, 600)).toBeNull();
    expect(restingPage(300, 600)).toBeNull();
    expect(restingPage(598, 600)).toBeNull();
  });
});

describe('settleStep', () => {
  const anchor = 640;
  const never = () => false;
  const always = () => true;
  const on = (page: 'band' | 'board'): PagerState => ({ rest: { page, anchor }, pending: null });

  it('records the page a settle lands on, whoever scrolled there', () => {
    expect(settleStep({ rest: UNKNOWN_REST, pending: null }, { y: 0, anchor, skip: never })).toEqual({ rest: { page: 'band', anchor }, pending: null, scrollTo: null });
    expect(settleStep(on('band'), { y: 900, anchor, skip: never })).toEqual({ rest: { page: 'board', anchor }, pending: null, scrollTo: null });
    // Our flip arriving, even a pixel or two short.
    expect(settleStep({ rest: { page: 'band', anchor }, pending: anchor }, { y: anchor, anchor, skip: never })).toEqual({ rest: { page: 'board', anchor }, pending: null, scrollTo: null });
    expect(settleStep({ rest: { page: 'band', anchor }, pending: anchor }, { y: anchor - 2, anchor, skip: never })).toEqual({ rest: { page: 'board', anchor }, pending: null, scrollTo: null });
    expect(settleStep({ rest: { page: 'board', anchor }, pending: 0 }, { y: 2, anchor, skip: never })).toEqual({ rest: { page: 'band', anchor }, pending: null, scrollTo: null });
  });

  it('flips the way the visitor set off and remembers the flip it started', () => {
    expect(settleStep(on('band'), { y: 100, anchor, skip: never })).toEqual({ rest: { page: 'band', anchor }, pending: anchor, scrollTo: anchor });
    expect(settleStep(on('band'), { y: 20, anchor, skip: never })).toEqual({ rest: { page: 'band', anchor }, pending: 0, scrollTo: 0 });
    expect(settleStep(on('board'), { y: anchor - 60, anchor, skip: never })).toEqual({ rest: { page: 'board', anchor }, pending: 0, scrollTo: 0 });
    expect(settleStep(on('board'), { y: anchor - 20, anchor, skip: never })).toEqual({ rest: { page: 'board', anchor }, pending: anchor, scrollTo: anchor });
  });

  it('an interrupted flip forgets where it started, so the nearer page wins', () => {
    // Band → 100 starts a flip to the board; the visitor scrolls back up and stops at 250.
    const flipping = settleStep(on('band'), { y: 100, anchor, skip: never });
    const after = settleStep(flipping, { y: 250, anchor, skip: never });
    expect(after.scrollTo).toBe(0);
    expect(after.rest.page).toBeNull();
    // A finger hold that stops the glide and drags up to 200 does the same.
    expect(settleStep(flipping, { y: 200, anchor, skip: never }).scrollTo).toBe(0);
    // Taking over and carrying on past half still reaches the board.
    expect(settleStep(flipping, { y: 400, anchor, skip: never }).scrollTo).toBe(anchor);
    // Interrupted on the way back up, too.
    const back = settleStep(on('board'), { y: anchor - 100, anchor, skip: never });
    expect(back.scrollTo).toBe(0);
    expect(settleStep(back, { y: 500, anchor, skip: never }).scrollTo).toBe(anchor);
  });

  it('a vetoed flip leaves the visitor mid-way and forgets the resting page', () => {
    // Arrow keys from the band to 40, then 200: every settle is vetoed.
    let s: PagerState = on('band');
    for (const y of [40, 200]) {
      const step = settleStep(s, { y, anchor, skip: always });
      expect(step.scrollTo).toBeNull();
      expect(step.rest).toEqual({ page: null, anchor });
      s = step;
    }
    // Then one wheel notch up to 100: nearer page, the band, not a flip to the board.
    expect(settleStep(s, { y: 100, anchor, skip: never }).scrollTo).toBe(0);
  });

  it('passes the chosen target to the veto', () => {
    const seen: number[] = [];
    settleStep(on('band'), { y: 100, anchor, skip: t => { seen.push(t); return false; } });
    settleStep(on('band'), { y: 20, anchor, skip: t => { seen.push(t); return false; } });
    expect(seen).toEqual([anchor, 0]);
  });

  it('forgets everything while the band cannot act as a page', () => {
    expect(settleStep({ rest: { page: 'band', anchor }, pending: anchor }, { y: 100, anchor: null, skip: never })).toEqual({ rest: UNKNOWN_REST, pending: null, scrollTo: null });
    expect(settleStep({ rest: UNKNOWN_REST, pending: null }, { y: 100, anchor, skip: never }).scrollTo).toBe(0);
  });

  it('does not trust a resting page measured against another anchor', () => {
    expect(settleStep({ rest: { page: 'board', anchor: 700 }, pending: null }, { y: 600, anchor, skip: never }).scrollTo).toBe(anchor);
    expect(settleStep({ rest: { page: 'band', anchor: 700 }, pending: null }, { y: 100, anchor, skip: never }).scrollTo).toBe(0);
  });

  it('records without flipping when every flip is vetoed (the first look on mount)', () => {
    expect(settleStep({ rest: UNKNOWN_REST, pending: null }, { y: 0, anchor, skip: always })).toEqual({ rest: { page: 'band', anchor }, pending: null, scrollTo: null });
    expect(settleStep({ rest: UNKNOWN_REST, pending: null }, { y: 300, anchor, skip: always })).toEqual({ rest: { page: null, anchor }, pending: null, scrollTo: null });
  });
});

describe('skipSnap', () => {
  // 812px phone-ish viewport, 65px sticky header; settled at y=120, about to flip back to 0 (content moves down 120px).
  const base = { msSinceKeyboard: Infinity, focus: null, y: 120, target: 0, viewTop: 65, viewBottom: 812 };

  it('snaps when nothing keyboard-related is going on', () => {
    expect(skipSnap(base)).toBe(false);
  });
  it('leaves the page alone right after keyboard input or a focus move', () => {
    expect(skipSnap({ ...base, msSinceKeyboard: 0 })).toBe(true);
    expect(skipSnap({ ...base, msSinceKeyboard: KEYBOARD_QUIET_MS - 1 })).toBe(true);
    expect(skipSnap({ ...base, msSinceKeyboard: KEYBOARD_QUIET_MS })).toBe(false);
    expect(KEYBOARD_QUIET_MS).toBe(600);
  });
  it('does not flip a keyboard-focused element out of view', () => {
    // A board tab just scrolled into view at the bottom edge: flipping back to 0 would push it below the fold.
    expect(skipSnap({ ...base, focus: { top: 720, bottom: 750 } })).toBe(true);
    // Flipping on to the board would push a band CTA up under the header.
    expect(skipSnap({ ...base, y: 400, target: 600, focus: { top: 200, bottom: 244 } })).toBe(true);
  });
  it('still flips when the focused element stays at least partly visible', () => {
    expect(skipSnap({ ...base, focus: { top: 300, bottom: 344 } })).toBe(false);
    expect(skipSnap({ ...base, focus: { top: 650, bottom: 700 } })).toBe(false);
    expect(skipSnap({ ...base, y: 400, target: 600, focus: { top: 500, bottom: 540 } })).toBe(false);
    // A tall focused region (the board section) that spans the move.
    expect(skipSnap({ ...base, focus: { top: 100, bottom: 4000 } })).toBe(false);
  });
});

describe('wheel flip', () => {
  const anchor = 600;

  it('measures every delta mode in px', () => {
    expect(wheelPixels(100, 0, 800)).toBe(100);
    expect(wheelPixels(3, 1, 800)).toBe(48);
    expect(wheelPixels(-1, 2, 800)).toBe(-800);
  });

  it('on the band, only a downward wheel flips, to the board', () => {
    expect(wheelFlipTarget(0, anchor, 4)).toBe(anchor);
    expect(wheelFlipTarget(1, anchor, 100)).toBe(anchor);
    expect(wheelFlipTarget(0, anchor, -100)).toBeNull();
  });

  it('between the pages, the wheel direction decides at once', () => {
    for (const y of [2, 47, 300, 598]) {
      expect(wheelFlipTarget(y, anchor, 1)).toBe(anchor);
      expect(wheelFlipTarget(y, anchor, -1)).toBe(0);
    }
  });

  it('at the board top, only an upward wheel flips, to the band', () => {
    for (const y of [599, 600, 601]) {
      expect(wheelFlipTarget(y, anchor, -1)).toBe(0);
      expect(wheelFlipTarget(y, anchor, 100)).toBeNull();
    }
  });

  it('further down the board the wheel is native, unless one notch would carry the page back into the gap', () => {
    expect(wheelFlipTarget(900, anchor, 100)).toBeNull();
    expect(wheelFlipTarget(900, anchor, -100)).toBeNull();
    expect(wheelFlipTarget(650, anchor, -50)).toBeNull();
    expect(wheelFlipTarget(650, anchor, -51)).toBeNull();
    expect(wheelFlipTarget(650, anchor, -52)).toBe(0);
    expect(wheelFlipTarget(630, anchor, -100)).toBe(0);
  });

  it('leaves the wheel alone without a band that fits, and for sideways-only input', () => {
    expect(wheelFlipTarget(0, null, 100)).toBeNull();
    expect(wheelFlipTarget(300, null, -100)).toBeNull();
    expect(wheelFlipTarget(0, 0, 100)).toBeNull();
    expect(wheelFlipTarget(300, anchor, 0)).toBeNull();
  });

  it('a flip locks the wheel for the flip plus a quiet moment, and momentum keeps pushing the lock on', () => {
    const first = wheelStep({ y: 0, anchor, dy: 6, now: 1000, lockUntil: -Infinity, flipMs: FLIP_MS });
    expect(first).toEqual({ action: 'flip', to: anchor, lockUntil: 1000 + FLIP_MS + WHEEL_QUIET_MS });
    // Momentum during the flip, then at the board top after it: swallowed, wherever the page is.
    let lock = first.lockUntil;
    for (const [now, y] of [[1100, 200], [1400, anchor], [1520, anchor], [1650, anchor], [1780, anchor]] as const) {
      const step = wheelStep({ y, anchor, dy: 3, now, lockUntil: lock, flipMs: FLIP_MS });
      expect(step.action, `t=${now}`).toBe('swallow');
      expect(step.lockUntil).toBe(Math.max(lock, now + WHEEL_QUIET_MS));
      lock = step.lockUntil;
    }
    expect(lock).toBe(1780 + WHEEL_QUIET_MS);
    // A quiet moment later the wheel is the visitor's again: down scrolls the board, up flips back.
    expect(wheelStep({ y: anchor, anchor, dy: 3, now: lock, lockUntil: lock, flipMs: FLIP_MS }).action).toBe('native');
    expect(wheelStep({ y: anchor, anchor, dy: -3, now: lock, lockUntil: lock, flipMs: FLIP_MS })).toEqual({ action: 'flip', to: 0, lockUntil: lock + FLIP_MS + WHEEL_QUIET_MS });
  });

  it('under reduced motion the lock is only the quiet moment', () => {
    expect(wheelStep({ y: 0, anchor, dy: 6, now: 50, lockUntil: -Infinity, flipMs: 0 }).lockUntil).toBe(50 + WHEEL_QUIET_MS);
  });

  it('leaves the wheel native while the page is pinch-zoomed, lock or not', () => {
    expect(isZoomed(undefined)).toBe(false);
    expect(isZoomed(1)).toBe(false);
    expect(isZoomed(1.01)).toBe(false);
    expect(isZoomed(1.5)).toBe(true);
    expect(wheelStep({ y: 0, anchor, dy: 6, now: 1000, lockUntil: -Infinity, flipMs: FLIP_MS, zoomed: true })).toEqual({ action: 'native', lockUntil: -Infinity });
    expect(wheelStep({ y: 300, anchor, dy: -6, now: 1000, lockUntil: 1200, flipMs: FLIP_MS, zoomed: true })).toEqual({ action: 'native', lockUntil: 1200 });
  });

  it('leaves a wheel event the browser will not let us cancel native: no flip, no lock', () => {
    // Up from deep in the board: the browser already owns this gesture when it crosses into the gap.
    expect(wheelStep({ y: 630, anchor, dy: -100, now: 1000, lockUntil: -Infinity, flipMs: FLIP_MS, cancelable: false })).toEqual({ action: 'native', lockUntil: -Infinity });
    expect(wheelStep({ y: 300, anchor, dy: -3, now: 1000, lockUntil: -Infinity, flipMs: FLIP_MS, cancelable: false })).toEqual({ action: 'native', lockUntil: -Infinity });
    expect(wheelStep({ y: anchor, anchor, dy: 3, now: 1000, lockUntil: 1200, flipMs: FLIP_MS, cancelable: false })).toEqual({ action: 'native', lockUntil: 1200 });
    // The same events, cancelable, flip or swallow.
    expect(wheelStep({ y: 630, anchor, dy: -100, now: 1000, lockUntil: -Infinity, flipMs: FLIP_MS, cancelable: true }).action).toBe('flip');
    expect(wheelStep({ y: anchor, anchor, dy: 3, now: 1000, lockUntil: 1200, flipMs: FLIP_MS }).action).toBe('swallow');
  });

  it('native wheel input does not touch the lock', () => {
    expect(wheelStep({ y: 900, anchor, dy: 50, now: 5000, lockUntil: 10, flipMs: FLIP_MS })).toEqual({ action: 'native', lockUntil: 10 });
  });
});

describe('touch flip', () => {
  const anchor = 600; // threshold 48

  it('from the band: a threshold or more down flips to the board, less snaps back', () => {
    expect(touchTarget({ startY: 0, y: 20, anchor })).toBe(0);
    expect(touchTarget({ startY: 0, y: 47, anchor })).toBe(0);
    expect(touchTarget({ startY: 0, y: 48, anchor })).toBe(anchor);
    expect(touchTarget({ startY: 0, y: 500, anchor })).toBe(anchor);
  });

  it('from the board: a threshold or more up flips to the band, less snaps back', () => {
    expect(touchTarget({ startY: anchor, y: anchor - 20, anchor })).toBe(anchor);
    expect(touchTarget({ startY: anchor, y: anchor - 48, anchor })).toBe(0);
    // Dragged up from further down the board: measured from the board's top.
    expect(touchTarget({ startY: anchor + 400, y: anchor - 30, anchor })).toBe(anchor);
    expect(touchTarget({ startY: anchor + 400, y: anchor - 60, anchor })).toBe(0);
  });

  it('leaves the page to the browser when the finger lifts on a page or past the board top', () => {
    expect(touchTarget({ startY: 0, y: 0, anchor })).toBeNull();
    expect(touchTarget({ startY: 0, y: -30, anchor })).toBeNull();
    expect(touchTarget({ startY: 0, y: anchor, anchor })).toBeNull();
    expect(touchTarget({ startY: 0, y: anchor + 80, anchor })).toBeNull();
    expect(touchTarget({ startY: anchor + 400, y: anchor + 10, anchor })).toBeNull();
  });

  it('a touch that caught our flip mid-way goes the way the finger moved', () => {
    expect(touchTarget({ startY: 300, y: 310, anchor })).toBe(anchor);
    expect(touchTarget({ startY: 300, y: 290, anchor })).toBe(0);
    // A tap that did not move: the nearer page.
    expect(touchTarget({ startY: 200, y: 200, anchor })).toBe(0);
    expect(touchTarget({ startY: 400, y: 400, anchor })).toBe(anchor);
  });

  it('does nothing without a band that fits', () => {
    expect(touchTarget({ startY: 0, y: 100, anchor: null })).toBeNull();
    expect(touchTarget({ startY: 0, y: 1, anchor: 2 })).toBeNull();
  });
});

describe('flip tween', () => {
  it('eases out cubically and clamps', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });

  it('runs about 420ms, most of the way in the first third', () => {
    expect(FLIP_MS).toBeGreaterThanOrEqual(380);
    expect(FLIP_MS).toBeLessThanOrEqual(450);
    expect(tweenAt(0, 600, 0, FLIP_MS)).toBe(0);
    expect(tweenAt(0, 600, FLIP_MS / 3, FLIP_MS)).toBeGreaterThan(400);
    expect(tweenAt(600, 0, FLIP_MS / 2, FLIP_MS)).toBeCloseTo(75);
    expect(tweenAt(0, 600, FLIP_MS, FLIP_MS)).toBe(600);
    expect(tweenAt(0, 600, FLIP_MS + 50, FLIP_MS)).toBe(600);
  });

  it('jumps straight there under reduced motion', () => {
    expect(tweenAt(0, 600, 0, 0)).toBe(600);
  });
});

describe('marketEntryHref', () => {
  it('sends / to the board, keeping the query', () => {
    expect(marketEntryHref({})).toBe('/market');
    expect(marketEntryHref({ type: 'role', view: 'cards' })).toBe('/market?type=role&view=cards');
    expect(marketEntryHref({ q: ['js', 'ts'] })).toBe('/market?q=js');
  });
  it('drops a board filter in the same hop', () => {
    expect(marketEntryHref({ f: 'r.au-nt-darwin', type: 'skill' })).toBe('/market?type=skill');
    expect(marketEntryHref({ f: 'r.au-nt-darwin' })).toBe('/market');
  });
});
