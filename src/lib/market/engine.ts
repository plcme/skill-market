import { expandFilterToCells, type CellSet, type RightsBucket, type SeniorityBucket } from '@/lib/filters/spec';
import { getLocation, LEAF_IDS, stateOf } from '@/lib/filters/locations';
import { METRICS, metricSource, signalMetric } from '@/lib/metrics/registry';
import { getInstrument, INSTRUMENTS, premiumOf, profileOf, salaryOf, type SkillProfile } from './catalog';
import type {
  ActiveInstrumentType, Breakdown, BreakdownBucket, BreakdownBucketKey, BreakdownDimension, ExperienceBucket, FilterSpec, Instrument,
  InstrumentSnapshot, MetricKey, MetricReading, SeriesPoint, Signal, WorkMode,
} from './types';
import { EXPERIENCE_BUCKETS, WORK_MODES } from './types';

// Deterministic synthetic market (illustrative only). Each instrument has a weekly
// national series; cells are weighted by location × work mode × seniority × work
// rights, so any FilterSpec aggregates exactly like the real cell model
// (ARCHITECTURE A4 / §6.3).

export const DATA_AS_OF = '2026-09-21';
export const WEEKS = 104;
const UNIVERSE_WEEKLY = 3400;
export const SOURCE_IDS = { ads: 'job-ads-fixture', official: 'jsa-ivi-fixture', practitioner: 'platform-debriefs' } as const;

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;
const asOf = Date.parse(`${DATA_AS_OF}T00:00:00Z`);

export function weekDate(index: number): string {
  return new Date(asOf - (WEEKS - 1 - index) * 7 * DAY).toISOString().slice(0, 10);
}

function isoDaysBefore(days: number): string {
  return new Date(asOf - days * DAY).toISOString().slice(0, 10);
}

// --- Location & mode weights -------------------------------------------------

const STATE_BASE: Record<string, number> = {
  'au-nsw': 0.37, 'au-vic': 0.29, 'au-qld': 0.12, 'au-wa': 0.07, 'au-sa': 0.04,
  'au-act': 0.055, 'au-tas': 0.01, 'au-nt': 0.005, nz: 0.04,
};
const WITHIN_STATE: Record<string, number> = {
  'au-nsw-sydney-cbd': 0.5, 'au-nsw-sydney-north': 0.2, 'au-nsw-sydney-west': 0.16, 'au-nsw-newcastle': 0.08, 'au-nsw-wollongong': 0.06,
  'au-vic-melbourne-cbd': 0.52, 'au-vic-melbourne-south': 0.22, 'au-vic-melbourne-east': 0.18, 'au-vic-geelong': 0.08,
  'au-qld-brisbane': 0.86, 'au-qld-goldcoast': 0.14,
  'au-wa-perth': 1, 'au-sa-adelaide': 1, 'au-act-canberra': 1, 'au-tas-hobart': 1, 'au-nt-darwin': 1,
  'nz-auckland': 0.62, 'nz-wellington': 0.38,
};
const MODE_BASE: Record<WorkMode, number> = { onsite: 0.5, hybrid: 0.36, remote: 0.14 };

interface Model {
  slug: string;
  type: ActiveInstrumentType;
  p: SkillProfile;
  /** Weekly national ad counts (all cells). */
  weekly: number[];
  /** Per-leaf weight at t=0 and t=end (linear drift between). */
  leaf0: Map<string, number>;
  leaf1: Map<string, number>;
  mode: Record<WorkMode, number>;
}

const models = new Map<string, Model>();

function seasonal(week: number): number {
  // Summer slow-down around early January, small spring lift.
  const date = new Date(Date.parse(weekDate(week)));
  const doy = (date.getUTCMonth() * 30.4 + date.getUTCDate()) / 365;
  const raw = Math.abs(doy - 0.02);
  const d = Math.min(raw, 1 - raw);
  return 1 - 0.28 * Math.exp(-(d ** 2) / 0.0015) + 0.04 * Math.sin(2 * Math.PI * (doy - 0.6));
}

function universeWeekly(): number[] {
  const r = rng('universe');
  return Array.from({ length: WEEKS }, (_, w) => UNIVERSE_WEEKLY * (1 - 0.06 * (w / WEEKS)) * seasonal(w) * (0.96 + 0.08 * r()));
}
const UNIVERSE = universeWeekly();

