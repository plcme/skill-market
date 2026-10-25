import { beforeEach, describe, expect, it } from 'vitest';
import { getDB, resetPreview, setPersona, transact } from '../src/lib/demo/store';
import { addSkill } from '../src/lib/api/skills';
import { completeSignIn, requestMagicLink } from '../src/lib/api/auth';
import {
  clearAnonymousOnboarding,
  completeTier0,
  EMPTY_ONBOARDING,
  hideAnonymousSuggestion,
  mergeAnonymousOnboarding,
  parseAnonymousOnboarding,
  readAnonymousOnboarding,
  selectOnboarding,
  unhideAnonymousSuggestion,
} from '../src/lib/api/onboarding';

beforeEach(() => {
  resetPreview();
  clearAnonymousOnboarding();
});

describe('removed suggestions on this device (FE-R9)', () => {
  it('reads values stored before removed_skills existed', () => {
    const old = JSON.stringify({ university_id: 'usyd', degree_id: 'bach-it', year: '2', unit_codes: ['COMP2123'], tier0: 'done', tier1: 'pending', updated_at: 'x' });
    expect(parseAnonymousOnboarding(old)).toEqual({ ...EMPTY_ONBOARDING, university_id: 'usyd', degree_id: 'bach-it', year: '2', unit_codes: ['COMP2123'], tier0: 'done', updated_at: 'x' });
    expect(parseAnonymousOnboarding(JSON.stringify({ removed_skills: ['sql', 3, null], unit_codes: 'nope' }))).toMatchObject({ removed_skills: ['sql'], unit_codes: [] });
    expect(parseAnonymousOnboarding(null)).toBeNull();
    expect(parseAnonymousOnboarding('not json')).toBeNull();
    expect(parseAnonymousOnboarding('[1]')).toBeNull();
  });

  it('hides and unhides a suggestion without duplicates, and keeps it across answer changes', async () => {
    await completeTier0({ university_id: 'usyd', degree_id: 'bach-data-science', year: '2' });
    hideAnonymousSuggestion('sql');
    hideAnonymousSuggestion('sql');
    expect(readAnonymousOnboarding()?.removed_skills).toEqual(['sql']);
    expect(selectOnboarding(getDB(), readAnonymousOnboarding()).removed_skills).toEqual(['sql']);
    await completeTier0({ university_id: 'usyd', degree_id: 'bach-adv-computing', year: '3' });
    expect(readAnonymousOnboarding()?.removed_skills).toEqual(['sql']);
    unhideAnonymousSuggestion('sql');
    expect(readAnonymousOnboarding()?.removed_skills).toEqual([]);
    unhideAnonymousSuggestion('python');
    expect(readAnonymousOnboarding()?.removed_skills).toEqual([]);
  });

  it('does not add removed suggestions back when merging into a profile at sign-in', async () => {
    await completeTier0({ university_id: 'usyd', degree_id: 'bach-data-science', year: '2' });
    hideAnonymousSuggestion('sql');
    const sent = await requestMagicLink({ email: 'alex.chen@student.example', age_confirmed: true, privacy_acknowledged: true });
    if (!sent.ok) throw new Error('send failed');
    await completeSignIn(sent.data.token);
    const d = getDB();
    expect(d.skills.length).toBeGreaterThan(2);
    expect(d.skills.some(s => s.skill_slug === 'sql')).toBe(false);
    expect(readAnonymousOnboarding()).toBeNull();
  });

  it('drops an existing inferred row for a removed skill but never a held one', async () => {
    setPersona('student');
    await completeTier0({ university_id: 'usyd', degree_id: 'bach-data-science', year: '2' });
    await addSkill({ skill_slug: 'python' });
    expect(getDB().skills.find(s => s.skill_slug === 'sql')?.source).toBe('inferred');
    const anon = { ...EMPTY_ONBOARDING, tier0: 'done' as const, removed_skills: ['sql', 'python'] };
    expect(transact((d, now) => mergeAnonymousOnboarding(d, anon, now))).toBe(true);
    const d = getDB();
    expect(d.skills.some(s => s.skill_slug === 'sql')).toBe(false);
    expect(d.skills.find(s => s.skill_slug === 'python')?.source).toBe('confirmed');
    expect(d.skills.filter(s => s.source === 'inferred').length).toBeGreaterThan(1);
  });
});
