'use client';

import { useSyncExternalStore } from 'react';

/** Live `matchMedia` result; `false` during SSR so server markup matches the desktop layout. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    notify => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Phones: below Tailwind's `sm` breakpoint (640px). */
export const PHONE_QUERY = '(max-width: 639px)';

/** Viewer asked for less motion. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Auto-advancing content is allowed: a hover-capable fine pointer (so
 * hover-to-pause works, WCAG 2.2.2) and no reduced-motion preference.
 */
export const AUTO_ADVANCE_QUERY = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

/** One-off reduced-motion check for imperative code (e.g. `scrollIntoView` behaviour). */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
}
