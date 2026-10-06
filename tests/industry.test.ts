import { describe, expect, it } from 'vitest';
import { squarify, type TreemapItem } from '../src/lib/market/treemap';
import { heatStep, tileArea } from '../src/lib/market/heatmap';
import { isEligibleMover, pickMovers } from '../src/lib/market/movers';
import { computeMetric, industrySkillReadings, segmentCounts } from '../src/lib/market/engine';
import { componentsOf, getInstrument, INDUSTRY_COMPONENTS, industriesForSkill, instrumentsOfType, searchInstruments } from '../src/lib/market/catalog';
import { defaultMetric, isValidMetric, metricsFor, sharedMetrics, signalMetric } from '../src/lib/metrics/registry';
import { getBoard, getIndustryHeatmap, getIndustrySkillHeatmap, getInstrumentDetail, getMovers } from '../src/lib/queries/market';
import { parseBoardType } from '../src/features/market/logic';
import { instrumentPath } from '../src/lib/links';
import { DEFAULT_FILTER } from '../src/lib/filters/spec';
import type { FilterSpec, MetricReading } from '../src/lib/market/types';

const tiny: FilterSpec = { rules: [{ work_modes: ['remote'], location_ids: ['au-nt-darwin'] }], seniority: 'graduate', work_rights: 'no_pr_required' };

describe('squarify', () => {
  const rect = { x: 0, y: 0, w: 100, h: 60 };
  const items: TreemapItem[] = [6, 6, 4, 3, 2, 2, 1].map((value, i) => ({ id: `t${i}`, value }));

  it('fills the rectangle with areas proportional to value', () => {
    const tiles = squarify(items, rect);
    expect(tiles).toHaveLength(items.length);
    const total = items.reduce((a, b) => a + b.value, 0);
    const area = tiles.reduce((a, t) => a + t.w * t.h, 0);
    expect(area).toBeCloseTo(100 * 60, 6);
    for (const t of tiles) expect(t.w * t.h).toBeCloseTo((t.value / total) * 6000, 6);
  });

  it('keeps every tile inside the rectangle and never overlaps', () => {
    const tiles = squarify(items, rect);
    const eps = 1e-9;
    for (const t of tiles) {
      expect(t.x).toBeGreaterThanOrEqual(-eps);
      expect(t.y).toBeGreaterThanOrEqual(-eps);
      expect(t.x + t.w).toBeLessThanOrEqual(100 + eps);
      expect(t.y + t.h).toBeLessThanOrEqual(60 + eps);
    }
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        const a = tiles[i];
        const b = tiles[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        expect(ox <= eps || oy <= eps).toBe(true);
      }
    }
  });

  it('produces reasonably square tiles (the classic example stays under 3:1)', () => {
    for (const t of squarify(items, rect)) expect(Math.max(t.w / t.h, t.h / t.w)).toBeLessThan(3);
  });

  it('orders output by value, drops non-positive values and handles edge cases', () => {
    const tiles = squarify([{ id: 'a', value: 1 }, { id: 'z', value: 0 }, { id: 'b', value: 5 }, { id: 'n', value: Number.NaN }], rect);
    expect(tiles.map(t => t.id)).toEqual(['b', 'a']);
    expect(squarify([], rect)).toEqual([]);
    expect(squarify(items, { x: 0, y: 0, w: 0, h: 10 })).toEqual([]);
    expect(squarify([{ id: 'only', value: 3 }], rect)).toEqual([{ id: 'only', value: 3, x: 0, y: 0, w: 100, h: 60 }]);
  });

  it('is deterministic', () => {
    expect(squarify(items, rect)).toEqual(squarify(items, rect));
  });
});

describe('heat bands', () => {
  const r = (value: number | null, status: MetricReading['status'] = 'ok') => ({ value, status });
  it('bins change into a diverging scale with a neutral band near zero', () => {
    expect(heatStep(r(0.01))).toBe(0);
    expect(heatStep(r(-0.019))).toBe(0);
    expect(heatStep(r(0.05))).toBe(1);
    expect(heatStep(r(0.1))).toBe(2);
    expect(heatStep(r(-0.05))).toBe(-1);
    expect(heatStep(r(-0.25))).toBe(-2);
  });
  it('greys out missing or thin samples', () => {
    expect(heatStep(r(0.4, 'insufficient_sample'))).toBe('na');
    expect(heatStep(r(null))).toBe('na');
  });
});

