import { z } from 'zod';
import { filterSpecSchema } from '@/lib/filters/spec';
import { isoDateTime, op, slug } from './common';

// Public market reads (no sign-in). Production: RSC queries over `metric_points`
// summed across the cells `expandFilterToCells(filter)` returns (ARCHITECTURE
// §6.3), cached with revalidate + revalidateTag('market') after compute-metrics.
// Every number on screen is a MetricReading so it can explain itself (FR-D2).
//
// Scope: the market board, home, /people and /metrics/[key] always read the
// national default (DEFAULT_FILTER: All Australia · All levels · any work
// rights), so their ops take no filter. Filters exist only on detail pages
// (`?f=`, opened from the "in …" title), /compare and watchlist items.
//
// Data time (DESIGN §8, shown as "Updated today, 2:14 am"): `as_of` = finish of
// the last successful daily compute-metrics; `MetricReading.updated_at` = when
// that one number was settled (the same run for ad metrics, the IVI import for
// official ones); `polled_at` = last successful poll-ats, for the intraday layer
// only (`new_today`, tape events). Reads without `as_of` carry readings instead.

// ---------------------------------------------------------------- enums

export const INSTRUMENT_TYPES = ['skill', 'role', 'industry'] as const;
export const BOARD_TYPES = ['all', ...INSTRUMENT_TYPES] as const;
/** Same keys as METRICS in src/lib/metrics/registry.ts (tests/contract-registry.test.ts checks). */
export const METRIC_KEYS = [
  'ad_count', 'share_of_ads', 'change_4w', 'growth_12m', 'entry_level_share', 'no_pr_required_share', 'employer_concentration',
  'salary_median', 'salary_p10_p90', 'skill_premium', 'remote_share', 'contract_share', 'skills_per_ad', 'volatility',
] as const;
export const SOURCE_KINDS = ['official', 'ads', 'practitioner'] as const;
export const SKILL_LAYERS = ['technology_tool', 'specialist_task'] as const;
export const SIGNAL_KINDS = ['rise', 'fall', 'entry_open', 'since_added'] as const;
export const BREAKDOWN_DIMENSIONS = ['experience', 'rights', 'mode'] as const;
export const CHART_RANGES = ['3m', '6m', '1y', '2y'] as const;
export const BREAKDOWN_BUCKET_KEYS = ['entry', 'mid', 'senior', 'expert', 'requires_pr', 'not_stated', 'sponsorship_ok', 'onsite', 'hybrid', 'remote', 'all'] as const;

/** Coverage of the official count (ARCHITECTURE §6.8). Not a metric: never in the measure dropdown. */
export const COVERAGE_BANDS = ['normal', 'low', 'insufficient'] as const;
/** Lower bounds of `normal` and `low`; to be recalibrated on real data. */
export const COVERAGE_THRESHOLDS = { normal: 0.4, low: 0.15 } as const;
export type CoverageBand = (typeof COVERAGE_BANDS)[number];

/** Band for a coverage ratio; null (thin sample, no IVI cell) is insufficient. */
export function coverageBand(ratio: number | null): CoverageBand {
  if (ratio === null || !Number.isFinite(ratio) || ratio < COVERAGE_THRESHOLDS.low) return 'insufficient';
  return ratio < COVERAGE_THRESHOLDS.normal ? 'low' : 'normal';
}

export const metricKey = z.enum(METRIC_KEYS);
export const instrumentType = z.enum(INSTRUMENT_TYPES);
export { filterSpecSchema };

/** ISO timestamp with offset; see "Data time" above. */
export const dataTime = isoDateTime;

/**
 * How much of JSA IVI's count our ATS ads see behind a number. `low` → coverage
 * note beside the number; `insufficient` → change and signal withheld
 * (change.status 'unavailable', signal null) and "Not enough coverage yet".
 */
export const coverageSchema = z.object({
  /** Our deduped new ads ÷ IVI new ads, ANZSCO4 × state × month; skills weight their main occupations. null = sample too thin. */
  ratio: z.number().min(0).nullable(),
  /** coverageBand(ratio), also insufficient when the sample is thin. */
  band: z.enum(COVERAGE_BANDS),
  /** IVI month the ratio is for, YYYY-MM. */
  month: z.string(),
});

// Fields the demo does not produce yet. `.default(null)` only lets today's demo
// rows parse; `OutputOf` still makes them required for a real backend.

/** null = no coverage estimate (industries; before the first ingest-jsa). */
const coverageField = coverageSchema.nullable().default(null);
/** Ads first seen today (Australia/Sydney) by poll-ats, under the read's filter; null = not counted for this instrument. */
const newTodayField = z.number().int().min(0).nullable().default(null);
/** Last successful poll-ats behind `new_today`; null = no poll yet. */
const polledAtField = dataTime.nullable().default(null);

