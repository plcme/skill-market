'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { bandStep, isBareSearch } from './intro';

/** Mounted bands, told when the wordmark asks for the landing. */
const listeners = new Set<() => void>();

/** The wordmark's request for the landing: shows the band on the current /market page (no-op elsewhere). */
export function showLanding() {
  for (const listener of listeners) listener();
}

/**
 * Holds the server-rendered band in the /market layout, which in-place query
 * changes don't re-render or remount. Whether it shows is decided once, from
 * the URL the visitor entered by, and changed only by the wordmark (see
 * `bandStep`). Leaving /market unmounts the layout, so coming back decides
 * afresh.
 */
export function StickyBand({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  const [shown, setShown] = useState(() => bandStep(false, { type: 'enter', bare: isBareSearch(params) }));
  useEffect(() => {
    const listener = () => setShown(s => bandStep(s, { type: 'wordmark' }));
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  return shown ? children : null;
}
