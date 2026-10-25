'use client';

import { useEffect } from 'react';
import { prefersReducedMotion } from '@/lib/hooks/use-media-query';
import { BOARD_ANCHOR_ID, FLIP_MS, INTRO_ID, isZoomed, settleStep, skipSnap, touchTarget, tweenAt, UNKNOWN_REST, wheelPixels, wheelStep, type PagerState } from './intro';

/** Without `scrollend`, scrolling counts as settled after this long without a scroll event. */
const SETTLE_MS = 120;
/** Resizes and rotations count as settled after this long without another. */
const RESIZE_SETTLE_MS = 200;

function stickyHeaderHeight(): number {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  return header && getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height : 0;
}

/**
 * Scroll offset at which the board starts right under the sticky header
 * (never past the end of the page), or null when there is no band, or it is
 * taller than a screen (short landscape phones) and so cannot behave like a
 * page.
 */
function boardAnchor(): number | null {
  const band = document.getElementById(INTRO_ID);
  if (!band) return null;
  const headerHeight = stickyHeaderHeight();
  const rect = band.getBoundingClientRect();
  if (rect.height > window.innerHeight - headerHeight) return null;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  return Math.round(Math.min(rect.bottom + window.scrollY - headerHeight, maxScroll));
}

/** No global smooth scrolling here, so 'auto' is instant (and older WebKit rejects 'instant'). */
function jumpTo(top: number) {
  window.scrollTo({ top, behavior: 'auto' });
}

function zoomed(): boolean {
  return isZoomed(window.visualViewport?.scale);
}

function inDialog(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[role="dialog"], [aria-modal="true"]') !== null;
}

function flipDuration(): number {
  return prefersReducedMotion() ? 0 : FLIP_MS;
}

/**
 * The keyboard-focused element's viewport rect, or null when there is none to
 * protect: focus from a mouse click, or focus on something that doesn't move
 * with the page (outside `main`, like the sticky header and the phone tab bar,
 * or inside a fixed or sticky layer).
 */
function keyboardFocusRect(): { top: number; bottom: number } | null {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement) || !el.matches(':focus-visible')) return null;
  const main = el.closest('main');
  if (!main) return null;
  for (let node: HTMLElement | null = el; node && node !== main; node = node.parentElement) {
    const { position } = getComputedStyle(node);
    if (position === 'fixed' || position === 'sticky') return null;
  }
  const { top, bottom } = el.getBoundingClientRect();
  return { top, bottom };
}

/**
 * Whether input over `target` belongs to something other than the page: a
 * dialog, a fixed layer, or (for a wheel moving `dy` px) an inner box that
 * can still scroll that way.
 */
