import { describe, expect, it } from 'vitest';
import { computeBreakdown, computeMetric, experienceSplit, WEEKS } from '@/lib/market/engine';
import { DEFAULT_FILTER, decodeFilter } from '@/lib/filters/spec';
import { METRICS } from '@/lib/metrics/registry';
import { BREAKDOWN_DIMENSIONS, type Breakdown } from '@/lib/market/types';
import { parseBreakdownBy } from '@/features/market/logic';
import { getInstrumentDetail } from '@/lib/queries/market';

function maxGap(b: Breakdown): number {
  let worst = 0;
  for (let i = 0; i < WEEKS; i++) {
    const total = b.total?.[i]?.value;
    if (total == null) continue;
    const parts = b.buckets.reduce((a, k) => a + (k.series[i]?.value ?? 0), 0);
    worst = Math.max(worst, Math.abs(parts - total));
  }
  return worst;
}

describe('computeBreakdown — stacked job ads', () => {
  it('bands sum to the unbroken total (± weekly rounding) for every dimension and type', () => {
    for (const slug of ['python', 'data-analyst', 'health-care']) {
      for (const by of BREAKDOWN_DIMENSIONS) {
        const b = computeBreakdown(slug, 'ad_count', DEFAULT_FILTER, by);
        expect(b.kind).toBe('stack');
        expect(b.total).toHaveLength(WEEKS);
        // Each of 4 weeks in a rolling sum can be off by ≤ 0.5 per bucket.
        expect(maxGap(b), `${slug} ${by}`).toBeLessThanOrEqual(b.buckets.length * 4 * 0.5 + 1);
        const shares = b.buckets.reduce((a, k) => a + (k.share ?? 0), 0);
        expect(shares).toBeCloseTo(1, 6);
      }
    }
  });

  it('latest values add up to the 4-week job ads under the same filter', () => {
    const filter = decodeFilter('oh.au-nsw-sydney*r.au_all_all');
    const b = computeBreakdown('sql', 'ad_count', filter, 'mode');
    const total = computeMetric('sql', 'ad_count', filter).value ?? 0;
    const parts = b.buckets.reduce((a, k) => a + (k.latest.value ?? 0), 0);
    expect(Math.abs(parts - total)).toBeLessThanOrEqual(b.buckets.length * 4);
  });

  it('experience has four buckets; lower-entry instruments skew more senior', () => {
    const b = computeBreakdown('rust', 'ad_count', DEFAULT_FILTER, 'experience');
    expect(b.buckets.map(k => k.key)).toEqual(['entry', 'mid', 'senior', 'expert']);
    expect(b.estimated).toBe(true);
    expect(computeBreakdown('rust', 'ad_count', DEFAULT_FILTER, 'mode').estimated).toBe(false);
    const low = experienceSplit(0.05);
    const high = experienceSplit(0.35);
    expect(low.mid + low.senior + low.expert).toBeCloseTo(1, 10);
    expect(high.mid + high.senior + high.expert).toBeCloseTo(1, 10);
    expect(low.expert).toBeGreaterThan(high.expert);
    expect(low.mid).toBeLessThan(high.mid);
  });
});

describe('computeBreakdown — filter narrowing', () => {
  it('shows only buckets inside the filter and says so', () => {
    const entry = computeBreakdown('python', 'ad_count', decodeFilter('ohr.au_entry_all'), 'experience');
    expect(entry.buckets.map(b => b.key)).toEqual(['entry']);
    expect(entry.filtered_to).toEqual(['entry']);
    const rights = computeBreakdown('python', 'ad_count', decodeFilter('ohr.au_all_npr'), 'rights');
    expect(rights.buckets.map(b => b.key)).toEqual(['not_stated', 'sponsorship_ok']);
    expect(rights.filtered_to).toEqual(['not_stated', 'sponsorship_ok']);
    const modes = computeBreakdown('python', 'ad_count', decodeFilter('oh.au_all_all'), 'mode');
    expect(modes.buckets.map(b => b.key)).toEqual(['onsite', 'hybrid']);
    const compound = computeBreakdown('python', 'ad_count', decodeFilter('o.au-nsw*r.au_all_all'), 'mode');
    expect(compound.buckets.map(b => b.key)).toEqual(['onsite', 'remote']);
    expect(computeBreakdown('python', 'ad_count', DEFAULT_FILTER, 'rights').filtered_to).toBeNull();
  });
});

describe('computeBreakdown — measures', () => {
  it('salary splits into lines for roles only', () => {
    const role = computeBreakdown('data-analyst', 'salary_median', DEFAULT_FILTER, 'experience');
    expect(role.kind).toBe('lines');
    expect(role.measure).toBe('salary_median');
    expect(role.total).toBeNull();
    const v = role.buckets.map(b => b.latest.value ?? 0);
    expect(v[0]).toBeLessThan(v[3]);
    expect(role.salary_stated?.with_salary).toBeGreaterThan(0);
    expect(role.salary_stated?.with_salary).toBeLessThan(role.salary_stated?.total ?? 0);
    // One sample statement per page: matches the Median salary card exactly.
    const card = computeMetric('data-analyst', 'salary_median', DEFAULT_FILTER);
    expect(role.salary_stated).toEqual({ with_salary: card.numerator, total: card.denominator });
    const skill = computeBreakdown('python', 'salary_median', DEFAULT_FILTER, 'experience');
    expect(skill.kind).toBe('stack');
    expect(skill.measure).toBe('ad_count');
  });

  it('salary lines gate on sample size: gaps, not guesses', () => {
    const narrow = computeBreakdown('mining-engineer', 'salary_median', decodeFilter('r.au-nt-darwin_all_all'), 'experience');
    expect(narrow.kind).toBe('lines');
    expect(narrow.insufficient.length).toBeGreaterThan(0);
    for (const b of narrow.buckets) {
      if (narrow.insufficient.includes(b.key)) {
        expect(b.latest.status).toBe('insufficient_sample');
        expect(b.latest.value).toBeNull();
        expect(b.series[WEEKS - 1]?.value).toBeNull();
      }
    }
    // The first 51 weeks have no full 12-month window.
    const wide = computeBreakdown('software-engineer', 'salary_median', DEFAULT_FILTER, 'rights');
    expect(wide.buckets[0].series[10]?.value).toBeNull();
    expect(wide.buckets[0].series[WEEKS - 1]?.value).not.toBeNull();
  });

  it('other measures fall back to job ads, driven by the registry flag', () => {
    expect(METRICS.ad_count.breakdown).toBe('stack');
    expect(METRICS.salary_median.breakdown).toBe('lines');
    expect(METRICS.entry_level_share.breakdown).toBeNull();
    const b = computeBreakdown('data-analyst', 'entry_level_share', DEFAULT_FILTER, 'mode');
    expect(b.kind).toBe('stack');
    expect(b.measure).toBe('ad_count');
    expect(b.requested).toBe('entry_level_share');
  });

  it('is attached to the detail read model with the ?by= dimension', () => {
    expect(parseBreakdownBy('rights')).toBe('rights');
    expect(parseBreakdownBy('location')).toBe('experience');
    expect(parseBreakdownBy(undefined)).toBe('experience');
    const d = getInstrumentDetail('data-analyst', DEFAULT_FILTER, 'salary_median', 'mode');
    expect(d?.breakdown.by).toBe('mode');
    expect(d?.breakdown.kind).toBe('lines');
  });
});
