import { ACTIVE_INSTRUMENT_TYPES, type ActiveInstrumentType, type BreakdownDimension, type MetricKey, type SourceKind } from '@/lib/market/types';

// Single source of truth for metrics (ARCHITECTURE §6.4, PRD §7.1 validity matrix).
// Human copy (label, definition, denominator, method, caveat) lives in
// messages under `Metrics.<key>` so this file stays language-neutral.

export type MetricUnit = 'count' | 'share' | 'change' | 'aud' | 'aud_range' | 'employers' | 'premium' | 'ratio' | 'cv';
export type MetricTier = 'common' | 'advanced';

export interface MetricDefinition {
  key: MetricKey;
  applies_to: readonly ActiveInstrumentType[];
  default_for: readonly ActiveInstrumentType[];
  tier: MetricTier;
  unit: MetricUnit;
  /** Source per instrument type (roles' 12-month growth comes from official series). */
  source: Partial<Record<ActiveInstrumentType, SourceKind>>;
  window_days: number;
  min_sample: number;
  available_after_days: number;
  /** Derived from ad text by extraction rules — UI must show the method and known error. */
  text_derived: boolean;
  /** Filters this metric deliberately ignores so the ratio stays meaningful. */
  ignores: readonly ('seniority' | 'work_rights' | 'work_mode')[];
  /** A weekly series can be charted. */
  chartable: boolean;
  /** Higher-is-neither: we never colour these as good/bad. */
  neutral: boolean;
  /**
   * Offered in measure switchers. `false` keeps the metric computable (old
   * URLs, watchlist items, docs page) but it is explained inside another
   * metric's definition instead of being a user-facing measure (GLOSSARY §3).
   */
  selectable: boolean;
  /**
   * How the detail chart draws this measure as a weekly series: additive
   * counts stack (bands sum to the total), non-additive values (medians,
   * shares, distinct employers) draw one line per bucket. null = no weekly
   * series; the chart falls back to Job ads (GLOSSARY §2).
   */
  breakdown: 'stack' | 'lines' | null;
}

/** Every active type: skill, role and industry. */
const ALL = ['skill', 'role', 'industry'] as const;
const ADS = { skill: 'ads', role: 'ads', industry: 'ads' } as const;

export const MIN_SAMPLE_DEFAULT = 30;

export const METRICS: Record<MetricKey, MetricDefinition> = {
  ad_count: { key: 'ad_count', applies_to: ALL, default_for: ['skill', 'industry'], tier: 'common', unit: 'count', source: ADS, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: false, ignores: [], chartable: true, neutral: true, selectable: true, breakdown: 'stack' },
  share_of_ads: { key: 'share_of_ads', applies_to: ALL, default_for: [], tier: 'common', unit: 'share', source: ADS, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: false, ignores: [], chartable: true, neutral: true, selectable: false, breakdown: null },
  change_4w: { key: 'change_4w', applies_to: ALL, default_for: [], tier: 'common', unit: 'change', source: ADS, window_days: 56, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 56, text_derived: false, ignores: [], chartable: true, neutral: false, selectable: true, breakdown: null },
  growth_12m: { key: 'growth_12m', applies_to: ALL, default_for: ['role'], tier: 'common', unit: 'change', source: { skill: 'ads', role: 'official', industry: 'ads' }, window_days: 728, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 730, text_derived: false, ignores: [], chartable: true, neutral: false, selectable: true, breakdown: null },
  entry_level_share: { key: 'entry_level_share', applies_to: ALL, default_for: [], tier: 'common', unit: 'share', source: ADS, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: true, ignores: ['seniority'], chartable: true, neutral: true, selectable: true, breakdown: 'lines' },
  no_pr_required_share: { key: 'no_pr_required_share', applies_to: ALL, default_for: [], tier: 'common', unit: 'share', source: ADS, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: true, ignores: ['work_rights'], chartable: true, neutral: true, selectable: true, breakdown: 'lines' },
  employer_concentration: { key: 'employer_concentration', applies_to: ALL, default_for: [], tier: 'common', unit: 'employers', source: ADS, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: false, ignores: [], chartable: false, neutral: true, selectable: true, breakdown: 'lines' },
  salary_median: { key: 'salary_median', applies_to: ['skill', 'role'], default_for: [], tier: 'common', unit: 'aud', source: { skill: 'ads', role: 'ads' }, window_days: 365, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: false, ignores: [], chartable: false, neutral: true, selectable: true, breakdown: 'lines' },
  salary_p10_p90: { key: 'salary_p10_p90', applies_to: ['role'], default_for: [], tier: 'advanced', unit: 'aud_range', source: { role: 'ads' }, window_days: 365, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: false, ignores: [], chartable: false, neutral: true, selectable: true, breakdown: null },
  skill_premium: { key: 'skill_premium', applies_to: ['skill'], default_for: [], tier: 'advanced', unit: 'premium', source: { skill: 'ads' }, window_days: 365, min_sample: MIN_SAMPLE_DEFAULT * 2, available_after_days: 0, text_derived: false, ignores: [], chartable: false, neutral: true, selectable: true, breakdown: null },
  remote_share: { key: 'remote_share', applies_to: ALL, default_for: [], tier: 'advanced', unit: 'share', source: ADS, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: true, ignores: ['work_mode'], chartable: true, neutral: true, selectable: true, breakdown: 'lines' },
  contract_share: { key: 'contract_share', applies_to: ALL, default_for: [], tier: 'advanced', unit: 'share', source: ADS, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: true, ignores: [], chartable: false, neutral: true, selectable: true, breakdown: 'lines' },
  skills_per_ad: { key: 'skills_per_ad', applies_to: ['role'], default_for: [], tier: 'advanced', unit: 'ratio', source: { role: 'ads' }, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: true, ignores: [], chartable: false, neutral: true, selectable: true, breakdown: null },
  volatility: { key: 'volatility', applies_to: ALL, default_for: [], tier: 'advanced', unit: 'cv', source: ADS, window_days: 84, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 84, text_derived: false, ignores: [], chartable: false, neutral: true, selectable: true, breakdown: null },
};

