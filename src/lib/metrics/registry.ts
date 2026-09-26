import type { ActiveInstrumentType, MetricKey, SourceKind } from '@/lib/market/types';

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
}

const BOTH = ['skill', 'role'] as const;
const ADS = { skill: 'ads', role: 'ads' } as const;

export const MIN_SAMPLE_DEFAULT = 30;

export const METRICS: Record<MetricKey, MetricDefinition> = {
  ad_count: { key: 'ad_count', applies_to: BOTH, default_for: ['skill'], tier: 'common', unit: 'count', source: ADS, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: false, ignores: [], chartable: true, neutral: true, selectable: true },
  share_of_ads: { key: 'share_of_ads', applies_to: BOTH, default_for: [], tier: 'common', unit: 'share', source: ADS, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: false, ignores: [], chartable: true, neutral: true, selectable: false },
  change_4w: { key: 'change_4w', applies_to: BOTH, default_for: [], tier: 'common', unit: 'change', source: ADS, window_days: 56, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 56, text_derived: false, ignores: [], chartable: true, neutral: false, selectable: true },
  growth_12m: { key: 'growth_12m', applies_to: BOTH, default_for: ['role'], tier: 'common', unit: 'change', source: { skill: 'ads', role: 'official' }, window_days: 728, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 730, text_derived: false, ignores: [], chartable: true, neutral: false, selectable: true },
  entry_level_share: { key: 'entry_level_share', applies_to: BOTH, default_for: [], tier: 'common', unit: 'share', source: ADS, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: true, ignores: ['seniority'], chartable: true, neutral: true, selectable: true },
  no_pr_required_share: { key: 'no_pr_required_share', applies_to: BOTH, default_for: [], tier: 'common', unit: 'share', source: ADS, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: true, ignores: ['work_rights'], chartable: true, neutral: true, selectable: true },
  employer_concentration: { key: 'employer_concentration', applies_to: BOTH, default_for: [], tier: 'common', unit: 'employers', source: ADS, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: false, ignores: [], chartable: false, neutral: true, selectable: true },
  salary_median: { key: 'salary_median', applies_to: ['role'], default_for: [], tier: 'common', unit: 'aud', source: { role: 'ads' }, window_days: 365, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: false, ignores: [], chartable: false, neutral: true, selectable: true },
  salary_p10_p90: { key: 'salary_p10_p90', applies_to: ['role'], default_for: [], tier: 'advanced', unit: 'aud_range', source: { role: 'ads' }, window_days: 365, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: false, ignores: [], chartable: false, neutral: true, selectable: true },
  skill_premium: { key: 'skill_premium', applies_to: ['skill'], default_for: [], tier: 'advanced', unit: 'premium', source: { skill: 'ads' }, window_days: 365, min_sample: MIN_SAMPLE_DEFAULT * 2, available_after_days: 0, text_derived: false, ignores: [], chartable: false, neutral: true, selectable: true },
  remote_share: { key: 'remote_share', applies_to: BOTH, default_for: [], tier: 'advanced', unit: 'share', source: ADS, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: true, ignores: ['work_mode'], chartable: true, neutral: true, selectable: true },
  contract_share: { key: 'contract_share', applies_to: BOTH, default_for: [], tier: 'advanced', unit: 'share', source: ADS, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: true, ignores: [], chartable: false, neutral: true, selectable: true },
  skills_per_ad: { key: 'skills_per_ad', applies_to: ['role'], default_for: [], tier: 'advanced', unit: 'ratio', source: { role: 'ads' }, window_days: 28, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 0, text_derived: true, ignores: [], chartable: false, neutral: true, selectable: true },
  volatility: { key: 'volatility', applies_to: BOTH, default_for: [], tier: 'advanced', unit: 'cv', source: ADS, window_days: 84, min_sample: MIN_SAMPLE_DEFAULT, available_after_days: 84, text_derived: false, ignores: [], chartable: false, neutral: true, selectable: true },
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

/** Metrics that can be shown on a board for both types at once. */
export function sharedMetrics(): MetricKey[] {
  return METRIC_KEYS.filter(k => METRICS[k].applies_to.length === 2 && METRICS[k].selectable);
}

export function metricSource(key: MetricKey, type: ActiveInstrumentType): SourceKind {
  return METRICS[key].source[type] ?? 'ads';
}

/** The change metric that sits next to values in lists and drives signals. */
export function signalMetric(type: ActiveInstrumentType): MetricKey {
  return type === 'role' ? 'growth_12m' : 'change_4w';
}
