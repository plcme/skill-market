'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** Bring the "Right now" section (headline figure + chart) back into view. */
export function scrollToNow(): void {
  let reduced = false;
  try {
    reduced = window.matchMedia(REDUCED_QUERY).matches;
  } catch {
    reduced = false;
  }
  document.getElementById('now')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
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
