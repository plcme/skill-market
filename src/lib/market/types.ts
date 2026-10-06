// Shared market domain types. Mirrors docs/ARCHITECTURE.md §5.1 / §6.3 so the
// fixture engine can be swapped for Supabase-backed queries without UI changes.

export type InstrumentType = 'skill' | 'role' | 'industry' | 'employer' | 'credential';
/** Types open in the MVP (FR-D7). */
export type ActiveInstrumentType = Extract<InstrumentType, 'skill' | 'role' | 'industry'>;
export const ACTIVE_INSTRUMENT_TYPES: readonly ActiveInstrumentType[] = ['skill', 'role', 'industry'];

export type WorkMode = 'onsite' | 'hybrid' | 'remote';
export const WORK_MODES: readonly WorkMode[] = ['onsite', 'hybrid', 'remote'];

/** `entry` ⊇ graduate + junior + intern. */
export type Seniority = 'entry' | 'graduate' | 'all';
export type WorkRights = 'no_pr_required' | 'all';

export interface FilterRule {
  work_modes: WorkMode[];
  location_ids: string[];
}

export interface FilterSpec {
  /** Rules are OR-ed together (union of cells). */
  rules: FilterRule[];
  seniority: Seniority;
  work_rights: WorkRights;
}

export type SourceKind = 'official' | 'ads' | 'practitioner';

/**
 * Australian Skills Classification layer of a trackable skill. Core
 * competencies (the third ASC layer) are not instruments — see
 * `src/lib/market/competencies.ts`.
 */
export type SkillLayer = 'technology_tool' | 'specialist_task';
export const SKILL_LAYERS: readonly SkillLayer[] = ['technology_tool', 'specialist_task'];

export type LearningEffort = 'weeks' | 'months' | 'year_plus';
export type Transferability = 'narrow' | 'moderate' | 'broad';

export interface Instrument {
  id: string;
  slug: string;
  type: ActiveInstrumentType;
  name: string;
  /** Short ticker-style symbol shown in mono (e.g. PY, SQL). */
  symbol: string;
  category: string;
  aliases: string[];
  /** ANZSCO 6-digit code for roles when a single code applies. */
  anzsco: string | null;
  /** ANZSIC code for industries (Division letter, e.g. `Q`); null otherwise. */
  anzsic: string | null;
  /**
   * Parent instrument id. Reserved for sub-industries (ANZSIC Subdivision/Group,
   * granularity undecided — GLOSSARY §5); always null today and not shown in UI.
   */
  parent_id: string | null;
  /** ASC layer for skills; null for roles and industries. */
  skill_layer: SkillLayer | null;
  blurb: string;
  learning_effort: LearningEffort;
  transferability: Transferability;
  /** First day the instrument was tracked (drives `available_after_days`). */
  tracking_since: string;
}

export interface RoleComponent {
  skill_slug: string;
  /** Share of this role's ads that mention the skill (0–1). */
  weight: number;
}

/** Industry → skill link: same shape as RoleComponent; weight = share of the industry's ads mentioning the skill (0–1). */
export type IndustryComponent = RoleComponent;

export type LocationLevel = 'country' | 'state' | 'city' | 'region';

export interface Location {
  id: string;
  name: string;
  short: string;
  level: LocationLevel;
  parent_id: string | null;
}

export type MetricKey =
  | 'ad_count'
  | 'share_of_ads'
  | 'change_4w'
  | 'growth_12m'
  | 'entry_level_share'
  | 'no_pr_required_share'
  | 'employer_concentration'
  | 'salary_median'
  | 'salary_p10_p90'
  | 'skill_premium'
  | 'remote_share'
  | 'contract_share'
  | 'skills_per_ad'
  | 'volatility';

export type ReadingStatus = 'ok' | 'insufficient_sample' | 'unavailable';

export interface MetricWindow {
  start: string;
  end: string;
  days: number;
}

