'use client';

import { useEffect, useRef, useState } from 'react';
import { BOARD_ANCHOR_ID } from './intro';

/** Sticky header (h-16 + 1px rule). */
const HEADER = 65;

/**
 * Keeps the board's type tabs pinned under the site header while the list scrolls,
 * looser and smaller while pinned. Picking a tab (the current one included) glides
 * back to the top of the board.
 */
export function BoardTabsBar({ children }: { children: React.ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    // A scroll check, not an IntersectionObserver: jumps (anchors, scroll restore) skip crossings.
    const check = () => setStuck(el.getBoundingClientRect().top < HEADER);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);
  const onClick = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !(e.target as HTMLElement).closest('a')) return;
    const board = document.getElementById(BOARD_ANCHOR_ID);
    if (!board) return;
    const header = document.querySelector<HTMLElement>('[data-site-header]')?.offsetHeight ?? 0;
    const top = board.getBoundingClientRect().top + window.scrollY - header;
    if (window.scrollY > top) window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return (
    <>
      <div ref={sentinel} aria-hidden className="h-0" />
      <div
        onClick={onClick}
        data-stuck={stuck}
        className="group sticky top-[65px] z-30 -mx-4 border-b border-rule bg-paper px-4 pt-2 transition-[padding] data-[stuck=true]:pt-5 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10"
      >
        {children}
      </div>
    </>
  );
}
