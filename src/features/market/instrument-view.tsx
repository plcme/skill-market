import Link from 'next/link';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeftRight, ChevronRight, MessageCircle } from 'lucide-react';
import { encodeFilter, isDefaultFilter } from '@/lib/filters/spec';
import { chatHref, instrumentPath } from '@/lib/links';
import { CHART_MEASURE_METRIC, METRICS, signalMetric } from '@/lib/metrics/registry';
import { formatDate } from '@/lib/time';
import type { FilterSpec, MetricKey } from '@/lib/market/types';
import type { InstrumentDetail } from '@/lib/queries/market';
import { Button } from '@/components/ui/button';
import { Card, Container, Monogram, SectionHeader } from '@/components/ui/primitives';
import { ChangeBadge } from '@/components/market/change-badge';
import { MetricLabel } from '@/components/market/metric-info';
import { MetricSwitcher } from '@/components/market/metric-switcher';
import { MetricValue } from '@/components/market/metric-value';
import { SignalTag } from '@/components/market/signal-tag';
import { SourceBadge } from '@/components/market/source-badge';
import { WatchButton } from '@/components/market/watch-button';
import { HeatmapLegend, HeatmapTable, HeatmapTiles } from '@/components/market/heatmap';
import { competencyLevels } from '@/lib/market/competencies';
import { BeforeYouDecide, CompositionList, CoreCompetencies, Figure, Fundamentals, LocationBars, Provenance, RelatedSkills, SalaryBlock } from './instrument-sections';
import { hrefWith } from './logic';
import { InstrumentChart } from './instrument-chart';
import { TitleFilter, TitleFilterStatic } from './instrument-title-filter';
import { MyNotes } from './my-notes';
import { useSignalMove } from './signal-copy';

