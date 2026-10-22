'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, MapPin, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { Dialog, DialogTrigger, SheetContent, Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay';
import { Button } from '@/components/ui/button';
import { Checkbox, ChipRadioGroup, ChipToggleGroup, Input, RadioCards, Segmented, Switch } from '@/components/ui/form';
import { PICKABLE_LOCATIONS, ancestorsOf, getLocation, narrowedPlaces, placesOrAllAustralia } from '@/lib/filters/locations';
import {
  cloneFilter, DEFAULT_FILTER, describeFilter, encodeFilter, fromSimpleFilter, isDefaultFilter, MAX_RULES, normaliseFilter,
  remoteAnywhereRedundant, toSimpleFilter, type SimpleFilter,
} from '@/lib/filters/spec';
import type { BreakdownDimension, FilterRule, FilterSpec, LocationLevel, MetricKey, Seniority, WorkMode, WorkRights } from '@/lib/market/types';
import { BREAKDOWN_DIMENSIONS, WORK_MODES, type ActiveInstrumentType } from '@/lib/market/types';
import { chartPlanFor, chosenByParam, metricParam, splitBlockers } from '@/features/market/logic';
import { cn } from '@/lib/utils';
import { useFilterCopy } from './filter-readback';
import { useSetParams, useUrlFilter } from './use-url-state';

/** Detail page only: the chart's Y axis and Split by, edited in the Filter panel and applied with it. */
export interface ChartControls {
  type: ActiveInstrumentType;
  /** The page's measure (`?metric=`, resolved) and its default. */
  metric: MetricKey;
  defaultMetric: MetricKey;
  /** Y axis options for this type. */
  options: MetricKey[];
  /** Requested split (`?by=`); the panel shows it as None while the filter or measure fixes it. */
  by: BreakdownDimension | null;
}

interface ChartDraft {
  metric: MetricKey;
  by: BreakdownDimension | null;
}

/** "Y axis" and "Split by" sections of the detail-page Filter panel. */
function ChartSections({ controls, draft, filter, onChange }: { controls: ChartControls; draft: ChartDraft; filter: FilterSpec; onChange: (next: ChartDraft) => void }) {
  const t = useTranslations('Breakdown');
  const series = chartPlanFor(draft.metric, controls.type).series;
  const blockers = splitBlockers(filter, series);
  const by = draft.by && !blockers[draft.by] ? draft.by : null;
  return (
    <>
      {controls.options.length > 1 ? (
        <div>
          <p className="mb-2 text-[13px] font-medium">{t('yAxis')}</p>
          <ChipRadioGroup<MetricKey>
            label={t('yAxis')}
            value={series}
            onValueChange={m => onChange({ ...draft, metric: m })}
            options={controls.options.map(m => ({ value: m, label: t(`measures.${m}`) }))}
          />
        </div>
      ) : null}
      <div className={cn(controls.options.length > 1 && 'border-t border-rule pt-5')}>
        <p className="mb-2 text-[13px] font-medium">{t('splitBy')}</p>
        <RadioCards<'none' | BreakdownDimension>
          label={t('splitBy')}
          columns={2}
          value={by ?? 'none'}
          onValueChange={v => onChange({ ...draft, by: v === 'none' ? null : v })}
          options={[
            { value: 'none', label: t('none') },
            ...BREAKDOWN_DIMENSIONS.map(d => ({
              value: d,
              label: t(`dims.${d}`),
              disabled: Boolean(blockers[d]),
              description: blockers[d] ? t(blockers[d] === 'filter' ? 'fixedByFilter' : 'fixedByMeasure') : undefined,
            })),
          ]}
        />
      </div>
    </>
  );
}

// The picker never lists the country level (Australia is the fixed base).
const INDENT: Record<LocationLevel, string> = { country: 'pl-3', state: 'pl-3', city: 'pl-6', region: 'pl-9' };

function PlacePicker({ selected, onAdd, label }: { selected: string[]; onAdd: (id: string) => void; label: string }) {
  const t = useTranslations('Filter');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PICKABLE_LOCATIONS.filter(l => !needle || l.name.toLowerCase().includes(needle) || l.short.toLowerCase().includes(needle));
  }, [q]);
  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) setQ(''); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 rounded-full border border-dashed border-rule px-2.5 text-muted hover:text-ink">
          <Plus aria-hidden />{label}
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
                  <span>{l.name}</span>
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
      {rule.work_modes.length === 0 ? <p className="mt-1.5 text-[13px] text-danger">{t('modeRequired')}</p> : null}
      <p className="mb-2 mt-4 text-[13px] font-medium">{t('places')}</p>
      <PlaceChips places={rule.location_ids} onChange={location_ids => onChange({ ...rule, location_ids })} />
    </fieldset>
  );
}

