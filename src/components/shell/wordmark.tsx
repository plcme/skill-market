'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { flipToTop } from '@/features/market/intro-pager';
import { showLanding } from '@/features/market/sticky-band';
import { cn } from '@/lib/utils';

/** The landing: the band on top of the bare board. */
const LANDING_HREF = '/market';

/** Monochrome mark: an ink tile with a paper trend line (no brand hue). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-6 shrink-0', className)}>
      <rect width="24" height="24" rx="4" className="fill-ink" />
      <path d="M5 16.5 9.5 12l3 3L19 8" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="stroke-paper" />
      <circle cx="19" cy="8" r="1.8" className="fill-paper" />
    </svg>
  );
}

/**
 * Always back to the top of the landing. Already on /market (scrolled into
 * the board, or on a board tab), the layout stays mounted and the router keeps
 * the scroll position, so the wordmark asks for the band itself and goes up:
 * the band's flip when it is there, a jump otherwise.
 */
export function Wordmark({ name, className }: { name: string; className?: string }) {
  const onMarket = usePathname() === LANDING_HREF;
  return (
    <Link
      href={LANDING_HREF}
      scroll={!onMarket}
      onClick={e => {
        if (!onMarket || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        showLanding();
        flipToTop();
      }}
      className={cn('group inline-flex items-center gap-2.5 rounded-[4px]', className)}
    >
      <LogoMark />
      <span className="font-serif text-[21px] italic leading-none tracking-[-0.02em] text-ink">{name}</span>
    </Link>
  );
}
