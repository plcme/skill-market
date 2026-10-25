'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { isBareSearch, keepBand } from './intro';

/**
 * Shows the server-rendered band on a bare /market entry and keeps it while
 * the board changes the query in place, so the board never jumps up a screen
 * under the visitor (see `keepBand`). Lives in the /market layout, which
 * query changes don't re-render.
 */
export function StickyBand({ children }: { children: React.ReactNode }) {
  const bare = isBareSearch(useSearchParams());
  const [shown, setShown] = useState(bare);
  const visible = keepBand(shown, bare);
  if (visible !== shown) setShown(visible);
  return visible ? children : null;
}
