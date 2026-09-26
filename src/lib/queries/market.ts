import { computeMetric, computeSeries, correlation, DATA_AS_OF, detectSignal, locationBreakdown, snapshot, SOURCE_IDS } from '@/lib/market/engine';
import { cooccurrence, getInstrument, INSTRUMENTS, relatedSkills, ROLE_COMPONENTS, rolesForSkill, searchInstruments, type SearchHit } from '@/lib/market/catalog';
import { METRICS, defaultMetric, isValidMetric, metricsFor, sharedMetrics, signalMetric } from '@/lib/metrics/registry';
import { sortValue } from '@/lib/market/format';
import type {
  ActiveInstrumentType, DataSource, FilterSpec, Instrument, InstrumentSnapshot, MetricKey, MetricReading, SeriesPoint, Signal,
} from '@/lib/market/types';

// Public read model (RSC). Today backed by the fixture engine; the production
// version queries `metric_points` summed over `expandFilterToCells()` cells.
// Signatures are the contract documented in docs/FRONTEND_API_REPORT.md.

export type BoardType = ActiveInstrumentType | 'all';
export type BoardSort = 'value' | 'change';

export interface BoardQuery {
  type: BoardType;
  metric?: string;
  filter: FilterSpec;
  sort?: BoardSort;
  q?: string;
}

export interface Board {
  type: BoardType;
  metric: MetricKey;
  sort: BoardSort;
  rows: InstrumentSnapshot[];
  signals: number;
  as_of: string;
}

/**
 * `?metric=` for a board. Only measures offered in that board's switcher are
 * honoured; anything else — including legacy `share_of_ads` links — falls back
 * to the default, the same way on the All, Skills and Roles boards.
 */
export function resolveBoardMetric(type: BoardType, metric?: string): MetricKey {
  if (type === 'all') return metric && sharedMetrics().includes(metric as MetricKey) ? (metric as MetricKey) : 'ad_count';
  return metric && isValidMetric(type, metric) && METRICS[metric].selectable ? metric : defaultMetric(type);
}

export function getBoard(query: BoardQuery): Board {
  const metric = resolveBoardMetric(query.type, query.metric);
  const sort = query.sort ?? 'value';
  const needle = query.q?.trim().toLowerCase() ?? '';
  const pool = INSTRUMENTS.filter(i => query.type === 'all' || i.type === query.type);
  const rows = pool
    .filter(i => !needle || i.name.toLowerCase().includes(needle) || i.aliases.some(a => a.includes(needle)) || i.symbol.toLowerCase() === needle)
    .map(i => snapshot(i.slug, metric, query.filter));
  rows.sort((a, b) => {
    if (sort === 'change') return sortValue(b.change) - sortValue(a.change);
    return sortValue(b.metric) - sortValue(a.metric);
  });
  return { type: query.type, metric, sort, rows, signals: rows.filter(r => r.signal).length, as_of: DATA_AS_OF };
}

export interface TapeEntry {
  slug: string;
  type: ActiveInstrumentType;
  symbol: string;
  name: string;
  change: number;
  from: number;
  to: number;
  signal: boolean;
}

/** Biggest 4-week movers nationally, signals first — for the ticker tape. */
export function getTape(limit = 16): TapeEntry[] {
  const all = INSTRUMENTS.map(i => ({ i, r: computeMetric(i.slug, 'change_4w', { rules: [{ work_modes: ['onsite', 'hybrid', 'remote'], location_ids: ['au'] }], seniority: 'all', work_rights: 'all' }) }))
    .filter(x => x.r.status === 'ok' && x.r.value !== null && x.r.from !== null && x.r.to !== null);
  const signals = new Set(INSTRUMENTS.filter(i => detectSignal(i.slug, { rules: [{ work_modes: ['onsite', 'hybrid', 'remote'], location_ids: ['au'] }], seniority: 'all', work_rights: 'all' })).map(i => i.slug));
  return all
    .sort((a, b) => Number(signals.has(b.i.slug)) - Number(signals.has(a.i.slug)) || Math.abs(b.r.value ?? 0) - Math.abs(a.r.value ?? 0))
    .slice(0, limit)
    .map(({ i, r }) => ({ slug: i.slug, type: i.type, symbol: i.symbol, name: i.name, change: r.value ?? 0, from: r.from ?? 0, to: r.to ?? 0, signal: signals.has(i.slug) }));
}

