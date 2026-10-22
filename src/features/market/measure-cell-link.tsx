'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { prefersReducedMotion } from '@/lib/hooks/use-media-query';

/**
 * Bring the "Right now" section (headline figure + chart) back into view and
 * move focus to its heading, so keyboard and screen-reader users land on the
 * newly selected measure.
 */
export function scrollToNow(): void {
  document.getElementById('now')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  document.getElementById('now-h')?.focus({ preventScroll: true });
}

/**
 * Stretched link over a Fundamentals cell: selects that measure in the headline
 * (`?metric=…`) without Next's own scroll handling, then scrolls up to `#now`
 * explicitly — same-page hash scrolling is unreliable on client navigation.
 */
export function MeasureCellLink({ href, label, current }: { href: string; label: string; current: boolean }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let the browser handle new-tab / new-window clicks untouched.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    scrollToNow();
  };
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onClick}
      aria-label={label}
      aria-current={current ? 'true' : undefined}
      className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    />
  );
}
