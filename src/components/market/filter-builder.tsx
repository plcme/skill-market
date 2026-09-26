'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { Dialog, DialogTrigger, SheetContent, Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay';
import { Button } from '@/components/ui/button';
import { ChipToggleGroup, Input, Segmented } from '@/components/ui/form';
import { LOCATIONS, getLocation } from '@/lib/filters/locations';
import { activeConditionCount, cloneFilter, DEFAULT_FILTER, describeFilter, isDefaultFilter, MAX_RULES, normaliseFilter } from '@/lib/filters/spec';
import type { FilterRule, FilterSpec, Seniority, WorkMode, WorkRights } from '@/lib/market/types';
import { WORK_MODES } from '@/lib/market/types';
import { cn } from '@/lib/utils';
import { useFilterCopy } from './filter-readback';
import { useUrlFilter } from './use-url-state';

const INDENT = { country: 'pl-2', state: 'pl-5', city: 'pl-8', region: 'pl-11' } as const;

function PlacePicker({ selected, onAdd }: { selected: string[]; onAdd: (id: string) => void }) {
  const t = useTranslations('Filter');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return LOCATIONS.filter(l => !needle || l.name.toLowerCase().includes(needle) || l.short.toLowerCase().includes(needle));
  }, [q]);
  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) setQ(''); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 rounded-full border border-dashed border-rule px-2.5 text-muted hover:text-ink">
          <Plus aria-hidden />{t('addPlace')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(320px,calc(100vw-24px))] p-0">
        <div className="border-b border-rule p-2">
          <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchPlaces')} aria-label={t('searchPlaces')} className="h-9" />
        </div>
        <ul role="listbox" aria-label={t('places')} className="max-h-72 overflow-y-auto py-1">
          {matches.length === 0 ? <li className="px-3 py-2 text-sm text-muted">{t('noPlaces')}</li> : null}
          {matches.map(l => {
            const isSel = selected.includes(l.id);
            return (
              <li key={l.id} role="option" aria-selected={isSel}>
                <button
                  type="button"
                  disabled={isSel}
                  onClick={() => { onAdd(l.id); setOpen(false); setQ(''); }}
                  className={cn('flex w-full items-center justify-between gap-3 py-1.5 pr-3 text-left text-sm hover:bg-sunken disabled:opacity-40', q ? 'pl-3' : INDENT[l.level])}
                >
                  <span className={cn(l.level === 'country' && 'font-medium')}>{l.name}</span>
                  <span className="kicker">{t(`levels.${l.level}`)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function RuleEditor({ rule, index, canRemove, onChange, onRemove }: {
  rule: FilterRule;
  index: number;
  canRemove: boolean;
  onChange: (r: FilterRule) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('Filter');
  return (
    <fieldset className="rounded-md border border-rule bg-paper/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <legend className="kicker">{t('ruleLabel', { n: index + 1 })}</legend>
        {canRemove ? (
          <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={t('removeRule', { n: index + 1 })}>
            <Trash2 aria-hidden />
          </Button>
        ) : null}
      </div>
      <p className="mb-2 mt-3 text-[13px] font-medium">{t('workMode')}</p>
      <ChipToggleGroup<WorkMode>
        label={t('workMode')}
        value={rule.work_modes}
        onValueChange={v => onChange({ ...rule, work_modes: v })}
        options={WORK_MODES.map(m => ({ value: m, label: t(`modes.${m}`) }))}
      />
      {rule.work_modes.length === 0 ? <p className="mt-1.5 text-[13px] text-down">{t('modeRequired')}</p> : null}
      <p className="mb-2 mt-4 text-[13px] font-medium">{t('places')}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {rule.location_ids.map(id => {
          const loc = getLocation(id);
          return (
            <span key={id} className="inline-flex h-7 items-center gap-1 rounded-full bg-ink pl-2.5 pr-1 text-[13px] text-paper">
              <MapPin className="size-3" aria-hidden />
              {loc?.name ?? id}
              <button type="button" onClick={() => onChange({ ...rule, location_ids: rule.location_ids.filter(x => x !== id) })} aria-label={t('removePlace', { place: loc?.name ?? id })} className="grid size-5 place-items-center rounded-full hover:bg-paper/20">
                <X className="size-3" aria-hidden />
              </button>
            </span>
          );
        })}
        <PlacePicker selected={rule.location_ids} onAdd={id => onChange({ ...rule, location_ids: [...rule.location_ids, id] })} />
      </div>
      {rule.location_ids.length === 0 ? <p className="mt-1.5 text-[13px] text-down">{t('placeRequired')}</p> : null}
    </fieldset>
  );
}

/** Rule-based filter editor (FR-F1–F5). Single rule by default; more are opt-in. */
export function FilterEditor({ value, onChange }: { value: FilterSpec; onChange: (f: FilterSpec) => void }) {
  const t = useTranslations('Filter');
  const copy = useFilterCopy();
  const setRule = (i: number, r: FilterRule) => onChange({ ...value, rules: value.rules.map((x, k) => (k === i ? r : x)) });
  const valid = value.rules.every(r => r.work_modes.length && r.location_ids.length);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {value.rules.map((rule, i) => (
          <RuleEditor key={i} rule={rule} index={i} canRemove={value.rules.length > 1} onChange={r => setRule(i, r)} onRemove={() => onChange({ ...value, rules: value.rules.filter((_, k) => k !== i) })} />
        ))}
        {value.rules.length > 1 ? <p className="text-[13px] text-muted">{t('unionNote')}</p> : null}
        {value.rules.length < MAX_RULES ? (
          <button type="button" onClick={() => onChange({ ...value, rules: [...value.rules, { work_modes: ['remote'], location_ids: ['au'] }] })} className="flex items-start gap-2 rounded-md border border-dashed border-rule px-4 py-3 text-left text-sm hover:border-ink/40 hover:bg-surface">
            <Plus className="mt-0.5 size-4 text-muted" aria-hidden />
            <span>
              <span className="font-medium">{t('addRule')}</span>
              <span className="block text-[13px] text-muted">{t('addRuleHint')}</span>
            </span>
          </button>
        ) : <p className="text-[13px] text-muted">{t('maxRules', { max: MAX_RULES })}</p>}
      </div>
      <div className="grid gap-5 border-t border-rule pt-5">
        <div>
          <p className="mb-2 text-[13px] font-medium">{t('seniority')}</p>
          <Segmented<Seniority> label={t('seniority')} value={value.seniority} onValueChange={v => onChange({ ...value, seniority: v })} options={(['all', 'entry', 'graduate'] as const).map(v => ({ value: v, label: t(`seniorityOptions.${v}`) }))} />
          <p className="mt-1.5 text-[13px] text-muted">{t('seniorityHint')}</p>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-medium">{t('workRights')}</p>
          <Segmented<WorkRights> label={t('workRights')} value={value.work_rights} onValueChange={v => onChange({ ...value, work_rights: v })} options={(['all', 'no_pr_required'] as const).map(v => ({ value: v, label: t(`workRightsOptions.${v}`) }))} />
          <p className="mt-1.5 text-[13px] text-muted">{t('workRightsHint')}</p>
        </div>
      </div>
      <div aria-live="polite" className="rounded-md bg-signal-soft px-4 py-3 text-sm">
        <p className="kicker mb-1">{t('currentlyShowing')}</p>
        <p className="text-ink">{valid ? describeFilter(value, copy) : '…'}</p>
      </div>
    </div>
  );
}

/**
 * Readback + edit sheet. Without `onChange` it reads and writes the `?f=` param.
 * `variant="button"` renders only a compact Filter button (with a badge counting
 * active conditions); the caller keeps the readback visible elsewhere (PRD §10.1).
 */
export function FilterBar({ value, onChange, className, compact = false, variant = 'bar' }: {
  value?: FilterSpec;
  onChange?: (f: FilterSpec) => void;
  className?: string;
  compact?: boolean;
  variant?: 'bar' | 'button';
}) {
  const t = useTranslations('Filter');
  const copy = useFilterCopy();
  const [urlFilter, setUrlFilter, pending] = useUrlFilter();
  const current = value ?? urlFilter;
  const apply = onChange ?? setUrlFilter;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterSpec>(() => cloneFilter(current));
  const valid = draft.rules.every(r => r.work_modes.length && r.location_ids.length);
  const count = activeConditionCount(current);
  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (o) setDraft(cloneFilter(current)); }}>
      {variant === 'button' ? (
        <DialogTrigger asChild>
          <Button
            variant={count ? 'primary' : 'subtle'}
            size="sm"
            className={cn(pending && 'opacity-70', className)}
            aria-label={count ? t('buttonLabelActive', { n: count }) : t('buttonLabel')}
          >
            <SlidersHorizontal aria-hidden />
            {t('button')}
            {count ? <span className="num -mr-1 grid h-5 min-w-5 place-items-center rounded-full bg-paper px-1 text-[11.5px] font-semibold text-ink" aria-hidden>{count}</span> : null}
          </Button>
        </DialogTrigger>
      ) : (
      <div className={cn('flex items-center gap-3 rounded-md border border-rule bg-surface px-3 py-2.5 sm:px-4', pending && 'opacity-70', className)}>
        <SlidersHorizontal className="hidden size-4 shrink-0 text-muted sm:block" aria-hidden />
        <div className="min-w-0 flex-1">
          {!compact ? <p className="kicker">{t('currentlyShowing')}</p> : null}
          <p className="text-[13.5px] leading-snug text-ink" aria-live="polite">{describeFilter(current, copy)}</p>
        </div>
        {!isDefaultFilter(current) ? (
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => apply(cloneFilter(DEFAULT_FILTER))}>{t('reset')}</Button>
        ) : null}
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">{t('edit')}</Button>
        </DialogTrigger>
      </div>
      )}
      <SheetContent
        title={t('title')}
        closeLabel={t('close')}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setDraft(cloneFilter(DEFAULT_FILTER))}>{t('reset')}</Button>
            <Button disabled={!valid} onClick={() => { apply(normaliseFilter(draft)); setOpen(false); }}>{t('apply')}</Button>
          </>
        )}
      >
        <FilterEditor value={draft} onChange={setDraft} />
      </SheetContent>
    </Dialog>
  );
}
