import { getInstrument } from '@/lib/market/catalog';
import { METRICS } from '@/lib/metrics/registry';
import type { ActiveInstrumentType, Instrument, MetricKey } from '@/lib/market/types';
import type { BoardSort, BoardType } from '@/lib/queries/market';

// Pure helpers for the public market pages: URL parsing, href building and the
// plain-language bands used instead of raw statistics (PRD §10).

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function firstParam(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s : undefined;
}

export function parseBoardType(v: string | string[] | undefined): BoardType {
  const s = firstParam(v);
  return s === 'role' || s === 'all' ? s : 'skill';
}

export function parseSort(v: string | string[] | undefined): BoardSort {
  const s = firstParam(v);
  return s === 'change' || s === 'name' ? s : 'value';
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

export function otherType(type: ActiveInstrumentType): ActiveInstrumentType {
  return type === 'skill' ? 'role' : 'skill';
}
