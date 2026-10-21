'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, X } from 'lucide-react';
import {
  clearScopeCondition, fromSimpleFilter, isAllAustralia, placesLabel, resetPlaces, scopeConditions, toSimpleFilter,
  type PlacesCopy, type ScopeCondition, type SimpleFilter,
} from '@/lib/filters/spec';
import type { FilterSpec } from '@/lib/market/types';
import { AdaptivePopover } from '@/components/ui/adaptive-popover';
import { Button } from '@/components/ui/button';
import { FilterReadback } from '@/components/market/filter-readback';
import { PlacesField, RemoteAnywhereSwitch } from '@/components/market/filter-builder';
import { useUrlFilter } from '@/components/market/use-url-state';
import { cn } from '@/lib/utils';

// Detail-page title "SQL in [All Australia ▾]" (GLOSSARY §2, 2026-10-17):
// places are part of the page's filter (`?f=`), chosen from the title.

/** The title's places button; scope chips hand focus to it when the last chip goes. */
const PLACES_TRIGGER_ID = 'instrument-places-trigger';

const WHERE = 'font-serif text-[22px] leading-tight tracking-normal text-muted sm:text-[26px]';

export function usePlacesLabel(filter: FilterSpec): string {
  const t = useTranslations('InstrumentPage.places');
  return placesLabel(filter, t.raw('label') as PlacesCopy);
}

/** Server-safe stand-in while the picker hydrates. */
export function PlacesInTitleStatic({ filter }: { filter: FilterSpec }) {
  const t = useTranslations('InstrumentPage.places');
  return <span className={WHERE}>{t('in')} <span className="text-ink">{usePlacesLabel(filter)}</span></span>;
}

/** " in [places ▾]" after the instrument name; opens the Places popover (bottom sheet on phones). */
export function PlacesInTitle() {
  const t = useTranslations('InstrumentPage.places');
  const [filter, setFilter, pending] = useUrlFilter();
  const [open, setOpen] = useState(false);
  const label = usePlacesLabel(filter);
  const simple = toSimpleFilter(filter);
  // Removing the last place means "anywhere": back to all of Australia.
  const setSimple = (next: SimpleFilter) => setFilter(fromSimpleFilter(next.places.length ? next : { ...next, places: ['au'] }, filter));
  return (
    <span className={WHERE}>
      {t('in')}{' '}
      <AdaptivePopover
        open={open}
        onOpenChange={setOpen}
        title={t('title')}
        closeLabel={t('close')}
        trigger={(
          <button
            id={PLACES_TRIGGER_ID}
            type="button"
            aria-label={t('button', { places: label })}
            className={cn('inline-block max-w-full border-b border-dashed border-muted text-left text-ink transition-colors hover:border-ink', pending && 'opacity-70')}
          >
            {label}
            <ChevronDown className="ml-1.5 inline size-4 align-middle text-muted" aria-hidden />
          </button>
        )}
      >
        <div className="flex flex-col gap-4 font-sans text-sm tracking-normal">
          {simple ? (
            <>
              {/* All of Australia shows as no chips, just "Add a place" (picking one replaces it). */}
              <PlacesField simple={simple.places.length === 1 && simple.places[0] === 'au' ? { ...simple, places: [] } : simple} onChange={setSimple} compact />
              <RemoteAnywhereSwitch simple={simple} onChange={setSimple} compact />
            </>
          ) : (
            <p className="text-[13px] text-ink-2"><FilterReadback filter={filter} /></p>
          )}
          {!isAllAustralia(filter) ? (
            <div>
              <Button variant="link" size="sm" onClick={() => setFilter(resetPlaces(filter))}>{t('reset')}</Button>
            </div>
          ) : null}
        </div>
      </AdaptivePopover>
    </span>
  );
}

function useConditionLabel() {
  const t = useTranslations('InstrumentPage.scope');
  const tf = useTranslations('Filter');
  return (filter: FilterSpec, c: ScopeCondition): string => {
    if (c === 'seniority') return t(`seniority.${filter.seniority === 'graduate' ? 'graduate' : 'entry'}`);
    if (c === 'work_rights') return t('workRights');
    const modes = toSimpleFilter(filter)?.modes ?? [];
    return t('workModes', { modes: modes.map(m => tf(`modes.${m}`)).join(', ') });
  };
}

/** Seniority, work rights and work modes from `?f=` (e.g. from a board link), each removable. Nothing when unset. */
export function ScopeChips({ className }: { className?: string }) {
  const t = useTranslations('InstrumentPage.scope');
  const [filter, setFilter, pending] = useUrlFilter();
  const labelOf = useConditionLabel();
  const conditions = scopeConditions(filter);
  const removeButtons = useRef(new Map<ScopeCondition, HTMLButtonElement>());
  // The removed chip unmounts once the URL updates: move focus first, to the next chip or the places button.
  const remove = (c: ScopeCondition) => {
    const next = conditions[conditions.indexOf(c) + 1];
    const target = next ? removeButtons.current.get(next) : document.getElementById(PLACES_TRIGGER_ID);
    target?.focus();
    setFilter(clearScopeCondition(filter, c));
  };
  if (!conditions.length) return null;
  return (
    <ul aria-label={t('label')} className={cn('flex flex-wrap gap-2', pending && 'opacity-70', className)}>
      {conditions.map(c => {
        const label = labelOf(filter, c);
        return (
          <li key={c} className="inline-flex h-8 items-center gap-0.5 rounded-full border border-rule bg-surface pl-3 pr-1 text-[13px] text-ink">
            {label}
            <button
              ref={el => { if (el) removeButtons.current.set(c, el); else removeButtons.current.delete(c); }}
              type="button"
              onClick={() => remove(c)}
              aria-label={t('remove', { condition: label })} className="grid size-6 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink">
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
