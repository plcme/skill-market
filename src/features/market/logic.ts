import { expandFilterToCells } from '@/lib/filters/spec';
import { getInstrument } from '@/lib/market/catalog';
import { chartSeriesFor, defaultMetric, measureFixedSplit, METRICS, resolveDetailMetric } from '@/lib/metrics/registry';
import type { ActiveInstrumentType, BreakdownDimension, FilterSpec, Instrument, MetricKey, SkillLayer } from '@/lib/market/types';
import type { BoardSort, BoardType } from '@/lib/queries/market';

export { measureFixedSplit };

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

/**
 * Detail-chart split: `?by=experience|rights|mode|none`. Absent or invalid =
 * experience (the default); `none` = not split (null).
 */
export function parseBreakdownBy(v: string | string[] | undefined): BreakdownDimension | null {
  const s = firstParam(v);
  if (s === 'none') return null;
  return s === 'rights' || s === 'mode' ? s : 'experience';
}

/** `by` value for a link: omitted for the default (experience), `none` for no split. */
export function breakdownParam(by: BreakdownDimension | null): string | null {
  return by === null ? 'none' : by === 'experience' ? null : by;
}

/**
 * Split by dimensions the filter has fixed to a single bucket, so splitting by
 * them would show one band: experience when the level is entry-level or
 * graduate (both sit inside the 0–2 yrs band), work mode when the rules cover
 * exactly one mode. Work rights "No PR stated" still leaves two buckets
 * (not stated, sponsorship OK), so it stays splittable.
 */
export function fixedSplitDimensions(filter: FilterSpec): BreakdownDimension[] {
  const cells = expandFilterToCells(filter);
  const out: BreakdownDimension[] = [];
  if (!cells.seniority.includes('other')) out.push('experience');
  if (cells.rights.length === 1) out.push('rights');
  if (new Set(cells.pairs.map(p => p.mode)).size === 1) out.push('mode');
  return out;
}

/** Why each Split by option is unavailable right now, if it is: fixed by the filter, or not meaningful for the measure. */
export function splitBlockers(filter: FilterSpec, series: MetricKey): Partial<Record<BreakdownDimension, 'filter' | 'measure'>> {
  const out: Partial<Record<BreakdownDimension, 'filter' | 'measure'>> = {};
  for (const d of fixedSplitDimensions(filter)) out[d] = 'filter';
  const m = measureFixedSplit(series);
  if (m) out[m] = 'measure';
  return out;
}

/** The split to actually draw: a dimension fixed by the filter (or by the measure) renders as no split. */
export function effectiveSplit(by: BreakdownDimension | null, filter: FilterSpec, series: MetricKey = 'ad_count'): BreakdownDimension | null {
  return by && splitBlockers(filter, series)[by] ? null : by;
}

/**
 * `by` to write after a change of filter or measure: an explicit split that
 * is now fixed never stays in the URL; it becomes `none` (absent `by` already
 * means the default, Experience, which the route draws unsplit when fixed).
 */
export function nextByParam(byParam: string | null | undefined, filter: FilterSpec, series: MetricKey): string | null {
  if (!byParam) return null;
  const by = parseBreakdownBy(byParam);
  // Experience is the default: no param needed, and the route draws it unsplit while it is fixed.
  if (by === 'experience') return null;
  return breakdownParam(effectiveSplit(by, filter, series));
}

/** `by` to write for a split chosen in the Filter panel, given what the (new) filter and measure fix. */
export function chosenByParam(by: BreakdownDimension | null, filter: FilterSpec, series: MetricKey): string | null {
  return nextByParam(breakdownParam(by) ?? 'experience', filter, series);
}

/** Old `?y=ads|salary` chart links map onto the one measure param, `?metric=`. */
export function legacyYMetric(y: string | string[] | undefined): MetricKey | undefined {
  const s = firstParam(y);
  return s === 'salary' ? 'salary_median' : s === 'ads' ? 'ad_count' : undefined;
}

export type ChartRange = '3m' | '6m' | '1y' | '2y';
export const CHART_RANGES: readonly ChartRange[] = ['3m', '6m', '1y', '2y'];
export const CHART_RANGE_WEEKS: Record<ChartRange, number> = { '3m': 13, '6m': 26, '1y': 52, '2y': 104 };

/** How the detail chart shows the selected measure (`?metric=`). */
export interface ChartPlan {
  /** The weekly series drawn; always one of the type's Y axis options (`chartSeriesFor`). */
  series: MetricKey;
  /** Range the chart opens on. */
  range: ChartRange;
  /** Change measures: the two compared windows (shaded), in weeks; `marks` labels the from → to values. */
  compare: { weeks: number; marks: boolean } | null;
}

/**
 * Measure → chart (GLOSSARY §2, 2026-10-22). Level measures with a weekly
 * series chart themselves. Change measures chart Job ads over a range that
 * shows both compared windows: 4-week change over 3M with the windows shaded
 * and from → to marked; 12-month change over 2Y with the years shaded;
 * volatility over 1Y. Salary range and skill premium chart Median salary;
 * anything else falls back to Job ads.
 */
export function chartPlanFor(metric: MetricKey, type: ActiveInstrumentType): ChartPlan {
  const options = chartSeriesFor(type);
  const level = (series: MetricKey): ChartPlan => ({ series: options.includes(series) ? series : 'ad_count', range: '1y', compare: null });
  switch (metric) {
    case 'change_4w':
      return { series: 'ad_count', range: '3m', compare: { weeks: 4, marks: true } };
    case 'growth_12m':
      return { series: 'ad_count', range: '2y', compare: { weeks: 52, marks: false } };
    case 'volatility':
      return level('ad_count');
    case 'salary_p10_p90':
    case 'skill_premium':
      return level('salary_median');
    default:
      return level(metric);
  }
}

/**
 * The detail page's query string after cleaning, or null when it is already
 * canonical: `?y=` folds into `?metric=` (an explicit `metric` wins), and an
 * explicit `by` that the filter or the measure fixes becomes `none`.
 * `metric` is the measure the page resolves without the legacy `y`.
 */
export function canonicalDetailQuery(sp: SearchParamsRecord, filter: FilterSpec, metric: MetricKey, type: ActiveInstrumentType): string | null {
  const q = new URLSearchParams(toQueryString(sp));
  let changed = false;
  let measure = metric;
  if (q.has('y')) {
    const fromY = legacyYMetric(q.get('y') ?? undefined);
    if (!q.has('metric') && fromY && resolveDetailMetric(type, fromY) === fromY) {
      if (fromY !== defaultMetric(type)) q.set('metric', fromY);
      measure = fromY;
    }
    q.delete('y');
    changed = true;
  }
  const by = q.get('by');
  if (by) {
    const next = nextByParam(by, filter, chartPlanFor(measure, type).series);
    if (next !== by) {
      if (next) q.set('by', next);
      else q.delete('by');
      changed = true;
    }
  }
  return changed ? q.toString() : null;
}

/** `metric` value for a link: omitted for the type's default measure. */
export function metricParam(metric: MetricKey, defaultMetric: MetricKey): string | null {
  return metric === defaultMetric ? null : metric;
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
