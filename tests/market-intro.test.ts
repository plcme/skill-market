import { describe, expect, it } from 'vitest';
import { BOARD_QUERY_KEYS, flipTarget, hasIntroCookie, hasSessionCookie, INTRO_COOKIE, INTRO_MAX_AGE, introSeenCookie, isBareEntry, KEYBOARD_QUIET_MS, shouldShowIntro, skipSnap } from '@/features/market/intro';
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
  const anchor = 600;
  it('leaves the band and the board alone', () => {
    expect(flipTarget(0, anchor)).toBeNull();
    expect(flipTarget(anchor, anchor)).toBeNull();
    expect(flipTarget(anchor + 1, anchor)).toBeNull();
    expect(flipTarget(5000, anchor)).toBeNull();
  });
  it('flips back to the band up to and including half way', () => {
    expect(flipTarget(10, anchor)).toBe(0);
    expect(flipTarget(299, anchor)).toBe(0);
    expect(flipTarget(300, anchor)).toBe(0);
  });
  it('flips on to the board past half way', () => {
    expect(flipTarget(301, anchor)).toBe(anchor);
    expect(flipTarget(590, anchor)).toBe(anchor);
  });
  it('treats a pixel of rounding at either edge as arrived, so a flip never re-triggers', () => {
    expect(flipTarget(1, anchor)).toBeNull();
    expect(flipTarget(anchor - 1, anchor)).toBeNull();
    expect(flipTarget(anchor - 0.5, anchor)).toBeNull();
  });
  it('does nothing without a band above the board', () => {
    expect(flipTarget(0, 0)).toBeNull();
    expect(flipTarget(10, 0)).toBeNull();
    expect(flipTarget(10, -50)).toBeNull();
    expect(flipTarget(1, 2)).toBeNull();
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
