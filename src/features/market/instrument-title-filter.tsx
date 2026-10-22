'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { titleFilterLabel, type PlacesCopy, type TitleFilterCopy } from '@/lib/filters/spec';
import type { BreakdownDimension, FilterSpec } from '@/lib/market/types';
import { FilterBar, type ChartControls } from '@/components/market/filter-builder';
import { cn } from '@/lib/utils';

// Detail-page title "SQL in [All Australia · Entry-level · by experience ▾]"
// (GLOSSARY §2): the part after the name reads the page's whole filter (`?f=`)
// and the chart split as a sentence, and opens the same Filter sheet as the
// board's Filter button, with the chart's Y axis and Split by added. There is
// no other filter or split control on the detail page.

const WHERE = 'font-serif text-[22px] leading-tight tracking-normal text-muted sm:text-[26px]';

export function useTitleFilterLabel(filter: FilterSpec, split: BreakdownDimension | null = null): string {
  const tp = useTranslations('InstrumentPage.places');
  const t = useTranslations('InstrumentPage.titleFilter');
  const tb = useTranslations('Breakdown');
  const copy: TitleFilterCopy = {
    places: tp.raw('label') as PlacesCopy,
    separator: t('separator'),
    seniority: t.raw('seniority') as TitleFilterCopy['seniority'],
    workRights: t('workRights'),
    workModes: t.raw('workModes') as TitleFilterCopy['workModes'],
    workModesInline: t.raw('workModesInline') as TitleFilterCopy['workModesInline'],
    placesWithModes: t.raw('placesWithModes') as string,
  };
  return titleFilterLabel(filter, copy, undefined, split ? t('by', { dimension: tb(`dimsLower.${split}`) }) : undefined);
}

/** Server-safe stand-in while the title filter hydrates (it reads `useSearchParams`). */
export function TitleFilterStatic({ filter, split = null }: { filter: FilterSpec; split?: BreakdownDimension | null }) {
  const t = useTranslations('InstrumentPage.places');
  return <span className={WHERE}>{t('in')} <span className="text-ink">{useTitleFilterLabel(filter, split)}</span></span>;
}

/**
 * " in [filter sentence ▾]" after the instrument name; opens the Filter sheet
 * and writes `?f=` — plus `metric` and `by` when `chart` is given.
 * `split` is the split the chart draws (null = none).
 */
export function TitleFilter({ split = null, chart }: { split?: BreakdownDimension | null; chart?: ChartControls }) {
  const tp = useTranslations('InstrumentPage.places');
  const t = useTranslations('InstrumentPage.titleFilter');
  return (
    <FilterBar
      chartControls={chart}
      trigger={({ current, pending }) => <TitleFilterButton filter={current} split={split} pending={pending} inWord={tp('in')} buttonLabel={sentence => t('button', { filter: sentence })} />}
    />
  );
}

function TitleFilterButton({ filter, split, pending, inWord, buttonLabel, ...rest }: {
  filter: FilterSpec;
  split: BreakdownDimension | null;
  pending: boolean;
  inWord: string;
  buttonLabel: (sentence: string) => string;
} & React.ComponentProps<'button'>) {
  const label = useTitleFilterLabel(filter, split);
  return (
    <button
      type="button"
      {...rest}
      aria-label={buttonLabel(`${inWord} ${label}`)}
      className={cn(WHERE, 'group inline text-left transition-colors', pending && 'opacity-70')}
    >
      {inWord}{' '}
      <span className="text-ink underline decoration-muted decoration-dashed decoration-1 underline-offset-[6px] group-hover:decoration-ink">{label}</span>
      <ChevronDown className="ml-1.5 inline size-4 align-middle text-muted" aria-hidden />
    </button>
  );
}
