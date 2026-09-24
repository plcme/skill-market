import { useTranslations } from 'next-intl';
import { describeFilter, type FilterCopy } from '@/lib/filters/spec';
import type { FilterSpec } from '@/lib/market/types';

export function useFilterCopy(): FilterCopy {
  return useTranslations('Filter').raw('readback') as FilterCopy;
}

/** FR-F3 plain-English readback of any filter state. */
export function FilterReadback({ filter, className }: { filter: FilterSpec; className?: string }) {
  const copy = useFilterCopy();
  return <span className={className}>{describeFilter(filter, copy)}</span>;
}