// ---------------------------------------------------------------- entities

/** A trackable thing: skill, role (ANZSCO) or industry (ANZSIC Division). Table `instruments`. */
export const instrumentSchema = z.object({
  id: z.string(),
  slug,
  type: instrumentType,
  name: z.string(),
  /** Short mono symbol, e.g. PY, SQL. */
  symbol: z.string(),
  category: z.string(),
  aliases: z.array(z.string()),
  anzsco: z.string().nullable(),
  anzsic: z.string().nullable(),
  /** Reserved for sub-industries; always null in the MVP. */
  parent_id: z.string().nullable(),
  /** ASC layer, skills only. */
  skill_layer: z.enum(SKILL_LAYERS).nullable(),
  blurb: z.string(),
  /** Editorial estimates (not measured) — shown as such. */
  learning_effort: z.enum(['weeks', 'months', 'year_plus']),
  transferability: z.enum(['narrow', 'moderate', 'broad']),
  tracking_since: z.string(),
});

export const metricWindowSchema = z.object({ start: z.string(), end: z.string(), days: z.number().int() });

/** One number plus everything needed to explain it. `value` is null unless status = ok. */
export const metricReadingSchema = z.object({
  metric: metricKey,
  status: z.enum(['ok', 'insufficient_sample', 'unavailable']),
  /** Counts, 0–1 ratios, AUD, or relative change (0.38 = +38%). */
  value: z.number().nullable(),
  numerator: z.number().nullable(),
  denominator: z.number().nullable(),
  /** Change metrics: absolute counts before → after (FR-D3). */
  from: z.number().nullable(),
  to: z.number().nullable(),
  low: z.number().nullable(),
  high: z.number().nullable(),
  sample_n: z.number(),
  min_sample: z.number(),
  window: metricWindowSchema,
  source: z.enum(SOURCE_KINDS),
  source_id: z.string(),
  /** When this number was settled: the compute-metrics run (ads) or the IVI import (official). */
  updated_at: dataTime,
});

export const seriesPointSchema = z.object({ date: z.string(), value: z.number().nullable() });

/** A detected move worth a look. Table `signals`. */
export const signalSchema = z.object({
  id: z.string(),
  kind: z.enum(SIGNAL_KINDS),
  instrument_slug: slug,
  metric: metricKey,
  /** Relative change (rise/fall/since_added) or percentage-point delta (entry_open). */
  magnitude: z.number(),
  from: z.number(),
  to: z.number(),
  detected_at: z.string(),
  filter: filterSpecSchema,
});

/** One row/card on a board. */
export const snapshotSchema = z.object({
  instrument: instrumentSchema,
  metric: metricReadingSchema,
  /** The change shown next to the value (change_4w; growth_12m for roles). */
  change: metricReadingSchema,
  entry_share: metricReadingSchema,
  sparkline: z.array(z.number()),
  signal: signalSchema.nullable(),
  coverage: coverageField,
  new_today: newTodayField,
});

export const dataSourceSchema = z.object({
  id: z.string(),
  kind: z.enum(SOURCE_KINDS),
  name: z.string(),
  licence: z.string(),
  cadence: z.string(),
  /** Last successful run: poll-ats for an ATS, ingest-jsa for IVI. */
  last_run_at: dataTime,
  status: z.enum(['healthy', 'delayed', 'failed']),
  url: z.string().nullable(),
});

/** The detail page's one chart: Y axis split by one dimension. */
export const breakdownSchema = z.object({
  by: z.enum(BREAKDOWN_DIMENSIONS).nullable(),
  kind: z.enum(['stack', 'lines']),
  measure: metricKey,
  requested: metricKey,
  buckets: z.array(z.object({
    key: z.enum(BREAKDOWN_BUCKET_KEYS),
    series: z.array(seriesPointSchema),
    latest: metricReadingSchema,
    share: z.number().nullable(),
  })),
  total: z.array(seriesPointSchema).nullable(),
  filtered_to: z.array(z.enum(BREAKDOWN_BUCKET_KEYS)).nullable(),
  /** Extracted from ad text (experience, work rights). */
  estimated: z.boolean(),
  salary_stated: z.object({ with_salary: z.number(), total: z.number() }).nullable(),
  insufficient: z.array(z.enum(BREAKDOWN_BUCKET_KEYS)),
});

