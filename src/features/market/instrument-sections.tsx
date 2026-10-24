import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { instrumentPath } from '@/lib/links';
import { COMPETENCY_SCALE_MAX, competencyHref, type CompetencyLevel } from '@/lib/market/competencies';
import { METRICS } from '@/lib/metrics/registry';
import { formatAud, formatCount, formatShare } from '@/lib/market/format';
import { formatDate } from '@/lib/time';
import type { ActiveInstrumentType, FilterSpec, Instrument, LearningEffort, MetricKey, MetricReading, Transferability } from '@/lib/market/types';
import type { CompositionEntry, InstrumentDetail } from '@/lib/queries/market';
import { ChangeBadge } from '@/components/market/change-badge';
import { MetricInfo, MetricLabel } from '@/components/market/metric-info';
import { MetricValue } from '@/components/market/metric-value';
import { WatchButton } from '@/components/market/watch-button';
import { SourceBadge } from '@/components/market/source-badge';
import { Notice } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import { barPercent, salaryAxis, togetherness, type Togetherness } from './logic';
import { MeasureCellLink } from './measure-cell-link';
import { InstrumentMark } from '@/components/market/instrument-mark';

// Building blocks of the full ticker page (FR-M2 "full page"); several are reused
// on /compare so both views explain numbers the same way.

/** A reading as an editorial figure: serif value, with change metrics keeping their glyph + counts. */
export function Figure({ reading, className }: { reading: MetricReading; className?: string }) {
  if (METRICS[reading.metric].unit === 'change' && reading.status === 'ok') {
    return <ChangeBadge reading={reading} size="lg" className={cn('[&>span:first-child]:font-serif [&>span:first-child]:text-[30px] [&>span:first-child]:font-normal [&>span:first-child]:leading-none', className)} />;
  }
  return <MetricValue reading={reading} size="lg" className={cn('[&>span:last-child]:whitespace-normal', className)} />;
}

/**
 * Every valid measure as a figure cell; advanced ones behind a disclosure (PRD §10 rule 9).
 * Each cell selects its measure in the "Right now" headline and scrolls back up to it.
 */
export function Statistics({ detail, filter, metricHref }: {
  detail: InstrumentDetail;
  filter: FilterSpec;
  metricHref: (m: MetricKey) => string;
}) {
  const t = useTranslations('InstrumentPage');
  const tm = useTranslations('Metrics');
  const type = detail.snapshot.instrument.type;
  const cell = (m: MetricKey) => {
    const r = detail.readings[m];
    if (!r) return null;
    const current = m === detail.metric;
    return (
      <li key={m} className={cn('relative flex min-w-0 flex-col gap-3.5 border-b border-r border-rule p-4 transition-colors sm:p-6', current ? 'bg-picked shadow-[inset_0_0_0_2px_var(--ink)]' : 'bg-surface hover:bg-sunken/50')}>
        <MeasureCellLink href={metricHref(m)} current={current} label={t('showMeasureLabel', { metric: tm(`${m}.label`) })} />
        <MetricLabel metric={m} type={type} reading={r} filter={filter} subject={detail.snapshot.instrument.name} infoClassName="relative z-10" />
        <Figure reading={r} className="[&>span:first-child]:text-[32px] sm:[&>span:first-child]:text-[40px]" />
        <div className="mt-auto pt-1">
          <SourceBadge kind={r.source} short />
        </div>
      </li>
    );
  };
  const grid = 'grid grid-cols-2 border-l border-t border-rule md:grid-cols-3 lg:grid-cols-4';
  return (
    <div>
      <ul className={grid}>{[detail.metrics.default, ...detail.metrics.common].map(cell)}</ul>
      {detail.metrics.advanced.length ? (
        <details className="group mt-4">
          <summary className="inline-flex items-center gap-1.5 rounded-[4px] py-1 text-sm font-medium text-accent">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            <span className="group-open:hidden">{t('moreMeasures', { n: detail.metrics.advanced.length })}</span>
            <span className="hidden group-open:inline">{t('fewerMeasures')}</span>
          </summary>
          <p className="mb-3 mt-1 max-w-2xl text-[13px] text-muted">{t('advancedNote')}</p>
          <ul className={grid}>{detail.metrics.advanced.map(cell)}</ul>
        </details>
      ) : null}
    </div>
  );
}