function buildModel(inst: Instrument): Model {
  const p = profileOf(inst.slug);
  const r = rng(inst.slug);
  const growthPerWeek = Math.log(1 + p.growth) / 52;
  const weekly = UNIVERSE.map((u, w) => {
    const base = u * p.share * Math.exp(growthPerWeek * w);
    const sinceKick = w - (WEEKS - 8);
    const kick = sinceKick > 0 ? 1 + p.kick * (sinceKick / 8) : 1;
    return base * kick * (0.9 + 0.2 * r());
  });
  const leaf0 = new Map<string, number>();
  const leaf1 = new Map<string, number>();
  let t0 = 0;
  let t1 = 0;
  for (const leaf of LEAF_IDS) {
    const state = stateOf(leaf) ?? 'au';
    const base = (STATE_BASE[state] ?? 0.01) * (WITHIN_STATE[leaf] ?? 1);
    const tilt = 0.7 + 0.6 * r();
    const drift = 0.85 + 0.35 * r();
    leaf0.set(leaf, base * tilt);
    leaf1.set(leaf, base * tilt * drift);
    t0 += base * tilt;
    t1 += base * tilt * drift;
  }
  for (const leaf of LEAF_IDS) {
    leaf0.set(leaf, (leaf0.get(leaf) ?? 0) / t0);
    leaf1.set(leaf, (leaf1.get(leaf) ?? 0) / t1);
  }
  const remote = MODE_BASE.remote * p.remoteTilt;
  const hybrid = MODE_BASE.hybrid * (0.85 + 0.3 * r());
  const onsite = Math.max(0.15, 1 - remote - hybrid);
  const total = remote + hybrid + onsite;
  return {
    slug: inst.slug,
    type: inst.type,
    p,
    weekly,
    leaf0,
    leaf1,
    mode: { onsite: onsite / total, hybrid: hybrid / total, remote: remote / total },
  };
}

function modelOf(slug: string): Model {
  let m = models.get(slug);
  if (!m) {
    const inst = getInstrument(slug);
    if (!inst) throw new Error(`Unknown instrument ${slug}`);
    m = buildModel(inst);
    models.set(slug, m);
  }
  return m;
}

function seniorityWeights(p: SkillProfile, week: number): Record<SeniorityBucket, number> {
  const sinceKick = week - (WEEKS - 8);
  const kick = sinceKick > 0 ? (p.entryKick ?? 0) * (sinceKick / 8) : 0;
  const entry = Math.min(0.9, Math.max(0.01, p.entry - p.entryDrift / 2 + p.entryDrift * (week / (WEEKS - 1)) + kick));
  const grad = entry * 0.36;
  return { graduate: grad, entry_other: entry - grad, other: 1 - entry };
}

function rightsWeights(p: SkillProfile): Record<RightsBucket, number> {
  const sponsor = 0.06 * p.openRights;
  return { requires_pr: 1 - p.openRights, not_stated: p.openRights - sponsor, sponsorship_ok: sponsor };
}

function pairWeight(m: Model, cells: CellSet, week: number): number {
  const t = week / (WEEKS - 1);
  let sum = 0;
  for (const { leaf, mode } of cells.pairs) {
    const w = (m.leaf0.get(leaf) ?? 0) * (1 - t) + (m.leaf1.get(leaf) ?? 0) * t;
    sum += w * m.mode[mode];
  }
  return sum;
}

function bucketSum<K extends string>(weights: Record<K, number>, keys: readonly K[]): number {
  return keys.reduce((acc, k) => acc + weights[k], 0);
}

interface Slice {
  seniority?: readonly SeniorityBucket[];
  rights?: readonly RightsBucket[];
  /** Override work modes across every place in the filter (ignores the filter's modes). */
  modes?: readonly WorkMode[];
  /** Keep only the filter's own (place, mode) cells with these modes. */
  keepModes?: readonly WorkMode[];
}