export const heatTileSchema = z.object({
  slug,
  type: instrumentType,
  name: z.string(),
  symbol: z.string(),
  /** ad_count — tile area. */
  ads: metricReadingSchema,
  /** change_4w — tile colour (neutral when coverage is insufficient). */
  change: metricReadingSchema,
  coverage: coverageField,
});

export const heatmapSchema = z.object({
  kind: z.enum(['industries', 'industry_skills']),
  parent: z.string().nullable(),
  tiles: z.array(heatTileSchema),
  /** Last daily settle. */
  as_of: dataTime,
});

export const compositionEntrySchema = z.object({
  instrument: instrumentSchema,
  /** role/industry → share of its ads mentioning the skill; skill → share of its demand from the role. */
  weight: z.number(),
  snapshot: snapshotSchema,
});

export const instrumentDetailSchema = z.object({
  snapshot: snapshotSchema,
  /** The "Right now" measure (`?metric=`). */
  metric: metricKey,
  metrics: z.object({ default: metricKey, common: z.array(metricKey), advanced: z.array(metricKey) }),
  /** Fundamentals: every valid metric for this type. */
  readings: z.partialRecord(metricKey, metricReadingSchema),
  series: z.array(seriesPointSchema),
  /** Role → Top holdings; industry → skills in its ads; skill → roles asking for it. */
  composition: z.array(compositionEntrySchema),
  /** Industry only. */
  heatmap: heatmapSchema.nullable(),
  /** Skill only: often asked together. */
  related: z.array(compositionEntrySchema),
  /** Job ads by state. */
  locations: z.array(z.object({ location_id: z.string(), name: z.string(), count: z.number() })),
  breakdown: breakdownSchema,
  /** How the selected measure is charted. Change measures chart Job ads with the two compared windows shaded. */
  chart: z.object({
    /** Weekly series drawn; one of `options`. */
    series: metricKey,
    range: z.enum(CHART_RANGES),
    compare: z.object({ weeks: z.number().int(), marks: z.boolean() }).nullable(),
    /** Y axis options for this type. */
    options: z.array(metricKey),
    /** Requested split; `breakdown.by` is the one drawn (fixed by the filter or the measure → unsplit; rights under No PR stated). */
    by: z.enum(BREAKDOWN_DIMENSIONS).nullable(),
  }),
  signal: signalSchema.nullable(),
  /** Last daily settle. */
  as_of: dataTime,
  polled_at: polledAtField,
});

export const boardSchema = z.object({
  type: z.enum(BOARD_TYPES),
  metric: metricKey,
  sort: z.enum(['value', 'change']),
  layer: z.enum(SKILL_LAYERS).nullable(),
  rows: z.array(snapshotSchema),
  /** Rows carrying a signal. */
  signals: z.number().int(),
  /** Last daily settle. */
  as_of: dataTime,
  polled_at: polledAtField,
});

/** A settled national 4-week change on the tape. */
export const tapeEntrySchema = z.object({
  slug,
  type: instrumentType,
  symbol: z.string(),
  name: z.string(),
  change: z.number(),
  from: z.number(),
  to: z.number(),
  signal: z.boolean(),
  new_today: newTodayField,
});

/** Intraday: one employer's new ads for one instrument, seen in one poll ("Atlassian posted 3 Data Engineer roles"). */
export const tapeEventSchema = z.object({
  id: z.string(),
  /** Name from the `employers` register. */
  employer: z.string(),
  slug,
  type: instrumentType,
  symbol: z.string(),
  name: z.string(),
  count: z.number().int().min(1),
  /** When poll-ats first saw them; the one place shown as relative time ("2 h ago"). */
  seen_at: dataTime,
});

export const tapeSchema = z.object({
  changes: z.array(tapeEntrySchema),
  /** Last 24 h, newest first. */
  events: z.array(tapeEventSchema),
  /** Last daily settle (changes). */
  as_of: dataTime,
  /** Last successful poll-ats (events, new_today); null = no poll yet. */
  polled_at: dataTime.nullable(),
});

export const comparisonSchema = z.object({
  a: instrumentDetailSchema,
  b: instrumentDetailSchema,
  /** Pearson, last 52 weekly counts. */
  correlation: z.number(),
  /** Two skills: co-occurrence 0–1; otherwise overlap of components. */
  overlap: z.number(),
  shared: z.array(instrumentSchema),
  onlyA: z.array(instrumentSchema),
  onlyB: z.array(instrumentSchema),
});

export const searchHitSchema = z.object({ instrument: instrumentSchema, matched: z.string(), via: z.enum(['name', 'alias', 'symbol', 'prefix', 'fuzzy']) });
/** ASC core competencies are not instruments; hits link to /metrics#competency-<slug>. */
export const competencyHitSchema = z.object({ slug: z.string(), matched: z.string() });
export const competencyLevelSchema = z.object({ slug: z.string(), level: z.number().int().min(1).max(10) });