export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

export function isValidMetric(type: ActiveInstrumentType, key: string): key is MetricKey {
  return key in METRICS && METRICS[key as MetricKey].applies_to.includes(type);
}

export function defaultMetric(type: ActiveInstrumentType): MetricKey {
  return METRIC_KEYS.find(k => METRICS[k].default_for.includes(type)) ?? 'ad_count';
}

/** FR-M4: only valid, selectable combinations, grouped default → common → advanced. */
export function metricsFor(type: ActiveInstrumentType): { default: MetricKey; common: MetricKey[]; advanced: MetricKey[] } {
  const def = defaultMetric(type);
  const valid = METRIC_KEYS.filter(k => METRICS[k].applies_to.includes(type) && METRICS[k].selectable && k !== def);
  return {
    default: def,
    common: valid.filter(k => METRICS[k].tier === 'common'),
    advanced: valid.filter(k => METRICS[k].tier === 'advanced'),
  };
}

/** Metrics that can be shown on a board for every active type at once (the All board). */
export function sharedMetrics(): MetricKey[] {
  return METRIC_KEYS.filter(k => ACTIVE_INSTRUMENT_TYPES.every(t => METRICS[k].applies_to.includes(t)) && METRICS[k].selectable);
}

export function metricSource(key: MetricKey, type: ActiveInstrumentType): SourceKind {
  return METRICS[key].source[type] ?? 'ads';
}

/** The change metric that sits next to values in lists and drives signals. */
export function signalMetric(type: ActiveInstrumentType): MetricKey {
  // Industries move with the cycle, so the short window is the useful one (as for skills).
  return type === 'role' ? 'growth_12m' : 'change_4w';
}

/**
 * Level measures the detail chart can draw as a weekly series — the chart's
 * Y axis options, in menu order (GLOSSARY §2). Change measures are not
 * options: they chart Job ads with the compared windows marked
 * (`chartPlanFor` in features/market/logic.ts).
 */
export const CHART_SERIES: readonly MetricKey[] = ['ad_count', 'salary_median', 'entry_level_share', 'no_pr_required_share', 'employer_concentration', 'remote_share', 'contract_share'];

/** Y axis options valid for a type (industries have no salary). */
export function chartSeriesFor(type: ActiveInstrumentType): MetricKey[] {
  return CHART_SERIES.filter(m => isValidMetric(type, m) && METRICS[m].breakdown !== null);
}

/** `?metric=` for a detail page: valid, selectable measures only; anything else is the type's default. */
export function resolveDetailMetric(type: ActiveInstrumentType, metric?: string | null): MetricKey {
  return metric && isValidMetric(type, metric) && METRICS[metric].selectable ? metric : defaultMetric(type);
}

/**
 * The dimension a share measure is about: splitting it by that dimension
 * would be degenerate (entry-level share by experience is 100% / 0%), so the
 * chart draws it unsplit.
 */
export function measureFixedSplit(series: MetricKey): BreakdownDimension | null {
  if (series === 'entry_level_share') return 'experience';
  if (series === 'no_pr_required_share') return 'rights';
  if (series === 'remote_share') return 'mode';
  return null;
}