/**
 * Places on top of the fixed "All Australia" base: with nothing narrower chosen
 * it shows a non-removable "All Australia" pill; otherwise the chosen states,
 * cities or regions as removable chips. Removing the last one returns to
 * `['au']` (all of Australia, as in DEFAULT_FILTER), so a selection is never empty.
 */
export function PlaceChips({ places, onChange }: { places: string[]; onChange: (next: string[]) => void }) {
  const t = useTranslations('Filter');
  const tp = useTranslations('InstrumentPage.places');
  const narrowed = narrowedPlaces(places);
  // Picking a place replaces any selected ancestor or descendant of it, so
  // Sydney then New South Wales means New South Wales, and the "au" base drops out.
  const add = (id: string) => {
    const lineage = new Set(ancestorsOf(id).map(a => a.id));
    onChange([...places.filter(p => !lineage.has(p) && !ancestorsOf(p).some(a => a.id === id)), id]);
  };
  const remove = (id: string) => onChange(placesOrAllAustralia(places.filter(x => x !== id)));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {narrowed.length === 0 ? (
        <span className="inline-flex h-7 items-center gap-1 rounded-full border border-rule-strong/70 px-2.5 text-[13px] text-ink">
          <MapPin className="size-3 text-muted" aria-hidden />
          {tp('label.all')}
        </span>
      ) : narrowed.map(id => {
        const loc = getLocation(id);
        return (
          <span key={id} className="inline-flex h-7 items-center gap-1 rounded-full bg-ink pl-2.5 pr-1 text-[13px] text-paper">
            <MapPin className="size-3" aria-hidden />
            {loc?.name ?? id}
            <button type="button" onClick={() => remove(id)} aria-label={t('removePlace', { place: loc?.name ?? id })} className="grid size-5 place-items-center rounded-full hover:bg-paper/20">
              <X className="size-3" aria-hidden />
            </button>
          </span>
        );
      })}
      <PlacePicker selected={places} onAdd={add} label={narrowed.length ? t('addAnotherPlace') : t('narrowPlaces')} />
    </div>
  );
}

/** Places of the simple filter. `compact` drops the heading and hint (the caller titles it). */
export function PlacesField({ simple, onChange, compact = false }: { simple: SimpleFilter; onChange: (next: SimpleFilter) => void; compact?: boolean }) {
  const t = useTranslations('Filter');
  return (
    <div>
      {!compact ? (
        <>
          <p className="mb-1 text-[13px] font-medium">{t('places')}</p>
          <p className="mb-2 text-[13px] text-muted">{t('placesHint')}</p>
        </>
      ) : null}
      <PlaceChips places={simple.places} onChange={places => onChange({ ...simple, places })} />
    </div>
  );
}

/** "Also include remote jobs anywhere in Australia"; disabled (and on) when places × modes already cover it. */
export function RemoteAnywhereSwitch({ simple, onChange, compact = false, className }: { simple: SimpleFilter; onChange: (next: SimpleFilter) => void; compact?: boolean; className?: string }) {
  const t = useTranslations('Filter');
  const redundant = remoteAnywhereRedundant(simple.places, simple.modes);
  return (
    <Switch
      label={t('remoteAnywhere')}
      description={redundant ? t(compact ? 'remoteAnywhereCoveredShort' : 'remoteAnywhereCovered') : compact ? undefined : t('remoteAnywhereHint')}
      checked={redundant || simple.includeRemoteAnywhere}
      disabled={redundant}
      onCheckedChange={v => onChange({ ...simple, includeRemoteAnywhere: v })}
      className={cn('rounded-md border border-rule bg-paper/50 p-3', className)}
    />
  );
}

