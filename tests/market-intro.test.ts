import { describe, expect, it } from 'vitest';
import { BOARD_QUERY_KEYS, FLIP_THRESHOLD_MAX, flipTarget, flipThreshold, hasIntroCookie, hasSessionCookie, INTRO_COOKIE, INTRO_MAX_AGE, introSeenCookie, isBareEntry, KEYBOARD_QUIET_MS, restingPage, settleStep, shouldShowIntro, skipSnap, UNKNOWN_REST, type PagerState } from '@/features/market/intro';
import { marketEntryHref } from '@/features/market/logic';

describe('intro band gating', () => {
  it('shows only to anonymous visitors without the cookie, on the bare entry', () => {
    expect(shouldShowIntro({ signedIn: false, cookieValue: undefined, bareEntry: true })).toBe(true);
    expect(shouldShowIntro({ signedIn: false, cookieValue: '1', bareEntry: true })).toBe(false);
    expect(shouldShowIntro({ signedIn: false, cookieValue: '', bareEntry: true })).toBe(false);
    expect(shouldShowIntro({ signedIn: true, cookieValue: undefined, bareEntry: true })).toBe(false);
    expect(shouldShowIntro({ signedIn: true, cookieValue: '1', bareEntry: true })).toBe(false);
    expect(shouldShowIntro({ signedIn: false, cookieValue: undefined, bareEntry: false })).toBe(false);
    expect(shouldShowIntro({ signedIn: true, cookieValue: '1', bareEntry: false })).toBe(false);
  });

  it('counts /market as the bare entry only without board query keys', () => {
    expect(isBareEntry({})).toBe(true);
    expect(isBareEntry({ utm_source: 'newsletter', ref: 'x' })).toBe(true);
    expect(isBareEntry({ type: '', q: '  ', sort: undefined, view: [] })).toBe(true);
    for (const key of BOARD_QUERY_KEYS) expect(isBareEntry({ [key]: 'x' }), key).toBe(false);
    expect(isBareEntry({ type: 'role' })).toBe(false);
    expect(isBareEntry({ q: ['', 'js'] })).toBe(false);
    expect(BOARD_QUERY_KEYS).toEqual(['type', 'q', 'sort', 'view', 'layer', 'metric']);
  });

  it('treats a Supabase auth cookie, whole or chunked, as signed in', () => {
    expect(hasSessionCookie([{ name: 'sb-abcdefghij-auth-token', value: 'base64-x' }])).toBe(true);
    expect(hasSessionCookie([{ name: 'sb-abcdefghij-auth-token.0', value: 'x' }, { name: 'sb-abcdefghij-auth-token.1', value: 'y' }])).toBe(true);
    expect(hasSessionCookie([{ name: 'sb-abcdefghij-auth-token', value: '' }])).toBe(false);
    expect(hasSessionCookie([{ name: 'sb-abcdefghij-auth-token-code-verifier', value: 'x' }])).toBe(false);
    expect(hasSessionCookie([{ name: INTRO_COOKIE, value: '1' }, { name: 'sm-theme', value: 'dark' }])).toBe(false);
    expect(hasSessionCookie([])).toBe(false);
  });

  it('remembers the band for 30 days, Secure on https only, without the brand in its name', () => {
    expect(INTRO_COOKIE).toBe('intro_seen');
    expect(INTRO_MAX_AGE).toBe(2_592_000);
    expect(introSeenCookie(false)).toBe('intro_seen=1; Path=/; Max-Age=2592000; SameSite=Lax');
    expect(introSeenCookie(true)).toBe('intro_seen=1; Path=/; Max-Age=2592000; SameSite=Lax; Secure');
  });

  it('finds the cookie in a document.cookie string by exact name', () => {
    expect(hasIntroCookie('')).toBe(false);
    expect(hasIntroCookie('intro_seen=1')).toBe(true);
    expect(hasIntroCookie('a=b; intro_seen=1; c=d')).toBe(true);
    expect(hasIntroCookie('a=b;intro_seen=')).toBe(true);
    expect(hasIntroCookie('not_intro_seen=1; intro_seen_x=1')).toBe(false);
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
