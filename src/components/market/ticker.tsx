import Link from 'next/link';
import { instrumentPath } from '@/lib/links';
import { useTranslations } from 'next-intl';
import { direction } from '@/lib/market/format';
import type { InstrumentSnapshot } from '@/lib/market/types';

import { cn } from '@/lib/utils';
import { ChangeBadge } from './change-badge';
import { MetricValue } from './metric-value';
import { SignalTag } from './signal-tag';
import { Sparkline } from './sparkline';
import { InstrumentMark } from '@/components/market/instrument-mark';
import { ReviewText } from '@/features/dev/copy-review';

// Ticker card family (FR-M2): row / card share one data shape; the full page
// composes the same pieces at a larger size.

export function instrumentHref(snap: Pick<InstrumentSnapshot, 'instrument'>, query = ''): string {
  const base = instrumentPath(snap.instrument.type, snap.instrument.slug);
  return query ? `${base}?${query}` : base;
}

function useSparkCopy(snap: InstrumentSnapshot) {
  const t = useTranslations('Ticker');
  const first = snap.sparkline[0] ?? 0;
  const last = snap.sparkline[snap.sparkline.length - 1] ?? 0;
  return { label: t('trend'), description: t('trendDesc', { name: snap.instrument.name, first, last }) };
}

/**
 * Row grid, driven by the row's own width (container queries) so the same row
 * works full-width on /market and in narrower columns (landing page):
 * - below 36rem: name on top, value/change/action wrap underneath;
 * - 36–56rem: name · value · change · action (no sparkline, icon-only watch);
 * - 56rem and up: adds the 12-month sparkline and a labelled watch button.
 * The name column always keeps a real minimum so it never collapses.
 * Must be mirrored by the column header (features/market/board.tsx).
 */
export const ROW_GRID = 'grid-cols-[auto_1fr_auto] gap-x-3 px-3 @xl:grid-cols-[auto_minmax(150px,1fr)_136px_104px_72px] @xl:px-4 @4xl:grid-cols-[auto_minmax(160px,1.3fr)_minmax(132px,1fr)_minmax(116px,0.9fr)_96px_136px] @4xl:gap-x-5';

/** Classes for a WatchButton inside a row: icon-only until the row is wide enough. */
export const ROW_WATCH_LABEL = '@max-4xl:sr-only';

/** List-row size: name, current value, change, sparkline. */
export function TickerRow({ snap, href, action, select, showType = false }: {
  snap: InstrumentSnapshot;
  href: string;
  action?: React.ReactNode;
  /** Optional selection control drawn over the monogram (compare mode). */
  select?: React.ReactNode;
  showType?: boolean;
}) {
  const t = useTranslations('Ticker');
  const spark = useSparkCopy(snap);
  const dir = direction(snap.change.value);
  return (
    <div className="@container">
      <div className={cn('group relative grid items-center gap-y-1 py-3 transition-colors hover:bg-surface', ROW_GRID, snap.signal && 'bg-signal-soft/40')}>
        <span className="relative grid place-items-center">
          <InstrumentMark tone={snap.signal ? 'signal' : 'plain'} slug={snap.instrument.slug} symbol={snap.instrument.symbol} />
          {select}
        </span>
        <div className="min-w-0">
          <Link href={href} className="block truncate font-medium text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent">
            {snap.instrument.name}
          </Link>
          <p className="flex min-w-0 items-center gap-2 truncate text-[12.5px] text-muted">
            {showType ? <span className="kicker">{t(snap.instrument.type)}</span> : null}
            <span className="truncate">{snap.instrument.type === 'industry' ? <ReviewText id="market.industryDivision" proposal="delete">{snap.instrument.category}</ReviewText> : snap.instrument.category}</span>
            {snap.signal ? <ReviewText id="market.rowSignalTag" proposal="delete" hint="Replace the text with the icon plus a tooltip."><SignalTag signal={snap.signal} className="hidden @4xl:inline-flex" /></ReviewText> : null}
          </p>
        </div>
        <div className="min-w-0 text-right @xl:text-left">
          <MetricValue reading={snap.metric} size="md" />
        </div>
        <div className="col-start-2 min-w-0 @xl:col-start-auto">
          <ChangeBadge reading={snap.change} size="sm" />
        </div>
        <div className="hidden @4xl:block">
          <Sparkline values={snap.sparkline} dir={dir} label={spark.label} description={spark.description} />
        </div>
        <div className="relative z-10 col-start-3 row-start-2 flex justify-end @xl:col-start-auto @xl:row-start-auto">{action}</div>
      </div>
    </div>
  );
}

/** Card size: adds entry-level share and signal context. */
export function TickerCard({ snap, href, action, select, className }: {
  snap: InstrumentSnapshot;
  href: string;
  action?: React.ReactNode;
  /** Optional selection control in the header (compare mode). */
  select?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations('Ticker');
  const spark = useSparkCopy(snap);
  const dir = direction(snap.change.value);
  return (
    <article className={cn('group relative flex flex-col gap-4 rounded-md border border-rule bg-surface p-4 transition-shadow hover:shadow-float', snap.signal && 'border-ink/25', className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <InstrumentMark tone={snap.signal ? 'signal' : 'plain'} slug={snap.instrument.slug} symbol={snap.instrument.symbol} />
          <div className="min-w-0">
            <Link href={href} className="block truncate font-serif text-[20px] leading-tight after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:outline-2 focus-visible:after:outline-accent">
              {snap.instrument.name}
            </Link>
            <p className="kicker mt-0.5">{t(snap.instrument.type)} · {snap.instrument.category}</p>
          </div>
        </div>
        {select}
      </header>
      <div className="flex items-end justify-between gap-3">
        <MetricValue reading={snap.metric} size="lg" />
        <Sparkline values={snap.sparkline} dir={dir} label={spark.label} description={spark.description} width={110} height={36} />
      </div>
      <div className="flex items-end justify-between gap-3 border-t border-rule pt-3">
        <ChangeBadge reading={snap.change} size="sm" />
        <div className="text-right">
          <p className="kicker">{t('entryShare')}</p>
          <MetricValue reading={snap.entry_share} size="sm" showDetail={false} />
        </div>
      </div>
      {snap.signal || action ? (
        <footer className="relative z-10 flex items-center justify-between gap-2">
          {snap.signal ? <SignalTag signal={snap.signal} /> : <span />}
          {action}
        </footer>
      ) : null}
    </article>
  );
}