/** Role pay: median plus the p10–p90 band on a simple axis, with salary coverage. */
export function SalaryBlock({ median, range, filter }: { median?: MetricReading; range?: MetricReading; filter: FilterSpec }) {
  const t = useTranslations('InstrumentPage');
  if (!median) return null;
  const ok = median.status === 'ok' && median.value !== null;
  const coverage = median.numerator !== null && median.denominator ? median.numerator / median.denominator : null;
  const band = range && range.status === 'ok' && range.low !== null && range.high !== null && median.value !== null
    ? { low: range.low, high: range.high, axis: salaryAxis(range.low, median.value, range.high) }
    : null;
  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-12">
      <div>
        <span className="inline-flex items-center gap-1">
          <span className="kicker">{t('payMedian')}</span>
          <MetricInfo metric="salary_median" type="role" reading={median} filter={filter} />
        </span>
        {ok && median.value !== null ? (
          <p className="mt-2 flex items-baseline gap-2">
            <span className="serif-num text-[56px] leading-none">{formatAud(median.value)}</span>
            <span className="text-sm text-muted">{t('perYear')}</span>
          </p>
        ) : (
          <p className="mt-2 font-serif text-2xl text-muted">{t('payInsufficient')}</p>
        )}
        {median.numerator !== null && median.denominator !== null ? (
          <p className="num mt-3 text-[13px] text-ink-2">
            {t('payCoverage', { num: formatCount(median.numerator), den: formatCount(median.denominator), pct: coverage !== null ? formatShare(coverage) : '—' })}
          </p>
        ) : null}
        <SourceBadge kind={median.source} className="mt-3" />
      </div>
      <div>
        <span className="inline-flex items-center gap-1">
          <span className="kicker">{t('payRange')}</span>
          {range ? <MetricInfo metric="salary_p10_p90" type="role" reading={range} filter={filter} /> : null}
        </span>
        {band && median.value !== null ? (
          <figure className="mt-4">
            <div className="relative h-16" aria-hidden>
              <span className="absolute inset-x-0 top-9 h-px bg-rule-strong/40" />
              <span className="absolute top-[30px] h-3 rounded-full bg-ink/15 ring-1 ring-inset ring-ink/25" style={{ left: `${band.axis.low}%`, width: `${band.axis.high - band.axis.low}%` }} />
              <span className="absolute top-[26px] h-5 w-[3px] -translate-x-1/2 rounded-full bg-ink" style={{ left: `${band.axis.median}%` }} />
              <span className="num absolute top-0 -translate-x-1/2 whitespace-nowrap text-[13px] font-medium" style={{ left: `${band.axis.median}%` }}>{formatAud(median.value)}</span>
            </div>
            <div className="relative h-11" aria-hidden>
              <span className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${band.axis.low}%` }}>
                <span className="num text-[13px]">{formatAud(band.low)}</span>
                <span className="kicker whitespace-nowrap">{t('p10')}</span>
              </span>
              <span className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${band.axis.high}%` }}>
                <span className="num text-[13px]">{formatAud(band.high)}</span>
                <span className="kicker whitespace-nowrap">{t('p90')}</span>
              </span>
            </div>
            <figcaption className="mt-2 text-[13px] text-ink-2">
              {t('payRangeSentence', { low: formatAud(band.low), high: formatAud(band.high), median: formatAud(median.value) })}
            </figcaption>
          </figure>
        ) : (
          <p className="mt-4 text-sm text-muted">{t('payRangeInsufficient')}</p>
        )}
        <p className="mt-3 text-[12.5px] text-muted">{t('payCaveat')}</p>
      </div>
    </div>
  );
}

