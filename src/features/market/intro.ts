// The landing band on top of the /market board: when it shows, and the "page
// flip" between band and board. Pure functions only, so the rules are
// unit-tested without a browser.

/** The board section the band flips to (and the no-JS anchor target). */
export const BOARD_ANCHOR_ID = 'board';
export const INTRO_ID = 'intro';

/** Board query keys that make a /market URL a deep link rather than the bare entry. */
export const BOARD_QUERY_KEYS = ['type', 'q', 'sort', 'view', 'layer', 'metric'] as const;

/** Whether `/market` was opened bare, which shows the band: none of the board's own query keys carry a value (tracking params don't count). */
export function isBareEntry(sp: Record<string, string | string[] | undefined>): boolean {
  return BOARD_QUERY_KEYS.every(key => {
    const v = sp[key];
    return (Array.isArray(v) ? v : [v]).every(x => !x || !x.trim());
  });
}

/** `isBareEntry` for a live query string (`useSearchParams`). */
export function isBareSearch(params: { getAll(key: string): string[] }): boolean {
  return isBareEntry(Object.fromEntries(BOARD_QUERY_KEYS.map(key => [key, params.getAll(key)])));
}

/**
 * What happens to the band. `enter`: the visitor came into /market (a fresh
 * load, or a navigation from another route), with a bare query or not.
 * `query`: the board changed the query in place (search, sort, layout,
 * layer, tabs, clearing the search). `wordmark`: the wordmark was clicked.
 */
export type BandEvent = { type: 'enter'; bare: boolean } | { type: 'query' } | { type: 'wordmark' };

/**
 * Whether the band shows after `event`. Only entering /market decides it (band
 * iff the entry URL is bare) and the wordmark always brings it; in-place query
 * changes never add or remove it, so the controls never jump under the visitor.
 */
export function bandStep(shown: boolean, event: BandEvent): boolean {
  switch (event.type) {
    case 'enter': return event.bare;
    case 'query': return shown;
    case 'wordmark': return true;
  }
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

/** How long our own flip takes. */
export const FLIP_MS = 420;
/** Strong ease-out: the page leaves fast and lands softly. */
export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) ** 3;
}
/** The flip's scroll offset `elapsed` ms after it started; `duration` 0 (reduced motion) jumps straight there. */
export function tweenAt(from: number, to: number, elapsed: number, duration: number): number {
  if (!(duration > 0) || elapsed >= duration) return to;
  return from + (to - from) * easeOutCubic(elapsed / duration);
}

/**
 * After a wheel flip, wheel input stays swallowed until the flip has ended and
 * no wheel event has arrived for this long: trackpad momentum belongs to the
 * gesture that turned the page, so one gesture turns one page.
 */
export const WHEEL_QUIET_MS = 150;
/** Pixels per line for `WheelEvent.DOM_DELTA_LINE` (Firefox mouse wheels). */
const LINE_PX = 16;
/** A wheel event's vertical delta in px, whatever unit it came in. */
export function wheelPixels(deltaY: number, deltaMode: number, pageHeight: number): number {
  if (deltaMode === 1) return deltaY * LINE_PX;
  if (deltaMode === 2) return deltaY * pageHeight;
  return deltaY;
}

/**
 * Where one wheel event (`dy` px, positive = down) flips to, or null to let it
 * scroll natively. Between the band and the board the wheel direction decides
 * at once; on the band only a downward wheel flips; at the board's top only an
 * upward one, and further down the board the wheel is native unless this one
 * notch would carry the page back up into the gap.
 */
export function wheelFlipTarget(y: number, anchor: number | null, dy: number): number | null {
  if (anchor === null || !(anchor > 2 * EDGE) || dy === 0) return null;
  if (y <= EDGE) return dy > 0 ? anchor : null;
  if (y < anchor - EDGE) return dy > 0 ? anchor : 0;
  if (dy > 0) return null;
  return y <= anchor + EDGE || y + dy < anchor - EDGE ? 0 : null;
}

/** One wheel event: scroll natively, swallow it (inside the lock), or flip; plus when the lock now ends. */
export type WheelStep = { action: 'native' | 'swallow'; lockUntil: number } | { action: 'flip'; to: number; lockUntil: number };

/**
 * `now` and `lockUntil` are ms on one clock; `flipMs` is how long the flip
 * about to start will take (0 under reduced motion). Inside the lock every
 * wheel event is swallowed, wherever the page is, and pushes the lock on.
 *
 * Two kinds of wheel event are always left native, lock or not: while the page
 * is pinch-zoomed (the wheel pans the zoomed view), and when the event cannot
 * be cancelled (the browser already scrolls this gesture itself, so a flip
 * would fight its momentum; the settle fallback finishes instead).
 */
export function wheelStep({ y, anchor, dy, now, lockUntil, flipMs, zoomed = false, cancelable = true }: {
  y: number;
  anchor: number | null;
  dy: number;
  now: number;
  lockUntil: number;
  flipMs: number;
  zoomed?: boolean;
  cancelable?: boolean;
}): WheelStep {
  if (zoomed || !cancelable) return { action: 'native', lockUntil };
  if (now < lockUntil) return { action: 'swallow', lockUntil: Math.max(lockUntil, now + WHEEL_QUIET_MS) };
  const to = wheelFlipTarget(y, anchor, dy);
  if (to === null) return { action: 'native', lockUntil };
  return { action: 'flip', to, lockUntil: now + flipMs + WHEEL_QUIET_MS };
}

/** Whether the page counts as pinch-zoomed (`visualViewport.scale`); input then pans the zoomed view and is left alone. */
export function isZoomed(scale: number | undefined): boolean {
  return (scale ?? 1) > 1.01;
}

/**
 * Where to flip when the finger lifts, or null to leave the page to the
 * browser (it ended on a page, or past the board's top). The distance comes
 * from the page the touch started on: at least `flipThreshold` off it turns
 * to the other page, less snaps back. A touch that started mid-way (it caught
 * our flip) goes the way the finger moved.
 */
export function touchTarget({ startY, y, anchor }: { startY: number; y: number; anchor: number | null }): number | null {
  if (anchor === null || !(anchor > 2 * EDGE)) return null;
  if (y <= EDGE || y >= anchor - EDGE) return null;
  const from = restingPage(startY, anchor);
  if (from) return flipTarget(y, anchor, from);
  if (y > startY) return anchor;
  if (y < startY) return 0;
  return flipTarget(y, anchor, null);
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
