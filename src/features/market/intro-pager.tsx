'use client';

import { useEffect } from 'react';
import { prefersReducedMotion } from '@/lib/hooks/use-media-query';
import { BOARD_ANCHOR_ID, flipTarget, INTRO_ID, markIntroSeen, restingPage, skipSnap, type RestedAt } from './intro';

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

/** The focused element's viewport rect, when focus came from the keyboard (a mouse click shouldn't pin the page). */
function keyboardFocusRect(): { top: number; bottom: number } | null {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement) || el === document.body || !el.matches(':focus-visible')) return null;
  const { top, bottom } = el.getBoundingClientRect();
  return { top, bottom };
}

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
    let pending: number | null = null;
    let keyboardAt = -Infinity;
    // The page last rested on, valid only for the anchor it was measured against (a resize that moves the anchor forgets it).
    let rest: { page: RestedAt; anchor: number } = { page: null, anchor: NaN };
    const remember = (y: number, anchor: number) => {
      const page = restingPage(y, anchor);
      if (page) rest = { page, anchor };
    };
    const restedAt = (anchor: number): RestedAt => (rest.anchor === anchor ? rest.page : null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const settle = () => {
      if (touching) return;
      const y = window.scrollY;
      // Measured now rather than cached, so resizes and late layout are always reflected.
      const anchor = boardAnchor();
      if (anchor !== null) remember(y, anchor);
      if (pending !== null) {
        const ours = Math.abs(y - pending) <= 2;
        pending = null;
        if (ours) return; // the scroll-end of our own flip
      }
      if (anchor === null) return;
      const target = flipTarget(y, anchor, restedAt(anchor));
      if (target === null) return;
      const skip = skipSnap({
        msSinceKeyboard: performance.now() - keyboardAt,
        focus: keyboardFocusRect(),
        y,
        target,
        viewTop: stickyHeaderHeight(),
        viewBottom: window.innerHeight,
      });
      if (skip) return;
      pending = target;
      scrollToY(target);
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
    const onKeyboard = () => { keyboardAt = performance.now(); };
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(later, RESIZE_SETTLE_MS);
    };

    const initial = boardAnchor();
    if (initial !== null) remember(window.scrollY, initial);

    const passive = { passive: true } as const;
    window.addEventListener('scroll', onScroll, passive);
    if (hasScrollEnd) window.addEventListener('scrollend', onScrollEnd, passive);
    window.addEventListener('touchstart', onTouchStart, passive);
    window.addEventListener('touchend', onTouchEnd, passive);
    window.addEventListener('touchcancel', onTouchEnd, passive);
    window.addEventListener('keydown', onKeyboard, passive);
    window.addEventListener('focusin', onKeyboard, passive);
    window.addEventListener('resize', onResize, passive);
    window.addEventListener('orientationchange', onResize, passive);
    return () => {
      clearTimeout(timer);
      clearTimeout(resizeTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', onScrollEnd);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('keydown', onKeyboard);
      window.removeEventListener('focusin', onKeyboard);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return null;
}