/** FR-M3: weighted links between roles and skills, each one hop away. */
export function CompositionList({ entries, parent, filter, mode }: {
  entries: CompositionEntry[];
  parent: Instrument;
  filter: FilterSpec;
  /** skillsOfRole = "Top holdings"; skillsOfIndustry = skills in an industry's ads; rolesOfSkill = roles asking for a skill. */
  mode: 'skillsOfRole' | 'skillsOfIndustry' | 'rolesOfSkill';
}) {
  const t = useTranslations('InstrumentPage');
  if (!entries.length) return <p className="text-sm text-muted">{t('compositionEmpty')}</p>;
  const max = Math.max(...entries.map(e => e.weight));
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {entries.map(e => {
        const pct = formatShare(e.weight).replace(/\.0%$/, '%');
        const skillsOfParent = mode !== 'rolesOfSkill';
        const roleName = skillsOfParent ? parent.name : e.instrument.name;
        const skillName = skillsOfParent ? e.instrument.name : parent.name;
        return (
          <li key={e.instrument.id} className="relative py-3 hover:bg-surface">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <p className="min-w-0 truncate">
                <Link href={instrumentPath(e.instrument.type, e.instrument.slug, filter)} className="font-medium after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent">
                  {e.instrument.name}
                </Link>
                <span className="ml-2 text-[12px] text-muted">{e.instrument.category}</span>
              </p>
              <span className="num shrink-0 text-sm font-medium">{skillsOfParent ? t('holdingPct', { pct }) : pct}</span>
              {mode !== 'skillsOfIndustry' ? (
                <div className="relative z-10 col-span-2 justify-self-end sm:col-span-1">
                  <WatchButton slug={e.instrument.slug} filter={filter} compact />
                </div>
              ) : null}
            </div>
            <span className="relative mt-2 block h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
              <span className="absolute inset-y-0 left-0 rounded-full bg-ink/70" style={{ width: `${barPercent(e.weight, max)}%` }} />
            </span>
            <span className="sr-only">{t('weightSentence', { pct, role: roleName, skill: skillName })}</span>
          </li>
        );
      })}
    </ul>
  );
}

const TOGETHER_ORDER: Togetherness[] = ['often', 'sometimes', 'occasionally'];

