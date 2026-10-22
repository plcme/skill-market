import { z } from 'zod';
import { filterSpecSchema } from '@/lib/filters/spec';
import { op, slug } from './common';

// Public market reads (no sign-in). Production: RSC queries over `metric_points`
// summed across the cells `expandFilterToCells(filter)` returns (ARCHITECTURE
// §6.3), cached with revalidate + revalidateTag('market') after compute-metrics.
// Every number on screen is a MetricReading so it can explain itself (FR-D2).

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
export const CHART_MEASURES = ['ads', 'salary'] as const;
export const BREAKDOWN_BUCKET_KEYS = ['entry', 'mid', 'senior', 'expert', 'requires_pr', 'not_stated', 'sponsorship_ok', 'onsite', 'hybrid', 'remote', 'all'] as const;

export const metricKey = z.enum(METRIC_KEYS);
export const instrumentType = z.enum(INSTRUMENT_TYPES);
export { filterSpecSchema };

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
  updated_at: z.string(),
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
});

export const dataSourceSchema = z.object({
  id: z.string(),
  kind: z.enum(SOURCE_KINDS),
  name: z.string(),
  licence: z.string(),
  cadence: z.string(),
  last_run_at: z.string(),
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
  /** change_4w — tile colour. */
  change: metricReadingSchema,
});

export const heatmapSchema = z.object({
  kind: z.enum(['industries', 'industry_skills']),
  parent: z.string().nullable(),
  tiles: z.array(heatTileSchema),
  as_of: z.string(),
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
  chart: z.object({ y: z.enum(CHART_MEASURES), measures: z.array(z.enum(CHART_MEASURES)) }),
  signal: signalSchema.nullable(),
  as_of: z.string(),
});

export const boardSchema = z.object({
  type: z.enum(BOARD_TYPES),
  metric: metricKey,
  sort: z.enum(['value', 'change']),
  layer: z.enum(SKILL_LAYERS).nullable(),
  rows: z.array(snapshotSchema),
  /** Rows carrying a signal. */
  signals: z.number().int(),
  as_of: z.string(),
});

