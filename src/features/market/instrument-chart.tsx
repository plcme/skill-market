'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Info, Plus, X } from 'lucide-react';
import { formatCount } from '@/lib/market/format';
import { formatDate } from '@/lib/time';
import { CHART_MEASURE_METRIC } from '@/lib/metrics/registry';
import {
  BREAKDOWN_BUCKETS, BREAKDOWN_DIMENSIONS, type ActiveInstrumentType, type Breakdown, type BreakdownDimension, type ChartMeasure, type FilterSpec, type MetricReading,
} from '@/lib/market/types';
import { AdaptivePopover, MenuOption } from '@/components/ui/adaptive-popover';
import { Badge } from '@/components/ui/primitives';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay';
import { BreakdownChart } from '@/components/market/breakdown-chart';
import { MetricInfo } from '@/components/market/metric-info';
import { SampleWarning } from '@/components/market/sample-warning';
import { SourceBadge } from '@/components/market/source-badge';
import { useSetParams } from '@/components/market/use-url-state';
import { cn } from '@/lib/utils';
import { breakdownParam, chartYParam, fixedSplitDimensions } from './logic';

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

const PILL = 'inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium';

/**
 * The detail page's one chart (GLOSSARY §2, 2026-10-17): a Y axis pill
 * (`?y=ads|salary`) and a Split by slot (`?by=experience|rights|mode|none`)
 * above the chart, its legend, and one source line. Job ads split → stacked
 * bands; Median salary split → one line per bucket; no split → one ink series.
 */
export function InstrumentChart({ breakdown, y, measures, type, filter, subject, reading }: {
  breakdown: Breakdown;
  y: ChartMeasure;
  /** Y axis options valid for this type; a single option renders as a static label. */
  measures: ChartMeasure[];
  type: ActiveInstrumentType;
  filter: FilterSpec;
  subject: string;
  /** The unsplit reading of the chart's measure (definition popover and sample check). */
  reading?: MetricReading;
}) {
  const t = useTranslations('Breakdown');
  const tm = useTranslations('Metrics');
  const { set, pending } = useSetParams();
  const [menu, setMenu] = useState<'y' | 'split' | null>(null);
  const toggle = (which: 'y' | 'split') => (open: boolean) => setMenu(open ? which : null);
  const by = breakdown.by;
  const metric = CHART_MEASURE_METRIC[y];
  const measureLabel = t(`measures.${y}`);
  const chooseY = (next: ChartMeasure) => { setMenu(null); if (next !== y) set({ y: chartYParam(next) }); };
  const chooseBy = (next: BreakdownDimension | null) => { setMenu(null); if (next !== by) set({ by: breakdownParam(next) }); };
  const splitTrigger = useRef<HTMLButtonElement>(null);
  // The clear button unmounts once the URL updates: hand focus to the (stable) Split by trigger first.
  const clearSplit = () => { splitTrigger.current?.focus(); chooseBy(null); };
  const latest = breakdown.buckets[0]?.latest;
  // Splits the filter has fixed to one bucket are offered but disabled (the route already draws them as no split).
  const fixed = fixedSplitDimensions(filter);
  const caption = by
    ? t(breakdown.kind === 'stack' ? 'captionStack' : 'captionLines', { dimension: t(`dimsLower.${by}`) })
    : t(breakdown.kind === 'stack' ? 'captionSingleStack' : 'captionSingleLines');
  const unsplitThin = reading?.status === 'insufficient_sample';

  const splitMenu = (
    <div className="flex flex-col gap-2">
      {BREAKDOWN_DIMENSIONS.map(d => (
        <MenuOption
          key={d}
          selected={by === d}
          title={t(`dims.${d}`)}
          subtitle={fixed.includes(d) ? t('fixedByFilter') : BREAKDOWN_BUCKETS[d].map(k => t(`short.${k}`)).join(' · ')}
          disabled={fixed.includes(d)}
          onSelect={() => chooseBy(d)}
        />
      ))}
    </div>
  );

  return (
    <div className={cn('min-w-0', pending && 'opacity-70 transition-opacity')}>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="kicker">{t('yAxis')}</span>
          {measures.length > 1 ? (
            <AdaptivePopover
              open={menu === 'y'}
              onOpenChange={toggle('y')}
              title={t('yAxis')}
              closeLabel={t('close')}
              trigger={(
                <button type="button" className={cn(PILL, 'bg-ink text-paper hover:bg-ink-2')} aria-label={t('yAxisButton', { measure: measureLabel })}>
                  {measureLabel}
                  <ChevronDown className="size-3.5" aria-hidden />
                </button>
              )}
            >
              <div className="flex flex-col gap-2">
                {measures.map(m => <MenuOption key={m} selected={m === y} title={t(`measures.${m}`)} onSelect={() => chooseY(m)} />)}
              </div>
            </AdaptivePopover>
          ) : (
            <span className={cn(PILL, 'bg-ink text-paper')}>{measureLabel}</span>
          )}
          <MetricInfo metric={metric} type={type} reading={reading} filter={filter} subject={subject} />
        </div>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="kicker">{t('splitBy')}</span>
          {/* One stable trigger for both states, so focus survives a split change (WCAG 2.4.3). */}
          <span className="flex items-center">
            <AdaptivePopover
              open={menu === 'split'}
              onOpenChange={toggle('split')}
              title={t('splitBy')}
              closeLabel={t('close')}
              align="end"
              trigger={(
                <button
                  ref={splitTrigger}
                  type="button"
                  className={cn(
                    PILL,
                    by
                      ? 'rounded-r-none border border-r-0 border-accent bg-accent-soft pr-3 text-accent'
                      : 'gap-1.5 border border-dashed border-muted text-muted hover:border-ink hover:text-ink',
                  )}
                  aria-label={by ? t('splitButton', { dimension: t(`dims.${by}`) }) : t('splitNoneButton')}
                >
                  {by ? t(`dims.${by}`) : <><Plus className="size-3.5" aria-hidden />{t('none')}</>}
                </button>
              )}
            >
              {splitMenu}
            </AdaptivePopover>
            {by ? (
              // A 44px-wide segment of the chip, so its touch area never overlaps the trigger.
              <button
                type="button"
                onClick={clearSplit}
                aria-label={t('clearSplit')}
                className="grid h-10 w-11 place-items-center rounded-r-full border border-accent bg-accent-soft text-accent hover:bg-surface"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1 text-[12.5px]" aria-live="polite">
        {breakdown.filtered_to ? (
          <p className="text-ink-2">{t('filteredTo', { buckets: breakdown.filtered_to.map(k => t(`short.${k}`)).join(', ') })}</p>
        ) : null}
        {!unsplitThin && breakdown.insufficient.length ? (
          <p className="text-warn">{t(breakdown.kind === 'stack' ? 'thin' : 'gaps', { buckets: breakdown.insufficient.map(k => t(`short.${k}`)).join(', ') })}</p>
        ) : null}
      </div>

      <div className="mt-2">
        {unsplitThin && reading ? (
          <SampleWarning reading={reading} filter={filter} />
        ) : (
          <BreakdownChart
            key={`${by ?? 'none'}-${breakdown.kind}`}
            breakdown={breakdown}
            caption={caption}
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
        )}
      </div>
    </div>
  );
}
