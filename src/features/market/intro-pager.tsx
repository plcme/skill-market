'use client';

import { useEffect } from 'react';
import { prefersReducedMotion } from '@/lib/hooks/use-media-query';
import { BOARD_ANCHOR_ID, INTRO_ID, markIntroSeen, settleStep, skipSnap, UNKNOWN_REST, type PagerState } from './intro';

/** Without `scrollend`, scrolling counts as settled after this long without a scroll event. */
const SETTLE_MS = 120;
/** Resizes and rotations count as settled after this long without another. */
const RESIZE_SETTLE_MS = 200;

function stickyHeaderHeight(): number {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  return header && getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height : 0;
}

/**
 * Scroll offset at which the board starts right under the sticky header, or
 * null when there is no band, or it is taller than a screen (short landscape
 * phones) and so cannot behave like a page.
 */
function boardAnchor(): number | null {
  const band = document.getElementById(INTRO_ID);
  if (!band) return null;
  const headerHeight = stickyHeaderHeight();
  const rect = band.getBoundingClientRect();
  if (rect.height > window.innerHeight - headerHeight) return null;
  return Math.round(rect.bottom + window.scrollY - headerHeight);
}

function scrollToY(top: number) {
  window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
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

/** Set while a pager is mounted: lets the intro link's glide count as the pager's own flip. */
let registerFlip: ((target: number) => void) | null = null;

/** In-page link to the board: a plain anchor without JS; with it, glides there and moves focus like the anchor would. */
export function FlipToBoardLink({ onClick, ...props }: React.ComponentProps<'a'>) {
  return (
    <a
      href={`#${BOARD_ANCHOR_ID}`}
      {...props}
      onClick={e => {
        onClick?.(e);
        const anchor = boardAnchor();
        if (e.defaultPrevented || anchor === null) return;
        e.preventDefault();
        registerFlip?.(anchor);
        scrollToY(anchor);
        document.getElementById(BOARD_ANCHOR_ID)?.focus({ preventScroll: true });
      }}
    />
  );
}

/**
 * Mounted with the intro band. Marks the band as seen, and makes band and
 * board behave like two pages: once scrolling settles anywhere between them,
 * finish the flip in the direction the visitor set off (see `flipTarget`).
 * Input is never intercepted; only the resting position is corrected, only
 * inside that range, and never right after keyboard use or away from a
 * keyboard-focused element.
 */
export function IntroPager() {
  useEffect(() => {
    markIntroSeen();

    const hasScrollEnd = 'onscrollend' in window;
    let touching = false;
    let moving = false;
    let keyboardAt = -Infinity;
    let state: PagerState = { rest: UNKNOWN_REST, pending: null };
    let timer: ReturnType<typeof setTimeout> | undefined;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    /** One settled scroll; `snap: false` only records where the visitor is. */
    const settle = (snap = true) => {
      if (touching) return;
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
      if (next.scrollTo !== null) scrollToY(next.scrollTo);
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
    const onTouchStart = () => { touching = true; clearTimeout(timer); };
    // A lift without momentum may end scrolling while the finger was still down.
    const onTouchEnd = () => { touching = false; later(); };
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
    registerFlip = target => { state = { ...state, pending: target }; };

    const passive = { passive: true } as const;
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
      registerFlip = null;
      clearTimeout(timer);
      clearTimeout(resizeTimer);
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