/** B2 primary controls: places × work modes, plus "remote anywhere in Australia". */
function SimpleControls({ simple, onChange }: { simple: SimpleFilter; onChange: (next: SimpleFilter) => void }) {
  const t = useTranslations('Filter');
  const toggleMode = (mode: WorkMode, on: boolean) => onChange({ ...simple, modes: WORK_MODES.filter(m => (m === mode ? on : simple.modes.includes(m))) });
  return (
    <div className="flex flex-col gap-5">
      <PlacesField simple={simple} onChange={onChange} />
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">{t('workModeLegend')}</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {WORK_MODES.map(m => (
            <Checkbox key={m} label={t(`modes.${m}`)} checked={simple.modes.includes(m)} onCheckedChange={v => toggleMode(m, v === true)} />
          ))}
        </div>
        {simple.modes.length === 0 ? <p className="mt-1.5 text-[13px] text-danger">{t('modeRequired')}</p> : null}
      </fieldset>
      <RemoteAnywhereSwitch simple={simple} onChange={onChange} />
    </div>
  );
}

function AdvancedRules({ value, onChange }: { value: FilterSpec; onChange: (f: FilterSpec) => void }) {
  const t = useTranslations('Filter');
  const setRule = (i: number, r: FilterRule) => onChange({ ...value, rules: value.rules.map((x, k) => (k === i ? r : x)) });
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted">{t('advancedHint')}</p>
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
  );
}

/**
 * Filter editor (FR-F1–F5). Top to bottom: a sticky "Currently showing"
 * readback, work rights (set first, rarely changed), level, then the simple
 * place controls (places, work mode, remote-anywhere switch); the multi-rule
 * builder sits behind "Advanced" and opens by itself when a spec can't be
 * expressed simply, so any URL stays editable.
 */
export function FilterEditor({ value, onChange, extra, readbackSuffix }: {
  value: FilterSpec;
  onChange: (f: FilterSpec) => void;
  /** Sections between the readback and Work rights (the detail page's chart controls). */
  extra?: React.ReactNode;
  /** Appended to the readback, e.g. " · by experience". */
  readbackSuffix?: string;
}) {
  const t = useTranslations('Filter');
  const copy = useFilterCopy();
  // The simple controls keep their own state so a half-edited draft (no work
  // mode ticked yet) isn't normalised away; it re-derives when `value` changes
  // from outside (e.g. Reset).
  const [local, setLocal] = useState<{ from: FilterSpec; simple: SimpleFilter | null }>(() => ({ from: value, simple: toSimpleFilter(value) }));
  let simple = local.simple;
  if (local.from !== value) {
    simple = toSimpleFilter(value);
    setLocal({ from: value, simple });
  }
  const [advancedOpen, setAdvancedOpen] = useState(() => simple === null);
  const advanced = advancedOpen || simple === null;
  const emit = (spec: FilterSpec, nextSimple: SimpleFilter | null) => {
    setLocal({ from: spec, simple: nextSimple });
    onChange(spec);
  };
  const setSimple = (next: SimpleFilter) => emit(fromSimpleFilter(next, value), next);
  const setScope = (patch: Partial<Pick<FilterSpec, 'seniority' | 'work_rights'>>) => {
    const scope = { seniority: value.seniority, work_rights: value.work_rights, ...patch };
    if (!advanced && simple) emit(fromSimpleFilter(simple, scope), simple);
    else onChange({ ...value, ...scope });
  };
  const valid = value.rules.every(r => r.work_modes.length && r.location_ids.length);
  const canGoSimple = valid && toSimpleFilter(value) !== null;
  return (
    <div className="flex flex-col gap-5">
      {/* Sticks to the top of the sheet's scroll area; -top-5/-mt-5 cancel the sheet's padding so nothing shows through above it. */}
      <div className="sticky -top-5 z-10 -mx-5 -mt-5 bg-surface px-5 pb-1 pt-5">
        <div aria-live="polite" className="rounded-md bg-accent-soft px-4 py-3 text-sm">
          <p className="kicker mb-1">{t('currentlyShowing')}</p>
          <p className="text-ink" data-testid="filter-readback">{valid ? `${describeFilter(value, copy)}${readbackSuffix ?? ''}` : '…'}</p>
        </div>
      </div>
      {extra ? <div className="flex flex-col gap-5 border-b border-rule pb-5">{extra}</div> : null}
      <div>
        <p className="mb-2 text-[13px] font-medium">{t('workRights')}</p>
        <Segmented<WorkRights> label={t('workRights')} value={value.work_rights} onValueChange={v => setScope({ work_rights: v })} options={(['all', 'no_pr_required'] as const).map(v => ({ value: v, label: t(`workRightsOptions.${v}`) }))} />
        <p className="mt-1.5 text-[13px] text-muted">{t('workRightsHint')}</p>
      </div>
      <div className="border-t border-rule pt-5">
        <p className="mb-2 text-[13px] font-medium">{t('seniority')}</p>
        <Segmented<Seniority> label={t('seniority')} value={value.seniority} onValueChange={v => setScope({ seniority: v })} options={(['all', 'entry', 'graduate'] as const).map(v => ({ value: v, label: t(`seniorityOptions.${v}`) }))} />
        <p className="mt-1.5 text-[13px] text-muted">{t('seniorityHint')}</p>
      </div>
      {!advanced && simple ? <div className="border-t border-rule pt-5"><SimpleControls simple={simple} onChange={setSimple} /></div> : null}
      <div className="border-t border-rule pt-4">
        <button
          type="button"
          aria-expanded={advanced}
          aria-controls="filter-advanced"
          disabled={advanced && !canGoSimple}
          onClick={() => {
            if (advanced) {
              setLocal({ from: value, simple: toSimpleFilter(value) });
              setAdvancedOpen(false);
            } else setAdvancedOpen(true);
          }}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ChevronDown className={cn('size-4 transition-transform', advanced && 'rotate-180')} aria-hidden />
          {advanced ? t('simpleBack') : t('advanced')}
        </button>
        {advanced && !canGoSimple && valid ? <p className="mt-1.5 text-[13px] text-muted">{t('advancedLocked')}</p> : null}
        {advanced ? <div id="filter-advanced" className="mt-3"><AdvancedRules value={value} onChange={onChange} /></div> : null}
      </div>
    </div>
  );
}