export const searchResultsSchema = z.object({
  skills: z.array(searchHitSchema),
  roles: z.array(searchHitSchema),
  industries: z.array(searchHitSchema),
  competencies: z.array(competencyHitSchema),
});

const withSnapshot = z.object({ hit: searchHitSchema, snapshot: snapshotSchema });
export const searchWithSnapshotsSchema = z.object({
  skills: z.array(withSnapshot),
  roles: z.array(withSnapshot),
  industries: z.array(withSnapshot),
  competencies: z.array(competencyHitSchema),
});

export const moverSchema = z.object({ instrument: instrumentSchema, change: metricReadingSchema, sparkline: z.array(z.number()), coverage: coverageField });

// ---------------------------------------------------------------- inputs

/**
 * No filter: every board is the national default. The Watching tab reads `all`
 * and keeps the watched rows. Unknown or non-selectable metrics fall back to the
 * type's default; never an error.
 */
export const boardQuery = z.object({
  type: z.enum(BOARD_TYPES),
  metric: z.string().optional(),
  sort: z.enum(['value', 'change']).optional(),
  /** Narrows rows by name/alias. */
  q: z.string().max(80).optional(),
  /** Skills board only. */
  layer: z.enum(SKILL_LAYERS).nullable().optional(),
});

export const detailQuery = z.object({
  slug,
  filter: filterSpecSchema,
  /** `?metric=` drives both the Right now figure and the chart; invalid → the type's default. */
  metric: z.string().optional(),
  /** `?by=`; null = not split (default). */
  by: z.enum(BREAKDOWN_DIMENSIONS).nullable().default(null),
});

/** Shared by every read that has these demo gaps. */
const DATA_TIME_DELTA = 'Demo as_of is a date (DATA_AS_OF), not the compute-metrics timestamp';
const COVERAGE_DELTA = 'demo has no coverage (always null)';
const INTRADAY_DELTA = 'no new_today or polled_at (always null)';

// ---------------------------------------------------------------- operations