export const tapeEntrySchema = z.object({
  slug,
  type: instrumentType,
  symbol: z.string(),
  name: z.string(),
  change: z.number(),
  from: z.number(),
  to: z.number(),
  signal: z.boolean(),
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

export const searchHitSchema = z.object({ instrument: instrumentSchema, matched: z.string(), via: z.enum(['name', 'alias', 'symbol', 'prefix']) });
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

export const moverSchema = z.object({ instrument: instrumentSchema, change: metricReadingSchema, sparkline: z.array(z.number()) });

// ---------------------------------------------------------------- inputs

/** Unknown or non-selectable metrics fall back to the type's default; never an error. */
export const boardQuery = z.object({
  type: z.enum(BOARD_TYPES),
  metric: z.string().optional(),
  filter: filterSpecSchema,
  sort: z.enum(['value', 'change']).optional(),
  /** Narrows rows by name/alias. */
  q: z.string().max(80).optional(),
  /** Skills board only. */
  layer: z.enum(SKILL_LAYERS).nullable().optional(),
});

export const detailQuery = z.object({
  slug,
  filter: filterSpecSchema,
  /** `?metric=` */
  metric: z.string().optional(),
  /** `?by=`; null = not split. */
  by: z.enum(BREAKDOWN_DIMENSIONS).nullable().default('experience'),
  /** `?y=`; salary only where it applies, else ads. */
  y: z.string().optional(),
});

const filterOnly = z.object({ filter: filterSpecSchema });

// ---------------------------------------------------------------- operations

export const marketOps = {
  getBoard: op({
    kind: 'read', access: 'public', input: boardQuery, output: boardSchema,
    does: 'Rows of one board (all / skills / roles / industries) under a filter, sorted by value or change.',
    ui: '/market list and tiles; type tabs, metric switcher, sort, Tools/Tasks switch, search box, Filter sheet',
    tables: ['instruments', 'metric_points', 'signals'], fr: ['FR-M1', 'FR-M4', 'FR-M6', 'FR-F1'],
  }),
  getInstrumentDetail: op({
    kind: 'read', access: 'public', input: detailQuery, output: instrumentDetailSchema.nullable(),
    does: 'Everything on /s|/r|/i/[slug]: headline, Right now, Fundamentals, the chart with Y axis and Split by, composition, places. null = unknown slug (404).',
    ui: 'Detail pages; title sentence (opens Filter), Y axis and Split by controls, Fundamentals cells (pick the Right now measure)',
    tables: ['instruments', 'instrument_components', 'metric_points', 'signals'], fr: ['FR-M2', 'FR-M3', 'FR-D2', 'FR-D3', 'FR-D4'],
    delta: 'Breakdown needs experience buckets (entry/mid/senior/expert) in the cell model and per-bucket salary sample counts; cells today only have graduate/entry_other/other.',
  }),
  getCoreCompetencies: op({
    kind: 'read', access: 'public', input: z.object({ slug }), output: z.array(competencyLevelSchema).nullable(),
    does: 'ASC core competency levels (1–10) for a role; null for anything else.',
    ui: 'Role page "Core competencies" block',
    tables: ['role_competencies'], fr: ['FR-M3'],
    delta: 'Demo levels are illustrative; production loads the ASC dataset.',
  }),
  getComparison: op({
    kind: 'read', access: 'public', input: z.object({ a: slug, b: slug, filter: filterSpecSchema }), output: comparisonSchema.nullable(),
    does: 'Two instruments side by side: correlation, overlap, shared and only-one components.',
    ui: '/compare (from multi-select on /market)',
    tables: ['metric_points', 'instrument_components'], fr: ['FR-M5'],
  }),
  search: op({
    kind: 'read', access: 'public', input: z.object({ q: z.string().max(80) }), output: searchResultsSchema,
    does: 'Alias-aware search grouped by type, plus core competency hits.',
    ui: '⌘K search panel in the header',
    tables: ['instruments', 'instrument_aliases'], fr: ['FR-D6'],
  }),
  searchWithSnapshots: op({
    kind: 'read', access: 'public', input: z.object({ q: z.string().max(80), filter: filterSpecSchema }), output: searchWithSnapshotsSchema,
    does: 'Same as search, each hit with its current snapshot.',
    ui: '/search results page',
    tables: ['instruments', 'instrument_aliases', 'metric_points'], fr: ['FR-D6'],
  }),
  getSignalsNow: op({
    kind: 'read', access: 'public', input: z.object({ filter: filterSpecSchema, limit: z.number().int().min(1).max(50).default(12) }), output: z.array(snapshotSchema),
    does: 'Instruments with a signal under the filter, largest first.',
    ui: 'Board signal count',
    tables: ['signals', 'metric_points'], fr: ['FR-M6'],
  }),
  getTape: op({
    kind: 'read', access: 'public', input: z.object({ limit: z.number().int().min(1).max(40).default(16) }), output: z.array(tapeEntrySchema),
    does: 'National 4-week changes for the scrolling ticker tape, signals first.',
    ui: 'Ticker tape under the header (hidden in plain mode)',
    tables: ['metric_points', 'signals'], fr: ['FR-M1'],
  }),
  getIndustryHeatmap: op({
    kind: 'read', access: 'public', input: filterOnly, output: heatmapSchema,
    does: 'All industries as treemap tiles: area = job ads, colour = 4-week change.',
    ui: 'Home hero heatmap',
    tables: ['metric_points'], fr: ['FR-M1'],
  }),
  getIndustrySkillHeatmap: op({
    kind: 'read', access: 'public', input: z.object({ industry: slug, filter: filterSpecSchema }), output: heatmapSchema,
    does: 'Skills inside one industry as tiles.',
    ui: 'Industry page heatmap',
    tables: ['metric_points', 'instrument_components'], fr: ['FR-M3'],
    delta: 'Demo approximates industry × skill counts; production sums industry ∩ skill cells.',
  }),
  getMovers: op({
    kind: 'read', access: 'public', input: z.object({ filter: filterSpecSchema, limit: z.number().int().min(1).max(12).default(4) }), output: z.array(moverSchema),
    does: 'Largest 4-week moves with enough sample, for the home carousel.',
    ui: 'Home movers carousel (each card links to the instrument)',
    tables: ['metric_points'], fr: ['FR-M1'],
  }),
  getMetricExamples: op({
    kind: 'read', access: 'public', input: z.object({ key: metricKey, filter: filterSpecSchema }), output: z.array(z.object({ instrument: instrumentSchema, reading: metricReadingSchema })),
    does: 'A few live examples of one metric for its definition page.',
    ui: '/metrics/[key]',
    tables: ['metric_points'], fr: ['FR-D2'],
  }),
  getSources: op({
    kind: 'read', access: 'public', input: z.object({}), output: z.array(dataSourceSchema),
    does: 'Data sources with licence, cadence and freshness.',
    ui: '/sources ("Data & safety" in the footer), admin pipeline',
    tables: ['data_sources', 'ingestion_runs'], fr: ['FR-D1', 'FR-D5'],
  }),
} as const;

export type Instrument = z.infer<typeof instrumentSchema>;
export type MetricReading = z.infer<typeof metricReadingSchema>;
export type InstrumentSnapshot = z.infer<typeof snapshotSchema>;
export type InstrumentDetail = z.infer<typeof instrumentDetailSchema>;
export type Board = z.infer<typeof boardSchema>;
export type Signal = z.infer<typeof signalSchema>;
