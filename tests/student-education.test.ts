import { describe, expect, it } from 'vitest';
import { COURSE_UNITS, DEGREES, describeReason, inferSkillProfile, MAX_SUGGESTION_CONFIDENCE, MIN_SUGGESTION_CONFIDENCE, unitsTeaching } from '../src/lib/demo/education';
import { getInstrument } from '../src/lib/market/catalog';

describe('education catalogue', () => {
  it('only maps to skills the market catalogue tracks', () => {
    for (const d of DEGREES) for (const s of d.skills) expect(getInstrument(s.skill_slug)?.type, `${d.id}:${s.skill_slug}`).toBe('skill');
    for (const u of COURSE_UNITS) for (const s of u.skills) expect(getInstrument(s.skill_slug)?.type, `${u.code}:${s.skill_slug}`).toBe('skill');
  });

  it('finds units that teach a skill, strongest first', () => {
    const sql = unitsTeaching('sql');
    expect(sql[0].unit.code).toBe('ISYS2120');
    expect(unitsTeaching('sql', 'unsw')).toEqual([]);
  });
});

describe('inferSkillProfile (Tier 0 / Tier 1)', () => {
  it('is deterministic and sorted by confidence', () => {
    const a = inferSkillProfile({ degree_id: 'bach-adv-computing', year: '3', unit_codes: [] });
    expect(a).toEqual(inferSkillProfile({ degree_id: 'bach-adv-computing', year: '3', unit_codes: [] }));
    expect(a.length).toBeGreaterThan(3);
    for (let i = 1; i < a.length; i++) expect(a[i - 1].confidence).toBeGreaterThanOrEqual(a[i].confidence);
  });

  it('gives first-years softer and fewer suggestions', () => {
    const y1 = inferSkillProfile({ degree_id: 'bach-adv-computing', year: '1', unit_codes: [] });
    const y3 = inferSkillProfile({ degree_id: 'bach-adv-computing', year: '3', unit_codes: [] });
    expect(y1.length).toBeLessThan(y3.length);
    const py1 = y1.find(s => s.skill_slug === 'python')?.confidence ?? 0;
    const py3 = y3.find(s => s.skill_slug === 'python')?.confidence ?? 0;
    expect(py1).toBeLessThan(py3);
  });

  it('ticked units add skills, raise confidence and are named as the reason', () => {
    const base = inferSkillProfile({ degree_id: 'bach-adv-computing', year: '3', unit_codes: [] });
    const withUnits = inferSkillProfile({ degree_id: 'bach-adv-computing', year: '3', unit_codes: ['isys2120', 'COMP2017'] });
    const sqlBefore = base.find(s => s.skill_slug === 'sql')!;
    const sqlAfter = withUnits.find(s => s.skill_slug === 'sql')!;
    expect(sqlAfter.confidence).toBeGreaterThan(sqlBefore.confidence);
    expect(sqlAfter.reason).toBe('ISYS2120');
    expect(sqlAfter.sources.map(s => s.source)).toContain('bach-adv-computing');
    expect(withUnits.some(s => s.skill_slug === 'postgresql')).toBe(true);
    expect(base.some(s => s.skill_slug === 'postgresql')).toBe(false);
  });

  it('never claims certainty and drops weak evidence', () => {
    const all = inferSkillProfile({ degree_id: 'bach-data-science', year: 'graduated', unit_codes: COURSE_UNITS.map(u => u.code) });
    for (const s of all) {
      expect(s.confidence).toBeLessThanOrEqual(MAX_SUGGESTION_CONFIDENCE);
      expect(s.confidence).toBeGreaterThanOrEqual(MIN_SUGGESTION_CONFIDENCE);
    }
  });

  it('works from units alone and ignores unknown codes', () => {
    const r = inferSkillProfile({ degree_id: null, year: null, unit_codes: ['INFO1110', 'NOPE9999'] });
    expect(r.map(s => s.skill_slug)).toEqual(['python', 'git']);
    expect(r[0].reason).toBe('INFO1110');
  });

  it('describes stored reasons', () => {
    expect(describeReason('COMP2123')).toMatchObject({ kind: 'unit' });
    expect(describeReason('bach-it')).toMatchObject({ kind: 'degree' });
    expect(describeReason(null)).toBeNull();
  });
});
