import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { direction } from '@/lib/market/format';
import type { InstrumentSnapshot } from '@/lib/market/types';
import { Monogram } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import { ChangeBadge } from './change-badge';
import { MetricValue } from './metric-value';
import { SignalTag } from './signal-tag';
import { Sparkline } from './sparkline';

// Ticker card family (FR-M2): row / card share one data shape; the full page
// composes the same pieces at a larger size.

export function instrumentHref(snap: Pick<InstrumentSnapshot, 'instrument'>, query = ''): string {
  const base = snap.instrument.type === 'skill' ? `/s/${snap.instrument.slug}` : `/r/${snap.instrument.slug}`;
  return query ? `${base}?${query}` : base;
}

function useSparkCopy(snap: InstrumentSnapshot) {
  const t = useTranslations('Ticker');
  const first = snap.sparkline[0] ?? 0;
  const last = snap.sparkline[snap.sparkline.length - 1] ?? 0;
  return { label: t('trend'), description: t('trendDesc', { name: snap.instrument.name, first, last }) };
}

/** List-row size: name, current value, change, sparkline. */
export function TickerRow({ snap, href, action, showType = false }: {
  snap: InstrumentSnapshot;
  href: string;
  action?: React.ReactNode;
  showType?: boolean;
}) {
  const t = useTranslations('Ticker');
  const spark = useSparkCopy(snap);
  const dir = direction(snap.change.value);
  return (
    <div className={cn('group relative grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-3 py-3 transition-colors hover:bg-surface sm:grid-cols-[auto_minmax(0,1.3fr)_minmax(132px,1fr)_minmax(116px,0.9fr)_96px_auto] sm:gap-x-5 sm:px-4', snap.signal && 'bg-signal-soft/40')}>
      <Monogram tone={snap.signal ? 'signal' : 'plain'}>{snap.instrument.symbol}</Monogram>
      <div className="min-w-0">
        <Link href={href} className="block truncate font-medium text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent">
          {snap.instrument.name}
        </Link>
        <p className="flex min-w-0 items-center gap-2 truncate text-[12.5px] text-muted">
          {showType ? <span className="kicker">{t(snap.instrument.type)}</span> : null}
          <span className="truncate">{snap.instrument.category}</span>
          {snap.signal ? <SignalTag signal={snap.signal} className="hidden md:inline-flex" /> : null}
        </p>
      </div>
      <div className="text-right sm:text-left">
        <MetricValue reading={snap.metric} size="md" />
      </div>
      <div className="col-start-2 sm:col-start-auto">
        <ChangeBadge reading={snap.change} size="sm" />
      </div>
      <div className="hidden sm:block">
        <Sparkline values={snap.sparkline} dir={dir} label={spark.label} description={spark.description} />
      </div>
      <div className="relative z-10 col-start-3 row-start-2 justify-self-end sm:col-start-auto sm:row-start-auto">{action}</div>
    </div>
  );
}

/** Card size: adds entry-level share and signal context. */
export function TickerCard({ snap, href, action, className }: {
  snap: InstrumentSnapshot;
  href: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations('Ticker');
  const spark = useSparkCopy(snap);
  const dir = direction(snap.change.value);
  return (
    <article className={cn('group relative flex flex-col gap-4 rounded-md border border-rule bg-surface p-4 transition-shadow hover:shadow-float', snap.signal && 'border-ink/25', className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Monogram tone={snap.signal ? 'signal' : 'plain'}>{snap.instrument.symbol}</Monogram>
          <div className="min-w-0">
            <Link href={href} className="block truncate font-serif text-[20px] leading-tight after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:outline-2 focus-visible:after:outline-accent">
              {snap.instrument.name}
            </Link>
            <p className="kicker mt-0.5">{t(snap.instrument.type)} · {snap.instrument.category}</p>
          </div>
        </div>
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
