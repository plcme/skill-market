'use client';

import { useTranslations } from 'next-intl';
import { Scale } from 'lucide-react';
import { cloneFilter, DEFAULT_FILTER } from '@/lib/filters/spec';
import { formatCount } from '@/lib/market/format';
import type { FilterSpec, MetricReading } from '@/lib/market/types';
import { WORK_MODES } from '@/lib/market/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUrlFilter } from './use-url-state';

/** FR-D4: below the sample threshold we say so, draw nothing, and offer to widen. */
export function SampleWarning({ reading, filter, onWiden, className }: {
  reading: MetricReading;
  filter: FilterSpec;
  onWiden?: (f: FilterSpec) => void;
  className?: string;
}) {
  const t = useTranslations('Sample');
  const [, setUrlFilter] = useUrlFilter();
  const widen = onWiden ?? setUrlFilter;
  const options: Array<{ key: string; next: FilterSpec }> = [];
  if (filter.seniority !== 'all') options.push({ key: 'widenLevel', next: { ...cloneFilter(filter), seniority: 'all' } });
  if (filter.work_rights !== 'all') options.push({ key: 'widenRights', next: { ...cloneFilter(filter), work_rights: 'all' } });
  if (filter.rules.some(r => r.work_modes.length < WORK_MODES.length)) options.push({ key: 'widenMode', next: { ...cloneFilter(filter), rules: filter.rules.map(r => ({ ...r, work_modes: [...WORK_MODES] })) } });
  if (!(filter.rules.length === 1 && filter.rules[0].location_ids.includes('au'))) options.push({ key: 'widenPlace', next: { ...cloneFilter(filter), rules: [{ work_modes: [...(filter.rules[0]?.work_modes ?? WORK_MODES)], location_ids: ['au'] }] } });
  if (!options.length) options.push({ key: 'widenPlace', next: cloneFilter(DEFAULT_FILTER) });
  return (
    <div role="status" className={cn('flex flex-col gap-3 rounded-md border border-dashed border-warn/50 bg-warn-soft/60 px-5 py-5', className)}>
      <div className="flex items-start gap-3">
        <Scale className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
        <div>
          <p className="font-serif text-lg leading-snug">{t('title')}</p>
          <p className="mt-1 text-sm text-ink-2">{t('body', { n: formatCount(reading.sample_n), min: reading.min_sample })}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-8">
        <span className="text-[13px] text-muted">{t('suggestion')}</span>
        {options.map(o => (
          <Button key={o.key} variant="subtle" size="sm" onClick={() => widen(o.next)}>{t(o.key)}</Button>
        ))}
      </div>
    </div>
  );
}
