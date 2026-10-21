import { describe, expect, it } from 'vitest';
import { computeBreakdown, computeMetric, WEEKS } from '@/lib/market/engine';
import { DEFAULT_SKILL_SALARY, deriveSkillSalary, ROLE_COMPONENTS, rolesForSkill, salaryOf } from '@/lib/market/catalog';
import {
  clearScopeCondition, DEFAULT_FILTER, decodeFilter, encodeFilter, fromSimpleFilter, isAllAustralia, isDefaultFilter, placesLabel, resetPlaces, scopeConditions,
  toSimpleFilter, type PlacesCopy,
} from '@/lib/filters/spec';
import { CHART_MEASURE_METRIC, chartMeasuresFor, isValidMetric, metricsFor } from '@/lib/metrics/registry';
import { breakdownParam, chartYParam, parseBreakdownBy, parseChartY } from '@/features/market/logic';
import { getInstrumentDetail, resolveChartMeasure } from '@/lib/queries/market';
import pages from '../messages/en/market-pages.json';

// Frontend round 3: one chart on detail pages (Y axis + Split by), places in the title.

describe('?y= and ?by= parsing', () => {
  it('reads the Y axis, falling back to Job ads', () => {
    expect(parseChartY('salary')).toBe('salary');
    expect(parseChartY('ads')).toBe('ads');
    expect(parseChartY(undefined)).toBe('ads');
    expect(parseChartY('salary_median')).toBe('ads');
    expect(parseChartY(['salary', 'ads'])).toBe('salary');
    expect(chartYParam('ads')).toBeNull();
    expect(chartYParam('salary')).toBe('salary');
  });

  it('reads the split: experience by default, none = not split, invalid = default', () => {
    expect(parseBreakdownBy(undefined)).toBe('experience');
    expect(parseBreakdownBy('none')).toBeNull();
    expect(parseBreakdownBy('mode')).toBe('mode');
    expect(parseBreakdownBy('rights')).toBe('rights');
    expect(parseBreakdownBy('location')).toBe('experience');
    expect(parseBreakdownBy('NONE')).toBe('experience');
    expect(breakdownParam('experience')).toBeNull();
    expect(breakdownParam(null)).toBe('none');
    expect(breakdownParam('mode')).toBe('mode');
    for (const by of ['experience', 'rights', 'mode', null] as const) expect(parseBreakdownBy(breakdownParam(by) ?? undefined)).toBe(by);
  });

  it('only offers Median salary where it applies (industries: Job ads only)', () => {
    expect(chartMeasuresFor('skill')).toEqual(['ads', 'salary']);
    expect(chartMeasuresFor('role')).toEqual(['ads', 'salary']);
    expect(chartMeasuresFor('industry')).toEqual(['ads']);
    expect(resolveChartMeasure('industry', 'salary')).toBe('ads');
    expect(resolveChartMeasure('skill', 'salary')).toBe('salary');
    expect(resolveChartMeasure('skill', 'bogus')).toBe('ads');
    const mining = getInstrumentDetail('mining', DEFAULT_FILTER, undefined, 'experience', 'salary');
    expect(mining?.chart).toEqual({ y: 'ads', measures: ['ads'] });
    expect(mining?.breakdown.measure).toBe('ad_count');
    const sql = getInstrumentDetail('sql', DEFAULT_FILTER, undefined, null, 'salary');
    expect(sql?.chart.y).toBe('salary');
    expect(sql?.breakdown.by).toBeNull();
    expect(sql?.breakdown.measure).toBe(CHART_MEASURE_METRIC.salary);
  });
});

