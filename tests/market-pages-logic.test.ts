import { describe, expect, it } from 'vitest';
import {
  barPercent, chartMetricFor, compareState, correlationBand, firstParam, hrefWith, keyMetrics, parseBoardType, parseSort, parseView,
  salaryAxis, SUGGESTED_PAIRS, toQueryString, togetherness,
} from '@/features/market/logic';
import { getInstrument } from '@/lib/market/catalog';
import { DEFAULT_FILTER, decodeFilter } from '@/lib/filters/spec';
import { metricsFor } from '@/lib/metrics/registry';
import { getMetricExamples, getSignalsNow, searchWithSnapshots } from '@/lib/queries/market';

describe('URL parsing', () => {
  it('takes the first non-empty value', () => {
    expect(firstParam(['a', 'b'])).toBe('a');
    expect(firstParam('  ')).toBeUndefined();
    expect(firstParam(undefined)).toBeUndefined();
  });
  it('falls back to safe defaults for unknown values', () => {
    expect(parseBoardType(undefined)).toBe('skill');
    expect(parseBoardType('role')).toBe('role');
    expect(parseBoardType('all')).toBe('all');
    expect(parseBoardType('employer')).toBe('skill');
    expect(parseSort('change')).toBe('change');
    expect(parseSort('rank')).toBe('value');
    expect(parseView('cards')).toBe('cards');
    expect(parseView('grid')).toBe('list');
  });
  it('builds hrefs without empty params', () => {
    expect(hrefWith('/market', { type: 'role', f: null, q: '' })).toBe('/market?type=role');
    expect(hrefWith('/market', {})).toBe('/market');
    expect(toQueryString({ f: 'r.au_all_all', q: ['x', 'y'], empty: undefined })).toBe('f=r.au_all_all&q=x');
  });
});

describe('plain-language bands', () => {
  it('describes correlation in words', () => {
    expect(correlationBand(0.85)).toBe('strong');
    expect(correlationBand(0.7)).toBe('strong');
    expect(correlationBand(0.5)).toBe('some');
    expect(correlationBand(0.1)).toBe('weak');
    expect(correlationBand(-0.2)).toBe('weak');
    expect(correlationBand(-0.6)).toBe('opposite');
  });
  it('describes co-occurrence qualitatively', () => {
    expect(togetherness(0.96)).toBe('often');
    expect(togetherness(0.45)).toBe('sometimes');
    expect(togetherness(0.1)).toBe('occasionally');
  });
});

describe('compare state', () => {
  it('handles missing, unknown, same and mismatched instruments', () => {
    expect(compareState()).toEqual({ kind: 'empty' });
    expect(compareState('nope', 'nada')).toEqual({ kind: 'empty' });
    expect(compareState('python').kind).toBe('partial');
    expect(compareState(undefined, 'java').kind).toBe('partial');
    expect(compareState('python', 'python').kind).toBe('same');
    expect(compareState('python', 'data-analyst').kind).toBe('mismatch');
    const ready = compareState('python', 'java');
    expect(ready.kind).toBe('ready');
  });
  it('suggests only valid same-type pairs', () => {
    for (const [a, b] of SUGGESTED_PAIRS) expect(compareState(a, b).kind).toBe('ready');
  });
});

describe('chart and bar helpers', () => {
  it('charts share metrics directly and everything else as ad counts', () => {
    expect(chartMetricFor('share_of_ads')).toBe('share_of_ads');
    expect(chartMetricFor('entry_level_share')).toBe('entry_level_share');
    expect(chartMetricFor('contract_share')).toBe('ad_count');
    expect(chartMetricFor('growth_12m')).toBe('ad_count');
    expect(chartMetricFor('salary_median')).toBe('ad_count');
  });
  it('scales bars with a visible minimum', () => {
    expect(barPercent(0, 100)).toBe(0);
    expect(barPercent(50, 100)).toBe(50);
    expect(barPercent(1, 1000)).toBe(2);
    expect(barPercent(200, 100)).toBe(100);
    expect(barPercent(5, 0)).toBe(0);
  });
  it('places salary markers in order inside the axis', () => {
    const a = salaryAxis(70000, 97000, 130000);
    expect(a.low).toBeGreaterThan(0);
    expect(a.low).toBeLessThan(a.median);
    expect(a.median).toBeLessThan(a.high);
    expect(a.high).toBeLessThan(100);
  });
  it('lists key metrics default first', () => {
    const keys = keyMetrics(metricsFor('role'));
    expect(keys[0]).toBe('growth_12m');
    expect(keys).toContain('salary_median');
    expect(keys).not.toContain('skill_premium');
  });
});

describe('market page queries', () => {
  it('returns only instruments with signals, biggest move first', () => {
    const rows = getSignalsNow(DEFAULT_FILTER);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(r => r.signal)).toBe(true);
    const mags = rows.map(r => Math.abs(r.signal?.magnitude ?? 0));
    expect([...mags].sort((a, b) => b - a)).toEqual(mags);
  });
  it('produces no signals when the sample is too small', () => {
    expect(getSignalsNow(decodeFilter('r.au-nt-darwin_graduate_npr')).length).toBe(0);
  });
  it('resolves aliases in search and attaches snapshots', () => {
    const r = searchWithSnapshots('js', DEFAULT_FILTER);
    expect(r.skills[0]?.hit.instrument.slug).toBe('javascript');
    expect(r.skills[0]?.snapshot.instrument.slug).toBe('javascript');
    expect(searchWithSnapshots('', DEFAULT_FILTER)).toEqual({ skills: [], roles: [] });
  });
  it('gives example readings only for types the metric applies to', () => {
    const salary = getMetricExamples('salary_median', DEFAULT_FILTER);
    expect(salary.length).toBe(2);
    expect(salary.every(e => e.instrument.type === 'role')).toBe(true);
    expect(getMetricExamples('share_of_ads', DEFAULT_FILTER).length).toBe(4);
    expect(getInstrument('python')).toBeDefined();
  });
});
