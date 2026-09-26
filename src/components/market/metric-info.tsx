'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { METRICS, metricSource } from '@/lib/metrics/registry';
import { demandShare } from '@/lib/metrics/demand';
import { formatCount, formatShare } from '@/lib/market/format';
import { formatDate } from '@/lib/time';
import type { ActiveInstrumentType, FilterSpec, MetricKey, MetricReading } from '@/lib/market/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay';
import { cn } from '@/lib/utils';
import { SourceBadge } from './source-badge';
import { FilterReadback } from './filter-readback';

/** Everything that explains one number, one click away (FR-D2, UX principle 1). */
export function MetricDefinition({ metric, type, reading, filter, subject, compact = false }: {
  metric: MetricKey;
  type: ActiveInstrumentType;
  reading?: MetricReading;
  filter?: FilterSpec;
  /** The instrument this reading belongs to; omit for column heads / section headers. */
  subject?: string;
  compact?: boolean;
}) {
  const t = useTranslations('Metrics');
  const ts = useTranslations('Sources');
  const def = METRICS[metric];
  const source = reading?.source ?? metricSource(metric, type);
  const rows: Array<[string, React.ReactNode]> = [
    [t('fields.unit'), t(`${metric}.unit`)],
    [t('fields.denominator'), t(`${metric}.denominator`)],
  ];
  if (reading) {
    rows.push([t('fields.window'), t('windowValue', { start: formatDate(reading.window.start), end: formatDate(reading.window.end), days: reading.window.days })]);
  } else {
    rows.push([t('fields.window'), t('windowValue', { start: '…', end: '…', days: def.window_days })]);
  }
  if (filter) rows.push([t('fields.geography'), <FilterReadback key="f" filter={filter} />]);
  rows.push([t('fields.source'), <span key="s" className="inline-flex flex-col gap-1"><SourceBadge kind={source} />{reading ? <span className="text-muted">{ts(`names.${reading.source_id}`)}</span> : null}</span>]);
  if (reading) {
    rows.push([t('fields.updated'), formatDate(reading.updated_at, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })]);
    rows.push([t('fields.sample'), t('sampleValue', { n: formatCount(reading.sample_n), min: reading.min_sample })]);
  }
  rows.push([t('fields.method'), t(`${metric}.method`)]);
  if (t.has(`${metric}.caveat`)) rows.push([t('fields.caveat'), t(`${metric}.caveat`)]);
  // Demand is a raw count; its share of all ads stays one line away (GLOSSARY §3).
  // A figure is only stated when it's named; otherwise the generic line.
  const share = metric === 'ad_count' ? demandShare(reading, subject) : null;
  const shareLine = metric === 'ad_count'
    ? share
      ? t('ad_count.shareLine', { name: share.name, share: formatShare(share.share), den: formatCount(share.denominator) })
      : t('ad_count.shareLineGeneric')
    : null;
  const ignores = def.ignores.map(f => t(f === 'seniority' ? 'ignoresSeniority' : f === 'work_rights' ? 'ignoresWorkRights' : 'ignoresWorkMode'));
  return (
    <div className="text-[13px] leading-relaxed">
      <p className="font-serif text-[19px] leading-snug text-ink">{t(`${metric}.label`)}</p>
      <p className="mt-1 text-ink-2">{t(`${metric}.definition`)}</p>
      {shareLine ? <p className="mt-1.5 text-muted">{shareLine}</p> : null}
      {ignores.length ? <p className="mt-1.5 text-muted">{ignores.join(' ')}</p> : null}
      <dl className={cn('mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-rule pt-3', compact && 'gap-y-1.5')}>
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="kicker pt-0.5">{k}</dt>
            <dd className="min-w-0 text-ink-2">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function MetricInfo({ metric, type, reading, filter, subject, className }: {
  metric: MetricKey;
  type: ActiveInstrumentType;
  reading?: MetricReading;
  filter?: FilterSpec;
  /** Instrument name when the popover belongs to one instrument's figure. */
  subject?: string;
  className?: string;
}) {
  const t = useTranslations('Metrics');
  return (
    <Popover>
      <PopoverTrigger
        className={cn('inline-grid size-5 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink data-[state=open]:bg-ink data-[state=open]:text-paper', className)}
        aria-label={t('info', { metric: t(`${metric}.label`) })}
      >
        <Info className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-[min(400px,calc(100vw-24px))]">
        <MetricDefinition metric={metric} type={type} reading={reading} filter={filter} subject={subject} compact />
        <Link href={`/metrics/${metric}`} className="link mt-3 inline-block text-[13px]">{t('fullDefinition')}</Link>
      </PopoverContent>
    </Popover>
  );
}

/** Label with its info button — use for every column head / figure label. */
export function MetricLabel({ metric, type, reading, filter, subject, short = false, column = false, className }: {
  metric: MetricKey;
  type: ActiveInstrumentType;
  reading?: MetricReading;
  filter?: FilterSpec;
  /** Instrument name when the label belongs to one instrument's figure. */
  subject?: string;
  short?: boolean;
  /** Table column head: uses the metric's `column` wording when it has one (e.g. Demand → "Job ads"). */
  column?: boolean;
  className?: string;
}) {
  const t = useTranslations('Metrics');
  const key = column && t.has(`${metric}.column`) ? 'column' : short ? 'short' : 'label';
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="kicker">{t(`${metric}.${key}`)}</span>
      <MetricInfo metric={metric} type={type} reading={reading} filter={filter} subject={subject} />
    </span>
  );
}