describe('Median salary for skills', () => {
  it('is valid for skills and roles, not industries; the range stays role-only', () => {
    expect(isValidMetric('skill', 'salary_median')).toBe(true);
    expect(isValidMetric('role', 'salary_median')).toBe(true);
    expect(isValidMetric('industry', 'salary_median')).toBe(false);
    expect(isValidMetric('skill', 'salary_p10_p90')).toBe(false);
    const g = metricsFor('skill');
    expect([g.default, ...g.common, ...g.advanced]).toContain('salary_median');
  });

  it('derives a skill salary from its roles, weighted by how often they ask for it', () => {
    const s = deriveSkillSalary([
      { salary: { median: 100000, spread: 0.2, skillsPerAd: 6 }, weight: 0.75 },
      { salary: { median: 140000, spread: 0.4, skillsPerAd: 10 }, weight: 0.25 },
      { salary: undefined, weight: 0.9 },
      { salary: { median: 999000, spread: 0.9, skillsPerAd: 30 }, weight: 0 },
    ]);
    expect(s).toEqual({ median: 110000, spread: 0.25, skillsPerAd: 7 });
    expect(deriveSkillSalary([])).toEqual(DEFAULT_SKILL_SALARY);
  });

  it('salaryOf works for skills, is deterministic, and leaves roles and industries alone', () => {
    const roles = rolesForSkill('sql');
    expect(roles.length).toBeGreaterThan(0);
    const expected = deriveSkillSalary(roles.map(r => ({ salary: salaryOf(r.role.slug), weight: r.weight })));
    expect(salaryOf('sql')).toEqual(expected);
    expect(salaryOf('sql')).toEqual(salaryOf('sql'));
    expect(salaryOf('data-analyst')?.median).toBe(98000);
    expect(salaryOf('mining')).toBeUndefined();
    const orphan = ['lean-six-sigma', 'plc-programming', 'adobe-creative-cloud'].find(slug => !Object.values(ROLE_COMPONENTS).some(c => c.some(x => x.skill_slug === slug)));
    if (orphan) expect(salaryOf(orphan)).toEqual(DEFAULT_SKILL_SALARY);
  });

  it('computeMetric gives a skill a median with its "with salary / total" sample', () => {
    const r = computeMetric('python', 'salary_median', DEFAULT_FILTER);
    expect(r.status).toBe('ok');
    expect(r.value).toBeGreaterThan(50000);
    expect(r.numerator ?? 0).toBeGreaterThan(0);
    expect(r.numerator ?? 0).toBeLessThan(r.denominator ?? 0);
    expect(r.source).toBe('ads');
  });

  it('computeBreakdown draws one line per experience bucket for a skill', () => {
    const b = computeBreakdown('python', 'salary_median', DEFAULT_FILTER, 'experience');
    expect(b.kind).toBe('lines');
    expect(b.measure).toBe('salary_median');
    expect(b.buckets.map(k => k.key)).toEqual(['entry', 'mid', 'senior', 'expert']);
    const v = b.buckets.map(k => k.latest.value ?? 0);
    expect(v[0]).toBeLessThan(v[3]);
    const card = computeMetric('python', 'salary_median', DEFAULT_FILTER);
    expect(b.salary_stated).toEqual({ with_salary: card.numerator, total: card.denominator });
    expect(b.estimated).toBe(true);
  });

  it('a thin skill filter leaves gaps instead of numbers', () => {
    const b = computeBreakdown('rust', 'salary_median', decodeFilter('r.au-nt-darwin_all_all'), 'experience');
    expect(b.kind).toBe('lines');
    expect(b.insufficient.length).toBeGreaterThan(0);
    for (const k of b.buckets.filter(x => b.insufficient.includes(x.key))) {
      expect(k.latest.status).toBe('insufficient_sample');
      expect(k.series[WEEKS - 1]?.value).toBeNull();
    }
  });
});

