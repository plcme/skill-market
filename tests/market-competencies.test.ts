import { describe, expect, it } from 'vitest';
import { getInstrument, instrumentsOfType, ROLE_COMPONENTS, INDUSTRY_COMPONENTS, searchInstruments, skillLayerOf } from '@/lib/market/catalog';
import { COMPETENCY_SCALE_MAX, CORE_COMPETENCIES, competencyHref, competencyLevels, searchCompetencies } from '@/lib/market/competencies';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import { getBoard, searchWithSnapshots } from '@/lib/queries/market';
import { layerParam, parseLayer } from '@/features/market/logic';
import { dropUnknownInstruments } from '@/lib/demo/sanitize';
import { createSeed } from '@/lib/demo/store';
import { FIRST_STEPS } from '@/lib/api/skills';

describe('ASC skill layers', () => {
  it('classifies every skill and only skills', () => {
    for (const s of instrumentsOfType('skill')) expect(['technology_tool', 'specialist_task']).toContain(s.skill_layer);
    for (const i of [...instrumentsOfType('role'), ...instrumentsOfType('industry')]) expect(i.skill_layer).toBeNull();
  });
  it('tools are named products; tasks are activities', () => {
    expect(getInstrument('python')?.skill_layer).toBe('technology_tool');
    expect(getInstrument('excel')?.skill_layer).toBe('technology_tool');
    expect(getInstrument('data-analysis')?.skill_layer).toBe('specialist_task');
    expect(getInstrument('cybersecurity')?.skill_layer).toBe('specialist_task');
    expect(skillLayerOf('networking')).toBe('specialist_task');
  });
  it('the skills board narrows by layer and ignores the param elsewhere', () => {
    const all = getBoard({ type: 'skill', filter: DEFAULT_FILTER });
    const tools = getBoard({ type: 'skill', filter: DEFAULT_FILTER, layer: 'technology_tool' });
    const tasks = getBoard({ type: 'skill', filter: DEFAULT_FILTER, layer: 'specialist_task' });
    expect(tools.rows.every(r => r.instrument.skill_layer === 'technology_tool')).toBe(true);
    expect(tasks.rows.every(r => r.instrument.skill_layer === 'specialist_task')).toBe(true);
    expect(tools.rows.length + tasks.rows.length).toBe(all.rows.length);
    expect(all.layer).toBeNull();
    const roles = getBoard({ type: 'role', filter: DEFAULT_FILTER, layer: 'technology_tool' });
    expect(roles.layer).toBeNull();
    expect(roles.rows.length).toBe(instrumentsOfType('role').length);
  });
  it('round-trips the URL param and ignores junk', () => {
    expect(parseLayer('tool')).toBe('technology_tool');
    expect(parseLayer('task')).toBe('specialist_task');
    expect(parseLayer('constructor')).toBeNull();
    expect(parseLayer(undefined)).toBeNull();
    expect(parseLayer(layerParam('specialist_task'))).toBe('specialist_task');
    expect(layerParam(null)).toBeUndefined();
  });
});

describe('core competencies are not instruments', () => {
  it('communication is gone from the catalogue, compositions and first steps', () => {
    expect(getInstrument('communication')).toBeUndefined();
    for (const comps of [...Object.values(ROLE_COMPONENTS), ...Object.values(INDUSTRY_COMPONENTS)]) {
      for (const c of comps) expect(getInstrument(c.skill_slug)).toBeDefined();
    }
    for (const slug of FIRST_STEPS) expect(getInstrument(slug)?.type).toBe('skill');
    expect(searchInstruments('communication').some(h => h.instrument.type === 'skill')).toBe(false);
  });
  it('lists the ten ASC core competencies', () => {
    expect(CORE_COMPETENCIES).toHaveLength(10);
    expect(new Set(CORE_COMPETENCIES.map(c => c.slug)).size).toBe(10);
  });
  it('search maps soft-skill words to a competency explainer', () => {
    expect(searchCompetencies('communication')[0]).toEqual({ slug: 'oral-communication', matched: 'communication' });
    expect(searchCompetencies('Teamwork')[0]?.slug).toBe('teamwork');
    expect(searchCompetencies('written communication')[0]?.slug).toBe('writing');
    expect(searchCompetencies('co')).toEqual([]);
    expect(searchCompetencies('kubernetes')).toEqual([]);
    expect(competencyHref('teamwork')).toBe('/metrics#competency-teamwork');
    const res = searchWithSnapshots('communication', DEFAULT_FILTER);
    expect(res.competencies.map(c => c.slug)).toContain('oral-communication');
    expect(res.skills).toHaveLength(0);
  });
  it('every role has ten illustrative levels on the 1–10 scale, in ASC order', () => {
    for (const role of instrumentsOfType('role')) {
      const levels = competencyLevels(role.slug);
      expect(levels, role.slug).not.toBeNull();
      expect(levels?.map(l => l.slug)).toEqual(CORE_COMPETENCIES.map(c => c.slug));
      for (const l of levels ?? []) {
        expect(Number.isInteger(l.level)).toBe(true);
        expect(l.level).toBeGreaterThanOrEqual(1);
        expect(l.level).toBeLessThanOrEqual(COMPETENCY_SCALE_MAX);
      }
    }
    expect(competencyLevels('python')).toBeNull();
    expect(competencyLevels('health-care')).toBeNull();
    expect(competencyLevels('nope')).toBeNull();
  });
});

describe('persisted preview state with retired slugs', () => {
  it('drops rows for unknown instruments instead of crashing', () => {
    const db = createSeed(Date.parse('2026-09-20T00:00:00Z'));
    const stale = {
      ...db,
      watchlist: [
        { id: 'w1', instrument_slug: 'communication', status: 'held' as const, filter: DEFAULT_FILTER, metric: 'ad_count' as const, baseline_value: 1, baseline_at: '', created_at: '' },
        { id: 'w2', instrument_slug: 'sql', status: 'held' as const, filter: DEFAULT_FILTER, metric: 'ad_count' as const, baseline_value: 1, baseline_at: '', created_at: '' },
      ],
      skills: [
        { id: 's1', skill_slug: 'communication', source: 'self_reported' as const, confidence: null, reason: null, added_at: '' },
        { id: 's2', skill_slug: 'python', source: 'self_reported' as const, confidence: null, reason: null, added_at: '' },
      ],
      practitioners: db.practitioners.map((p, i) => (i === 0 ? { ...p, skills: [...p.skills, 'communication'] } : p)),
    };
    const clean = dropUnknownInstruments(stale);
    expect(clean.watchlist.map(w => w.id)).toEqual(['w2']);
    expect(clean.skills.map(s => s.id)).toEqual(['s2']);
    expect(clean.practitioners[0].skills).not.toContain('communication');
    expect(dropUnknownInstruments(clean)).toBe(clean);
  });
});
