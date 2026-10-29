'use client';

import { BOARD_ANCHOR_ID } from './intro';

/**
 * Keeps the board's type tabs pinned under the site header while the list scrolls.
 * Picking a tab (the current one included) glides back to the top of the board.
 */
export function BoardTabsBar({ children }: { children: React.ReactNode }) {
  const onClick = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('a')) return;
    const board = document.getElementById(BOARD_ANCHOR_ID);
    if (!board) return;
    const header = document.querySelector<HTMLElement>('[data-site-header]')?.offsetHeight ?? 0;
    const top = board.getBoundingClientRect().top + window.scrollY - header;
    if (window.scrollY > top) window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return (
    // 65px = sticky header (h-16 + 1px rule).
    <div onClick={onClick} className="sticky top-[65px] z-30 -mx-4 border-b border-rule bg-paper px-4 pt-2 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      {children}
    </div>
  );
}