/** Unrounded weekly counts for an instrument under a filter (optionally overriding buckets). */
function weeklyRaw(slug: string, filter: FilterSpec, slice: Slice = {}): number[] {
  const m = modelOf(slug);
  const cells = expandFilterToCells(filter);
  const pairs = slice.modes ? uniquePairs(cells, slice.modes) : cells.pairs;
  const effective: CellSet = {
    pairs: slice.keepModes ? pairs.filter(p => slice.keepModes?.includes(p.mode)) : pairs,
    seniority: [...(slice.seniority ?? cells.seniority)],
    rights: [...(slice.rights ?? cells.rights)],
  };
  const rightsW = bucketSum(rightsWeights(m.p), effective.rights);
  return m.weekly.map((n, w) => n * pairWeight(m, effective, w) * bucketSum(seniorityWeights(m.p, w), effective.seniority) * rightsW);
}

/** Weekly counts for an instrument under a filter (optionally overriding buckets). */
function weeklyCounts(slug: string, filter: FilterSpec, slice: Slice = {}): number[] {
  return weeklyRaw(slug, filter, slice).map(Math.round);
}

function uniquePairs(cells: CellSet, modes: readonly WorkMode[]): CellSet['pairs'] {
  const leaves = [...new Set(cells.pairs.map(p => p.leaf))];
  return leaves.flatMap(leaf => modes.map(mode => ({ leaf, mode })));
}

