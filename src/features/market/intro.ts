// First-visit intro band on top of the /market board: who sees it, the cookie
// that remembers it was seen, and the "page flip" between band and board.
// Pure functions only, so the rules are unit-tested without a browser.

/** Present once a visitor has seen the band. Brand-free on purpose. */
export const INTRO_COOKIE = 'intro_seen';
/** 30 days; refreshed on every visit, so only visitors gone longer see the band again. */
export const INTRO_MAX_AGE = 60 * 60 * 24 * 30;
/** The board section the band flips to (and the no-JS anchor target). */
export const BOARD_ANCHOR_ID = 'board';
export const INTRO_ID = 'intro';

/** Signed-in visitors never see the band; anonymous ones see it until the cookie exists. */
export function shouldShowIntro({ signedIn, cookieValue }: { signedIn: boolean; cookieValue: string | undefined }): boolean {
  return !signedIn && cookieValue === undefined;
}

/** Supabase SSR stores the session as `sb-<project-ref>-auth-token`, chunked as `.0`, `.1`, … when large. */
const SUPABASE_AUTH_COOKIE = /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i;

/**
 * Whether the request carries a Supabase session cookie. Presence is enough to
 * hide a cosmetic band; nothing here grants access, so no token verification.
 */
export function hasSessionCookie(cookies: ReadonlyArray<{ name: string; value: string }>): boolean {
  return cookies.some(c => c.value !== '' && SUPABASE_AUTH_COOKIE.test(c.name));
}

/** `document.cookie` assignment that (re)marks the band as seen for another 30 days. */
export function introSeenCookie(secure: boolean): string {
  return `${INTRO_COOKIE}=1; Path=/; Max-Age=${INTRO_MAX_AGE}; SameSite=Lax${secure ? '; Secure' : ''}`;
}

/** Browser only: (re)mark the band as seen. */
export function markIntroSeen(): void {
  document.cookie = introSeenCookie(window.location.protocol === 'https:');
}

/** Whether a `document.cookie` string contains the intro cookie. */
export function hasIntroCookie(cookieString: string): boolean {
  return cookieString.split(';').some(part => part.trim().split('=')[0] === INTRO_COOKIE);
}

/** Positions within this many px of a page edge count as on it (sub-pixel rounding of scroll offsets). */
const EDGE = 1;

/**
 * Where to settle after scrolling stops, or null to leave the page alone.
 * `anchor` is the scroll offset at which the board starts under the sticky
 * header. Only offsets strictly between the band (0) and the board snap:
 * past half flips to the board, otherwise back to the band. Exactly half
 * counts as "not past".
 */
export function flipTarget(y: number, anchor: number): number | null {
  if (!(anchor > 2 * EDGE)) return null;
  if (y <= EDGE || y >= anchor - EDGE) return null;
  return y > anchor / 2 ? anchor : 0;
}
