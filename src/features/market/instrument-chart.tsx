'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronDown, Info } from 'lucide-react';
import { formatCount } from '@/lib/market/format';
import { formatDate } from '@/lib/time';
import { type ActiveInstrumentType, type Breakdown, type BreakdownDimension, type FilterSpec, type MetricKey, type MetricReading } from '@/lib/market/types';
import { AdaptivePopover, MenuOption } from '@/components/ui/adaptive-popover';
import { Badge } from '@/components/ui/primitives';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay';
import { BreakdownChart } from '@/components/market/breakdown-chart';
import { SampleWarning } from '@/components/market/sample-warning';
import { SourceBadge } from '@/components/market/source-badge';
import { useSetParams } from '@/components/market/use-url-state';
import { cn } from '@/lib/utils';
import { metricParam, nextByParam, type ChartPlan } from './logic';

/** Method note for dimensions read from ad text (experience, work rights). */
function MethodInfo({ by }: { by: Exclude<BreakdownDimension, 'mode'> }) {
  const t = useTranslations('Breakdown');
  const dim = t(`dimsLower.${by}`);
  return (
    <Popover>
      <PopoverTrigger
        className="inline-grid size-5 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink data-[state=open]:bg-ink data-[state=open]:text-paper"
        aria-label={t('methodLabel', { dimension: dim })}
      >
        <Info className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-[min(380px,calc(100vw-24px))] text-[13px] leading-relaxed">
        <p className="font-serif text-[19px] leading-snug text-ink">{t('methodTitle', { dimension: dim })}</p>
        <p className="mt-1.5 text-ink-2">{t(`method.${by}`)}</p>
      </PopoverContent>
    </Popover>
  );
}

/**
 * The detail page's one chart (GLOSSARY §2, 2026-10-22). Top left: the
 * measure as a plain dropdown ("Job ads ▾") over the chartable level
 * measures; top right: the range pills. The selected measure is the page's
 * one measure (`?metric=`): change measures chart Job ads with the compared
 * windows shaded (`chartPlanFor`). The split (`?by=`) is set only in the
 * title's Filter panel.
 */
export function InstrumentChart({ breakdown, plan, options, metric, defaultMetric, filter, reading }: {
  breakdown: Breakdown;
  plan: ChartPlan;
  /** Y axis options for this type, in menu order. */
  options: MetricKey[];
  /** The page's selected measure (`?metric=`, resolved). */
  metric: MetricKey;
  defaultMetric: MetricKey;
  type: ActiveInstrumentType;
  filter: FilterSpec;
  /** The unsplit reading of the charted series (sample check). */
  reading?: MetricReading;
}) {
  const t = useTranslations('Breakdown');
  const tm = useTranslations('Metrics');
  const params = useSearchParams();
  const { set, pending } = useSetParams();
  const [open, setOpen] = useState(false);
  const by = breakdown.by;
  const series = plan.series;
  const label = (m: MetricKey) => t(`measures.${m}`);
  const choose = (next: MetricKey) => {
    setOpen(false);
    if (next === metric) return;
    set({ metric: metricParam(next, defaultMetric), y: null, by: nextByParam(params.get('by'), filter, next) });
  };
  const latest = breakdown.buckets[0]?.latest;
  const caption = by
    ? t('captionBy', { measure: label(breakdown.measure), dimension: t(`dimsLower.${by}`) })
    : label(breakdown.measure);
  const unsplitThin = reading?.status === 'insufficient_sample';
  const isSalary = breakdown.measure === 'salary_median';

  const trigger = (
    <button
      type="button"
      className="inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-[4px] text-[15px] font-medium text-ink hover:text-ink-2"
      aria-label={t('measureButton', { measure: label(series) })}
    >
      <span className="truncate">{label(series)}</span>
      <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
    </button>
  );

  const headerStart = options.length > 1 ? (
    <AdaptivePopover open={open} onOpenChange={setOpen} title={t('measureMenu')} closeLabel={t('close')} trigger={trigger}>
      <div className="flex flex-col gap-2">
        {options.map(m => <MenuOption key={m} selected={m === series} title={label(m)} onSelect={() => choose(m)} />)}
      </div>
    </AdaptivePopover>
  ) : <span className="text-[15px] font-medium text-ink">{label(series)}</span>;

  const notes = breakdown.filtered_to || (!unsplitThin && breakdown.insufficient.length) ? (
    <div className="flex flex-col gap-1 text-[12.5px]" aria-live="polite">
      {breakdown.filtered_to ? (
        <p className="text-ink-2">{t('filteredTo', { buckets: breakdown.filtered_to.map(k => t(`short.${k}`)).join(', ') })}</p>
      ) : null}
      {!unsplitThin && breakdown.insufficient.length ? (
        <p className="text-warn">{t(breakdown.kind === 'stack' ? 'thin' : isSalary ? 'gaps' : 'gapsAds', { buckets: breakdown.insufficient.map(k => t(`short.${k}`)).join(', ') })}</p>
      ) : null}
    </div>
  ) : null;

  if (unsplitThin && reading) {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0">{headerStart}</div>
        <SampleWarning reading={reading} filter={filter} />
      </div>
    );
  }

  return (
    <div className={cn('min-w-0', pending && 'opacity-70 transition-opacity')}>
      <BreakdownChart
        key={`${metric}-${by ?? 'none'}-${breakdown.kind}`}
        breakdown={breakdown}
        caption={caption}
        initialRange={plan.range}
        compare={plan.compare}
        headerStart={headerStart}
        notes={notes}
        footer={latest ? (
          <>
            <SourceBadge kind={latest.source} />
            <span>{tm('windowValue', { start: formatDate(latest.window.start), end: formatDate(latest.window.end), days: latest.window.days })}</span>
            {breakdown.salary_stated ? (
              <span>{t('salaryStated', { with: formatCount(breakdown.salary_stated.with_salary), total: formatCount(breakdown.salary_stated.total) })}</span>
            ) : null}
            {breakdown.estimated && by && by !== 'mode' ? (
              <span className="inline-flex items-center gap-1">
                <Badge tone="warn">{t('estimated')}</Badge>
                <MethodInfo by={by} />
              </span>
            ) : null}
          </>
        ) : null}
      />
    </div>
  );
}