export const marketOps = {
  getBoard: op({
    kind: 'read', access: 'public', input: boardQuery, output: boardSchema,
    does: 'Rows of one board (all / skills / roles / industries) at national scope, narrowed by name, sorted by value or change.',
    ui: '/market tabs Watching · All · Skills · Roles · Industries (?type=), measure dropdown (?metric=), Tools/Tasks switch (?layer=), name box (?q=); home skill and role lists; /people',
    tables: ['instruments', 'metric_points', 'signals', 'job_ads'], fr: ['FR-M1', 'FR-M4', 'FR-M6'],
    delta: `Demo getBoard still takes a FilterSpec (every caller passes DEFAULT_FILTER). ${DATA_TIME_DELTA}; ${COVERAGE_DELTA}; ${INTRADAY_DELTA}.`,
  }),
  getInstrumentDetail: op({
    kind: 'read', access: 'public', input: detailQuery, output: instrumentDetailSchema.nullable(),
    does: 'Everything on /s|/r|/i/[slug]: headline, Right now, Statistics, the one chart (measure, range, split), composition, industry skill heatmap, places. null = unknown slug (404).',
    ui: 'Detail pages: "in …" title opens Filter (Y axis, Split by, work rights, level, places; ?f=), chart measure dropdown and Statistics cells (?metric=), range pills, Split by (?by=, default none)',
    tables: ['instruments', 'instrument_components', 'metric_points', 'signals', 'job_ads'], fr: ['FR-M2', 'FR-M3', 'FR-D2', 'FR-D3', 'FR-D4'],
    delta: `Breakdown needs experience buckets (entry/mid/senior/expert) in the cell model and per-bucket salary sample counts; cells today only have graduate/entry_other/other. Demo approximates industry × skill heatmap counts; production sums industry ∩ skill cells. ${DATA_TIME_DELTA}; ${COVERAGE_DELTA}; ${INTRADAY_DELTA}.`,
  }),
  getCoreCompetencies: op({
    kind: 'read', access: 'public', input: z.object({ slug }), output: z.array(competencyLevelSchema).nullable(),
    does: 'ASC core competency levels (1–10) for a role; null for anything else. Reference data, no data time.',
    ui: 'Role page "Core competencies" block',
    tables: ['role_competencies'], fr: ['FR-M3'],
    delta: 'Demo levels are illustrative; production loads the ASC dataset.',
  }),
  getComparison: op({
    kind: 'read', access: 'public', input: z.object({ a: slug, b: slug, filter: filterSpecSchema }), output: comparisonSchema.nullable(),
    does: 'Two instruments side by side under a filter: correlation, overlap, shared and only-one components. Data time: a.as_of / b.as_of.',
    ui: '/compare (Compare mode on /market, "Compare with…" on detail pages); Filter bar (?f=)',
    tables: ['metric_points', 'instrument_components'], fr: ['FR-M5'],
  }),
  search: op({
    kind: 'read', access: 'public', input: z.object({ q: z.string().max(80) }), output: searchResultsSchema,
    does: 'Alias-aware conservative fuzzy search grouped by type, plus core competency hits. Exact matches precede prefix, substring and fuzzy results; short symbols, numeric codes and technical punctuation remain literal.',
    ui: '⌘K search panel in the header',
    tables: ['instruments', 'instrument_aliases'], fr: ['FR-D6'],
  }),
  searchWithSnapshots: op({
    kind: 'read', access: 'public', input: z.object({ q: z.string().max(80), filter: filterSpecSchema }), output: searchWithSnapshotsSchema,
    does: 'Same as search, each hit with its current snapshot. No link sets ?f= since the board lost its filter; the page still forwards a legacy one, else DEFAULT_FILTER.',
    ui: '/search results page',
    tables: ['instruments', 'instrument_aliases', 'metric_points'], fr: ['FR-D6'],
  }),
  getTape: op({
    kind: 'read', access: 'public', input: z.object({ limit: z.number().int().min(1).max(40).default(16) }), output: tapeSchema,
    does: 'Ticker tape: settled national 4-week changes (signals first; insufficient coverage left out) and the last 24 h of real posting events from poll-ats; `limit` caps each list.',
    ui: 'Ticker tape under the header (hidden in plain mode)',
    tables: ['metric_points', 'signals', 'job_ads', 'employers'], fr: ['FR-M1'],
    delta: `Demo returns the change entries only, as a bare array: no events, as_of or polled_at; ${INTRADAY_DELTA}.`,
  }),
  getIndustryHeatmap: op({
    kind: 'read', access: 'public', input: z.object({}), output: heatmapSchema,
    does: 'All industries as treemap tiles at national scope: area = job ads, colour = 4-week change.',
    ui: 'Home hero heatmap',
    tables: ['metric_points'], fr: ['FR-M1'],
    delta: `Demo takes a FilterSpec (home passes DEFAULT_FILTER). ${DATA_TIME_DELTA}; ${COVERAGE_DELTA}.`,
  }),
  getMovers: op({
    kind: 'read', access: 'public', input: z.object({ limit: z.number().int().min(1).max(12).default(4) }), output: z.array(moverSchema),
    does: 'Largest national 4-week moves with enough sample and coverage, for the home carousel. Data time: change.updated_at.',
    ui: 'Home movers carousel (each card links to the instrument)',
    tables: ['metric_points'], fr: ['FR-M1'],
    delta: `Demo takes a FilterSpec (home passes DEFAULT_FILTER); ${COVERAGE_DELTA}.`,
  }),
  getMetricExamples: op({
    kind: 'read', access: 'public', input: z.object({ key: metricKey }), output: z.array(z.object({ instrument: instrumentSchema, reading: metricReadingSchema })),
    does: 'A few national readings of one metric for its definition page. Data time: reading.updated_at.',
    ui: '/metrics/[key]',
    tables: ['metric_points'], fr: ['FR-D2'],
    delta: 'Demo takes a FilterSpec (the page passes DEFAULT_FILTER).',
  }),
  getSources: op({
    kind: 'read', access: 'public', input: z.object({}), output: z.array(dataSourceSchema),
    does: 'Data sources with licence, cadence and freshness: Greenhouse, Lever and Ashby public job-board APIs (ads), JSA IVI (official), coffee-chat debriefs.',
    ui: '/sources ("Data & safety" in the footer), admin pipeline',
    tables: ['data_sources', 'ingestion_runs'], fr: ['FR-D1', 'FR-D5'],
    delta: 'Demo lists one illustrative ads fixture and an IVI fixture.',
  }),
} as const;

export type Instrument = z.infer<typeof instrumentSchema>;
export type MetricReading = z.infer<typeof metricReadingSchema>;
export type InstrumentSnapshot = z.infer<typeof snapshotSchema>;
export type InstrumentDetail = z.infer<typeof instrumentDetailSchema>;
export type Board = z.infer<typeof boardSchema>;
export type Signal = z.infer<typeof signalSchema>;
export type Coverage = z.infer<typeof coverageSchema>;
export type Tape = z.infer<typeof tapeSchema>;
