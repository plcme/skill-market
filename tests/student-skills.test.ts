import { beforeEach, describe, expect, it } from 'vitest';
import { getDB, resetPreview, setPersona, transact } from '../src/lib/demo/store';
import { addSkill, confirmSkill, FIRST_STEPS, removeSkill, restoreSkill, selectSkillBoard, suggestNextSteps } from '../src/lib/api/skills';
import { completeTier0 } from '../src/lib/api/onboarding';

beforeEach(() => resetPreview());

describe('skills (FR-O4–O6)', () => {
  it('needs a signed-in student', async () => {
    const r = await addSkill({ skill_slug: 'sql' });
    expect(!r.ok && r.error.code).toBe('unauthenticated');
  });

  it('confirms and removes suggestions in one step, keeping no rejection record', async () => {
    setPersona('student');
    await completeTier0({ university_id: 'usyd', degree_id: 'bach-adv-computing', year: '3' });
    const [first, second] = getDB().skills;
    await confirmSkill(first.id);
    expect(getDB().skills.find(s => s.id === first.id)).toMatchObject({ source: 'confirmed', confidence: null });
    const before = getDB().skills.length;
    const removed = await removeSkill(second.id);
    expect(getDB().skills).toHaveLength(before - 1);
    expect(JSON.stringify(getDB())).not.toContain(second.id);
    if (removed.ok) await restoreSkill(removed.data);
    expect(getDB().skills.some(s => s.id === second.id)).toBe(true);
  });

  it('adds catalogue skills as self-reported; adding a suggestion confirms it', async () => {
    setPersona('student');
    expect((await addSkill({ skill_slug: 'data-engineer' })).ok).toBe(false);
    const r = await addSkill({ skill_slug: 'rust' });
    expect(r.ok && r.data.source).toBe('self_reported');
    const dup = await addSkill({ skill_slug: 'rust' });
    expect(!dup.ok && dup.error.code).toBe('conflict');
    transact(d => { d.skills.push({ id: 'sk-x', skill_slug: 'sql', source: 'inferred', confidence: 0.5, reason: 'ISYS2120', added_at: new Date().toISOString() }); });
    const sql = await addSkill({ skill_slug: 'sql' });
    expect(sql.ok && sql.data).toMatchObject({ id: 'sk-x', source: 'confirmed' });
  });

  it('builds a three-column board with next steps outside the profile', async () => {
    setPersona('student');
    await completeTier0({ university_id: 'usyd', degree_id: 'bach-data-science', year: '3' });
    await addSkill({ skill_slug: 'git' });
    const board = selectSkillBoard(getDB());
    expect(board.confirmed.map(b => b.skill.slug)).toEqual(['git']);
    expect(board.suggestions.length).toBeGreaterThan(2);
    expect(board.suggestions.every(s => s.row.confidence !== null)).toBe(true);
    const owned = new Set(getDB().skills.map(s => s.skill_slug));
    expect(board.next_steps.length).toBeGreaterThan(0);
    for (const step of board.next_steps) {
      expect(owned.has(step.skill.slug)).toBe(false);
      expect(step.because).not.toBeNull();
      expect(step.effort).toBeTruthy();
    }
    expect(board.starting_out).toBe(false);
  });

  it('a near-empty profile gets a starting point, not a deficit list', () => {
    const steps = suggestNextSteps([]);
    expect(steps.map(s => s.skill.slug)).toEqual(FIRST_STEPS.slice(0, 4));
    expect(steps.every(s => s.because === null)).toBe(true);
    setPersona('student');
    expect(selectSkillBoard(getDB()).starting_out).toBe(true);
  });
});
