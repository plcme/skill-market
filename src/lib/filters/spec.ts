import { z } from 'zod';
import type { FilterRule, FilterSpec, Seniority, WorkMode, WorkRights } from '@/lib/market/types';
import { WORK_MODES } from '@/lib/market/types';
import { getLocation, leafIdsFor, normaliseLocationIds } from './locations';

export const MAX_RULES = 4;

export const DEFAULT_FILTER: FilterSpec = Object.freeze({
  rules: [{ work_modes: [...WORK_MODES], location_ids: ['au'] }],
  seniority: 'all',
  work_rights: 'all',
}) as FilterSpec;

export const filterSpecSchema = z.object({
  rules: z.array(z.object({
    work_modes: z.array(z.enum(['onsite', 'hybrid', 'remote'])).min(1),
    location_ids: z.array(z.string().min(1)).min(1),
  })).min(1).max(MAX_RULES),
  seniority: z.enum(['entry', 'graduate', 'all']),
  work_rights: z.enum(['no_pr_required', 'all']),
});

/** Canonical form: known ids only, no ancestor+descendant duplicates, stable ordering. */
export function normaliseFilter(spec: FilterSpec): FilterSpec {
  const rules: FilterRule[] = [];
  const seen = new Set<string>();
  for (const rule of spec.rules) {
    const work_modes = WORK_MODES.filter(m => rule.work_modes.includes(m));
    const location_ids = normaliseLocationIds(rule.location_ids).sort();
    if (!work_modes.length || !location_ids.length) continue;
    const key = `${work_modes.join('')}|${location_ids.join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push({ work_modes, location_ids });
  }
  return {
    rules: rules.length ? rules.slice(0, MAX_RULES) : DEFAULT_FILTER.rules.map(r => ({ ...r, work_modes: [...r.work_modes], location_ids: [...r.location_ids] })),
    seniority: spec.seniority,
    work_rights: spec.work_rights,
  };
}

const MODE_CODE: Record<WorkMode, string> = { onsite: 'o', hybrid: 'h', remote: 'r' };
const CODE_MODE: Record<string, WorkMode> = { o: 'onsite', h: 'hybrid', r: 'remote' };
const RIGHTS_CODE: Record<WorkRights, string> = { all: 'all', no_pr_required: 'npr' };

/**
 * URL codec. Only characters that survive form-encoding untouched are used:
 * `ohr.au-nsw-sydney.au-vic-melbourne*r.au-qld.au-wa_entry_npr`
 */
export function encodeFilter(spec: FilterSpec): string {
  const n = normaliseFilter(spec);
  const rules = n.rules.map(r => [r.work_modes.map(m => MODE_CODE[m]).join(''), ...r.location_ids].join('.')).join('*');
  return `${rules}_${n.seniority}_${RIGHTS_CODE[n.work_rights]}`;
}

export function decodeFilter(raw: string | null | undefined): FilterSpec {
  if (!raw) return cloneFilter(DEFAULT_FILTER);
  const [rulesPart = '', sen = 'all', rights = 'all'] = raw.split('_');
  const rules: FilterRule[] = rulesPart.split('*').map(chunk => {
    const [modes = '', ...locs] = chunk.split('.');
    return {
      work_modes: [...modes].map(c => CODE_MODE[c]).filter((m): m is WorkMode => Boolean(m)),
      location_ids: locs.filter(id => getLocation(id)),
    };
  });
  const seniority: Seniority = sen === 'entry' || sen === 'graduate' ? sen : 'all';
  const work_rights: WorkRights = rights === 'npr' ? 'no_pr_required' : 'all';
  return normaliseFilter({ rules, seniority, work_rights });
}

export function cloneFilter(spec: FilterSpec): FilterSpec {
  return {
    rules: spec.rules.map(r => ({ work_modes: [...r.work_modes], location_ids: [...r.location_ids] })),
    seniority: spec.seniority,
    work_rights: spec.work_rights,
  };
}

export function filterHash(spec: FilterSpec): string {
  return encodeFilter(spec);
}

export function isDefaultFilter(spec: FilterSpec): boolean {
  return filterHash(spec) === filterHash(DEFAULT_FILTER);
}

export function sameFilter(a: FilterSpec, b: FilterSpec): boolean {
  return filterHash(a) === filterHash(b);
}

export type SeniorityBucket = 'graduate' | 'entry_other' | 'other';
export type RightsBucket = 'requires_pr' | 'not_stated' | 'sponsorship_ok';

export interface CellSet {
  /** Distinct (leaf location, work mode) pairs covered by the union of rules. */
  pairs: Array<{ leaf: string; mode: WorkMode }>;
  seniority: SeniorityBucket[];
  rights: RightsBucket[];
}

export const SENIORITY_BUCKETS: Record<Seniority, SeniorityBucket[]> = {
  all: ['graduate', 'entry_other', 'other'],
  entry: ['graduate', 'entry_other'],
  graduate: ['graduate'],
};

export const RIGHTS_BUCKETS: Record<WorkRights, RightsBucket[]> = {
  all: ['requires_pr', 'not_stated', 'sponsorship_ok'],
  no_pr_required: ['not_stated', 'sponsorship_ok'],
};

/** ARCHITECTURE §6.3 `expandFilterToCells()`: union of rules, deduplicated at leaf level. */
export function expandFilterToCells(spec: FilterSpec): CellSet {
  const n = normaliseFilter(spec);
  const keys = new Set<string>();
  const pairs: CellSet['pairs'] = [];
  for (const rule of n.rules) {
    const leaves = rule.location_ids.flatMap(leafIdsFor);
    for (const leaf of leaves) {
      for (const mode of rule.work_modes) {
        const key = `${leaf}|${mode}`;
        if (keys.has(key)) continue;
        keys.add(key);
        pairs.push({ leaf, mode });
      }
    }
  }
  return { pairs, seniority: SENIORITY_BUCKETS[n.seniority], rights: RIGHTS_BUCKETS[n.work_rights] };
}

/** Copy for the natural-language readback; comes from messages so it stays translatable. */
export interface FilterCopy {
  showing: string; // "Showing {rules}"
  ruleAllModes: string; // "all roles in {places}"
  ruleModes: string; // "{modes} roles in {places}"
  /** "remote roles anywhere in Australia" — for the add-on rule of the simple filter (optional for older copy). */
  ruleRemoteAnywhere?: string;
  joinRules: string; // ", plus "
  or: string; // " or "
  modes: Record<WorkMode, string>;
  seniority: Record<Seniority, string>;
  workRights: Record<WorkRights, string>;
  separator: string; // " · "
}

export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

function joinOr(items: string[], or: string): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')}${or}${items[items.length - 1]}`;
}

/** FR-F3: every filter state has a plain-English readback. */
export function describeFilter(spec: FilterSpec, copy: FilterCopy): string {
  const n = normaliseFilter(spec);
  const rules = n.rules.map((rule, i) => {
    if (i > 0 && copy.ruleRemoteAnywhere && isRemoteAnywhereRule(rule)) return copy.ruleRemoteAnywhere;
    const places = joinOr(rule.location_ids.map(id => getLocation(id)?.name ?? id), copy.or);
    if (rule.work_modes.length === WORK_MODES.length) return fillTemplate(copy.ruleAllModes, { places });
    const modes = joinOr(rule.work_modes.map(m => copy.modes[m]), copy.or);
    return fillTemplate(copy.ruleModes, { modes, places });
  });
  const parts = [fillTemplate(copy.showing, { rules: rules.join(copy.joinRules) }), copy.seniority[n.seniority]];
  if (n.work_rights !== 'all') parts.push(copy.workRights[n.work_rights]);
  return parts.filter(Boolean).join(copy.separator);
}

// --- Simple filter (B2) -------------------------------------------------------
// The filter panel's primary controls: one set of places × work modes, plus a
// switch that adds "remote anywhere in Australia" as a second OR-ed rule. Any
// spec these controls can't express stays editable in the Advanced rule builder.

/** The add-on rule behind "Also include remote jobs anywhere in Australia". */
export const REMOTE_ANYWHERE_RULE: Readonly<FilterRule> = Object.freeze({ work_modes: ['remote'], location_ids: ['au'] }) as FilterRule;

export function isRemoteAnywhereRule(rule: FilterRule): boolean {
  const modes = WORK_MODES.filter(m => rule.work_modes.includes(m));
  const places = normaliseLocationIds(rule.location_ids);
  return modes.length === 1 && modes[0] === 'remote' && places.length === 1 && places[0] === 'au';
}

export interface SimpleFilter {
  /** Location ids at any level of the tree. */
  places: string[];
  modes: WorkMode[];
  /** Adds REMOTE_ANYWHERE_RULE next to the places × modes rule. */
  includeRemoteAnywhere: boolean;
}

/**
 * True when places × modes already cover remote roles across all of Australia,
 * so the remote-anywhere switch would add nothing (the UI disables it).
 */
export function remoteAnywhereRedundant(places: readonly string[], modes: readonly WorkMode[]): boolean {
  return modes.includes('remote') && normaliseLocationIds([...places]).includes('au');
}

/** Express a spec with the simple controls, or null when it needs the Advanced rule builder. */
export function toSimpleFilter(spec: FilterSpec): SimpleFilter | null {
  const { rules } = normaliseFilter(spec);
  const simple = (rule: FilterRule, includeRemoteAnywhere: boolean): SimpleFilter => ({
    places: [...rule.location_ids],
    modes: [...rule.work_modes],
    includeRemoteAnywhere: includeRemoteAnywhere && !remoteAnywhereRedundant(rule.location_ids, rule.work_modes),
  });
  if (rules.length === 1) return simple(rules[0], false);
  if (rules.length !== 2) return null;
  const extra = rules.findIndex(isRemoteAnywhereRule);
  if (extra < 0) return null;
  return simple(rules[1 - extra], true);
}

/** Build a spec from the simple controls; seniority and work rights come from `base`. */
export function fromSimpleFilter(simple: SimpleFilter, base: Pick<FilterSpec, 'seniority' | 'work_rights'>): FilterSpec {
  const primary: FilterRule = { work_modes: WORK_MODES.filter(m => simple.modes.includes(m)), location_ids: normaliseLocationIds(simple.places) };
  const rules = [primary];
  if (simple.includeRemoteAnywhere && !remoteAnywhereRedundant(primary.location_ids, primary.work_modes)) {
    rules.push({ work_modes: [...REMOTE_ANYWHERE_RULE.work_modes], location_ids: [...REMOTE_ANYWHERE_RULE.location_ids] });
  }
  return { rules, seniority: base.seniority, work_rights: base.work_rights };
}

// --- Detail-page title: "SQL in [places]" (GLOSSARY §2, 2026-10-17) -------------

/** Copy for the places label in a detail-page title; from messages so it stays translatable. */
export interface PlacesCopy {
  all: string; // "All Australia"
  custom: string; // "custom places" — a multi-rule spec the simple controls can't show
  count: string; // "{n} places"
  withRemote: string; // "{places} + remote"
  join: string; // ", "
}

/**
 * Short label for where a spec looks: "All Australia", up to two place names,
 * or "N places", plus " + remote" when remote-anywhere is on; `custom` for
 * multi-rule specs. Work modes, seniority and work rights are not part of it.
 */
export function placesLabel(spec: FilterSpec, copy: PlacesCopy, nameOf: (id: string) => string = id => getLocation(id)?.name ?? id): string {
  const simple = toSimpleFilter(spec);
  if (!simple) return copy.custom;
  const places = simple.places;
  const base = places.length === 1 && places[0] === 'au'
    ? copy.all
    : places.length <= 2 ? places.map(nameOf).join(copy.join) : fillTemplate(copy.count, { n: places.length });
  return simple.includeRemoteAnywhere ? fillTemplate(copy.withRemote, { places: base }) : base;
}

/** Conditions besides places that narrow a spec; listed after the places in a detail-page title. */
export type ScopeCondition = 'seniority' | 'work_rights' | 'work_modes';

export function scopeConditions(spec: FilterSpec): ScopeCondition[] {
  const n = normaliseFilter(spec);
  const out: ScopeCondition[] = [];
  if (n.seniority !== 'all') out.push('seniority');
  if (n.work_rights !== 'all') out.push('work_rights');
  const simple = toSimpleFilter(n);
  if (simple && simple.modes.length < WORK_MODES.length) out.push('work_modes');
  return out;
}

/** Copy for the detail-page title filter ("in Sydney + remote · Entry-level ▾"); from messages so it stays translatable. */
export interface TitleFilterCopy {
  places: PlacesCopy;
  separator: string; // " · "
  seniority: Record<Exclude<Seniority, 'all'>, string>; // "Entry-level", "Graduate"
  workRights: string; // "No PR stated"
  /** Keyed by the selected modes in WORK_MODES order joined with "_", e.g. `onsite_hybrid`. */
  workModes: Record<string, string>;
  /** Same keys, lower case inside a sentence: "on-site or hybrid". */
  workModesInline: Record<string, string>;
  /** "{places} ({modes})": the places rule's modes when remote-anywhere is also on. */
  placesWithModes: string;
}

/**
 * The active filter as a short sentence for a detail-page title: the places
 * label (always), then only the conditions that narrow — level, work modes,
 * work rights — joined by the separator, then the chart split when one is
 * drawn ("by experience"). "All Australia" for the default.
 *
 * With remote-anywhere on, the work modes belong to the places rule only, so
 * they go in brackets after those places — "Sydney (on-site or hybrid) +
 * remote" — instead of a separate "On-site or hybrid" that the "+ remote"
 * would contradict.
 */
export function titleFilterLabel(spec: FilterSpec, copy: TitleFilterCopy, nameOf?: (id: string) => string, split?: string): string {
  const n = normaliseFilter(spec);
  const conditions = scopeConditions(n);
  const simple = toSimpleFilter(n);
  const modesKey = WORK_MODES.filter(m => simple?.modes.includes(m)).join('_');
  const scopedModes = conditions.includes('work_modes') && simple?.includeRemoteAnywhere === true;
  const places = scopedModes && simple
    ? fillTemplate(copy.places.withRemote, {
      places: fillTemplate(copy.placesWithModes, { places: placesLabel({ ...n, rules: [n.rules.find(r => !isRemoteAnywhereRule(r)) ?? n.rules[0]] }, copy.places, nameOf), modes: copy.workModesInline[modesKey] ?? modesKey }),
    })
    : placesLabel(n, copy.places, nameOf);
  const parts = [places];
  if (n.seniority !== 'all') parts.push(copy.seniority[n.seniority]);
  if (conditions.includes('work_modes') && !scopedModes) parts.push(copy.workModes[modesKey] ?? modesKey);
  if (n.work_rights !== 'all') parts.push(copy.workRights);
  if (split) parts.push(split);
  return parts.join(copy.separator);
}
