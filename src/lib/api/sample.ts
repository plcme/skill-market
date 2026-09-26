import type { DemoDB } from './types';
import { computeMetric } from '@/lib/market/engine';
import { decodeFilter, DEFAULT_FILTER } from '@/lib/filters/spec';
import type { FilterSpec, MetricKey } from '@/lib/market/types';
import { seedSampleChats } from './chat-sample';
import { DAY } from '@/lib/time';

// Sample activity for the "load a sample student" preview control.
export function seedSampleActivity(d: DemoDB, now: number) {
  const at = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString();
  const item = (id: string, slug: string, status: 'held' | 'watching', filter: FilterSpec, metric: MetricKey, daysAgo: number, drift: number) => {
    const current = computeMetric(slug, metric, filter).value;
    return {
      id,
      instrument_slug: slug,
      status,
      filter,
      metric,
      // Baseline as it was when added (fixture data is static, so we back-date it).
      baseline_value: current === null ? null : current / (1 + drift),
      baseline_at: at(daysAgo),
      created_at: at(daysAgo),
    };
  };
  const sydneyPlusRemote = decodeFilter('ohr.au-nsw-sydney*r.au_all_all');
  d.watchlist = [
    item('w-rust', 'rust', 'watching', sydneyPlusRemote, 'ad_count', 18, 0.31),
    item('w-sql', 'sql', 'held', DEFAULT_FILTER, 'ad_count', 21, 0.02),
    item('w-python', 'python', 'held', DEFAULT_FILTER, 'ad_count', 21, 0.06),
    item('w-dbt', 'dbt', 'watching', DEFAULT_FILTER, 'ad_count', 12, 0.28),
    item('w-data-engineer', 'data-engineer', 'watching', decodeFilter('ohr.au-nsw_entry_all'), 'growth_12m', 16, 0.04),
  ];
  seedSampleChats(d, now);
}