describe('industries as instruments', () => {
  it('are ANZSIC divisions with a reserved parent and a board tab', () => {
    const industries = instrumentsOfType('industry');
    expect(industries.length).toBeGreaterThanOrEqual(10);
    for (const i of industries) {
      expect(i.anzsic).toMatch(/^[A-S]$/);
      expect(i.parent_id).toBeNull();
      expect(i.id).toBe(`industry:${i.slug}`);
    }
    expect(parseBoardType('industry')).toBe('industry');
    expect(instrumentPath('industry', 'mining')).toBe('/i/mining');
    expect(searchInstruments('xero')[0]?.instrument.slug).toBe('xero');
    expect(searchInstruments('government')[0]?.instrument.slug).toBe('public-administration');
  });

  it('default to Demand with a 4-week change and never offer salary', () => {
    expect(defaultMetric('industry')).toBe('ad_count');
    expect(signalMetric('industry')).toBe('change_4w');
    expect(isValidMetric('industry', 'salary_median')).toBe(false);
    expect(isValidMetric('industry', 'skill_premium')).toBe(false);
    const groups = metricsFor('industry');
    expect([groups.default, ...groups.common, ...groups.advanced]).not.toContain('salary_median');
    expect(sharedMetrics()).toContain('ad_count');
    expect(sharedMetrics()).not.toContain('salary_median');
    expect(computeMetric('mining', 'salary_median', DEFAULT_FILTER).status).toBe('unavailable');
  });

  it('link only to concrete, known skills with weights in (0, 1]', () => {
    for (const [slug, comps] of Object.entries(INDUSTRY_COMPONENTS)) {
      expect(getInstrument(slug)?.type).toBe('industry');
      expect(comps.length).toBeGreaterThanOrEqual(3);
      for (const c of comps) {
        expect(getInstrument(c.skill_slug)?.type).toBe('skill');
        expect(c.weight).toBeGreaterThan(0);
        expect(c.weight).toBeLessThanOrEqual(1);
        // Core competencies are not instruments; generic people skills stay out of industries.
        expect(c.skill_slug).not.toBe('stakeholder-management');
      }
      expect(comps.map(c => c.weight)).toEqual([...comps.map(c => c.weight)].sort((a, b) => b - a));
    }
    expect(componentsOf('mining')).toBe(INDUSTRY_COMPONENTS.mining);
    expect(industriesForSkill('python').map(x => x.industry.slug)).toContain('professional-services');
  });

  it('shows up on the Industries and All boards', () => {
    const board = getBoard({ type: 'industry', filter: DEFAULT_FILTER });
    expect(board.metric).toBe('ad_count');
    expect(board.rows.every(r => r.instrument.type === 'industry')).toBe(true);
    expect(board.rows[0].change.metric).toBe('change_4w');
    expect(getBoard({ type: 'all', filter: DEFAULT_FILTER }).rows.some(r => r.instrument.type === 'industry')).toBe(true);
    expect(getBoard({ type: 'industry', filter: DEFAULT_FILTER, metric: 'salary_median' }).metric).toBe('ad_count');
  });
});

