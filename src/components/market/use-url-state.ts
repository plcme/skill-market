'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useTransition } from 'react';
import { decodeFilter, encodeFilter, isDefaultFilter } from '@/lib/filters/spec';
import type { FilterSpec } from '@/lib/market/types';

/** Patch the query string without scrolling; null removes a key. */
export function useSetParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const set = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }, [params, pathname, router]);
  return { set, pending };
}

/** The market filter lives in `?f=` so every view is shareable. */
export function useUrlFilter(): [FilterSpec, (f: FilterSpec) => void, boolean] {
  const params = useSearchParams();
  const raw = params.get('f');
  const filter = useMemo(() => decodeFilter(raw), [raw]);
  const { set, pending } = useSetParams();
  const setFilter = useCallback((f: FilterSpec) => set({ f: isDefaultFilter(f) ? null : encodeFilter(f) }), [set]);
  return [filter, setFilter, pending];
}

export function filterQuery(f: FilterSpec): string {
  return isDefaultFilter(f) ? '' : `f=${encodeFilter(f)}`;
}
