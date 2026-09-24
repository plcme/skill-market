import Link from 'next/link';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, ArrowUpRight, MessageCircle } from 'lucide-react';
import { chatHref, instrumentPath } from '@/lib/links';
import { encodeFilter, isDefaultFilter } from '@/lib/filters/spec';
import { getInstrument } from '@/lib/market/catalog';
import { formatDate } from '@/lib/time';
import type { FilterSpec, Instrument } from '@/lib/market/types';
import type { Comparison, InstrumentDetail } from '@/lib/queries/market';
import { Button } from '@/components/ui/button';
import { Card, Monogram, Notice, SectionHeader } from '@/components/ui/primitives';
import { MetricLabel } from '@/components/market/metric-info';
import { MetricValue } from '@/components/market/metric-value';
import { SampleWarning } from '@/components/market/sample-warning';
import { cn } from '@/lib/utils';
import { chartMetricFor, correlationBand, hrefWith, keyMetrics, SUGGESTED_PAIRS, togetherness } from './logic';
import { ClientTrendChart as TrendChart } from './trend-chart-client';

// /compare (FR-M5): evidence and trade-offs side by side — never a winner.

function Legend({ tone }: { tone: 'ink' | 'accent' }) {
  return <span aria-hidden className={cn('inline-block h-0.5 w-5 shrink-0 rounded-full', tone === 'ink' ? 'bg-ink' : 'bg-[repeating-linear-gradient(90deg,var(--accent)_0_5px,transparent_5px_8px)]')} />;
}