/** The flagship full ticker page shared by /s/[slug], /r/[slug] and /i/[slug]. */
export function InstrumentView({ detail, filter }: { detail: InstrumentDetail; filter: FilterSpec }) {
  const t = useTranslations('InstrumentPage');
  const tt = useTranslations('Ticker');
  const move = useSignalMove();
  const { snapshot: snap, signal } = detail;
  const inst = snap.instrument;
  const type = inst.type;
  const f = isDefaultFilter(filter) ? undefined : encodeFilter(filter);
  const base = instrumentPath(type, inst.slug);
  const metricHref = (m: MetricKey) => `${hrefWith(base, { f, metric: m === detail.metrics.default ? undefined : m })}#now`;
  const talk = chatHref(inst.slug, filter, signal?.kind);
  const compare = hrefWith('/compare', { a: inst.slug, f });

  const reading = snap.metric;
  const competencies = type === 'role' ? competencyLevels(inst.slug) : null;
  const tc = useTranslations('Competencies');
  const secondary = ([signalMetric(type), 'entry_level_share', 'ad_count'] as MetricKey[]).filter(m => m !== detail.metric).slice(0, 2);

  return (
    <Container className="pb-20">
      <nav aria-label={t('breadcrumb')} className="pt-6">
        <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
          <li><Link href={hrefWith('/market', { f })} className="hover:text-ink hover:underline">{t('crumbMarket')}</Link></li>
          <li aria-hidden><ChevronRight className="size-3.5" /></li>
          <li><Link href={hrefWith('/market', { type, f })} className="hover:text-ink hover:underline">{t(`crumbType.${type}`)}</Link></li>
          <li aria-hidden><ChevronRight className="size-3.5" /></li>
          <li aria-current="page" className="text-ink">{inst.name}</li>
        </ol>
      </nav>

      <header className="grid grid-cols-1 gap-8 pb-8 pt-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Monogram size="lg" tone={signal ? 'signal' : 'plain'}>{inst.symbol}</Monogram>
            <div className="min-w-0">
              <p className="kicker">{tt(type)}{inst.skill_layer ? <>{' · '}{tt(`layer.${inst.skill_layer}`)}</> : null} · {inst.category}</p>
              <p className="mt-1 font-mono text-[12px] text-muted">
                {type === 'role' ? (inst.anzsco ? tt('anzsco', { code: inst.anzsco }) : tt('noAnzsco')) : t('tracked', { date: formatDate(inst.tracking_since, { month: 'short', year: 'numeric' }) })}
              </p>
            </div>
          </div>
          <h1 className="display mt-6 break-words text-[48px] sm:text-[72px] lg:text-[88px]">
            {inst.name}{' '}
            <Suspense fallback={<TitleFilterStatic filter={filter} />}>
              <TitleFilter />
            </Suspense>
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-2">{inst.blurb}</p>
          {inst.aliases.length ? (
            <p className="mt-3 text-[13px] text-muted">
              {t('aliases')}{' '}
              {inst.aliases.map((a, i) => <span key={a}><span className="font-mono text-ink-2">{a}</span>{i < inst.aliases.length - 1 ? ', ' : null}</span>)}
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-[340px]">
          <Suspense fallback={<Button variant="accent" size="lg" disabled className="w-full" aria-hidden />}>
            <WatchButton slug={inst.slug} filter={filter} metric={detail.metric} prominent />
          </Suspense>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <Link href={compare} className="inline-flex items-center gap-1.5 py-1 underline-offset-4 hover:text-ink hover:underline">
              <ArrowLeftRight className="size-3.5" aria-hidden />{t('compareWith')}
            </Link>
            <span aria-hidden className="text-faint">·</span>
            <Link href={talk} aria-label={t(`talk.${type}`, { name: inst.name })} className="inline-flex items-center gap-1.5 py-1 underline-offset-4 hover:text-ink hover:underline">
              <MessageCircle className="size-3.5" aria-hidden />{t('talkShort')}
            </Link>
          </div>
        </div>
      </header>

      <section id="now" aria-labelledby="now-h" className="mt-8 grid scroll-mt-24 gap-8 border-t-2 border-rule-strong pt-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="now-h" tabIndex={-1} className="kicker text-ink">{t('now')}</h2>
            <Suspense fallback={<div className="h-8 w-40" />}>
              <MetricSwitcher type={type} value={detail.metric} />
            </Suspense>
          </div>
          <div className="mt-6">
            <MetricLabel metric={detail.metric} type={type} reading={reading} filter={filter} subject={inst.name} />
          </div>
          <div className="mt-2">
            {reading.status === 'ok' && METRICS[reading.metric].unit === 'change'
              ? <ChangeBadge reading={reading} size="lg" className="gap-2 [&>span:first-child]:font-serif [&>span:first-child]:text-[64px] [&>span:first-child]:font-normal [&>span:first-child]:leading-[0.95] sm:[&>span:first-child]:text-[80px] [&>span:last-child]:text-[13px]" />
              : <MetricValue reading={reading} size="xl" className={reading.status === 'ok' ? '[&>span:first-child]:text-[64px] sm:[&>span:first-child]:text-[80px]' : undefined} />}
          </div>
          <div className="mt-3"><SourceBadge kind={reading.source} /></div>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-rule pt-4">
            {secondary.map(m => {
              const r = detail.readings[m];
              if (!r) return null;
              return (
                <div key={m} className="min-w-0">
                  <dt><MetricLabel metric={m} type={type} reading={r} filter={filter} subject={inst.name} short /></dt>
                  <dd className="mt-1.5"><Figure reading={r} className="[&>span:first-child]:text-[24px]" /></dd>
                </div>
              );
            })}
          </dl>

          {signal ? (
            <div className="mt-6 rounded-md bg-signal-soft p-4 sm:p-5">
              <SignalTag signal={signal} />
              <p className="mt-3 font-serif text-[20px] leading-snug">{move(signal)}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                <span className="font-medium text-ink">{t('whyFlagged')}</span>{' '}
                {t(`why.${signal.kind === 'entry_open' ? 'entry_open' : 'count'}`)}
              </p>
              <Button asChild variant="primary" size="sm" className="mt-4">
                <Link href={talk}>{t('signalTalk')}</Link>
              </Button>
            </div>
          ) : (
            <p className="mt-6 text-[13px] leading-relaxed text-muted">{t('noSignal')}</p>
          )}
        </div>

        <Card className="min-w-0 self-start p-4 sm:p-6">
          <Suspense fallback={<div className="skeleton h-[420px] w-full" />}>
            <InstrumentChart
              breakdown={detail.breakdown}
              y={detail.chart.y}
              measures={detail.chart.measures}
              type={type}
              filter={filter}
              subject={inst.name}
              reading={detail.readings[CHART_MEASURE_METRIC[detail.chart.y]]}
            />
          </Suspense>
        </Card>
      </section>

      <MyNotes slug={inst.slug} name={inst.name} />

      <section aria-labelledby="fund-h" className="mt-16">
        <SectionHeader id="fund-h" kicker={t('fundKicker')} title={t('fundTitle')} action={<Link href="/metrics" className="link hidden text-sm sm:inline">{t('fundAction')}</Link>} />
        <Fundamentals detail={detail} filter={filter} metricHref={metricHref} />
      </section>

      {type === 'role' ? (
        <section aria-labelledby="pay-h" className="mt-16">
          <SectionHeader id="pay-h" kicker={t('payKicker')} title={t('payTitle')} />
          <SalaryBlock median={detail.readings.salary_median} range={detail.readings.salary_p10_p90} filter={filter} />
        </section>
      ) : null}

      {type === 'industry' ? (
        <>
          <section aria-labelledby="comp-h" className="mt-16">
            <SectionHeader id="comp-h" kicker={t('compKicker.industry')} title={t('compTitle.industry')} />
            <p className="-mt-1 mb-4 max-w-3xl text-[13px] text-muted">{t('compNote.industry', { name: inst.name })}</p>
            {detail.heatmap ? (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
                <div className="min-w-0">
                  <HeatmapTiles heatmap={detail.heatmap} filter={filter} label={t('industryHeatmapLabel', { name: inst.name })} />
                  <HeatmapLegend heatmap={detail.heatmap} filter={filter} className="mt-4" />
                  <HeatmapTable heatmap={detail.heatmap} caption={t('industryHeatmapLabel', { name: inst.name })} nameHead={tt('skill')} />
                </div>
                <div className="min-w-0">
                  <h3 className="kicker mb-3 text-ink">{t('industryListTitle')}</h3>
                  <CompositionList entries={detail.composition} parent={inst} filter={filter} mode="skillsOfIndustry" />
                </div>
              </div>
            ) : null}
          </section>
          <section aria-labelledby="loc-h" className="mt-16">
            <SectionHeader id="loc-h" kicker={t('locKicker')} title={t('locTitle')} />
            <LocationBars locations={detail.locations} />
          </section>
        </>
      ) : (
      <div className="mt-16 grid gap-16 lg:grid-cols-2 lg:gap-12">
        <section aria-labelledby="comp-h">
          <SectionHeader id="comp-h" kicker={t(`compKicker.${type}`)} title={t(`compTitle.${type}`, { name: inst.name })} />
          <p className="-mt-1 mb-4 text-[13px] text-muted">{t(`compNote.${type}`, { name: inst.name })}</p>
          <CompositionList entries={detail.composition} parent={inst} filter={filter} mode={type === 'role' ? 'skillsOfRole' : 'rolesOfSkill'} />
        </section>
        {type === 'skill' ? (
          <section aria-labelledby="rel-h">
            <SectionHeader id="rel-h" kicker={t('relKicker')} title={t('relTitle')} />
            <p className="-mt-1 mb-4 text-[13px] text-muted">{t('relNote', { name: inst.name })}</p>
            <RelatedSkills entries={detail.related} filter={filter} />
          </section>
        ) : (
          <section aria-labelledby="loc-h">
            <SectionHeader id="loc-h" kicker={t('locKicker')} title={t('locTitle')} />
            <LocationBars locations={detail.locations} />
          </section>
        )}
      </div>
      )}

      {type === 'skill' ? (
        <div className="mt-16 grid gap-16 lg:grid-cols-2 lg:gap-12">
          <section aria-labelledby="loc-h">
            <SectionHeader id="loc-h" kicker={t('locKicker')} title={t('locTitle')} />
            <LocationBars locations={detail.locations} />
          </section>
          <section aria-labelledby="decide-h">
            <SectionHeader id="decide-h" kicker={t('decideKicker')} title={t('decideTitle')} />
            <BeforeYouDecide instrument={inst} layout="stack" />
          </section>
        </div>
      ) : type === 'role' ? (
        <>
        {competencies ? (
          <section aria-labelledby="core-h" className="mt-16">
            <SectionHeader id="core-h" kicker={tc('kicker')} title={tc('title')} />
            <CoreCompetencies levels={competencies} name={inst.name} />
          </section>
        ) : null}
        <section aria-labelledby="decide-h" className="mt-16">
          <SectionHeader id="decide-h" kicker={t('decideKicker')} title={t('decideTitle')} />
          <BeforeYouDecide instrument={inst} />
        </section>
        </>
      ) : null}

      <section aria-labelledby="next-h" className="mt-16 grid gap-6 rounded-lg border border-rule bg-surface p-6 sm:p-8 md:grid-cols-[minmax(0,1.4fr)_auto] md:items-end">
        <div>
          <p className="kicker">{t('nextKicker')}</p>
          <h2 id="next-h" className="mt-2 font-serif text-[28px] leading-tight sm:text-[32px]">{t(`nextTitle.${type}`, { name: inst.name })}</h2>
          <p className="mt-2 max-w-2xl text-ink-2">{t('nextBody')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="accent" size="lg"><Link href={talk}><MessageCircle aria-hidden />{t('nextCta')}</Link></Button>
          <Button asChild variant="outline" size="lg"><Link href={compare}><ArrowLeftRight aria-hidden />{t('compareWith')}</Link></Button>
        </div>
      </section>

      <Provenance detail={detail} metricKey={detail.metric} />
    </Container>
  );
}
