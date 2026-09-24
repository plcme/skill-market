import { beforeEach, describe, expect, it } from 'vitest';
import { getDB, resetPreview, setPersona } from '../src/lib/demo/store';
import { clearAnonymousOnboarding, completeTier0, completeTier1, readAnonymousOnboarding, selectOnboarding, skipOnboarding } from '../src/lib/api/onboarding';
import { addSkill } from '../src/lib/api/skills';

beforeEach(() => {
  resetPreview();
  clearAnonymousOnboarding();
});

describe('onboarding (FR-O1–O3)', () => {
  it('works signed out and keeps answers on the device only', async () => {
    const r = await completeTier0({ university_id: 'usyd', degree_id: 'bach-adv-computing', year: '3' });
    expect(r.ok && r.data.saved_to_profile).toBe(false);
    expect(r.ok && r.data.suggestions.length).toBeGreaterThan(3);
    expect(getDB().student).toBeNull();
    expect(selectOnboarding(getDB(), readAnonymousOnboarding())).toMatchObject({ signed_in: false, degree_id: 'bach-adv-computing', tier0: 'done', tier1: 'pending' });
  });

  it('validates the three Tier 0 fields', async () => {
    const r = await completeTier0({ university_id: 'nowhere', degree_id: 'bach-it', year: '9' as '1' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.error.fields ?? {}).sort()).toEqual(['university_id', 'year']);
  });

  it('writes inferred suggestions for a signed-in student without touching held skills', async () => {
    setPersona('student');
    await addSkill({ skill_slug: 'python' });
    const r = await completeTier0({ university_id: 'usyd', degree_id: 'bach-adv-computing', year: '3' });
    expect(r.ok && r.data.saved_to_profile).toBe(true);
    const d = getDB();
    expect(d.student?.onboarding.tier0).toBe('done');
    expect(d.skills.find(s => s.skill_slug === 'python')).toMatchObject({ source: 'self_reported', confidence: null });
    const sql = d.skills.find(s => s.skill_slug === 'sql');
    expect(sql).toMatchObject({ source: 'inferred', reason: 'bach-adv-computing' });
    expect(sql?.confidence).toBeGreaterThan(0);
  });

  it('re-inference replaces stale suggestions when answers change', async () => {
    setPersona('student');
    await completeTier0({ university_id: 'usyd', degree_id: 'bach-design-computing', year: '3' });
    expect(getDB().skills.some(s => s.skill_slug === 'figma')).toBe(true);
    await completeTier0({ university_id: 'usyd', degree_id: 'bach-data-science', year: '3' });
    expect(getDB().skills.some(s => s.skill_slug === 'figma')).toBe(false);
    await completeTier1({ unit_codes: ['ELEC3506'] });
    expect(getDB().skills.find(s => s.skill_slug === 'networking')?.reason).toBe('ELEC3506');
    expect(getDB().student?.onboarding.tier1).toBe('done');
  });

  it('rejects unknown unit codes', async () => {
    const r = await completeTier1({ unit_codes: ['ABCD1234'] });
    expect(r.ok).toBe(false);
  });

  it('every tier can be skipped', async () => {
    const r = await skipOnboarding({ tier: 'all' });
    expect(r).toEqual({ ok: true, data: { tier0: 'skipped', tier1: 'skipped' } });
    setPersona('student');
    await skipOnboarding({ tier: 'tier1' });
    expect(getDB().student?.onboarding).toEqual({ tier0: 'pending', tier1: 'skipped' });
  });
});
