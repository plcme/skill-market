import { describe, expect, it } from 'vitest';
import {
  barPercent, boardForTab, boardTypeParam, canonicalMarketQuery, chartMetricFor, COMPARE_MAX, compareBlocker, compareHref, compareState, correlationBand, firstParam, hrefWith,
  keyMetrics, parseBoardType, parseSort, parseView, salaryAxis, SUGGESTED_PAIRS, toggleCompare, toQueryString, togetherness, watchedRows, watchedSlugs,
} from '@/features/market/logic';
import { getInstrument } from '@/lib/market/catalog';
import { DEFAULT_FILTER, decodeFilter } from '@/lib/filters/spec';
import { defaultMetric, isValidMetric, metricsFor, sharedMetrics } from '@/lib/metrics/registry';
import { demandShare } from '@/lib/metrics/demand';
import { getBoard, getInstrumentDetail, getMetricExamples, getSignalsNow, searchWithSnapshots } from '@/lib/queries/market';

describe('URL parsing', () => {
  it('takes the first non-empty value', () => {
    expect(firstParam(['a', 'b'])).toBe('a');
    expect(firstParam('  ')).toBeUndefined();
    expect(firstParam(undefined)).toBeUndefined();
  });
  it('falls back to safe defaults for unknown values', () => {
    expect(parseSort('change')).toBe('change');
    expect(parseSort('rank')).toBe('value');
    expect(parseView('cards')).toBe('cards');
    expect(parseView('grid')).toBe('list');
  });
  it('opens the board on All; skill and role narrow it', () => {
    expect(parseBoardType(undefined)).toBe('all');
    expect(parseBoardType('all')).toBe('all');
    expect(parseBoardType('skill')).toBe('skill');
    expect(parseBoardType('role')).toBe('role');
    expect(parseBoardType('employer')).toBe('all');
    expect(boardTypeParam('all')).toBeUndefined();
    expect(boardTypeParam('skill')).toBe('skill');
    expect(boardTypeParam('role')).toBe('role');
  });
  it('has a Watching tab that reads the All board, keeping watched rows only', () => {
    expect(parseBoardType('watching')).toBe('watching');
    expect(boardTypeParam('watching')).toBe('watching');
    expect(boardForTab('watching')).toBe('all');
    expect(boardForTab('role')).toBe('role');
    // Held and watching both count; the same instrument under two filters counts once; dropped instruments are skipped.
    const watched = watchedSlugs([{ instrument_slug: 'sql' }, { instrument_slug: 'data-analyst' }, { instrument_slug: 'sql' }, { instrument_slug: 'gone' }, { instrument_slug: 'mining' }]);
    expect([...watched]).toEqual(['sql', 'data-analyst', 'mining']);
    const board = getBoard({ type: 'all', filter: DEFAULT_FILTER });
    const rows = watchedRows(board.rows, watched);
    // The tab's count matches the list, which keeps the board's order.
    expect(rows).toHaveLength(watched.size);
    expect(rows.map(r => r.instrument.slug)).toEqual(board.rows.map(r => r.instrument.slug).filter(s => watched.has(s)));
    expect(watchedRows(board.rows, new Set())).toEqual([]);
  });
  it('has no A–Z sort; old links fall back to the measure order', () => {
    expect(parseSort(undefined)).toBe('value');
    expect(parseSort('az')).toBe('value');
    expect(parseSort('name')).toBe('value');
    expect(parseSort(['change', 'az'])).toBe('change');
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

describe('compare selection from the board', () => {
  const py = { slug: 'python', type: 'skill' } as const;
  const java = { slug: 'java', type: 'skill' } as const;
  const rust = { slug: 'rust', type: 'skill' } as const;
  const analyst = { slug: 'data-analyst', type: 'role' } as const;
  it('adds and removes instruments', () => {
    const one = toggleCompare([], py);
    expect(one).toEqual({ ok: true, selection: [py] });
    const two = toggleCompare(one.selection, java);
    expect(two.selection).toEqual([py, java]);
    expect(toggleCompare(two.selection, py).selection).toEqual([java]);
  });
  it('caps the selection at what /compare can show', () => {
    expect(COMPARE_MAX).toBe(2);
    const full = [py, java];
    const r = toggleCompare(full, rust);
    expect(r).toEqual({ ok: false, reason: 'max', selection: full });
    expect(compareBlocker(full, rust)).toBe('max');
    // A larger cap is honoured when passed explicitly.
    expect(toggleCompare(full, rust, 4).selection).toEqual([py, java, rust]);
    expect(toggleCompare([py, java, rust, { slug: 'go', type: 'skill' }], { slug: 'sql', type: 'skill' }, 4).ok).toBe(false);
  });
  it('never mixes skills and roles', () => {
    expect(toggleCompare([py], analyst)).toEqual({ ok: false, reason: 'type', selection: [py] });
    expect(compareBlocker([py], analyst)).toBe('type');
    expect(compareBlocker([py], java)).toBeNull();
    expect(compareBlocker([], analyst)).toBeNull();
  });
  it('links to /compare with a and b only', () => {
    expect(compareHref([py, java])).toBe('/compare?a=python&b=java');
    expect(compareHref([py])).toBe('/compare?a=python');
  });
});

describe('Market board query', () => {
  it('drops an old ?f= and keeps the rest', () => {
    expect(canonicalMarketQuery({ type: 'roles', f: 'r.au_all_all', sort: 'change' })).toBe('type=roles&sort=change');
    expect(canonicalMarketQuery({ f: 'r.au_all_all' })).toBe('');
    expect(canonicalMarketQuery({ f: ['r.au_all_all', 'x'] })).toBe('');
  });
  it('leaves a board URL without a filter alone', () => {
    expect(canonicalMarketQuery({ type: 'roles', q: 'data' })).toBeNull();
    expect(canonicalMarketQuery({})).toBeNull();
    expect(canonicalMarketQuery({ f: '' })).toBeNull();
  });
});

describe('Demand is the default skill measure', () => {
  it('uses ad_count for skills and keeps growth for roles', () => {
    expect(defaultMetric('skill')).toBe('ad_count');
    expect(defaultMetric('role')).toBe('growth_12m');
    expect(getBoard({ type: 'skill', filter: DEFAULT_FILTER }).metric).toBe('ad_count');
    expect(getBoard({ type: 'all', filter: DEFAULT_FILTER }).metric).toBe('ad_count');
  });
  it('keeps share of ads out of the switchers but still valid for old links', () => {
    for (const type of ['skill', 'role'] as const) {
      const g = metricsFor(type);
      expect([g.default, ...g.common, ...g.advanced]).not.toContain('share_of_ads');
    }
    expect(sharedMetrics()).not.toContain('share_of_ads');
    // Still computable (watchlist items, /metrics/share_of_ads)…
    expect(isValidMetric('skill', 'share_of_ads')).toBe(true);
    // …but legacy ?metric=share_of_ads links land on the default everywhere.
    for (const type of ['skill', 'role', 'all'] as const) {
      expect(getBoard({ type, metric: 'share_of_ads', filter: DEFAULT_FILTER }).metric).toBe(type === 'role' ? 'growth_12m' : 'ad_count');
    }
    expect(getInstrumentDetail('python', DEFAULT_FILTER, 'share_of_ads')?.metric).toBe('ad_count');
    expect(getBoard({ type: 'skill', metric: 'entry_level_share', filter: DEFAULT_FILTER }).metric).toBe('entry_level_share');
  });
  it('states the share of ads only for a named instrument', () => {
    const r = getBoard({ type: 'skill', filter: DEFAULT_FILTER }).rows[0]?.metric;
    // Column heads / section headers pass no subject → no figure.
    expect(demandShare(r, undefined)).toBeNull();
    const named = demandShare(r, 'Communication');
    expect(named?.name).toBe('Communication');
    expect(named?.share).toBeCloseTo((r?.numerator ?? 0) / (r?.denominator ?? 1));
    expect(demandShare(getInstrumentDetail('python', DEFAULT_FILTER)?.readings.change_4w, 'Python')).toBeNull();
    expect(demandShare(getInstrumentDetail('rust', decodeFilter('r.au-nt-darwin_graduate_npr'))?.readings.ad_count, 'Rust')).toBeNull();
  });
  it('gives the Demand reading a denominator so its share can be stated', () => {
    const r = getBoard({ type: 'skill', filter: DEFAULT_FILTER }).rows[0]?.metric;
    expect(r?.metric).toBe('ad_count');
    expect(r?.denominator).toBeGreaterThan(r?.numerator ?? 0);
  });
  it('sorts the board by measure or by change only', () => {
    const byValue = getBoard({ type: 'skill', filter: DEFAULT_FILTER, sort: 'value' }).rows.map(r => r.metric.value ?? -1);
    expect([...byValue].sort((a, b) => b - a)).toEqual(byValue);
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
    expect(searchWithSnapshots('', DEFAULT_FILTER)).toEqual({ skills: [], roles: [], industries: [], competencies: [] });
  });
  it('gives example readings only for types the metric applies to', () => {
    const salary = getMetricExamples('salary_median', DEFAULT_FILTER);
    expect(salary.length).toBe(4);
    expect(salary.every(e => e.instrument.type !== 'industry')).toBe(true);
    const range = getMetricExamples('salary_p10_p90', DEFAULT_FILTER);
    expect(range.every(e => e.instrument.type === 'role')).toBe(true);
    expect(getMetricExamples('share_of_ads', DEFAULT_FILTER).length).toBe(6);
    expect(getInstrument('python')).toBeDefined();
  });
});
