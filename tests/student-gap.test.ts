import { describe, expect, it } from 'vitest';
import { diagnoseGap, MAX_PRIORITIES, priorityScore } from '../src/lib/api/gap';
import { ROLE_COMPONENTS } from '../src/lib/market/catalog';

describe('diagnoseGap (FR-G1–G3)', () => {
  it('returns at most three priorities, each with its reasons', () => {
    const g = diagnoseGap('data-engineer', [])!;
    expect(g.priorities).toHaveLength(MAX_PRIORITIES);
    for (const p of g.priorities) {
      expect(p.relevance).toBeGreaterThan(0);
      expect(p.entry_share.metric).toBe('entry_level_share');
      expect(['broad', 'moderate', 'narrow']).toContain(p.transferability);
      expect(['weeks', 'months', 'year_plus']).toContain(p.effort);
      expect(p.role_count).toBeGreaterThan(0);
      expect(p.ways.some(w => w.kind === 'project')).toBe(true);
    }
    expect(g.priorities.length + g.later.length).toBe(ROLE_COMPONENTS['data-engineer'].length);
  });

  it('never suggests what the student already has, and lists it positively', () => {
    const g = diagnoseGap('data-engineer', [
      { skill_slug: 'sql', source: 'confirmed' },
      { skill_slug: 'python', source: 'self_reported' },
      { skill_slug: 'aws', source: 'inferred' },
    ])!;
    const suggested = g.priorities.map(p => p.skill.slug);
    expect(suggested).not.toContain('sql');
    expect(suggested).not.toContain('python');
    expect(suggested).not.toContain('aws');
    expect(g.have.map(h => h.skill.slug)).toEqual(['sql', 'python', 'aws']);
    expect(g.have.find(h => h.skill.slug === 'aws')?.suggested).toBe(true);
  });

  it('points to units that teach the skill, with the university named', () => {
    const g = diagnoseGap('data-analyst', [], undefined, 'usyd')!;
    const withUnit = g.priorities.flatMap(p => p.ways).find(w => w.kind === 'unit');
    expect(withUnit && withUnit.kind === 'unit' && withUnit.university_name).toBe('The University of Sydney');
  });

  it('weighs demand as one input among several', () => {
    // A slightly less-mentioned skill that is quick and broad can outrank a slow, narrow one.
    expect(priorityScore(0.4, 0.25, 'broad', 'weeks')).toBeGreaterThan(priorityScore(0.45, 0.07, 'narrow', 'year_plus'));
  });

  it('has nothing left when the profile covers the role', () => {
    const all = ROLE_COMPONENTS['network-engineer'].map(c => ({ skill_slug: c.skill_slug, source: 'confirmed' as const }));
    const g = diagnoseGap('network-engineer', all)!;
    expect(g.priorities).toEqual([]);
    expect(g.have).toHaveLength(all.length);
  });

  it('returns null for unknown roles or skills passed as roles', () => {
    expect(diagnoseGap('astronaut', [])).toBeNull();
    expect(diagnoseGap('python', [])).toBeNull();
  });
});
