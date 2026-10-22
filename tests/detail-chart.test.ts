import { describe, expect, it } from 'vitest';
import { computeBreakdown, computeMetric, WEEKS } from '@/lib/market/engine';
import { DEFAULT_SKILL_SALARY, deriveSkillSalary, ROLE_COMPONENTS, rolesForSkill, salaryOf } from '@/lib/market/catalog';
import {
  DEFAULT_FILTER, decodeFilter, encodeFilter, fromSimpleFilter, isDefaultFilter, placesLabel, scopeConditions,
  titleFilterLabel, type PlacesCopy, type TitleFilterCopy,
} from '@/lib/filters/spec';
import { chartSeriesFor, isValidMetric, metricsFor } from '@/lib/metrics/registry';
import {
  breakdownParam, canonicalDetailQuery, chartPlanFor, chosenByParam, rollingWindow, syncChartRange, effectiveSplit, fixedSplitDimensions, legacyYMetric, nextByParam, parseBreakdownBy, splitBlockers,
} from '@/features/market/logic';
import { getInstrumentDetail } from '@/lib/queries/market';
import pages from '../messages/en/market-pages.json';

// Detail page: one measure (`?metric=`) drives the headline and the chart; the
// split (`?by=`) lives in the title's Filter panel (FE-R5).

describe('measure → chart', () => {
  it('maps old ?y= links onto ?metric=', () => {
    expect(legacyYMetric('salary')).toBe('salary_median');
    expect(legacyYMetric('ads')).toBe('ad_count');
    expect(legacyYMetric(undefined)).toBeUndefined();
    expect(legacyYMetric('salary_median')).toBeUndefined();
  });

  it('charts level measures as themselves, where the type has the series', () => {
    expect(chartPlanFor('ad_count', 'skill')).toEqual({ series: 'ad_count', range: '1y', compare: null });
    expect(chartPlanFor('entry_level_share', 'role')).toEqual({ series: 'entry_level_share', range: '1y', compare: null });
    expect(chartPlanFor('employer_concentration', 'industry').series).toBe('employer_concentration');
    expect(chartPlanFor('salary_median', 'skill').series).toBe('salary_median');
    expect(chartPlanFor('salary_p10_p90', 'role').series).toBe('salary_median');
    expect(chartPlanFor('skill_premium', 'skill').series).toBe('salary_median');
    expect(chartPlanFor('skills_per_ad', 'role').series).toBe('ad_count');
    expect(chartPlanFor('salary_median', 'industry').series).toBe('ad_count');
  });

  it('charts change measures as Job ads over a range that shows both compared windows', () => {
    expect(chartPlanFor('change_4w', 'skill')).toEqual({ series: 'ad_count', range: '3m', compare: { weeks: 4, marks: true } });
    expect(chartPlanFor('growth_12m', 'role')).toEqual({ series: 'ad_count', range: '2y', compare: { weeks: 52, marks: false } });
    expect(chartPlanFor('volatility', 'industry')).toEqual({ series: 'ad_count', range: '1y', compare: null });
  });

  it('offers the chartable level measures as Y axis options', () => {
    expect(chartSeriesFor('skill')).toEqual(['ad_count', 'salary_median', 'entry_level_share', 'no_pr_required_share', 'employer_concentration', 'remote_share', 'contract_share']);
    expect(chartSeriesFor('industry')).not.toContain('salary_median');
    for (const type of ['skill', 'role', 'industry'] as const) for (const m of chartSeriesFor(type)) expect(chartPlanFor(m, type).series).toBe(m);
  });
});

