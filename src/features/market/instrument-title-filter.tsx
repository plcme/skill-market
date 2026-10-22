'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { titleFilterLabel, type PlacesCopy, type TitleFilterCopy } from '@/lib/filters/spec';
import type { FilterSpec } from '@/lib/market/types';
import { FilterBar } from '@/components/market/filter-builder';
import { cn } from '@/lib/utils';

// Detail-page title "SQL in [All Australia · Entry-level ▾]" (GLOSSARY §2): the
// part after the name reads the page's whole filter (`?f=`) as a sentence and
// opens the same Filter sheet as the board's Filter button. There is no other
// filter control on the detail page.

const WHERE = 'font-serif text-[22px] leading-tight tracking-normal text-muted sm:text-[26px]';

export function useTitleFilterLabel(filter: FilterSpec): string {
  const tp = useTranslations('InstrumentPage.places');
  const t = useTranslations('InstrumentPage.titleFilter');
  const copy: TitleFilterCopy = {
    places: tp.raw('label') as PlacesCopy,
    separator: t('separator'),
    seniority: t.raw('seniority') as TitleFilterCopy['seniority'],
    workRights: t('workRights'),
    workModes: t.raw('workModes') as TitleFilterCopy['workModes'],
  };
  return titleFilterLabel(filter, copy);
}

/** Server-safe stand-in while the title filter hydrates (it reads `useSearchParams`). */
export function TitleFilterStatic({ filter }: { filter: FilterSpec }) {
  const t = useTranslations('InstrumentPage.places');
  return <span className={WHERE}>{t('in')} <span className="text-ink">{useTitleFilterLabel(filter)}</span></span>;
}

/** " in [filter sentence ▾]" after the instrument name; opens the Filter sheet and writes `?f=`. */
export function TitleFilter() {
  const tp = useTranslations('InstrumentPage.places');
  const t = useTranslations('InstrumentPage.titleFilter');
  return (
    <FilterBar
      trigger={({ current, pending }) => <TitleFilterButton filter={current} pending={pending} inWord={tp('in')} buttonLabel={sentence => t('button', { filter: sentence })} />}
    />
  );
}

function TitleFilterButton({ filter, pending, inWord, buttonLabel, ...rest }: {
  filter: FilterSpec;
  pending: boolean;
  inWord: string;
  buttonLabel: (sentence: string) => string;
} & React.ComponentProps<'button'>) {
  const label = useTitleFilterLabel(filter);
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