/** "Often asked for together": qualitative bands instead of raw similarity scores. */
export function RelatedSkills({ entries, filter }: { entries: CompositionEntry[]; filter: FilterSpec }) {
  const t = useTranslations('InstrumentPage');
  if (!entries.length) return <p className="text-sm text-muted">{t('relatedEmpty')}</p>;
  const groups = TOGETHER_ORDER.map(band => ({ band, items: entries.filter(e => togetherness(e.weight) === band) })).filter(g => g.items.length);
  return (
    <dl className="flex flex-col gap-5">
      {groups.map(g => (
        <div key={g.band}>
          <dt className="flex items-baseline gap-2">
            <span className="kicker text-ink">{t(`together.${g.band}`)}</span>
            <span className="text-[12.5px] text-muted">{t(`togetherHint.${g.band}`)}</span>
          </dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            {g.items.map(e => (
              <Link
                key={e.instrument.id}
                href={instrumentPath('skill', e.instrument.slug, filter)}
                className="inline-flex h-8 items-center gap-2 rounded-full border border-rule bg-surface pl-1 pr-3 text-[13px] font-medium transition-colors hover:border-ink/40 hover:bg-sunken/50"
              >
                <InstrumentMark size="sm" slug={e.instrument.slug} symbol={e.instrument.symbol} className="size-6 rounded-full border-0 bg-sunken text-[9.5px] font-normal text-ink-2" />
                {e.instrument.name}
              </Link>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Where the ads are, per state under the current filter. */
export function LocationBars({ locations }: { locations: InstrumentDetail['locations'] }) {
  const t = useTranslations('InstrumentPage');
  const total = locations.reduce((a, l) => a + l.count, 0);
  const max = Math.max(0, ...locations.map(l => l.count));
  if (!locations.length || total === 0) return <p className="text-sm text-muted">{t('locationsEmpty')}</p>;
  return (
    <div>
      <ul className="flex flex-col gap-2.5">
        {locations.map(l => (
          <li key={l.location_id} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2.5 text-sm sm:grid-cols-[minmax(0,12rem)_1fr_auto] sm:gap-3">
            <span className="truncate text-ink-2">{l.name}</span>
            <span className="relative h-2.5 overflow-hidden rounded-[2px] bg-sunken" aria-hidden>
              <span className="absolute inset-y-0 left-0 bg-ink/75" style={{ width: `${barPercent(l.count, max)}%` }} />
            </span>
            <span className="num w-[5.75rem] whitespace-nowrap text-right text-[13px] sm:w-[7.5rem]">
              {formatCount(l.count)}
              <span className="text-muted">{' · '}{formatShare(l.count / total)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12.5px] text-muted">{t('locationsNote', { total: formatCount(total) })}</p>
    </div>
  );
}

const EFFORT: LearningEffort[] = ['weeks', 'months', 'year_plus'];
const TRANSFER: Transferability[] = ['narrow', 'moderate', 'broad'];

function Scale<V extends string>({ steps, value, label }: { steps: V[]; value: V; label: (v: V) => string }) {
  const idx = steps.indexOf(value);
  return (
    <div className="mt-3" aria-hidden>
      <div className="grid grid-cols-3 gap-1">
        {steps.map((s, i) => <span key={s} className={cn('h-1.5 rounded-full', i <= idx ? 'bg-ink' : 'bg-sunken')} />)}
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1">
        {steps.map(s => <span key={s} className={cn('text-[11.5px]', s === value ? 'font-medium text-ink' : 'text-faint')}>{label(s)}</span>)}
      </div>
    </div>
  );
}

/**
 * ASC core competencies for a role: one bar per ability, 1–10 with the number
 * written next to it. Listed in the ASC's own order — never sorted, so it
 * never reads as a ranking. Illustrative fixture; no demand metrics.
 */
export function CoreCompetencies({ levels, name }: { levels: CompetencyLevel[]; name: string }) {
  const t = useTranslations('Competencies');
  return (
    <div>
      <p className="-mt-1 mb-4 max-w-3xl text-[13px] text-muted">{t('roleNote', { name })}{' '}{t('notTracked')}</p>
      <ul aria-label={t('listLabel', { name })} className="grid gap-x-12 gap-y-3 md:grid-cols-2">
        {levels.map(c => {
          const label = t(`items.${c.slug}.name`);
          return (
            <li key={c.slug} className="grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,12rem)_1fr_auto]">
              <Link href={competencyHref(c.slug)} className="leading-tight text-ink-2 hover:text-ink hover:underline">{label}</Link>
              <span className="grid h-2.5 grid-cols-10 gap-[2px]" aria-hidden>
                {Array.from({ length: COMPETENCY_SCALE_MAX }, (_, i) => (
                  <span key={i} className={cn('rounded-[1px]', i < c.level ? 'bg-ink/75' : 'bg-sunken')} />
                ))}
              </span>
              <span className="num w-12 whitespace-nowrap text-right text-[13px]">
                <span className="sr-only">{t('levelLabel', { name: label, level: c.level })}</span>
                <span aria-hidden>{t('level', { level: c.level })}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-col gap-1 text-[12.5px] text-muted">
        <p><span className="font-medium text-ink-2">{t('illustrative')}</span>{' · '}{t('scaleNote')}</p>
        <p>{t('attribution')}{' · '}<Link href="/metrics#core-competencies" className="link">{t('explainerLink')}</Link></p>
      </div>
    </div>
  );
}

/** UX rule 5: demand is one input — effort and transferability sit next to it. */
export function BeforeYouDecide({ instrument, layout = 'wide' }: { instrument: Instrument; layout?: 'wide' | 'stack' }) {
  const t = useTranslations('InstrumentPage');
  const type: ActiveInstrumentType = instrument.type;
  return (
    <div className={cn('grid gap-6', layout === 'wide' && 'md:grid-cols-3 md:gap-8')}>
      <div>
        <p className="kicker">{t(`effortLabel.${type}`)}</p>
        <p className="mt-1.5 font-serif text-[24px] leading-tight">{t(`effort.${instrument.learning_effort}`)}</p>
        <Scale steps={EFFORT} value={instrument.learning_effort} label={v => t(`effortShort.${v}`)} />
        <p className="mt-3 text-sm text-ink-2">{t(`effortBody.${type}.${instrument.learning_effort}`)}</p>
      </div>
      <div>
        <p className="kicker">{t('transferLabel')}</p>
        <p className="mt-1.5 font-serif text-[24px] leading-tight">{t(`transfer.${instrument.transferability}`)}</p>
        <Scale steps={TRANSFER} value={instrument.transferability} label={v => t(`transferShort.${v}`)} />
        <p className="mt-3 text-sm text-ink-2">{t(`transferBody.${instrument.transferability}`)}</p>
      </div>
      <Notice tone="signal" title={t('demandIsOneInput')} className={cn(layout === 'wide' && 'self-start')}>
        {t('demandIsOneInputBody')}
      </Notice>
    </div>
  );
}

/** Where every number on the page comes from (FR-D1, FR-D5). */
export function Provenance({ detail, metricKey }: { detail: InstrumentDetail; metricKey: MetricKey }) {
  const t = useTranslations('InstrumentPage');
  const ts = useTranslations('Sources');
  const tm = useTranslations('Metrics');
  const readings = Object.values(detail.readings).filter((r): r is MetricReading => Boolean(r));
  const sources = [...new Map(readings.map(r => [r.source_id, r])).values()];
  const count = detail.readings.ad_count;
  const updated = readings[0]?.updated_at;
  return (
    <footer aria-labelledby="provenance-h" className="mt-16 border-t-2 border-rule-strong pt-4">
      <h2 id="provenance-h" className="kicker text-ink">{t('provenance')}</h2>
      <dl className="mt-4 grid gap-6 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="kicker">{t('provSources')}</dt>
          <dd className="mt-2 flex flex-col gap-2">
            {sources.map(r => (
              <span key={r.source_id} className="flex flex-col gap-0.5">
                <SourceBadge kind={r.source} />
                <span className="text-ink-2">{ts(`names.${r.source_id}`)}</span>
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt className="kicker">{t('provUpdated')}</dt>
          <dd className="mt-2 text-ink-2">{updated ? formatDate(updated, { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</dd>
          <dd className="mt-1 text-muted">{t('provTracking', { date: formatDate(detail.snapshot.instrument.tracking_since, { month: 'long', year: 'numeric' }) })}</dd>
        </div>
        <div>
          <dt className="kicker">{t('provSample')}</dt>
          <dd className="num mt-2 text-ink-2">{count ? t('provSampleValue', { n: formatCount(count.sample_n), days: count.window.days }) : '—'}</dd>
          <dd className="mt-1 text-muted">{t('provThreshold', { min: count?.min_sample ?? 30 })}</dd>
        </div>
        <div>
          <dt className="kicker">{t('provMore')}</dt>
          <dd className="mt-2 flex flex-col gap-1.5">
            <Link href={`/metrics/${metricKey}`} className="link">{t('provMetricLink', { metric: tm(`${metricKey}.label`) })}</Link>
            <Link href="/metrics" className="link">{t('provAllMetrics')}</Link>
            <Link href="/sources" className="link">{t('provSourcesLink')}</Link>
          </dd>
        </div>
      </dl>
      <p className="mt-6 max-w-3xl text-[12.5px] text-muted">{ts('illustrativeLong')}</p>
    </footer>
  );
}