describe('industry × skill aggregation', () => {
  it('scales the industry by the weight and follows the skill’s relative trend', () => {
    const industry = [100, 100, 100, 100];
    const flat = [10, 10, 10, 10];
    const universe = [1000, 1000, 1000, 1000];
    expect(segmentCounts(industry, flat, universe, 0.5, 4)).toEqual([50, 50, 50, 50]);
    const rising = [8, 9, 11, 12];
    const seg = segmentCounts(industry, rising, universe, 0.5, 4);
    expect(seg[3]).toBeGreaterThan(seg[0]);
    expect(seg.reduce((a, b) => a + b, 0)).toBe(200);
    expect(segmentCounts(industry, [0, 0, 0, 0], universe, 0.5, 4)).toEqual([50, 50, 50, 50]);
  });

  it('gives each skill tile a count no larger than the industry’s ads', () => {
    const industryAds = computeMetric('health-care', 'ad_count', DEFAULT_FILTER).value ?? 0;
    for (const c of INDUSTRY_COMPONENTS['health-care']) {
      const r = industrySkillReadings('health-care', c.skill_slug, c.weight, DEFAULT_FILTER);
      expect(r.ad_count.denominator).toBe(industryAds);
      expect(r.ad_count.numerator ?? 0).toBeLessThanOrEqual(industryAds);
      expect(r.ad_count.source).toBe('ads');
      expect(r.change_4w.metric).toBe('change_4w');
    }
  });

  it('builds heatmaps for the landing page and the industry page', () => {
    const landing = getIndustryHeatmap(DEFAULT_FILTER);
    expect(landing.kind).toBe('industries');
    expect(landing.tiles.length).toBe(instrumentsOfType('industry').length);
    expect(landing.tiles.map(tileArea)).toEqual([...landing.tiles.map(tileArea)].sort((a, b) => b - a));
    const skills = getIndustrySkillHeatmap('mining', DEFAULT_FILTER);
    expect(skills.parent).toBe('mining');
    expect(skills.tiles.map(t => t.slug)).toContain('mine-planning');
    // Thin segments stay on the map but are greyed out.
    const thin = getIndustrySkillHeatmap('mining', tiny).tiles;
    expect(thin.some(t => heatStep(t.change) === 'na')).toBe(true);
  });

  it('attaches the heatmap and the skills list to the industry detail only', () => {
    const d = getInstrumentDetail('construction', DEFAULT_FILTER);
    expect(d?.heatmap?.tiles.length).toBe(INDUSTRY_COMPONENTS.construction.length);
    expect(d?.composition.map(c => c.instrument.slug)).toEqual(INDUSTRY_COMPONENTS.construction.map(c => c.skill_slug));
    expect(d?.readings.salary_median).toBeUndefined();
    expect(getInstrumentDetail('python', DEFAULT_FILTER)?.heatmap).toBeNull();
    expect(getInstrumentDetail('data-engineer', DEFAULT_FILTER)?.composition[0]?.weight).toBeGreaterThan(0);
  });
});

describe('landing movers rule', () => {
  const base = { metric: 'change_4w' as const, status: 'ok' as const, numerator: null, denominator: null, low: null, high: null, min_sample: 30, window: { start: '', end: '', days: 56 }, source: 'ads' as const, source_id: 'x', updated_at: '' };
  const c = (slug: string, value: number | null, from: number, status: MetricReading['status'] = 'ok') => ({ slug, change: { ...base, status, value, from, to: Math.round(from * (1 + (value ?? 0))), sample_n: from } });

  it('picks the largest absolute change, up or down, among base counts ≥ min sample', () => {
    const picked = pickMovers([c('a', 0.2, 100), c('b', -0.5, 80), c('tiny', 3, 10), c('c', 0.05, 5000), c('thin', 0.9, 40, 'insufficient_sample')], 3);
    expect(picked.map(p => p.slug)).toEqual(['b', 'a', 'c']);
  });

  it('breaks ties by the larger base and then by slug, and respects the limit', () => {
    expect(pickMovers([c('y', 0.3, 50), c('x', -0.3, 50), c('z', 0.3, 90)], 2).map(p => p.slug)).toEqual(['z', 'x']);
    expect(pickMovers([c('a', 0.2, 100)], 0)).toEqual([]);
  });

  it('only accepts 4-week change readings at or above the minimum base', () => {
    expect(isEligibleMover(c('edge', 0.2, 30).change)).toBe(true);
    expect(isEligibleMover(c('edge', 0.2, 29).change)).toBe(false);
    expect(isEligibleMover({ ...c('g', 0.2, 100).change, metric: 'growth_12m' })).toBe(false);
  });

  it('returns eligible movers of any type from the fixture market', () => {
    const movers = getMovers(DEFAULT_FILTER, 4);
    expect(movers).toHaveLength(4);
    for (const m of movers) expect((m.change.from ?? 0) >= m.change.min_sample).toBe(true);
    const mags = movers.map(m => Math.abs(m.change.value ?? 0));
    expect(mags).toEqual([...mags].sort((a, b) => b - a));
  });
});