function ownedElsewhere(target: EventTarget | null, dy: number): boolean {
  for (let node = target instanceof Element ? target : null; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    if (node.matches('[role="dialog"], [aria-modal="true"]')) return true;
    const { position, overflowY } = getComputedStyle(node);
    if (position === 'fixed') return true;
    if (dy !== 0 && (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
      if (dy > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 1 : node.scrollTop > 0) return true;
    }
  }
  return false;
}

/** Set while a pager is mounted: its own flip, so links on the page turn it the same way. */
let flipper: ((target: number) => void) | null = null;

/** Back to the top of the page: the band's flip while it is mounted, an instant jump otherwise. */
export function flipToTop() {
  if (flipper) flipper(0);
  else jumpTo(0);
}

/** In-page link to the board: a plain anchor without JS; with it, flips there and moves focus like the anchor would. */
export function FlipToBoardLink({ onClick, ...props }: React.ComponentProps<'a'>) {
  return (
    <a
      href={`#${BOARD_ANCHOR_ID}`}
      {...props}
      onClick={e => {
        onClick?.(e);
        const anchor = boardAnchor();
        if (e.defaultPrevented || anchor === null || !flipper) return;
        e.preventDefault();
        flipper(anchor);
        document.getElementById(BOARD_ANCHOR_ID)?.focus({ preventScroll: true });
      }}
    />
  );
}

/**
 * Mounted with the band. Makes band and board behave like two pages:
 *
 * - Wheel and trackpad between the pages, or going up at the board's top: the
 *   event is taken over and the page flips at once, the way the wheel turned.
 *   Until the flip has landed and the wheel has been quiet for a moment,
 *   further wheel input (momentum) is swallowed. Further down the board the
 *   wheel is left alone.
 * - Touch: the finger drags the page natively; when it lifts between the
 *   pages, the page flips on or snaps back at once (see `touchTarget`).
 * - Anything else that leaves the page between them (scrollbar, find in page,
 *   keyboard) is corrected once scrolling settles (see `settleStep`), never
 *   right after keyboard use or away from a keyboard-focused element.
 *
 * Every flip is our own eased tween, instant under reduced motion.
 */
export function IntroPager() {
  useEffect(() => {
    const hasScrollEnd = 'onscrollend' in window;
    const root = document.documentElement;
    let touching = false;
    let moving = false;
    let keyboardAt = -Infinity;
    let lockUntil = -Infinity;
    let state: PagerState = { rest: UNKNOWN_REST, pending: null };
    let touch: { startY: number; multi: boolean } | null = null;
    let anim: { frame: number } | null = null;
    /** The root's own inline overflow while a flip after touch holds the page, or null. */
    let heldOverflow: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const release = () => {
      if (heldOverflow === null) return;
      root.style.overflow = heldOverflow;
      heldOverflow = null;
    };
    const stop = () => {
      if (anim) cancelAnimationFrame(anim.frame);
      anim = null;
      release();
    };

    /** One settled scroll; `snap: false` only records where the visitor is. */
    const settle = (snap = true) => {
      if (touching || anim) return;
      const y = window.scrollY;
      // Measured now rather than cached, so resizes and late layout are always reflected.
      const next = settleStep(state, {
        y,
        anchor: boardAnchor(),
        skip: target => !snap || skipSnap({
          msSinceKeyboard: performance.now() - keyboardAt,
          focus: keyboardFocusRect(),
          y,
          target,
          viewTop: stickyHeaderHeight(),
          viewBottom: window.innerHeight,
        }),
      });
      state = { rest: next.rest, pending: next.pending };
      if (next.scrollTo !== null) flip(next.scrollTo);
    };

    /**
     * Our flip, one frame at a time. After a touch the root is held at
     * `overflow: hidden` while it runs: that stops the browser's own momentum
     * (which can otherwise glide on through programmatic scrolls on iOS) and
     * keeps the page scrollable by us.
     */
    const flip = (to: number, { afterTouch = false } = {}) => {
      stop();
      state = { ...state, pending: to };
      const from = window.scrollY;
      const duration = flipDuration();
      if (afterTouch && duration > 0) {
        heldOverflow = root.style.overflow;
        root.style.overflow = 'hidden';
      }
      const start = performance.now();
      const current = { frame: 0 };
      anim = current;
      const frame = (now: number) => {
        if (anim !== current) return;
        const elapsed = Math.max(0, now - start);
        jumpTo(tweenAt(from, to, elapsed, duration));
        if (elapsed < duration) {
          current.frame = requestAnimationFrame(frame);
          return;
        }
        anim = null;
        release();
        settle(false);
      };
      frame(start);
    };

    const later = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (!moving) settle(); }, SETTLE_MS);
    };
    const onScroll = () => {
      if (hasScrollEnd) moving = true;
      else later();
    };
    const onScrollEnd = () => {
      moving = false;
      settle();
    };

    /** The anchor, measured at most once per frame: wheel events come faster than layout changes. */
    let frameAnchor: { value: number | null } | null = null;
    const wheelAnchor = () => {
      if (!frameAnchor) {
        frameAnchor = { value: boardAnchor() };
        requestAnimationFrame(() => { frameAnchor = null; });
      }
      return frameAnchor.value;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.defaultPrevented || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const dy = wheelPixels(e.deltaY, e.deltaMode, window.innerHeight);
      const step = wheelStep({
        y: window.scrollY,
        anchor: wheelAnchor(),
        dy,
        now: performance.now(),
        lockUntil,
        flipMs: flipDuration(),
        zoomed: zoomed(),
        cancelable: e.cancelable,
      });
      if (step.action === 'native') return;
      if (step.action === 'flip' ? ownedElsewhere(e.target, dy) : inDialog(e.target)) return;
      lockUntil = step.lockUntil;
      e.preventDefault();
      if (step.action === 'flip') flip(step.to);
    };

    const onTouchStart = (e: TouchEvent) => {
      // The finger takes the page back from our flip.
      stop();
      touching = true;
      clearTimeout(timer);
      if (e.touches.length > 1) {
        if (touch) touch.multi = true;
        return;
      }
      touch = { startY: window.scrollY, multi: false };
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length > 0) return;
      touching = false;
      const gesture = touch;
      touch = null;
      const to = gesture && !gesture.multi && !zoomed() && e.type === 'touchend' && !ownedElsewhere(e.target, 0)
        ? touchTarget({ startY: gesture.startY, y: window.scrollY, anchor: boardAnchor() })
        : null;
      if (to !== null) flip(to, { afterTouch: true });
      // A lift without momentum may end scrolling while the finger was still down.
      else later();
    };

    const onKeyDown = () => { keyboardAt = performance.now(); };
    // Focus moves count only when the browser treats them as keyboard focus; a click on a tabIndex -1 container doesn't.
    const onFocusIn = (e: FocusEvent) => {
      if (e.target instanceof Element && e.target.matches(':focus-visible')) keyboardAt = performance.now();
    };
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(later, RESIZE_SETTLE_MS);
    };

    settle(false);
    flipper = target => flip(target);

    const passive = { passive: true } as const;
    // Not passive: inside the gap the wheel is ours (see above).
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScroll, passive);
    if (hasScrollEnd) window.addEventListener('scrollend', onScrollEnd, passive);
    window.addEventListener('touchstart', onTouchStart, passive);
    window.addEventListener('touchend', onTouchEnd, passive);
    window.addEventListener('touchcancel', onTouchEnd, passive);
    window.addEventListener('keydown', onKeyDown, passive);
    window.addEventListener('focusin', onFocusIn, passive);
    window.addEventListener('resize', onResize, passive);
    window.addEventListener('orientationchange', onResize, passive);
    return () => {
      flipper = null;
      stop();
      clearTimeout(timer);
      clearTimeout(resizeTimer);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', onScrollEnd);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return null;
}
