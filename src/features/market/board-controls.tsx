'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LayoutGrid, List, Search, X } from 'lucide-react';
import { sharedMetrics } from '@/lib/metrics/registry';
import type { MetricKey } from '@/lib/market/types';
import type { BoardSort } from '@/lib/queries/market';
import { Input, Segmented, Select } from '@/components/ui/form';
import { useSetParams } from '@/components/market/use-url-state';
import { cn } from '@/lib/utils';
import type { BoardView } from './logic';

/** Sort + list/cards toggle; both live in the URL so a board view is shareable. */
export function BoardViewControls({ sort, view, className }: { sort: BoardSort; view: BoardView; className?: string }) {
  const t = useTranslations('MarketPage');
  const { set, pending } = useSetParams();
  return (
    <div className={cn('flex flex-wrap items-center gap-2', pending && 'opacity-70', className)}>
      <Segmented<BoardSort>
        size="sm"
        label={t('sortLabel')}
        value={sort}
        onValueChange={v => set({ sort: v === 'value' ? null : v })}
        options={(['value', 'change'] as const).map(v => ({ value: v, label: t(`sort.${v}`) }))}
      />
      <Segmented<BoardView>
        size="sm"
        label={t('viewLabel')}
        value={view}
        onValueChange={v => set({ view: v === 'list' ? null : v })}
        options={[
          { value: 'list', label: <span className="inline-flex items-center gap-1.5"><List className="size-3.5" aria-hidden />{t('view.list')}</span> },
          { value: 'cards', label: <span className="inline-flex items-center gap-1.5"><LayoutGrid className="size-3.5" aria-hidden />{t('view.cards')}</span> },
        ]}
      />
    </div>
  );
}

/** In-page text filter (`?q=`), debounced so typing doesn't thrash the router. */
export function BoardTextFilter({ initial, className }: { initial: string; className?: string }) {
  const t = useTranslations('MarketPage');
  const { set, pending } = useSetParams();
  const [value, setValue] = useState(initial);
  // Last value pushed to (or received from) the URL.
  const [synced, setSynced] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    // An outside reset (e.g. "clear search" link) empties the box; our own
    // debounced pushes are already reflected in `value`.
    if (!initial) {
      setValue('');
      setSynced('');
    }
  }
  useEffect(() => {
    const next = value.trim();
    if (next === synced.trim()) return;
    const id = window.setTimeout(() => {
      setSynced(next);
      set({ q: next || null });
    }, 280);
    return () => window.clearTimeout(id);
  }, [value, synced, set]);
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={t('textFilterPlaceholder')}
        aria-label={t('textFilterLabel')}
        aria-busy={pending || undefined}
        className="h-8 pl-8 pr-8 text-[13.5px] [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label={t('textFilterClear')}
          className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-[4px] text-muted hover:bg-sunken hover:text-ink"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

/** For the mixed board only measures valid for both skills and roles are offered (FR-M4). */
export function SharedMetricSelect({ value, className }: { value: MetricKey; className?: string }) {
  const t = useTranslations('MarketPage');
  const tm = useTranslations('Metrics');
  const { set } = useSetParams();
  return (
    <label className={cn('inline-flex items-center gap-2', className)}>
      <span className="kicker">{tm('switcher')}</span>
      <Select
        value={value}
        onChange={e => set({ metric: e.target.value === 'ad_count' ? null : e.target.value })}
        aria-describedby="shared-metric-hint"
        className="h-8 w-auto py-0 pl-2.5 text-[13.5px] font-medium"
      >
        {sharedMetrics().map(m => <option key={m} value={m}>{tm(`${m}.label`)}</option>)}
      </Select>
      <span id="shared-metric-hint" className="sr-only">{t('sharedMetricHint')}</span>
    </label>
  );
}