describe('no split (by = none)', () => {
  it('job ads: one "all" series equal to the total, matching the Job ads figure', () => {
    const b = computeBreakdown('sql', 'ad_count', DEFAULT_FILTER, null);
    expect(b.by).toBeNull();
    expect(b.kind).toBe('stack');
    expect(b.buckets.map(k => k.key)).toEqual(['all']);
    expect(b.filtered_to).toBeNull();
    expect(b.estimated).toBe(false);
    expect(b.buckets[0].series.map(p => p.value)).toEqual(b.total?.map(p => p.value));
    expect(b.buckets[0].latest.value).toBe(computeMetric('sql', 'ad_count', DEFAULT_FILTER).value);
  });

  it('median salary: one line that ends on the Median salary figure', () => {
    for (const slug of ['sql', 'data-analyst']) {
      const filter = decodeFilter('oh.au-nsw_entry_all');
      const b = computeBreakdown(slug, 'salary_median', filter, null);
      expect(b.kind).toBe('lines');
      expect(b.buckets).toHaveLength(1);
      expect(b.buckets[0].latest.value).toBe(computeMetric(slug, 'salary_median', filter).value);
      expect(b.buckets[0].series[WEEKS - 1]?.value).toBe(b.buckets[0].latest.value);
    }
  });
});

describe('places in the title', () => {
  const copy = pages.InstrumentPage.places.label as PlacesCopy;
  const label = (raw: string) => placesLabel(decodeFilter(raw), copy);

  it('names up to two places, counts more, and adds "+ remote"', () => {
    expect(placesLabel(DEFAULT_FILTER, copy)).toBe('All Australia');
    expect(label('ohr.au-nsw-sydney_all_all')).toBe('Sydney');
    expect(label('ohr.au-nsw-sydney.au-vic-melbourne_all_all')).toBe('Sydney, Melbourne');
    expect(label('ohr.au-nsw-sydney.au-vic-melbourne.au-qld-brisbane_all_all')).toBe('3 places');
    expect(label('oh.au-nsw-sydney*r.au_all_all')).toBe('Sydney + remote');
    // Work modes, seniority and work rights are not places.
    expect(label('r.au_graduate_npr')).toBe('All Australia');
    expect(label('o.au-nsw*h.au-vic_all_all')).toBe('custom places');
  });

  it('All Australia reset keeps the other conditions', () => {
    const f = decodeFilter('o.au-nsw-sydney*r.au_entry_npr');
    expect(isAllAustralia(f)).toBe(false);
    const reset = resetPlaces(f);
    expect(isAllAustralia(reset)).toBe(true);
    expect(encodeFilter(reset)).toBe('o.au_entry_npr');
    const custom = resetPlaces(decodeFilter('o.au-nsw*h.au-vic_graduate_all'));
    expect(encodeFilter(custom)).toBe('ohr.au_graduate_all');
    expect(isDefaultFilter(resetPlaces(decodeFilter('ohr.au-vic_all_all')))).toBe(true);
  });

  it('lists non-place conditions as chips and removes them one at a time', () => {
    expect(scopeConditions(DEFAULT_FILTER)).toEqual([]);
    const f = decodeFilter('r.au-nt-darwin_graduate_npr');
    expect(scopeConditions(f)).toEqual(['seniority', 'work_rights', 'work_modes']);
    const noModes = clearScopeCondition(f, 'work_modes');
    expect(toSimpleFilter(noModes)).toEqual({ places: ['au-nt-darwin'], modes: ['onsite', 'hybrid', 'remote'], includeRemoteAnywhere: false });
    expect(clearScopeCondition(f, 'seniority').seniority).toBe('all');
    expect(clearScopeCondition(f, 'work_rights').work_rights).toBe('all');
    // Clearing modes in all of Australia makes remote-anywhere redundant: back to the default.
    const remoteOnly = fromSimpleFilter({ places: ['au'], modes: ['onsite'], includeRemoteAnywhere: true }, DEFAULT_FILTER);
    expect(isDefaultFilter(clearScopeCondition(remoteOnly, 'work_modes'))).toBe(true);
    // A multi-rule spec has no single set of modes to show as a chip.
    expect(scopeConditions(decodeFilter('o.au-nsw*h.au-vic_entry_all'))).toEqual(['seniority']);
  });
});
