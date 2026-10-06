'use client';

import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { formatCount } from '@/lib/market/format';
import { formatDate } from '@/lib/time';
import { BREAKDOWN_DIMENSIONS, type ActiveInstrumentType, type Breakdown, type BreakdownDimension, type FilterSpec, type MetricReading } from '@/lib/market/types';
import { Segmented } from '@/components/ui/form';
import { Badge, Card, SectionHeader } from '@/components/ui/primitives';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay';
import { BreakdownChart } from '@/components/market/breakdown-chart';
import { MetricLabel } from '@/components/market/metric-info';
import { SourceBadge } from '@/components/market/source-badge';
import { useSetParams } from '@/components/market/use-url-state';
import { cn } from '@/lib/utils';

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
 * "Breakdown" section under the main chart on skill, role and industry pages:
 * the selected measure split by one dimension at a time (`?by=`). Additive
 * job ads stack; median salary (roles) draws one line per bucket; any other
 * measure shows job ads and says so.
 */
export function BreakdownSection({ breakdown, type, filter, subject, reading }: {
  breakdown: Breakdown;
  type: ActiveInstrumentType;
  filter: FilterSpec;
  subject: string;
  /** The unbroken reading of the measure being broken down (for its definition popover). */
  reading?: MetricReading;
}) {
  const t = useTranslations('Breakdown');
  const tm = useTranslations('Metrics');
  const { set, pending } = useSetParams();
  const by = breakdown.by;
  const dim = t(`dimsLower.${by}`);
  const caption = breakdown.kind === 'stack' ? t('captionStack', { dimension: dim }) : t('captionLines', { dimension: dim });
  const latest = breakdown.buckets[0]?.latest;
  // Experience filtered to graduate ads: name what is actually inside, not the 0–2 yrs band.
  const graduateOnly = by === 'experience' && filter.seniority === 'graduate';
  return (
    <section id="breakdown" aria-labelledby="breakdown-h" className="mt-12 scroll-mt-24">
      <SectionHeader id="breakdown-h" kicker={t('kicker')} title={t('title')} />
      <div className={cn('mb-4 flex flex-wrap items-center gap-x-3 gap-y-2', pending && 'opacity-70')}>
        <span className="kicker">{t('dimensionLabel')}</span>
        <Segmented<BreakdownDimension>
          label={t('dimensionLabel')}
          value={by}
          onValueChange={v => set({ by: v === 'experience' ? null : v })}
          options={BREAKDOWN_DIMENSIONS.map(d => ({ value: d, label: t(`dims.${d}`) }))}
        />
      </div>
      <Card className="p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <MetricLabel metric={breakdown.measure} type={type} reading={reading} filter={filter} subject={subject} />
          {breakdown.estimated && by !== 'mode' ? (
            <span className="inline-flex items-center gap-1">
              <Badge tone="warn">{t('estimated')}</Badge>
              <MethodInfo by={by} />
            </span>
          ) : null}
        </div>
        <div className="mb-4 flex flex-col gap-1 text-[13px] text-ink-2" aria-live="polite">
          {breakdown.measure !== breakdown.requested ? <p>{t('fallback', { metric: tm(`${breakdown.requested}.label`) })}</p> : null}
          {breakdown.filtered_to ? (
            <p>{graduateOnly ? t('filteredToGraduate') : t('filteredTo', { buckets: breakdown.filtered_to.map(k => t(`buckets.${k}`)).join(', ') })}</p>
          ) : null}
          {breakdown.kind === 'stack' ? <p className="text-muted">{t('stackNote')}</p> : null}
          {breakdown.salary_stated ? (
            <p className="text-muted">{t('salaryStated', { with: formatCount(breakdown.salary_stated.with_salary), total: formatCount(breakdown.salary_stated.total) })}</p>
          ) : null}
          {breakdown.insufficient.length ? (
            <p className="text-warn">{t(breakdown.kind === 'stack' ? 'thin' : 'gaps', { buckets: breakdown.insufficient.map(k => t(`buckets.${k}`)).join(', '), min: breakdown.buckets[0]?.latest.min_sample ?? 30 })}</p>
          ) : null}
        </div>
        <BreakdownChart key={`${by}-${breakdown.kind}`} breakdown={breakdown} caption={caption} graduateOnly={graduateOnly} />
        {latest ? (
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule pt-3 text-[12.5px] text-muted">
            <SourceBadge kind={latest.source} />
            <span>{tm('windowValue', { start: formatDate(latest.window.start), end: formatDate(latest.window.end), days: latest.window.days })}</span>
            <span>{t('illustrative')}</span>
          </p>
        ) : null}
      </Card>
    </section>
  );
}
