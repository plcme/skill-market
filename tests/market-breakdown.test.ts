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

describe('computeBreakdown — thin stacked bands', () => {
  it('flags every stacked bucket whose latest 4 weeks are below the sample threshold', () => {
    const b = computeBreakdown('python', 'ad_count', decodeFilter('r.au-nt-darwin_all_all'), 'experience');
    expect(b.insufficient.length).toBeGreaterThan(0);
    for (const k of b.buckets) {
      expect(b.insufficient.includes(k.key)).toBe(k.latest.status !== 'ok');
      if (k.latest.status !== 'ok') expect(k.latest.value).toBeNull();
    }
    expect(computeBreakdown('python', 'ad_count', DEFAULT_FILTER, 'mode').insufficient).toEqual([]);
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
  it('salary splits into lines for roles and skills', () => {
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
    // Industries have no salary: the chart falls back to job ads.
    const industry = computeBreakdown('mining', 'salary_median', DEFAULT_FILTER, 'experience');
    expect(industry.kind).toBe('stack');
    expect(industry.measure).toBe('ad_count');
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

  it('measures without a weekly series fall back to job ads, driven by the registry flag', () => {
    expect(METRICS.ad_count.breakdown).toBe('stack');
    expect(METRICS.salary_median.breakdown).toBe('lines');
    expect(METRICS.entry_level_share.breakdown).toBe('lines');
    expect(METRICS.change_4w.breakdown).toBeNull();
    const b = computeBreakdown('data-analyst', 'skills_per_ad', DEFAULT_FILTER, 'mode');
    expect(b.kind).toBe('stack');
    expect(b.measure).toBe('ad_count');
    expect(b.requested).toBe('skills_per_ad');
  });

  it('shares and employers chart as 4-week rolling lines that end on the headline figure', () => {
    for (const metric of ['entry_level_share', 'no_pr_required_share', 'remote_share', 'contract_share', 'employer_concentration'] as const) {
      for (const slug of ['python', 'data-analyst', 'mining']) {
        const b = computeBreakdown(slug, metric, DEFAULT_FILTER, null);
        expect(b.kind).toBe('lines');
        expect(b.measure).toBe(metric);
        expect(b.buckets[0].latest.value).toBe(computeMetric(slug, metric, DEFAULT_FILTER).value);
        expect(b.buckets[0].series[WEEKS - 1]?.value).toBe(b.buckets[0].latest.value);
        expect(b.buckets[0].series[2]?.value).toBeNull();
        if (metric === 'employer_concentration') continue;
        for (const p of b.buckets[0].series) if (p.value !== null) expect(p.value >= 0 && p.value <= 1).toBe(true);
      }
    }
  });

  it('splits shares into one line per bucket, never by their own dimension', () => {
    const byMode = computeBreakdown('python', 'entry_level_share', DEFAULT_FILTER, 'mode');
    expect(byMode.by).toBe('mode');
    expect(byMode.buckets.map(b => b.key)).toEqual(['onsite', 'hybrid', 'remote']);
    expect(byMode.total).toBeNull();
    const own = computeBreakdown('python', 'entry_level_share', DEFAULT_FILTER, 'experience');
    expect(own.by).toBeNull();
    expect(own.buckets.map(b => b.key)).toEqual(['all']);
    expect(computeBreakdown('python', 'remote_share', DEFAULT_FILTER, 'mode').by).toBeNull();
    expect(computeBreakdown('python', 'no_pr_required_share', DEFAULT_FILTER, 'rights').by).toBeNull();
  });

  it('share lines leave gaps where a bucket has too few ads', () => {
    const thin = computeBreakdown('mining-engineer', 'entry_level_share', decodeFilter('r.au-nt-darwin_all_all'), 'rights');
    expect(thin.insufficient.length).toBeGreaterThan(0);
    for (const b of thin.buckets) if (thin.insufficient.includes(b.key)) expect(b.latest.value).toBeNull();
  });

  it('is attached to the detail read model with the ?by= dimension and the page measure', () => {
    expect(parseBreakdownBy('rights')).toBe('rights');
    expect(parseBreakdownBy('location')).toBeNull();
    expect(parseBreakdownBy(undefined)).toBeNull();
    const d = getInstrumentDetail('data-analyst', DEFAULT_FILTER, 'salary_median', 'mode');
    expect(d?.breakdown.by).toBe('mode');
    expect(d?.breakdown.kind).toBe('lines');
    expect(d?.chart).toMatchObject({ series: 'salary_median', options: ['ad_count', 'salary_median', 'entry_level_share', 'no_pr_required_share', 'employer_concentration', 'remote_share', 'contract_share'] });
    // The default measure for roles is 12-month change: Job ads over 2Y with the years shaded.
    const role = getInstrumentDetail('data-analyst', DEFAULT_FILTER, undefined, 'mode');
    expect(role?.metric).toBe('growth_12m');
    expect(role?.breakdown.kind).toBe('stack');
    expect(role?.chart).toMatchObject({ series: 'ad_count', range: '2y', compare: { weeks: 52, marks: false } });
  });
});