export interface CompositionEntry {
  instrument: Instrument;
  /** Share of the parent's ads that mention the skill (role → skills) or of this skill's demand that comes from the role. */
  weight: number;
  snapshot: InstrumentSnapshot;
}

export interface InstrumentDetail {
  snapshot: InstrumentSnapshot;
  metric: MetricKey;
  metrics: { default: MetricKey; common: MetricKey[]; advanced: MetricKey[] };
  readings: Partial<Record<MetricKey, MetricReading>>;
  series: SeriesPoint[];
  /** Role → component skills; skill → roles that ask for it (FR-M3). */
  composition: CompositionEntry[];
  /** Skill → often asked together. */
  related: CompositionEntry[];
  locations: Array<{ location_id: string; name: string; count: number }>;
  signal: Signal | null;
  as_of: string;
}

export function getInstrumentDetail(slug: string, filter: FilterSpec, metricParam?: string): InstrumentDetail | null {
  const inst = getInstrument(slug);
  if (!inst) return null;
  // Same rule as boards: legacy non-selectable metrics fall back to the default.
  const metric = metricParam && isValidMetric(inst.type, metricParam) && METRICS[metricParam].selectable ? metricParam : defaultMetric(inst.type);
  const groups = metricsFor(inst.type);
  const readings: Partial<Record<MetricKey, MetricReading>> = {};
  for (const k of [groups.default, ...groups.common, ...groups.advanced]) readings[k] = computeMetric(slug, k, filter);
  const series = computeSeries(slug, METRICS[metric].chartable ? metric : 'ad_count', filter);
  const snap = snapshot(slug, metric, filter);
  const composition: CompositionEntry[] = inst.type === 'role'
    ? (ROLE_COMPONENTS[slug] ?? []).map(c => {
      const skill = getInstrument(c.skill_slug);
      return skill ? { instrument: skill, weight: c.weight, snapshot: snapshot(skill.slug, 'share_of_ads', filter) } : null;
    }).filter((x): x is CompositionEntry => x !== null)
    : rolesForSkill(slug).map(r => ({ instrument: r.role, weight: r.weight, snapshot: snapshot(r.role.slug, 'growth_12m', filter) }));
  const related: CompositionEntry[] = inst.type === 'skill'
    ? relatedSkills(slug, 8).map(r => ({ instrument: r.skill, weight: r.weight, snapshot: snapshot(r.skill.slug, 'share_of_ads', filter) }))
    : [];
  return {
    snapshot: snap,
    metric,
    metrics: groups,
    readings,
    series,
    composition,
    related,
    locations: locationBreakdown(slug, filter),
    signal: snap.signal,
    as_of: DATA_AS_OF,
  };
}

export interface Comparison {
  a: InstrumentDetail;
  b: InstrumentDetail;
  /** Pearson correlation of the last 52 weekly counts. */
  correlation: number;
  /** For two skills: co-occurrence 0–1. For two roles: overlap of component skills. */
  overlap: number;
  shared: Instrument[];
  onlyA: Instrument[];
  onlyB: Instrument[];
}

