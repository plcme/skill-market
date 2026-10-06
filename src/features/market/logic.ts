import { getInstrument } from '@/lib/market/catalog';
import { METRICS } from '@/lib/metrics/registry';
import type { ActiveInstrumentType, BreakdownDimension, Instrument, MetricKey, SkillLayer } from '@/lib/market/types';
import type { BoardSort, BoardType } from '@/lib/queries/market';

// Pure helpers for the public market pages: URL parsing, href building and the
// plain-language bands used instead of raw statistics (PRD §10).

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function firstParam(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s : undefined;
}

/** The board opens on All; `?type=skill|role|industry` narrows it. */
export const DEFAULT_BOARD_TYPE: BoardType = 'all';

export function parseBoardType(v: string | string[] | undefined): BoardType {
  const s = firstParam(v);
  return s === 'skill' || s === 'role' || s === 'industry' ? s : DEFAULT_BOARD_TYPE;
}

/** `type` value for a board link: omitted for the default so URLs stay canonical. */
export function boardTypeParam(type: BoardType): BoardType | undefined {
  return type === DEFAULT_BOARD_TYPE ? undefined : type;
}

/** Only "by measure" and "by change" — no A–Z (GLOSSARY §2); old `?sort=az|name` falls back. */
export function parseSort(v: string | string[] | undefined): BoardSort {
  return firstParam(v) === 'change' ? 'change' : 'value';
}

/** Skills board ASC layer: `?layer=tool|task`; anything else = all skills. */
export function parseLayer(v: string | string[] | undefined): SkillLayer | null {
  const s = firstParam(v);
  return s === 'tool' ? 'technology_tool' : s === 'task' ? 'specialist_task' : null;
}

export function layerParam(layer: SkillLayer | null): string | undefined {
  if (!layer) return undefined;
  return layer === 'technology_tool' ? 'tool' : 'task';
}

/** Detail-page breakdown dimension: `?by=experience|rights|mode`, default experience. */
export function parseBreakdownBy(v: string | string[] | undefined): BreakdownDimension {
  const s = firstParam(v);
  return s === 'rights' || s === 'mode' ? s : 'experience';
}

export type BoardView = 'list' | 'cards';

export function parseView(v: string | string[] | undefined): BoardView {
  return firstParam(v) === 'cards' ? 'cards' : 'list';
}

/** Build `path?query` from a patch, dropping empty values; keeps key order stable. */
export function hrefWith(path: string, params: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Flatten Next's searchParams record into a query string (first value per key). */
export function toQueryString(sp: SearchParamsRecord): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const s = firstParam(v);
    if (s) q.set(k, s);
  }
  return q.toString();
}

/** Correlation of weekly counts described in words, never as a score. */
export type CorrelationBand = 'strong' | 'some' | 'weak' | 'opposite';

export function correlationBand(r: number): CorrelationBand {
  if (r <= -0.4) return 'opposite';
  if (r >= 0.7) return 'strong';
  if (r >= 0.4) return 'some';
  return 'weak';
}

/** Co-occurrence (0–1) as a qualitative frequency for "often asked for together". */
export type Togetherness = 'often' | 'sometimes' | 'occasionally';

export function togetherness(w: number): Togetherness {
  if (w >= 0.6) return 'often';
  if (w >= 0.3) return 'sometimes';
  return 'occasionally';
}

export const SUGGESTED_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['python', 'java'],
  ['data-analyst', 'data-engineer'],
  ['react', 'figma'],
  ['aws', 'azure'],
  ['software-engineer', 'devops-engineer'],
];

/**
 * Board → /compare selection. /compare shows exactly two instruments of the same
 * type (`?a=&b=`), so the cap mirrors that; raise it when /compare grows.
 */
export const COMPARE_MAX = 2;

export interface CompareItem {
  slug: string;
  type: ActiveInstrumentType;
}

export type CompareToggle =
  | { ok: true; selection: CompareItem[] }
  | { ok: false; reason: 'max' | 'type'; selection: CompareItem[] };

/** Add or remove one instrument; refuses past the cap or when mixing skills and roles. */
export function toggleCompare(selection: readonly CompareItem[], item: CompareItem, max = COMPARE_MAX): CompareToggle {
  if (selection.some(s => s.slug === item.slug)) return { ok: true, selection: selection.filter(s => s.slug !== item.slug) };
  const first = selection[0];
  if (first && first.type !== item.type) return { ok: false, reason: 'type', selection: [...selection] };
  if (selection.length >= max) return { ok: false, reason: 'max', selection: [...selection] };
  return { ok: true, selection: [...selection, item] };
}

/** Why a not-yet-selected instrument can't be added right now, if it can't. */
export function compareBlocker(selection: readonly CompareItem[], item: CompareItem, max = COMPARE_MAX): 'max' | 'type' | null {
  const r = toggleCompare(selection, item, max);
  return r.ok ? null : r.reason;
}

/** Link to /compare for a selection (first two slugs as `a` and `b`). */
export function compareHref(selection: readonly CompareItem[], f?: string): string {
  return hrefWith('/compare', { a: selection[0]?.slug, b: selection[1]?.slug, f });
}

export type CompareState =
  | { kind: 'empty' }
  | { kind: 'partial'; a: Instrument }
  | { kind: 'same'; a: Instrument }
  | { kind: 'mismatch'; a: Instrument; b: Instrument }
  | { kind: 'ready'; a: Instrument; b: Instrument };

/** What the compare page can show for the given `?a=&b=` (unknown slugs are ignored). */
export function compareState(aSlug?: string, bSlug?: string): CompareState {
  const a = aSlug ? getInstrument(aSlug) : undefined;
  const b = bSlug ? getInstrument(bSlug) : undefined;
  const one = a ?? b;
  if (!one) return { kind: 'empty' };
  if (!a || !b) return { kind: 'partial', a: one };
  if (a.slug === b.slug) return { kind: 'same', a };
  if (a.type !== b.type) return { kind: 'mismatch', a, b };
  return { kind: 'ready', a, b };
}

/**
 * The series we can draw for a metric: share metrics chart themselves; counts,
 * changes and single figures fall back to the 4-week rolling ad count.
 */
export function chartMetricFor(metric: MetricKey): MetricKey {
  const def = METRICS[metric];
  return def.chartable && def.unit === 'share' ? metric : 'ad_count';
}

/** Bar length in percent of the largest value; visible sliver for any non-zero value. */
export function barPercent(value: number, max: number): number {
  if (!(max > 0) || !(value > 0)) return 0;
  return Math.max(2, Math.min(100, (value / max) * 100));
}

/** Positions (0–100) of p10, median and p90 on a padded salary axis. */
export function salaryAxis(low: number, median: number, high: number): { min: number; max: number; low: number; median: number; high: number } {
  const span = Math.max(1, high - low);
  const min = Math.max(0, low - span * 0.25);
  const max = high + span * 0.25;
  const pos = (v: number) => ((v - min) / (max - min)) * 100;
  return { min, max, low: pos(low), median: pos(median), high: pos(high) };
}

/** Metrics valid for a type, default first, in registry order (FR-M4). */
export function keyMetrics(groups: { default: MetricKey; common: MetricKey[] }): MetricKey[] {
  return [groups.default, ...groups.common];
}

/** Board tab order (GLOSSARY §2): All · Skills · Roles · Industries. */
export const BOARD_TYPES: readonly BoardType[] = ['all', 'skill', 'role', 'industry'];