/** One number plus everything needed to explain it (FR-D2). */
export interface MetricReading {
  metric: MetricKey;
  status: ReadingStatus;
  /** Canonical value: counts, ratios in 0–1, AUD, or relative change (0.38 = +38%). */
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  /** For change metrics: absolute counts before → after (FR-D3). */
  from: number | null;
  to: number | null;
  /** For ranges / employer concentration extras. */
  low: number | null;
  high: number | null;
  sample_n: number;
  min_sample: number;
  window: MetricWindow;
  source: SourceKind;
  source_id: string;
  updated_at: string;
}

export interface SeriesPoint {
  /** ISO date of week end. */
  date: string;
  value: number | null;
}

export type SignalKind = 'rise' | 'fall' | 'entry_open' | 'since_added';

export interface Signal {
  id: string;
  kind: SignalKind;
  instrument_slug: string;
  metric: MetricKey;
  /** Relative change for rise/fall/since_added; percentage-point delta for entry_open. */
  magnitude: number;
  from: number;
  to: number;
  detected_at: string;
  filter: FilterSpec;
}

export interface InstrumentSnapshot {
  instrument: Instrument;
  metric: MetricReading;
  /** The signal-bearing change that sits next to the value in lists. */
  change: MetricReading;
  entry_share: MetricReading;
  sparkline: number[];
  signal: Signal | null;
}

export interface DataSource {
  id: string;
  kind: SourceKind;
  name: string;
  licence: string;
  cadence: string;
  last_run_at: string;
  status: 'healthy' | 'delayed' | 'failed';
  url: string | null;
}

// --- Breakdown (GLOSSARY §2, DESIGN §6.3) -------------------------------------

/** One dimension at a time; `?by=` on detail pages. Location is a filter, never a breakdown. */
export type BreakdownDimension = 'experience' | 'rights' | 'mode';
export const BREAKDOWN_DIMENSIONS: readonly BreakdownDimension[] = ['experience', 'rights', 'mode'];

/** Years of experience asked for: entry 0–2 (incl. graduate), mid 3–5, senior 6–9, expert 10+. */
export type ExperienceBucket = 'entry' | 'mid' | 'senior' | 'expert';
export const EXPERIENCE_BUCKETS: readonly ExperienceBucket[] = ['entry', 'mid', 'senior', 'expert'];

export type BreakdownRightsBucket = 'requires_pr' | 'not_stated' | 'sponsorship_ok';
export type BreakdownBucketKey = ExperienceBucket | BreakdownRightsBucket | WorkMode;

export interface BreakdownBucket {
  key: BreakdownBucketKey;
  /** Stack: 4-week rolling job ads. Lines: rolling 52-week median salary, null where the sample is too small. */
  series: SeriesPoint[];
  /** Latest value for the legend (job ads in the last 4 weeks, or median salary over 12 months). */
  latest: MetricReading;
  /** Stack only: bucket's share of the latest total (0–1); null for lines. */
  share: number | null;
}

export interface Breakdown {
  by: BreakdownDimension;
  kind: 'stack' | 'lines';
  /** The measure actually broken down (`ad_count` or `salary_median`). */
  measure: MetricKey;
  /** The page's selected measure; differs from `measure` when it can't be broken down. */
  requested: MetricKey;
  /** Buckets inside the filter, in dimension order. */
  buckets: BreakdownBucket[];
  /** Stack only: the unbroken total series (bands sum to it ± rounding). */
  total: SeriesPoint[] | null;
  /** Set when the table filter already narrows this dimension. */
  filtered_to: BreakdownBucketKey[] | null;
  /** Dimension is extracted from ad text (experience, work rights): show the method and "estimated". */
  estimated: boolean;
  /** Lines only: how many ads in the 12-month window state a salary. */
  salary_stated: { with_salary: number; total: number } | null;
  /** Lines only: buckets whose latest value is withheld for sample size. */
  insufficient: BreakdownBucketKey[];
}