export function getComparison(aSlug: string, bSlug: string, filter: FilterSpec): Comparison | null {
  const a = getInstrumentDetail(aSlug, filter);
  const b = getInstrumentDetail(bSlug, filter);
  if (!a || !b) return null;
  const setA = new Set(a.composition.map(c => c.instrument.slug));
  const setB = new Set(b.composition.map(c => c.instrument.slug));
  const shared = a.composition.filter(c => setB.has(c.instrument.slug)).map(c => c.instrument);
  const onlyA = a.composition.filter(c => !setB.has(c.instrument.slug)).map(c => c.instrument);
  const onlyB = b.composition.filter(c => !setA.has(c.instrument.slug)).map(c => c.instrument);
  const union = new Set([...setA, ...setB]).size;
  const overlap = a.snapshot.instrument.type === 'skill' && b.snapshot.instrument.type === 'skill'
    ? cooccurrence(aSlug, bSlug)
    : union ? shared.length / union : 0;
  return { a, b, correlation: correlation(aSlug, bSlug, filter), overlap, shared, onlyA, onlyB };
}

export function search(q: string): { skills: SearchHit[]; roles: SearchHit[] } {
  const hits = searchInstruments(q, 40);
  return { skills: hits.filter(h => h.instrument.type === 'skill'), roles: hits.filter(h => h.instrument.type === 'role') };
}

export function getSources(): DataSource[] {
  return [
    { id: SOURCE_IDS.ads, kind: 'ads', name: 'Adzuna AU job ads (fixture)', licence: 'Commercial API terms — pending confirmation (PRD Q6)', cadence: 'Daily, 05:00 AEST', last_run_at: `${DATA_AS_OF}T19:05:00+10:00`, status: 'healthy', url: null },
    { id: SOURCE_IDS.official, kind: 'official', name: 'JSA Internet Vacancy Index (fixture)', licence: 'CC BY 4.0 (to be re-checked)', cadence: 'Monthly', last_run_at: `${DATA_AS_OF}T19:05:00+10:00`, status: 'delayed', url: null },
    { id: SOURCE_IDS.practitioner, kind: 'practitioner', name: 'Coffee-chat debriefs', licence: 'Platform data, shown only in aggregate', cadence: 'Continuous', last_run_at: `${DATA_AS_OF}T19:05:00+10:00`, status: 'healthy', url: null },
  ];
}

export { signalMetric };

// --- Public market pages (added for /market, /search, /metrics) -------------

/** FR-M6 "30-second" strip: every skill or role with a signal under this filter, biggest move first. */
export function getSignalsNow(filter: FilterSpec, limit = 12): InstrumentSnapshot[] {
  return INSTRUMENTS
    .map(i => snapshot(i.slug, defaultMetric(i.type), filter))
    .filter(s => s.signal)
    .sort((x, y) => Math.abs(y.signal?.magnitude ?? 0) - Math.abs(x.signal?.magnitude ?? 0))
    .slice(0, limit);
}

export interface SearchResult {
  hit: SearchHit;
  snapshot: InstrumentSnapshot;
}

/** `/search?q=`: alias-aware hits with a ticker snapshot each, grouped by type (FR-D6). */
export function searchWithSnapshots(q: string, filter: FilterSpec): { skills: SearchResult[]; roles: SearchResult[] } {
  const { skills, roles } = search(q);
  const withSnap = (hit: SearchHit): SearchResult => ({ hit, snapshot: snapshot(hit.instrument.slug, defaultMetric(hit.instrument.type), filter) });
  return { skills: skills.map(withSnap), roles: roles.map(withSnap) };
}

const METRIC_EXAMPLES: Record<ActiveInstrumentType, readonly string[]> = {
  skill: ['python', 'rust'],
  role: ['software-engineer', 'data-analyst'],
};

/** `/metrics/[key]`: national readings for two familiar instruments of each type the metric applies to. */
export function getMetricExamples(key: MetricKey, filter: FilterSpec): Array<{ instrument: Instrument; reading: MetricReading }> {
  return METRICS[key].applies_to.flatMap(type => METRIC_EXAMPLES[type]
    .map(slug => getInstrument(slug))
    .filter((i): i is Instrument => Boolean(i))
    .map(instrument => ({ instrument, reading: computeMetric(instrument.slug, key, filter) })));
}
