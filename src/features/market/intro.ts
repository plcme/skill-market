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

/** Board query keys that make a /market URL a deep link rather than the bare entry. */
export const BOARD_QUERY_KEYS = ['type', 'q', 'sort', 'view', 'layer', 'metric'] as const;

/** Whether `/market` was opened bare: none of the board's own query keys carry a value (tracking params don't count). */
export function isBareEntry(sp: Record<string, string | string[] | undefined>): boolean {
  return BOARD_QUERY_KEYS.every(key => {
    const v = sp[key];
    return (Array.isArray(v) ? v : [v]).every(x => !x || !x.trim());
  });
}

/**
 * The band greets the bare entry only: signed-in visitors never see it, deep
 * links skip it (without marking it seen), and anonymous visitors see it until
 * the cookie exists.
 */
export function shouldShowIntro({ signedIn, cookieValue, bareEntry }: { signedIn: boolean; cookieValue: string | undefined; bareEntry: boolean }): boolean {
  return bareEntry && !signedIn && cookieValue === undefined;
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

/** The page a visitor last came to rest on, or null when unknown (first settle mid-way, or the anchor has moved since). */
export type RestedAt = 'band' | 'board' | null;

/** How far (px) a visitor must move off the page they rested on for the flip to carry on to the other page. */
export const FLIP_THRESHOLD_MAX = 48;
export function flipThreshold(anchor: number): number {
  return Math.min(FLIP_THRESHOLD_MAX, 0.1 * anchor);
}

/** Which page a settled offset rests on: the band at 0, the board at (or past) the anchor; null in between. */
export function restingPage(y: number, anchor: number): RestedAt {
  if (y <= EDGE) return 'band';
  if (y >= anchor - EDGE) return 'board';
  return null;
}

/**
 * Where to settle after scrolling stops, or null to leave the page alone.
 * `anchor` is the scroll offset at which the board starts under the sticky
 * header; only offsets strictly between the band (0) and the board snap.
 * Direction decides: moving at least `flipThreshold(anchor)` off the page the
 * visitor rested on flips to the other page; less snaps back to it. With no
 * known resting page, the nearer page wins (exactly half counts as the band).
 */
export function flipTarget(y: number, anchor: number, restedAt: RestedAt): number | null {
  if (!(anchor > 2 * EDGE)) return null;
  if (y <= EDGE || y >= anchor - EDGE) return null;
  const threshold = flipThreshold(anchor);
  if (restedAt === 'band') return y >= threshold ? anchor : 0;
  if (restedAt === 'board') return anchor - y >= threshold ? 0 : anchor;
  return y > anchor / 2 ? anchor : 0;
}

/** The page last rested on, valid only for the anchor it was measured against (a resize that moves the anchor forgets it). */
export interface Rest {
  page: RestedAt;
  anchor: number;
}
export const UNKNOWN_REST: Rest = { page: null, anchor: Number.NaN };

/** What the pager remembers between settles: where the visitor last rested, and the page our own flip is heading for. */
export interface PagerState {
  rest: Rest;
  pending: number | null;
}

/** Our own flip counts as arrived within this many px of its target (smooth scrolling can stop a pixel short). */
const ARRIVED = 2;

/**
 * One settled scroll: where to flip (`scrollTo`, or null to leave the page
 * alone) and the state to carry into the next settle. `anchor` is null when
 * the band cannot act as a page (fit guard). `skip(target)` vetoes a flip
 * (keyboard use, focus would be hidden).
 *
 * The resting page is only trusted while the visitor is on it or our flip is
 * carrying them to it. Any settle that ends between the pages and stays
 * there — a vetoed flip, our own flip interrupted, the fit guard — forgets it,
 * so the next decision falls back to the nearer page instead of flipping
 * against the way the visitor just moved.
 */
export function settleStep(state: PagerState, { y, anchor, skip }: { y: number; anchor: number | null; skip: (target: number) => boolean }): PagerState & { scrollTo: number | null } {
  if (anchor === null) return { rest: UNKNOWN_REST, pending: null, scrollTo: null };
  const { rest, pending } = state;
  const arrivedAt = pending !== null && Math.abs(y - pending) <= ARRIVED ? pending : y;
  const page = restingPage(arrivedAt, anchor);
  if (page) return { rest: { page, anchor }, pending: null, scrollTo: null };
  // Mid-way. If our flip was under way, the visitor took over: their start page no longer says which way they're heading.
  const restedAt = pending === null && rest.anchor === anchor ? rest.page : null;
  const target = flipTarget(y, anchor, restedAt);
  if (target === null || skip(target)) return { rest: { page: null, anchor }, pending: null, scrollTo: null };
  return { rest: { page: restedAt, anchor }, pending: target, scrollTo: target };
}

/** Keyboard input this recent means the scroll was the user's (focus moves, arrow keys): leave it alone. */
export const KEYBOARD_QUIET_MS = 600;

/**
 * Whether to leave a settled scroll where it is instead of flipping to
 * `target`: right after keyboard input, or when the flip would carry the
 * keyboard-focused element (viewport rect, `null` if none) entirely out of the
 * visible area between `viewTop` (under the sticky header) and `viewBottom`.
 */
export function skipSnap({ msSinceKeyboard, focus, y, target, viewTop, viewBottom }: {
  msSinceKeyboard: number;
  focus: { top: number; bottom: number } | null;
  y: number;
  target: number;
  viewTop: number;
  viewBottom: number;
}): boolean {
  if (msSinceKeyboard < KEYBOARD_QUIET_MS) return true;
  if (!focus) return false;
  const shift = target - y;
  return focus.bottom - shift <= viewTop || focus.top - shift >= viewBottom;
}