/**
 * Readback + edit sheet. Without `onChange` it reads and writes the `?f=` param.
 * `trigger` replaces the built-in trigger with the caller's own element (e.g. the
 * detail-page title), opening the same sheet.
 */
export function FilterBar({ value, onChange, className, compact = false, trigger, chartControls }: {
  value?: FilterSpec;
  onChange?: (f: FilterSpec) => void;
  className?: string;
  compact?: boolean;
  /** Custom trigger; must render a single focusable element (it is wrapped in `DialogTrigger asChild`). */
  trigger?: (state: { current: FilterSpec; pending: boolean }) => React.ReactElement;
  /** Detail page: adds Y axis and Split by sections; Apply writes them with the filter in one URL change. */
  chartControls?: ChartControls;
}) {
  const t = useTranslations('Filter');
  const tb = useTranslations('Breakdown');
  const tt = useTranslations('InstrumentPage.titleFilter');
  const copy = useFilterCopy();
  const [urlFilter, setUrlFilter, urlPending] = useUrlFilter();
  const { set: setParams, pending: paramsPending } = useSetParams();
  const pending = urlPending || paramsPending;
  const current = value ?? urlFilter;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterSpec>(() => cloneFilter(current));
  const chartInit = (): ChartDraft => ({ metric: chartControls?.metric ?? 'ad_count', by: chartControls?.by ?? null });
  const [chartDraft, setChartDraft] = useState<ChartDraft>(chartInit);
  const series = chartControls ? chartPlanFor(chartDraft.metric, chartControls.type).series : 'ad_count';
  const draftBy = chartControls && chartDraft.by && !splitBlockers(draft, series)[chartDraft.by] ? chartDraft.by : null;
  const apply = (f: FilterSpec) => {
    if (chartControls) {
      setParams({
        f: isDefaultFilter(f) ? null : encodeFilter(f),
        metric: metricParam(chartDraft.metric, chartControls.defaultMetric),
        y: null,
        by: chosenByParam(chartDraft.by, f, series),
      });
    } else (onChange ?? setUrlFilter)(f);
  };
  const valid = draft.rules.every(r => r.work_modes.length && r.location_ids.length);
  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (o) { setDraft(cloneFilter(current)); setChartDraft(chartInit()); } }}>
      {trigger ? (
        <DialogTrigger asChild>{trigger({ current, pending })}</DialogTrigger>
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
        <FilterEditor
          value={draft}
          onChange={setDraft}
          extra={chartControls ? <ChartSections controls={chartControls} draft={chartDraft} filter={draft} onChange={setChartDraft} /> : undefined}
          readbackSuffix={draftBy ? `${tt('separator')}${tt('by', { dimension: tb(`dimsLower.${draftBy}`) })}` : undefined}
        />
      </SheetContent>
    </Dialog>
  );
}
