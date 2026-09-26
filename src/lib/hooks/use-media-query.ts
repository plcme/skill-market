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
