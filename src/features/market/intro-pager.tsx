'use client';

import { useEffect } from 'react';
import { prefersReducedMotion } from '@/lib/hooks/use-media-query';
import { BOARD_ANCHOR_ID, flipTarget, INTRO_ID, markIntroSeen } from './intro';

/** Without `scrollend`, scrolling counts as settled after this long without a scroll event. */
const SETTLE_MS = 120;

/**
 * Scroll offset at which the board starts right under the sticky header, or
 * null when there is no band, or it is taller than a screen (short landscape
 * phones) and so cannot behave like a page.
 */
function boardAnchor(): number | null {
  const band = document.getElementById(INTRO_ID);
  if (!band) return null;
  const header = document.querySelector<HTMLElement>('header');
  const headerHeight = header && getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height : 0;
  const rect = band.getBoundingClientRect();
  if (rect.height > window.innerHeight - headerHeight) return null;
  return Math.round(rect.bottom + window.scrollY - headerHeight);
}

function scrollToY(top: number) {
  window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/** In-page link to the board: works as a plain anchor without JS, glides with it. */
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
      }}
    />
  );
}

/**
 * Mounted with the intro band. Marks the band as seen, and makes band and
 * board behave like two pages: once scrolling settles anywhere between them,
 * finish the flip to whichever is nearer. Input is never intercepted; only
 * the resting position is corrected, and only inside that range.
 */
export function IntroPager() {
  useEffect(() => {
    markIntroSeen();

    const hasScrollEnd = 'onscrollend' in window;
    let touching = false;
    let moving = false;
    let pending: number | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = () => {
      if (touching) return;
      const y = window.scrollY;
      if (pending !== null) {
        const ours = Math.abs(y - pending) <= 2;
        pending = null;
        if (ours) return; // the scroll-end of our own flip
      }
      // Measured now rather than cached, so resizes and late layout are always reflected.
      const anchor = boardAnchor();
      if (anchor === null) return;
      const target = flipTarget(y, anchor);
      if (target === null) return;
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

    const passive = { passive: true } as const;
    window.addEventListener('scroll', onScroll, passive);
    if (hasScrollEnd) window.addEventListener('scrollend', onScrollEnd, passive);
    window.addEventListener('touchstart', onTouchStart, passive);
    window.addEventListener('touchend', onTouchEnd, passive);
    window.addEventListener('touchcancel', onTouchEnd, passive);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', onScrollEnd);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);
  return null;
}
