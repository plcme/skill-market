import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { instrumentPath } from '@/lib/links';
import { signalMetric } from '@/lib/metrics/registry';
import type { ActiveInstrumentType, FilterSpec, InstrumentSnapshot, MetricKey } from '@/lib/market/types';
import { MetricLabel } from '@/components/market/metric-info';
import { TickerCard, TickerRow } from '@/components/market/ticker';
import { WatchButton } from '@/components/market/watch-button';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Shared board pieces for /market and /search. Server-rendered; only the watch
// buttons (and the popovers inside labels) hydrate.

// Must mirror the grid in TickerRow so headers line up with values.
const ROW_GRID = 'sm:grid-cols-[auto_minmax(0,1.3fr)_minmax(132px,1fr)_minmax(116px,0.9fr)_96px_auto] sm:gap-x-5 sm:px-4';
const ACTION_W = 'sm:w-[136px]';

function WatchSlot({ slug, filter, metric }: { slug: string; filter: FilterSpec; metric: MetricKey }) {
  return (
    <div className={cn('flex justify-end', ACTION_W)}>
      <Suspense fallback={<Button variant="subtle" size="sm" disabled className="w-[92px]" aria-hidden />}>
        <WatchButton slug={slug} filter={filter} metric={metric} />
      </Suspense>
    </div>
  );
}

/** Column heads for a list of TickerRows: every number column explains itself. */
export function BoardColumnHeader({ type, metric, filter, sample, changeSample }: {
  type: ActiveInstrumentType | 'all';
  metric: MetricKey;
  filter: FilterSpec;
  sample?: InstrumentSnapshot;
  changeSample?: InstrumentSnapshot;
}) {
  const t = useTranslations('MarketPage');
  const valueType: ActiveInstrumentType = type === 'all' ? 'skill' : type;
  const changeHead = type === 'all'
    ? <span className="kicker" title={t('colChangeMixedHint')}>{t('colChangeMixed')}</span>
    : <MetricLabel metric={signalMetric(type)} type={type} reading={(changeSample ?? sample)?.change} filter={filter} short />;
  return (
    <>
      <div className={cn('hidden items-center border-b border-rule-strong py-2 sm:grid', ROW_GRID)}>
        <span className="w-9" aria-hidden />
        <span className="kicker">{t('colName')}</span>
        <MetricLabel metric={metric} type={valueType} reading={sample?.metric} filter={filter} />
        {changeHead}
        <span className="kicker whitespace-nowrap">{t('colTrend')}</span>
        <span className={ACTION_W} aria-hidden />
      </div>
      <div className="flex items-center justify-between border-b border-rule-strong px-3 py-2 sm:hidden">
        {changeHead}
        <MetricLabel metric={metric} type={valueType} reading={sample?.metric} filter={filter} short />
      </div>
    </>
  );
}

export function BoardRows({ rows, filter, metric, showType = false, notes, className }: {
  rows: InstrumentSnapshot[];
  filter: FilterSpec;
  metric: MetricKey;
  showType?: boolean;
  /** Optional one-line note under a row, keyed by slug (e.g. which alias matched). */
  notes?: Record<string, string>;
  className?: string;
}) {
  return (
    <ul className={cn('divide-y divide-rule border-b border-rule', className)}>
      {rows.map(snap => (
        <li key={snap.instrument.id}>
          <TickerRow
            snap={snap}
            showType={showType}
            href={instrumentPath(snap.instrument.type, snap.instrument.slug, filter)}
            action={<WatchSlot slug={snap.instrument.slug} filter={filter} metric={metric} />}
          />
          {notes?.[snap.instrument.slug] ? (
            <p className="-mt-1 pb-3 pl-[60px] text-[12.5px] text-accent sm:pl-[72px]">{notes[snap.instrument.slug]}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function BoardCards({ rows, filter, metric }: { rows: InstrumentSnapshot[]; filter: FilterSpec; metric: MetricKey }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(snap => (
        <li key={snap.instrument.id} className="flex">
          <TickerCard
            snap={snap}
            className="w-full"
            href={instrumentPath(snap.instrument.type, snap.instrument.slug, filter)}
            action={(
              <Suspense fallback={null}>
                <WatchButton slug={snap.instrument.slug} filter={filter} metric={metric} />
              </Suspense>
            )}
          />
        </li>
      ))}
    </ul>
  );
}