describe('?by= parsing and fixed splits', () => {
  it('reads the split: none by default, old none / invalid = not split', () => {
    expect(parseBreakdownBy(undefined)).toBeNull();
    expect(parseBreakdownBy('none')).toBeNull();
    expect(parseBreakdownBy('experience')).toBe('experience');
    expect(parseBreakdownBy('mode')).toBe('mode');
    expect(parseBreakdownBy('rights')).toBe('rights');
    expect(parseBreakdownBy('location')).toBeNull();
    expect(breakdownParam('experience')).toBe('experience');
    expect(breakdownParam(null)).toBeNull();
    expect(breakdownParam('mode')).toBe('mode');
    for (const by of ['experience', 'rights', 'mode', null] as const) expect(parseBreakdownBy(breakdownParam(by) ?? undefined)).toBe(by);
  });

  it('disables splits the filter has fixed to one bucket', () => {
    expect(fixedSplitDimensions(DEFAULT_FILTER)).toEqual([]);
    expect(fixedSplitDimensions(decodeFilter('ohr.au_entry_all'))).toEqual(['experience']);
    expect(fixedSplitDimensions(decodeFilter('ohr.au_graduate_all'))).toEqual(['experience']);
    expect(fixedSplitDimensions(decodeFilter('r.au-nsw_all_all'))).toEqual(['mode']);
    // Two modes, or one mode plus remote-anywhere, are not fixed.
    expect(fixedSplitDimensions(decodeFilter('oh.au-nsw_all_all'))).toEqual([]);
    expect(fixedSplitDimensions(decodeFilter('o.au-nsw*r.au_all_all'))).toEqual([]);
    // "No PR stated" fixes Work rights: splitting would only restate the filter.
    expect(fixedSplitDimensions(decodeFilter('ohr.au_all_npr'))).toEqual(['rights']);
    expect(fixedSplitDimensions(decodeFilter('r.au_graduate_npr'))).toEqual(['experience', 'rights', 'mode']);
    expect(splitBlockers(decodeFilter('ohr.au_all_npr'), 'ad_count')).toEqual({ rights: 'filter' });
    expect(effectiveSplit('rights', decodeFilter('ohr.au_all_npr'))).toBeNull();
  });

  it('draws a conflicting split as no split, and leaves others alone', () => {
    const grad = decodeFilter('ohr.au_graduate_all');
    expect(effectiveSplit('experience', grad)).toBeNull();
    expect(effectiveSplit('mode', grad)).toBe('mode');
    expect(effectiveSplit(null, grad)).toBeNull();
    expect(effectiveSplit('mode', decodeFilter('r.au_all_all'))).toBeNull();
    expect(effectiveSplit('experience', DEFAULT_FILTER)).toBe('experience');
  });

  it('a share is never split by its own dimension', () => {
    expect(splitBlockers(DEFAULT_FILTER, 'entry_level_share')).toEqual({ experience: 'measure' });
    expect(splitBlockers(decodeFilter('r.au_entry_all'), 'remote_share')).toEqual({ experience: 'filter', mode: 'measure' });
    expect(effectiveSplit('rights', DEFAULT_FILTER, 'no_pr_required_share')).toBeNull();
    expect(effectiveSplit('mode', DEFAULT_FILTER, 'no_pr_required_share')).toBe('mode');
  });

  it('never keeps a fixed split in the URL', () => {
    // A split now fixed by the filter or the measure is dropped (no by = no split).
    expect(nextByParam('mode', decodeFilter('r.au_all_all'), 'ad_count')).toBeNull();
    expect(nextByParam('mode', DEFAULT_FILTER, 'remote_share')).toBeNull();
    expect(nextByParam('rights', decodeFilter('ohr.au_all_npr'), 'ad_count')).toBeNull();
    expect(nextByParam('rights', DEFAULT_FILTER, 'ad_count')).toBe('rights');
    expect(nextByParam('experience', DEFAULT_FILTER, 'ad_count')).toBe('experience');
    expect(nextByParam('experience', decodeFilter('ohr.au_entry_all'), 'ad_count')).toBeNull();
    // Absent, or an old `none`: no split, no param.
    expect(nextByParam(null, decodeFilter('ohr.au_entry_all'), 'ad_count')).toBeNull();
    expect(nextByParam('none', DEFAULT_FILTER, 'ad_count')).toBeNull();
    // Chosen in the Filter panel.
    expect(chosenByParam(null, DEFAULT_FILTER, 'ad_count')).toBeNull();
    expect(chosenByParam('experience', DEFAULT_FILTER, 'ad_count')).toBe('experience');
    expect(chosenByParam('mode', decodeFilter('o.au_all_all'), 'ad_count')).toBeNull();
    expect(chosenByParam('mode', DEFAULT_FILTER, 'ad_count')).toBe('mode');
    expect(chosenByParam('rights', decodeFilter('ohr.au_all_npr'), 'ad_count')).toBeNull();
  });

  it('rewrites old or conflicting detail URLs once, and leaves canonical ones alone', () => {
    const q = (sp: Record<string, string>, metric: Parameters<typeof canonicalDetailQuery>[2] = 'ad_count', type: Parameters<typeof canonicalDetailQuery>[3] = 'skill') => canonicalDetailQuery(sp, decodeFilter(sp.f ?? null), metric, type);
    expect(q({})).toBeNull();
    expect(q({ metric: 'salary_median', by: 'rights' }, 'salary_median')).toBeNull();
    expect(q({ y: 'salary' })).toBe('metric=salary_median');
    expect(q({ y: 'ads' })).toBe('');
    expect(q({ y: 'salary', metric: 'change_4w' }, 'change_4w')).toBe('metric=change_4w');
    expect(q({ y: 'salary' }, 'ad_count', 'industry')).toBe('');
    expect(q({ f: 'r.au_all_all', by: 'mode' })).toBe('f=r.au_all_all');
    expect(q({ metric: 'remote_share', by: 'mode' }, 'remote_share')).toBe('metric=remote_share');
    expect(q({ f: 'ohr.au_all_npr', by: 'rights' })).toBe('f=ohr.au_all_npr');
    // Old `by=none` links lose the param once; the result is canonical (no loop).
    expect(q({ by: 'none' })).toBe('');
    expect(q({ metric: 'salary_median', by: 'none' }, 'salary_median')).toBe('metric=salary_median');
    expect(q({ metric: 'salary_median' }, 'salary_median')).toBeNull();
    expect(q({ by: 'experience' })).toBeNull();
  });

  it('one measure drives the headline and the chart', () => {
    const mining = getInstrumentDetail('mining', DEFAULT_FILTER, 'salary_median', 'experience');
    expect(mining?.metric).toBe('ad_count');
    expect(mining?.breakdown.measure).toBe('ad_count');
    const sql = getInstrumentDetail('sql', DEFAULT_FILTER, 'salary_median', null);
    expect(sql?.chart.series).toBe('salary_median');
    expect(sql?.breakdown.by).toBeNull();
    expect(sql?.breakdown.measure).toBe('salary_median');
    // The bug this fixes: picking 4-week change used to leave the chart as it was.
    const change = getInstrumentDetail('sql', DEFAULT_FILTER, 'change_4w', 'experience');
    expect(change?.chart).toMatchObject({ series: 'ad_count', range: '3m', compare: { weeks: 4, marks: true }, by: 'experience' });
    expect(change?.breakdown.measure).toBe('ad_count');
    // A share split by its own dimension is drawn unsplit; the requested split is kept for links.
    const entry = getInstrumentDetail('sql', DEFAULT_FILTER, 'entry_level_share', 'experience');
    expect(entry?.breakdown.by).toBeNull();
    expect(entry?.chart.by).toBe('experience');
    // No split unless one is asked for.
    expect(getInstrumentDetail('sql', DEFAULT_FILTER)?.breakdown.by).toBeNull();
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

  it('lists the non-place conditions that narrow', () => {
    expect(scopeConditions(DEFAULT_FILTER)).toEqual([]);
    expect(scopeConditions(decodeFilter('r.au-nt-darwin_graduate_npr'))).toEqual(['seniority', 'work_rights', 'work_modes']);
    // A multi-rule spec has no single set of modes to name.
    expect(scopeConditions(decodeFilter('o.au-nsw*h.au-vic_entry_all'))).toEqual(['seniority']);
  });
});

describe('filter sentence in the title', () => {
  const copy: TitleFilterCopy = { places: pages.InstrumentPage.places.label as PlacesCopy, ...pages.InstrumentPage.titleFilter };
  const sentence = (raw: string | null) => titleFilterLabel(decodeFilter(raw), copy);

  it('is just the places when nothing else narrows', () => {
    expect(sentence(null)).toBe('All Australia');
    expect(sentence('ohr.au-nsw-sydney_all_all')).toBe('Sydney');
  });

  it('appends only narrowing conditions, in a fixed order', () => {
    expect(sentence('oh.au-nsw-sydney*r.au_entry_npr')).toBe('Sydney (on-site or hybrid) + remote · Entry-level · No PR stated');
    expect(sentence('ohr.au-nsw-sydney*r.au_all_all')).toBe('Sydney + remote');
    expect(sentence('oh.au-nsw-sydney_all_all')).toBe('Sydney · On-site or hybrid');
    expect(sentence('r.au_graduate_all')).toBe('All Australia · Graduate · Remote only');
    expect(sentence('ohr.au_all_npr')).toBe('All Australia · No PR stated');
  });

  it('uses the custom-places wording for multi-rule filters', () => {
    expect(sentence('o.au-nsw*h.au-vic_entry_all')).toBe('custom places · Entry-level');
  });

  it('keeps the URL stable: encoding the default stays the default', () => {
    expect(isDefaultFilter(fromSimpleFilter({ places: ['au'], modes: ['onsite', 'hybrid', 'remote'], includeRemoteAnywhere: false }, DEFAULT_FILTER))).toBe(true);
    expect(encodeFilter(DEFAULT_FILTER)).toBe('ohr.au_all_all');
  });

  it('adds the chart split when one is drawn', () => {
    expect(titleFilterLabel(DEFAULT_FILTER, copy, undefined, 'by experience')).toBe('All Australia · by experience');
    expect(titleFilterLabel(decodeFilter('ohr.au_entry_all'), copy, undefined, 'by work mode')).toBe('All Australia · Entry-level · by work mode');
  });
});

describe('chart range and caption window', () => {
  it('keeps the picked range until the measure or split changes', () => {
    const start = { key: 'ad_count-none-stack', range: '3m' as const };
    expect(syncChartRange(start, 'ad_count-none-stack', '1y')).toBe(start);
    expect(syncChartRange(start, 'salary_median-none-lines', '1y')).toEqual({ key: 'salary_median-none-lines', range: '1y' });
    expect(syncChartRange(start, 'ad_count-experience-stack', '2y')).toEqual({ key: 'ad_count-experience-stack', range: '2y' });
  });
  it('names the rolling window of each chartable measure', () => {
    expect(rollingWindow(28)).toEqual({ unit: 'weeks', n: 4 });
    expect(rollingWindow(365)).toEqual({ unit: 'months', n: 12 });
  });
});