/** Suggested pairs shown when the comparison isn't ready yet. */
export function SuggestedPairs({ filter }: { filter: FilterSpec }) {
  const t = useTranslations('ComparePage');
  const tt = useTranslations('Ticker');
  const f = isDefaultFilter(filter) ? undefined : encodeFilter(filter);
  return (
    <section aria-labelledby="pairs-h" className="mt-10">
      <SectionHeader id="pairs-h" kicker={t('pairsKicker')} title={t('pairsTitle')} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUGGESTED_PAIRS.map(([a, b]) => {
          const ia = getInstrument(a);
          const ib = getInstrument(b);
          if (!ia || !ib) return null;
          return (
            <li key={`${a}-${b}`}>
              <Link href={hrefWith('/compare', { a, b, f })} className="group flex h-full flex-col gap-3 rounded-md border border-rule bg-surface p-4 transition-colors hover:border-ink/40">
                <span className="kicker">{tt(ia.type)}</span>
                <span className="flex items-center gap-2 font-serif text-[22px] leading-tight">
                  {ia.name}
                  <span className="font-sans text-sm text-muted">{t('vs')}</span>
                  {ib.name}
                </span>
                <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-medium text-accent">
                  {t('pairsOpen')}<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SideHeader({ d, filter, tone }: { d: InstrumentDetail; filter: FilterSpec; tone: 'ink' | 'accent' }) {
  const t = useTranslations('ComparePage');
  const tt = useTranslations('Ticker');
  const inst = d.snapshot.instrument;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <Legend tone={tone} />
        <Monogram size="sm" tone={tone === 'accent' ? 'accent' : 'ink'}>{inst.symbol}</Monogram>
      </div>
      <div className="min-w-0">
        <h2 className="break-words font-serif text-[24px] leading-[1.05] sm:text-[36px]">{inst.name}</h2>
        <p className="kicker mt-1.5">{tt(inst.type)} · {inst.category}</p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
        <Link href={instrumentPath(inst.type, inst.slug, filter)} className="link inline-flex items-center gap-1">{t('openPage')}<ArrowUpRight className="size-3" aria-hidden /></Link>
        <Link href={chatHref(inst.slug, filter, d.signal?.kind)} className="link inline-flex items-center gap-1"><MessageCircle className="size-3" aria-hidden />{t('talkShort')}</Link>
      </div>
    </div>
  );
}

function ChipList({ items, filter, empty }: { items: Instrument[]; filter: FilterSpec; empty: string }) {
  if (!items.length) return <p className="text-[13px] text-muted">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map(i => (
        <li key={i.id}>
          <Link href={instrumentPath(i.type, i.slug, filter)} className="inline-flex h-7 items-center rounded-full border border-rule bg-surface px-2.5 text-[12.5px] font-medium hover:border-ink/40">{i.name}</Link>
        </li>
      ))}
    </ul>
  );
}

export function CompareView({ c, filter }: { c: Comparison; filter: FilterSpec }) {
  const t = useTranslations('ComparePage');
  const tm = useTranslations('Metrics');
  const ti = useTranslations('InstrumentPage');
  const a = c.a.snapshot.instrument;
  const b = c.b.snapshot.instrument;
  const type = a.type;
  const metrics = keyMetrics(c.a.metrics);
  const chartMetric = chartMetricFor(c.a.metric);
  const ra = c.a.readings[chartMetric];
  const rb = c.b.readings[chartMetric];
  const thin = [ra, rb].find(r => r?.status === 'insufficient_sample');
  const band = correlationBand(c.correlation);
  const lastDate = c.a.series[c.a.series.length - 1]?.date ?? c.a.as_of;
  const together = togetherness(c.overlap);

  return (
    <>
      <div className="mt-10 grid grid-cols-2 gap-4 border-t-2 border-rule-strong pt-5 sm:gap-10 md:grid-cols-[minmax(200px,1fr)_1fr_1fr]">
        <p className="kicker hidden md:block">{t('sideBySide')}</p>
        <SideHeader d={c.a} filter={filter} tone="ink" />
        <SideHeader d={c.b} filter={filter} tone="accent" />
      </div>

      <section aria-labelledby="measures-h" className="mt-10">
        <h2 id="measures-h" className="sr-only">{t('measuresTitle')}</h2>
        <div role="table" aria-labelledby="measures-h" className="border-t border-rule">
          <div role="row" className="sr-only">
            <span role="columnheader">{t('colMeasure')}</span>
            <span role="columnheader">{a.name}</span>
            <span role="columnheader">{b.name}</span>
          </div>
          {metrics.map(m => {
            const va = c.a.readings[m];
            const vb = c.b.readings[m];
            if (!va || !vb) return null;
            return (
              <div key={m} role="row" className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-rule py-3.5 sm:gap-x-10 md:grid-cols-[minmax(200px,1fr)_1fr_1fr] md:items-start">
                <div role="rowheader" className="col-span-2 md:col-span-1"><MetricLabel metric={m} type={type} reading={va} filter={filter} /></div>
                <div role="cell" className="min-w-0"><MetricValue reading={va} size="md" className="[&>span:last-child]:whitespace-normal" /></div>
                <div role="cell" className="min-w-0"><MetricValue reading={vb} size="md" className="[&>span:last-child]:whitespace-normal" /></div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12.5px] text-muted">{t('noWinner')}</p>
      </section>

      <section aria-labelledby="trend-h" className="mt-16">
        <SectionHeader id="trend-h" kicker={t('trendKicker')} title={t('trendTitle')} />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-12">
          <Card className="min-w-0 p-4 sm:p-6">
            {thin ? (
              <Suspense fallback={null}><SampleWarning reading={thin} filter={filter} /></Suspense>
            ) : (
              <TrendChart
                lines={[
                  { id: a.slug, label: a.name, points: c.a.series, tone: 'ink' },
                  { id: b.slug, label: b.name, points: c.b.series, tone: 'accent' },
                ]}
                metric={chartMetric}
                caption={ti('chartCaption', { metric: tm(`${chartMetric}.label`), end: formatDate(lastDate) })}
                height={280}
              />
            )}
          </Card>
          <div className="flex flex-col gap-4">
            <p className="kicker">{t('corrKicker')}</p>
            <p className="font-serif text-[26px] leading-snug">{t(`corr.${band}`, { a: a.name, b: b.name })}</p>
            <p className="num text-[13px] text-ink-2">{t('corrValue', { r: c.correlation.toFixed(2) })}</p>
            <Notice tone="info">{t('corrCaveat')}</Notice>
          </div>
        </div>
      </section>

      <section aria-labelledby="overlap-h" className="mt-16">
        <SectionHeader id="overlap-h" kicker={t('overlapKicker')} title={t(`overlapTitle.${type}`)} />
        {type === 'skill' ? (
          <p className="mb-6 max-w-2xl text-[15px] text-ink-2">
            <span className="font-medium text-ink">{t(`together.${together}`)}</span>{' '}
            {t('togetherBody', { a: a.name, b: b.name })}
          </p>
        ) : (
          <p className="num mb-6 max-w-2xl text-[15px] text-ink-2">{t('overlapRoles', { shared: c.shared.length, total: c.shared.length + c.onlyA.length + c.onlyB.length })}</p>
        )}
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="kicker mb-2.5">{t(`sharedLabel.${type}`)}</p>
            <ChipList items={c.shared} filter={filter} empty={t('none')} />
          </div>
          <div>
            <p className="kicker mb-2.5 flex items-center gap-2"><Legend tone="ink" />{t(`onlyLabel.${type}`, { name: a.name })}</p>
            <ChipList items={c.onlyA} filter={filter} empty={t('none')} />
          </div>
          <div>
            <p className="kicker mb-2.5 flex items-center gap-2"><Legend tone="accent" />{t(`onlyLabel.${type}`, { name: b.name })}</p>
            <ChipList items={c.onlyB} filter={filter} empty={t('none')} />
          </div>
        </div>
      </section>

      <section aria-labelledby="effort-h" className="mt-16">
        <SectionHeader id="effort-h" kicker={ti('decideKicker')} title={t('effortTitle')} />
        <dl className="border-t border-rule">
          {(['effort', 'transfer'] as const).map(k => (
            <div key={k} className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-rule py-4 sm:gap-x-10 md:grid-cols-[minmax(200px,1fr)_1fr_1fr]">
              <dt className="kicker col-span-2 md:col-span-1">{k === 'effort' ? ti(`effortLabel.${type}`) : ti('transferLabel')}</dt>
              {[a, b].map(i => (
                <dd key={i.id} className="min-w-0">
                  <p className="font-serif text-[20px] leading-tight">{k === 'effort' ? ti(`effort.${i.learning_effort}`) : ti(`transfer.${i.transferability}`)}</p>
                  <p className="mt-1 text-[13px] text-ink-2">{k === 'effort' ? ti(`effortBody.${type}.${i.learning_effort}`) : ti(`transferBody.${i.transferability}`)}</p>
                </dd>
              ))}
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="limits-h" className="mt-16 grid gap-6 rounded-lg border border-rule bg-surface p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div>
          <p className="kicker">{t('limitsKicker')}</p>
          <h2 id="limits-h" className="mt-2 font-serif text-[28px] leading-tight">{t('limitsTitle')}</h2>
        </div>
        <div>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] text-ink-2 marker:text-faint">
            {(['l1', 'l2', 'l3', 'l4'] as const).map(k => <li key={k}>{t(`limits.${k}`)}</li>)}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="accent"><Link href={chatHref(a.slug, filter, c.a.signal?.kind)}><MessageCircle aria-hidden />{t('talkAbout', { name: a.name })}</Link></Button>
            <Button asChild variant="outline"><Link href={chatHref(b.slug, filter, c.b.signal?.kind)}><MessageCircle aria-hidden />{t('talkAbout', { name: b.name })}</Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}
