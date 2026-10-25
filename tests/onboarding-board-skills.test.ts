import { beforeEach, describe, expect, it } from 'vitest';
import { getDB, resetPreview, setPersona } from '../src/lib/demo/store';
import { clearAnonymousOnboarding, completeTier0, EMPTY_ONBOARDING, readAnonymousOnboarding, selectOnboarding, type OnboardingState } from '../src/lib/api/onboarding';
import { addSkill, confirmSkill, suggestNextSteps } from '../src/lib/api/skills';
import { inferSkillProfile } from '../src/lib/demo/education';
import { addedByUnits, removalFocus, resolveRemovalFocus, selectBoardSkills, startColumn } from '../src/features/student/onboarding/board-skills';

beforeEach(() => {
  resetPreview();
  clearAnonymousOnboarding();
});

const answers = { university_id: 'usyd', degree_id: 'bach-data-science', year: '2' as const };
const signedOut = (patch: Partial<OnboardingState> = {}): OnboardingState => ({ ...EMPTY_ONBOARDING, signed_in: false, ...patch });

describe('mini-board skills (FE-R9)', () => {
  it('shows first steps only when nothing was answered, and nothing extra once every suggestion is gone', () => {
    expect(startColumn(false, 0)).toBe('first');
    expect(startColumn(true, 0)).toBe('none');
    expect(startColumn(true, 3)).toBe('list');
    expect(startColumn(false, 3)).toBe('list');
  });

  it('signed out: answered stays true when every suggestion was removed on this device', () => {
    const all = inferSkillProfile({ degree_id: answers.degree_id, year: answers.year, unit_codes: [] }).map(s => s.skill_slug);
    const board = selectBoardSkills(signedOut({ ...answers, tier0: 'done', removed_skills: all }), []);
    expect(board).toEqual({ answered: true, suggestions: [], anchors: [] });
    expect(startColumn(board.answered, board.suggestions.length)).toBe('none');
    expect(selectBoardSkills(signedOut(), [])).toEqual({ answered: false, suggestions: [], anchors: [] });
  });

  it('signed out: removed suggestions are left out of the list and the anchors', () => {
    const board = selectBoardSkills(signedOut({ ...answers, removed_skills: ['sql'] }), []);
    expect(board.suggestions.length).toBeGreaterThan(2);
    expect(board.suggestions.some(s => s.skill_slug === 'sql')).toBe(false);
    expect(board.anchors.every(a => a.source === 'inferred')).toBe(true);
  });

  it('signed in: lists inferred rows only, but next steps and roles see held skills too', async () => {
    setPersona('student');
    await completeTier0(answers);
    const sql = getDB().skills.find(s => s.skill_slug === 'sql');
    if (!sql) throw new Error('expected an sql suggestion');
    await confirmSkill(sql.id);
    await addSkill({ skill_slug: 'git' });
    const d = getDB();
    const board = selectBoardSkills(selectOnboarding(d, readAnonymousOnboarding()), d.skills);
    expect(board.answered).toBe(true);
    expect(board.suggestions.every(s => s.row?.source === 'inferred')).toBe(true);
    expect(board.suggestions.some(s => s.skill_slug === 'sql' || s.skill_slug === 'git')).toBe(false);
    expect(board.anchors.find(a => a.skill_slug === 'sql')?.source).toBe('confirmed');
    expect(board.anchors.find(a => a.skill_slug === 'git')?.source).toBe('self_reported');
    const next = suggestNextSteps(board.anchors, 10).map(s => s.skill.slug);
    expect(next).not.toContain('sql');
    expect(next).not.toContain('git');
  });

  it('signed in: confirming every suggestion keeps answered true with an empty list', async () => {
    setPersona('student');
    await completeTier0(answers);
    for (const s of getDB().skills.filter(x => x.source === 'inferred')) await confirmSkill(s.id);
    const d = getDB();
    const board = selectBoardSkills(selectOnboarding(d, null), d.skills);
    expect(board.answered).toBe(true);
    expect(board.suggestions).toEqual([]);
    expect(board.anchors.length).toBeGreaterThan(2);
    expect(startColumn(board.answered, board.suggestions.length)).toBe('none');
  });

  it('counts what ticked units add, leaving out removed suggestions', () => {
    const state = { degree_id: 'bach-data-science', year: '2' as const, removed_skills: [] as string[] };
    const added = addedByUnits(state, ['ELEC3506']);
    expect(added).toBeGreaterThan(0);
    expect(addedByUnits({ ...state, removed_skills: ['networking'] }, ['ELEC3506'])).toBe(added - 1);
    expect(addedByUnits(state, [])).toBe(0);
  });
});

describe('focus after removing a suggestion (FE-R9)', () => {
  it('targets the next row, else the previous one, else the heading', () => {
    expect(removalFocus(['a', 'b', 'c'], 'a')).toEqual({ removed: 'a', target: 'b' });
    expect(removalFocus(['a', 'b', 'c'], 'b')).toEqual({ removed: 'b', target: 'c' });
    expect(removalFocus(['a', 'b', 'c'], 'c')).toEqual({ removed: 'c', target: 'b' });
    expect(removalFocus(['a'], 'a')).toEqual({ removed: 'a', target: null });
    expect(removalFocus(['a'], 'zzz')).toEqual({ removed: 'zzz', target: null });
  });

  it('waits while the removed row is still listed, then resolves once', () => {
    const pending = removalFocus(['a', 'b', 'c'], 'a');
    expect(resolveRemovalFocus(pending, ['a', 'b', 'c'])).toBeUndefined();
    expect(resolveRemovalFocus(pending, ['b', 'c'])).toBe('b');
    expect(resolveRemovalFocus(pending, ['b', 'c', 'd'])).toBe('b');
    expect(resolveRemovalFocus(pending, ['c'])).toBeNull();
    expect(resolveRemovalFocus(removalFocus(['a'], 'a'), [])).toBeNull();
    expect(resolveRemovalFocus(null, ['a'])).toBeUndefined();
  });
});
