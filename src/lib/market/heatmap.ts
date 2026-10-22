import { direction } from './format';
import type { ActiveInstrumentType, MetricReading } from './types';

// Heatmap data shape shared by the landing hero (industries) and the industry
// page (skills within one industry). Area = job ads in the window; colour =
// 4-week change, binned so the legend can state each band exactly.

export interface HeatTile {
  slug: string;
  type: ActiveInstrumentType;
  name: string;
  symbol: string;
  /** Job ads in the window (`ad_count`) — drives tile area. */
  ads: MetricReading;
  /** 4-week change (`change_4w`) — drives tile colour. */
  change: MetricReading;
}

export interface Heatmap {
  /** What the tiles are: industries (landing) or skills within one industry. */
  kind: 'industries' | 'industry_skills';
  /** Industry slug when `kind === 'industry_skills'`. */
  parent: string | null;
  tiles: HeatTile[];
  as_of: string;
}

/**
 * Diverging bands by sign, like every other change: under 10% either way is
 * the light band, 10% or more the strong band. Neutral only when the change
 * rounds to 0.0%; grey hatching only for too few ads.
 */
export const HEAT_BANDS = { strong: 0.1 } as const;

export type HeatStep = -2 | -1 | 0 | 1 | 2 | 'na';

/** Colour band for a change reading; `na` when the sample is too small or the value is missing. */
export function heatStep(change: Pick<MetricReading, 'status' | 'value'>): HeatStep {
  if (change.status !== 'ok' || change.value === null || !Number.isFinite(change.value)) return 'na';
  const v = change.value;
  if (direction(v) === 'flat') return 0;
  if (v >= HEAT_BANDS.strong) return 2;
  if (v > 0) return 1;
  if (v <= -HEAT_BANDS.strong) return -2;
  return -1;
}

/** Tile area value: the job-ad count even when the change is not reliable (0 hides the tile). */
export function tileArea(tile: HeatTile): number {
  return tile.ads.numerator ?? tile.ads.value ?? tile.ads.sample_n ?? 0;
}
