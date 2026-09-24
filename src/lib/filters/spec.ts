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
 * `ohr.au-nsw-sydney.au-vic-melbourne*r.au.nz_entry_npr`
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
  const rules = n.rules.map(rule => {
    const places = joinOr(rule.location_ids.map(id => getLocation(id)?.name ?? id), copy.or);
    if (rule.work_modes.length === WORK_MODES.length) return fillTemplate(copy.ruleAllModes, { places });
    const modes = joinOr(rule.work_modes.map(m => copy.modes[m]), copy.or);
    return fillTemplate(copy.ruleModes, { modes, places });
  });
  const parts = [fillTemplate(copy.showing, { rules: rules.join(copy.joinRules) }), copy.seniority[n.seniority]];
  if (n.work_rights !== 'all') parts.push(copy.workRights[n.work_rights]);
  return parts.filter(Boolean).join(copy.separator);
}
