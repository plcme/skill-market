import { describe, expect, it } from 'vitest';
import { computeMetric, computeSeries, detectSignal, snapshot, WEEKS } from '../src/lib/market/engine';
import { searchInstruments, cooccurrence, relatedSkills, rolesForSkill } from '../src/lib/market/catalog';
import { DEFAULT_FILTER } from '../src/lib/filters/spec';
import type { FilterSpec } from '../src/lib/market/types';

const sydney: FilterSpec = { rules: [{ work_modes: ['onsite', 'hybrid', 'remote'], location_ids: ['au-nsw-sydney'] }], seniority: 'all', work_rights: 'all' };
const tiny: FilterSpec = { rules: [{ work_modes: ['remote'], location_ids: ['au-nt-darwin'] }], seniority: 'graduate', work_rights: 'no_pr_required' };

describe('fixture market engine', () => {
  it('is deterministic', () => {
    expect(computeMetric('python', 'ad_count', DEFAULT_FILTER)).toEqual(computeMetric('python', 'ad_count', DEFAULT_FILTER));
  });

  it('narrower filters never produce more ads than wider ones', () => {
    const au = computeMetric('python', 'ad_count', DEFAULT_FILTER).value ?? 0;
    const syd = computeMetric('python', 'ad_count', sydney).value ?? 0;
    expect(syd).toBeGreaterThan(0);
    expect(syd).toBeLessThan(au);
  });

  it('flags insufficient samples instead of returning a value (FR-D4)', () => {
    const r = computeMetric('rust', 'share_of_ads', tiny);
    expect(r.status).toBe('insufficient_sample');
    expect(r.value).toBeNull();
    expect(r.sample_n).toBeLessThan(r.min_sample);
  });

  it('change metrics always carry absolute before → after counts (FR-D3)', () => {
    const r = computeMetric('rust', 'change_4w', DEFAULT_FILTER);
    expect(r.from).not.toBeNull();
    expect(r.to).not.toBeNull();
    if (r.value !== null && r.from) expect(r.value).toBeCloseTo(((r.to ?? 0) - r.from) / r.from, 6);
  });

  it('shares are ratios between 0 and 1 with numerator ≤ denominator', () => {
    for (const metric of ['share_of_ads', 'entry_level_share', 'no_pr_required_share', 'remote_share'] as const) {
      const r = computeMetric('sql', metric, DEFAULT_FILTER);
      expect(r.status).toBe('ok');
      expect(r.value).toBeGreaterThan(0);
      expect(r.value).toBeLessThanOrEqual(1);
      expect(r.numerator ?? 0).toBeLessThanOrEqual(r.denominator ?? 0);
    }
  });

  it('refuses invalid metric × type combinations (FR-M4)', () => {
    expect(computeMetric('mining', 'salary_median', DEFAULT_FILTER).status).toBe('unavailable');
    expect(computeMetric('python', 'salary_p10_p90', DEFAULT_FILTER).status).toBe('unavailable');
    expect(computeMetric('data-analyst', 'skill_premium', DEFAULT_FILTER).status).toBe('unavailable');
    expect(computeMetric('data-analyst', 'salary_median', DEFAULT_FILTER).status).toBe('ok');
  });

  it('role 12-month growth is sourced from official series', () => {
    expect(computeMetric('software-engineer', 'growth_12m', DEFAULT_FILTER).source).toBe('official');
    expect(computeMetric('python', 'growth_12m', DEFAULT_FILTER).source).toBe('ads');
  });

  it('produces a full weekly series and a rising signal for the launch story', () => {
    expect(computeSeries('rust', 'share_of_ads', DEFAULT_FILTER)).toHaveLength(WEEKS);
    const sig = detectSignal('rust', DEFAULT_FILTER);
    expect(sig?.kind).toBe('rise');
    expect(snapshot('dbt', 'share_of_ads', DEFAULT_FILTER).signal?.kind).toBe('rise');
  });

  it('only reports signals backed by enough sample', () => {
    expect(detectSignal('rust', tiny)).toBeNull();
  });
});

describe('catalogue', () => {
  it('normalises aliases (FR-D6)', () => {
    expect(searchInstruments('JS')[0]?.instrument.slug).toBe('javascript');
    expect(searchInstruments('k8s')[0]?.instrument.slug).toBe('kubernetes');
    expect(searchInstruments('postgres')[0]?.instrument.slug).toBe('postgresql');
    expect(searchInstruments('')).toEqual([]);
  });

  it('links skills and roles both ways (FR-M3)', () => {
    expect(rolesForSkill('sql').map(r => r.role.slug)).toContain('data-analyst');
    expect(relatedSkills('dbt').map(r => r.skill.slug)).toContain('sql');
    expect(cooccurrence('sql', 'python')).toBeCloseTo(cooccurrence('python', 'sql'));
  });
});

describe('direction by displayed sign', () => {
  it('is up or down for any change that shows as non-zero', async () => {
    const { direction } = await import('@/lib/market/format');
    expect(direction(0.004)).toBe('up');
    expect(direction(0.019)).toBe('up');
    expect(direction(-0.01)).toBe('down');
    expect(direction(-0.001)).toBe('down');
    expect(direction(0.38)).toBe('up');
  });
  it('is flat only when the value rounds to 0.0% or is missing', async () => {
    const { direction } = await import('@/lib/market/format');
    expect(direction(0)).toBe('flat');
    expect(direction(0.0004)).toBe('flat');
    expect(direction(-0.0004)).toBe('flat');
    expect(direction(null)).toBe('flat');
    expect(direction(Number.NaN)).toBe('flat');
  });
  it('shows a change that rounds to zero without a sign', async () => {
    const { formatChange, formatPp } = await import('@/lib/market/format');
    expect(formatChange(0.0004)).toBe('0.0%');
    expect(formatChange(-0.0004)).toBe('0.0%');
    expect(formatChange(0)).toBe('0.0%');
    expect(formatChange(0.004)).toBe('+0.4%');
    expect(formatChange(-0.12)).toBe('−12%');
    expect(formatPp(0.0001)).toBe('0.0');
    expect(formatPp(-0.002)).toBe('−0.2');
  });
});
