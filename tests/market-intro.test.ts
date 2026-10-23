import { describe, expect, it } from 'vitest';
import { flipTarget, hasIntroCookie, hasSessionCookie, INTRO_COOKIE, INTRO_MAX_AGE, introSeenCookie, shouldShowIntro } from '@/features/market/intro';
import { marketEntryHref } from '@/features/market/logic';

describe('intro band gating', () => {
  it('shows only to anonymous visitors without the cookie', () => {
    expect(shouldShowIntro({ signedIn: false, cookieValue: undefined })).toBe(true);
    expect(shouldShowIntro({ signedIn: false, cookieValue: '1' })).toBe(false);
    expect(shouldShowIntro({ signedIn: false, cookieValue: '' })).toBe(false);
    expect(shouldShowIntro({ signedIn: true, cookieValue: undefined })).toBe(false);
    expect(shouldShowIntro({ signedIn: true, cookieValue: '1' })).toBe(false);
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