/** Denominator: all ads in the same cells (the universe is shaped like an average instrument). */
function universeCounts(filter: FilterSpec): number[] {
  const cells = expandFilterToCells(filter);
  const avg: SkillProfile = { share: 1, growth: 0, kick: 0, entry: 0.18, entryDrift: 0, openRights: 0.57, remoteTilt: 1, contract: 0.24 };
  const rightsW = bucketSum(rightsWeights(avg), cells.rights);
  let leafTotal = 0;
  const pairs = cells.pairs;
  for (const { leaf, mode } of pairs) {
    const state = stateOf(leaf) ?? 'au';
    leafTotal += (STATE_BASE[state] ?? 0.01) * (WITHIN_STATE[leaf] ?? 1) * MODE_BASE[mode];
  }
  const senW = bucketSum(seniorityWeights(avg, 0), cells.seniority);
  return UNIVERSE.map(u => Math.round(u * leafTotal * senW * rightsW));
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const lastN = (xs: number[], n: number, offset = 0) => xs.slice(xs.length - n - offset, xs.length - offset);

function reading(metric: MetricKey, type: ActiveInstrumentType, partial: Partial<MetricReading> & { sample_n: number }): MetricReading {
  const def = METRICS[metric];
  const source = metricSource(metric, type);
  const insufficient = partial.sample_n < def.min_sample;
  const days = def.window_days;
  return {
    metric,
    status: partial.status ?? (insufficient ? 'insufficient_sample' : 'ok'),
    value: insufficient ? null : partial.value ?? null,
    numerator: partial.numerator ?? null,
    denominator: partial.denominator ?? null,
    from: partial.from ?? null,
    to: partial.to ?? null,
    low: insufficient ? null : partial.low ?? null,
    high: insufficient ? null : partial.high ?? null,
    sample_n: partial.sample_n,
    min_sample: def.min_sample,
    window: { start: isoDaysBefore(days), end: DATA_AS_OF, days },
    source,
    source_id: SOURCE_IDS[source],
    updated_at: `${DATA_AS_OF}T19:05:00+10:00`,
  };
}

function shareOf(num: number, den: number): number {
  return den > 0 ? num / den : 0;
}

function rollingShare(num: number[], den: number[], width = 4): Array<number | null> {
  return num.map((_, i) => {
    if (i < width - 1) return null;
    const n = sum(num.slice(i - width + 1, i + 1));
    const d = sum(den.slice(i - width + 1, i + 1));
    return d > 0 ? n / d : null;
  });
}

function rollingSum(xs: number[], width = 4): Array<number | null> {
  return xs.map((_, i) => (i < width - 1 ? null : sum(xs.slice(i - width + 1, i + 1))));
}

function employerStats(count: number, slug: string): { distinct: number; top5: number } {
  const r = rng(`emp:${slug}`)();
  const distinct = Math.max(1, Math.round(Math.pow(count, 0.82) * (0.9 + 0.3 * r)));
  const top5 = Math.min(1, Math.max(0.08, 5 / Math.max(distinct, 5) + 0.12 + 0.1 * r));
  return { distinct, top5 };
}

const STATE_SALARY: Record<string, number> = { 'au-nsw': 1.06, 'au-vic': 1.0, 'au-qld': 0.94, 'au-wa': 0.98, 'au-sa': 0.9, 'au-act': 1.04, 'au-tas': 0.86, 'au-nt': 0.92, nz: 0.82 };

export function computeMetric(slug: string, metric: MetricKey, filter: FilterSpec): MetricReading {
  const inst = getInstrument(slug);
  if (!inst) throw new Error(`Unknown instrument ${slug}`);
  const type = inst.type;
  const def = METRICS[metric];
  if (!def.applies_to.includes(type)) {
    return reading(metric, type, { sample_n: 0, status: 'unavailable' });
  }
  const trackedDays = (asOf - Date.parse(`${inst.tracking_since}T00:00:00Z`)) / DAY;
  if (trackedDays < def.available_after_days && def.source[type] !== 'official') {
    return reading(metric, type, { sample_n: 0, status: 'unavailable' });
  }
  const counts = weeklyCounts(slug, filter);
  const last4 = sum(lastN(counts, 4));
  const m = modelOf(slug);

  switch (metric) {
    case 'ad_count': {
      // The denominator lets the Demand definition also state the share of ads.
      const den = sum(lastN(universeCounts(filter), 4));
      return reading(metric, type, { value: last4, numerator: last4, denominator: den, sample_n: last4 });
    }
    case 'share_of_ads': {
      const den = sum(lastN(universeCounts(filter), 4));
      return reading(metric, type, { value: shareOf(last4, den), numerator: last4, denominator: den, sample_n: last4 });
    }
    case 'change_4w': {
      const prev = sum(lastN(counts, 4, 4));
      return reading(metric, type, { value: prev > 0 ? (last4 - prev) / prev : null, from: prev, to: last4, sample_n: Math.min(prev, last4) });
    }
    case 'growth_12m': {
      const cur = sum(lastN(counts, 52));
      const prev = sum(lastN(counts, 52, 52));
      return reading(metric, type, { value: prev > 0 ? (cur - prev) / prev : null, from: prev, to: cur, sample_n: Math.min(prev, cur) });
    }
    case 'entry_level_share': {
      const all = sum(lastN(weeklyCounts(slug, filter, { seniority: ['graduate', 'entry_other', 'other'] }), 4));
      const entry = sum(lastN(weeklyCounts(slug, filter, { seniority: ['graduate', 'entry_other'] }), 4));
      return reading(metric, type, { value: shareOf(entry, all), numerator: entry, denominator: all, sample_n: all });
    }
    case 'no_pr_required_share': {
      const all = sum(lastN(weeklyCounts(slug, filter, { rights: ['requires_pr', 'not_stated', 'sponsorship_ok'] }), 4));
      const open = sum(lastN(weeklyCounts(slug, filter, { rights: ['not_stated', 'sponsorship_ok'] }), 4));
      return reading(metric, type, { value: shareOf(open, all), numerator: open, denominator: all, sample_n: all });
    }
    case 'remote_share': {
      const all = sum(lastN(weeklyCounts(slug, filter, { modes: ['onsite', 'hybrid', 'remote'] }), 4));
      const flex = sum(lastN(weeklyCounts(slug, filter, { modes: ['hybrid', 'remote'] }), 4));
      return reading(metric, type, { value: shareOf(flex, all), numerator: flex, denominator: all, sample_n: all });
    }
    case 'contract_share': {
      const contract = Math.round(last4 * m.p.contract);
      return reading(metric, type, { value: shareOf(contract, last4), numerator: contract, denominator: last4, sample_n: last4 });
    }
    case 'employer_concentration': {
      const { distinct, top5 } = employerStats(last4, slug);
      return reading(metric, type, { value: distinct, numerator: Math.round(top5 * last4), denominator: last4, high: top5, sample_n: last4 });
    }
    case 'salary_median':
    case 'salary_p10_p90': {
      const salary = salaryOf(slug);
      const year = sum(lastN(counts, 52));
      const withSalary = Math.round(year * 0.44);
      if (!salary) return reading(metric, type, { sample_n: 0, status: 'unavailable' });
      const cells = expandFilterToCells(filter);
      const leaves = [...new Set(cells.pairs.map(p => p.leaf))];
      const adj = leaves.length ? leaves.reduce((a, l) => a + (STATE_SALARY[stateOf(l) ?? 'au-vic'] ?? 1), 0) / leaves.length : 1;
      const senAdj = filter.seniority === 'graduate' ? 0.62 : filter.seniority === 'entry' ? 0.7 : 1;
      const median = Math.round((salary.median * adj * senAdj) / 1000) * 1000;
      const low = Math.round((median * (1 - salary.spread)) / 1000) * 1000;
      const high = Math.round((median * (1 + salary.spread * 1.15)) / 1000) * 1000;
      return reading(metric, type, { value: median, low, high, numerator: withSalary, denominator: year, sample_n: withSalary });
    }
    case 'skill_premium': {
      const premium = premiumOf(slug) ?? 0;
      const year = Math.round(sum(lastN(counts, 52)) * 0.44);
      return reading(metric, type, { value: premium, numerator: year, sample_n: year });
    }
    case 'skills_per_ad': {
      const salary = salaryOf(slug);
      return reading(metric, type, { value: salary?.skillsPerAd ?? null, sample_n: last4 });
    }
    case 'volatility': {
      const last12 = lastN(counts, 12);
      const mean = sum(last12) / 12;
      const sd = Math.sqrt(sum(last12.map(x => (x - mean) ** 2)) / 12);
      return reading(metric, type, { value: mean > 0 ? sd / mean : null, sample_n: sum(last12) });
    }
  }
}

/** Weekly series for charting a metric (null where not meaningful). */
export function computeSeries(slug: string, metric: MetricKey, filter: FilterSpec): SeriesPoint[] {
  const counts = weeklyCounts(slug, filter);
  let values: Array<number | null>;
  switch (metric) {
    case 'share_of_ads':
      values = rollingShare(counts, universeCounts(filter));
      break;
    case 'entry_level_share':
      values = rollingShare(weeklyCounts(slug, filter, { seniority: ['graduate', 'entry_other'] }), weeklyCounts(slug, filter, { seniority: ['graduate', 'entry_other', 'other'] }));
      break;
    case 'no_pr_required_share':
      values = rollingShare(weeklyCounts(slug, filter, { rights: ['not_stated', 'sponsorship_ok'] }), weeklyCounts(slug, filter, { rights: ['requires_pr', 'not_stated', 'sponsorship_ok'] }));
      break;
    case 'remote_share':
      values = rollingShare(weeklyCounts(slug, filter, { modes: ['hybrid', 'remote'] }), weeklyCounts(slug, filter, { modes: ['onsite', 'hybrid', 'remote'] }));
      break;
    default:
      // Count-based and change metrics chart the 4-week rolling ad count.
      values = rollingSum(counts);
  }
  return values.map((value, i) => ({ date: weekDate(i), value }));
}

/** Compact sparkline: 4-week rolling ad count sampled every 4 weeks over the last year. */
export function computeSparkline(slug: string, filter: FilterSpec): number[] {
  const rolled = rollingSum(weeklyCounts(slug, filter));
  const out: number[] = [];
  for (let i = WEEKS - 52; i < WEEKS; i += 4) out.push(rolled[i] ?? 0);
  out.push(rolled[WEEKS - 1] ?? 0);
  return out;
}

export const SIGNAL_THRESHOLDS = { relative: 0.25, absolute: 10, entryPp: 0.1 };

/** ARCHITECTURE §6.5: rise / fall / entry_open; only with sufficient sample. */
export function detectSignal(slug: string, filter: FilterSpec): Signal | null {
  const inst = getInstrument(slug);
  if (!inst) return null;
  const change = computeMetric(slug, 'change_4w', filter);
  const detected_at = `${DATA_AS_OF}T19:05:00+10:00`;
  const id = (kind: string) => `sig:${kind}:${slug}:${hashString(JSON.stringify(filter)).toString(36)}`;
  if (change.status === 'ok' && change.value !== null && change.from !== null && change.to !== null) {
    const delta = change.to - change.from;
    if (change.value >= SIGNAL_THRESHOLDS.relative && delta >= SIGNAL_THRESHOLDS.absolute) {
      return { id: id('rise'), kind: 'rise', instrument_slug: slug, metric: 'change_4w', magnitude: change.value, from: change.from, to: change.to, detected_at, filter };
    }
    if (change.value <= -SIGNAL_THRESHOLDS.relative && -delta >= SIGNAL_THRESHOLDS.absolute) {
      return { id: id('fall'), kind: 'fall', instrument_slug: slug, metric: 'change_4w', magnitude: change.value, from: change.from, to: change.to, detected_at, filter };
    }
  }
  const series = computeSeries(slug, 'entry_level_share', filter);
  const now = series[WEEKS - 1]?.value;
  const before = series[WEEKS - 9]?.value;
  const entry = computeMetric(slug, 'entry_level_share', filter);
  if (entry.status === 'ok' && now != null && before != null && now - before >= SIGNAL_THRESHOLDS.entryPp) {
    return { id: id('entry_open'), kind: 'entry_open', instrument_slug: slug, metric: 'entry_level_share', magnitude: now - before, from: before, to: now, detected_at, filter };
  }
  return null;
}

export function snapshot(slug: string, metric: MetricKey, filter: FilterSpec): InstrumentSnapshot {
  const instrument = getInstrument(slug);
  if (!instrument) throw new Error(`Unknown instrument ${slug}`);
  return {
    instrument,
    metric: computeMetric(slug, metric, filter),
    change: computeMetric(slug, signalMetric(instrument.type), filter),
    entry_share: computeMetric(slug, 'entry_level_share', filter),
    sparkline: computeSparkline(slug, filter),
    signal: detectSignal(slug, filter),
  };
}

/** Where the ads are: per-state counts for the location breakdown panel. */
export function locationBreakdown(slug: string, filter: FilterSpec): Array<{ location_id: string; name: string; count: number }> {
  const cells = expandFilterToCells(filter);
  const byState = new Map<string, string[]>();
  for (const { leaf } of cells.pairs) {
    const state = stateOf(leaf) ?? leaf;
    const list = byState.get(state) ?? [];
    if (!list.includes(leaf)) list.push(leaf);
    byState.set(state, list);
  }
  const out: Array<{ location_id: string; name: string; count: number }> = [];
  for (const [state, leaves] of byState) {
    const modes = [...new Set(cells.pairs.filter(p => leaves.includes(p.leaf)).map(p => p.mode))];
    const sub: FilterSpec = { rules: [{ work_modes: modes, location_ids: leaves }], seniority: filter.seniority, work_rights: filter.work_rights };
    const count = sum(lastN(weeklyCounts(slug, sub), 4));
    out.push({ location_id: state, name: getLocation(state)?.name ?? state, count });
  }
  return out.sort((a, b) => b.count - a.count);
}

/** Pearson correlation of weekly counts — "do these move together?" in compare view. */
export function correlation(a: string, b: string, filter: FilterSpec): number {
  const xa = lastN(weeklyCounts(a, filter), 52);
  const xb = lastN(weeklyCounts(b, filter), 52);
  const ma = sum(xa) / xa.length;
  const mb = sum(xb) / xb.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < xa.length; i++) {
    num += (xa[i] - ma) * (xb[i] - mb);
    da += (xa[i] - ma) ** 2;
    db += (xb[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

// --- Industry × skill segments ------------------------------------------------

/**
 * Weekly ads in an industry that mention a skill. Level = the industry's
 * weekly ads × `weight` (share of the industry's ads mentioning the skill);
 * shape = the skill's own share of all ads relative to its level over the
 * last `anchorWeeks`, so a skill that is rising overall also rises inside the
 * industry. Pure; exported for tests.
 */
export function segmentCounts(industry: readonly number[], skill: readonly number[], universe: readonly number[], weight: number, anchorWeeks = 8): number[] {
  const rel = skill.map((n, i) => (universe[i] ? n / universe[i] : 0));
  const anchor = rel.slice(-anchorWeeks);
  const mean = anchor.length ? anchor.reduce((a, b) => a + b, 0) / anchor.length : 0;
  return industry.map((n, i) => Math.round(n * weight * (mean > 0 ? rel[i] / mean : 1)));
}

/** Job ads (last 4 weeks) and 4-week change for one skill inside one industry. */
export function industrySkillReadings(industrySlug: string, skillSlug: string, weight: number, filter: FilterSpec): { ad_count: MetricReading; change_4w: MetricReading } {
  const counts = segmentCounts(weeklyCounts(industrySlug, filter), weeklyCounts(skillSlug, filter), universeCounts(filter), weight);
  const last4 = sum(lastN(counts, 4));
  const prev = sum(lastN(counts, 4, 4));
  const industryLast4 = sum(lastN(weeklyCounts(industrySlug, filter), 4));
  return {
    ad_count: reading('ad_count', 'industry', { value: last4, numerator: last4, denominator: industryLast4, sample_n: last4 }),
    change_4w: reading('change_4w', 'industry', { value: prev > 0 ? (last4 - prev) / prev : null, from: prev, to: last4, sample_n: Math.min(prev, last4) }),
  };
}

export function allSlugs(type?: ActiveInstrumentType): string[] {
  return INSTRUMENTS.filter(i => !type || i.type === type).map(i => i.slug);
}

// --- Breakdown (B1 prototype) ---------------------------------------------------

/**
 * Split of the non-entry ads (`other` seniority bucket) into mid / senior /
 * expert. Instruments with fewer entry-level ads skew more senior. Fixture
 * proportions, shaped like ads that state years of experience.
 */
export function experienceSplit(entryShare: number): Record<Exclude<ExperienceBucket, 'entry'>, number> {
  const s = Math.min(1, Math.max(0, (0.3 - entryShare) / 0.25));
  const mid = 0.5 - 0.14 * s;
  const senior = 0.34 + 0.06 * s;
  return { mid, senior, expert: 1 - mid - senior };
}

const RIGHTS_ORDER: readonly RightsBucket[] = ['requires_pr', 'not_stated', 'sponsorship_ok'];

/** Salary multipliers per bucket relative to the role's all-levels median (fixture). */
const SALARY_ADJ: Record<BreakdownBucketKey, number> = {
  entry: 0.7, mid: 0.94, senior: 1.14, expert: 1.36,
  requires_pr: 1.04, not_stated: 0.97, sponsorship_ok: 1.09,
  onsite: 0.97, hybrid: 1.02, remote: 1.05,
};
const SALARY_STATED_SHARE = 0.44;

/** Buckets of a dimension inside the filter, each with its unrounded weekly counts. */
function bucketCounts(slug: string, filter: FilterSpec, by: BreakdownDimension): { all: BreakdownBucketKey[]; rows: Array<{ key: BreakdownBucketKey; raw: number[] }> } {
  const cells = expandFilterToCells(filter);
  if (by === 'mode') {
    const present = WORK_MODES.filter(mode => cells.pairs.some(p => p.mode === mode));
    return { all: [...WORK_MODES], rows: present.map(mode => ({ key: mode, raw: weeklyRaw(slug, filter, { keepModes: [mode] }) })) };
  }
  if (by === 'rights') {
    const present = RIGHTS_ORDER.filter(r => cells.rights.includes(r));
    return { all: [...RIGHTS_ORDER], rows: present.map(r => ({ key: r, raw: weeklyRaw(slug, filter, { rights: [r] }) })) };
  }
  const rows: Array<{ key: BreakdownBucketKey; raw: number[] }> = [];
  const entry = cells.seniority.filter(b => b !== 'other');
  if (entry.length) rows.push({ key: 'entry', raw: weeklyRaw(slug, filter, { seniority: entry }) });
  if (cells.seniority.includes('other')) {
    const other = weeklyRaw(slug, filter, { seniority: ['other'] });
    const split = experienceSplit(profileOf(slug).entry);
    for (const key of ['mid', 'senior', 'expert'] as const) rows.push({ key, raw: other.map(n => n * split[key]) });
  }
  return { all: [...EXPERIENCE_BUCKETS], rows };
}

/**
 * Split the current measure by one dimension (GLOSSARY §2 "Breakdown").
 * Additive `ad_count` → stacked bands that sum to the unbroken total.
 * Non-additive `salary_median` (roles only) → one line per bucket, with gaps
 * where too few ads state a salary. Any other measure falls back to job ads.
 * Respects the table filter: only buckets inside it are returned.
 */
export function computeBreakdown(slug: string, metric: MetricKey, filter: FilterSpec, by: BreakdownDimension): Breakdown {
  const inst = getInstrument(slug);
  if (!inst) throw new Error(`Unknown instrument ${slug}`);
  const type = inst.type;
  const def = METRICS[metric];
  const kind = def.breakdown && def.applies_to.includes(type) && (def.breakdown !== 'lines' || salaryOf(slug)) ? def.breakdown : 'stack';
  const measure: MetricKey = kind === 'lines' ? metric : 'ad_count';
  const { all, rows } = bucketCounts(slug, filter, by);
  const filtered_to = rows.length < all.length ? rows.map(r => r.key) : null;
  const estimated = by !== 'mode';
  const counts = rows.map(r => ({ key: r.key, weekly: r.raw.map(Math.round) }));

  if (kind === 'stack') {
    const total = rollingSum(weeklyCounts(slug, filter)).map((value, i) => ({ date: weekDate(i), value }));
    const totalLast4 = sum(counts.map(c => sum(lastN(c.weekly, 4))));
    const buckets: BreakdownBucket[] = counts.map(c => {
      const last4 = sum(lastN(c.weekly, 4));
      return {
        key: c.key,
        series: rollingSum(c.weekly).map((value, i) => ({ date: weekDate(i), value })),
        latest: reading('ad_count', type, { value: last4, numerator: last4, denominator: totalLast4, sample_n: last4 }),
        share: totalLast4 > 0 ? last4 / totalLast4 : null,
      };
    });
    return { by, kind, measure, requested: metric, buckets, total, filtered_to, estimated, salary_stated: null, insufficient: [] };
  }

  // Lines: rolling 52-week median salary per bucket (same window as the metric).
  const salary = salaryOf(slug);
  const cells = expandFilterToCells(filter);
  const leaves = [...new Set(cells.pairs.map(p => p.leaf))];
  const placeAdj = leaves.length ? leaves.reduce((a, l) => a + (STATE_SALARY[stateOf(l) ?? 'au-vic'] ?? 1), 0) / leaves.length : 1;
  const senAdj = by === 'experience' ? 1 : filter.seniority === 'graduate' ? 0.62 : filter.seniority === 'entry' ? 0.7 : 1;
  const growthPerWeek = 0.03 / 52;
  const min = def.min_sample;
  const insufficient: BreakdownBucketKey[] = [];
  let withSalary = 0;
  let totalAds = 0;
  const buckets: BreakdownBucket[] = counts.map(c => {
    // A rolling 12-month median moves slowly: gentle drift plus a small seasonal wave.
    const phase = rng(`salary:${slug}:${c.key}`)() * Math.PI * 2;
    const base = (salary?.median ?? 0) * placeAdj * senAdj * SALARY_ADJ[c.key];
    const series: SeriesPoint[] = c.weekly.map((_, i) => {
      if (i < 51) return { date: weekDate(i), value: null };
      const stated = Math.round(sum(c.weekly.slice(i - 51, i + 1)) * SALARY_STATED_SHARE);
      const v = base * (1 + growthPerWeek * (i - (WEEKS - 1))) * (1 + 0.006 * Math.sin(i / 9 + phase));
      return { date: weekDate(i), value: stated >= min ? Math.round(v / 500) * 500 : null };
    });
    const year = sum(lastN(c.weekly, 52));
    const stated = Math.round(year * SALARY_STATED_SHARE);
    withSalary += stated;
    totalAds += year;
    const value = series[WEEKS - 1]?.value ?? null;
    const latest = reading('salary_median', type, { value, numerator: stated, denominator: year, sample_n: stated });
    if (latest.status !== 'ok') insufficient.push(c.key);
    return { key: c.key, series, latest, share: null };
  });
  return { by, kind, measure, requested: metric, buckets, total: null, filtered_to, estimated, salary_stated: { with_salary: withSalary, total: totalAds }, insufficient };
}
