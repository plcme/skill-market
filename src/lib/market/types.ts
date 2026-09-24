// Shared market domain types. Mirrors docs/ARCHITECTURE.md §5.1 / §6.3 so the
// fixture engine can be swapped for Supabase-backed queries without UI changes.

export type InstrumentType = 'skill' | 'role' | 'industry' | 'employer' | 'credential';
/** Types open in the MVP (FR-D7). */
export type ActiveInstrumentType = Extract<InstrumentType, 'skill' | 'role'>;
export const ACTIVE_INSTRUMENT_TYPES: readonly ActiveInstrumentType[] = ['skill', 'role'];

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
