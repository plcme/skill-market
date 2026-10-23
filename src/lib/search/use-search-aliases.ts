'use client';

import { useDB } from '@/lib/demo/store';
import { useMemo } from 'react';
import type { SearchAlias } from '@/lib/market/catalog';

/** Preview aliases stay in this browser; SSR always starts with the public catalogue. */
export function useSearchAliases(): readonly SearchAlias[] {
  const key = JSON.stringify(useDB()?.alias_overrides.map(({ alias, instrument_slug }) => ({ alias, instrument_slug })) ?? []);
  // Unrelated preview transactions clone the store; keep the search index stable.
  return useMemo(() => JSON.parse(key) as SearchAlias[], [key]);
}
