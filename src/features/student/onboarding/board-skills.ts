import type { StudentSkill } from '@/lib/api/types';
import type { OnboardingState } from '@/lib/api/onboarding';
import { inferSkillProfile } from '@/lib/demo/education';

/**
 * One "Skills you probably have" row. Signed in it is a stored inferred row
 * (`row`), removed with `removeSkill`; signed out it is hidden on this device.
 */
export interface BoardSuggestion {
  skill_slug: string;
  confidence: number | null;
  reason: string | null;
  row?: StudentSkill;
}

/** What the next steps and roles are computed from; `source` keeps held skills at full weight. */
export type BoardAnchor = Pick<StudentSkill, 'skill_slug' | 'source' | 'confidence'>;

export interface BoardSkills {
  /** The student gave answers (Tier 0 or units), whether or not any suggestion is left. */
  answered: boolean;
  /** "Skills you probably have": suggestions only, strongest first. */
  suggestions: BoardSuggestion[];
  /** Held + suggested skills, for next steps and roles. */
  anchors: BoardAnchor[];
}

/**
 * Picks the mini-board's skills. Signed in: the profile's stored rows, so a
 * removal shows at once and held skills are never offered as a next step.
 * Signed out: a fresh inference minus what was removed on this device.
 */
export function selectBoardSkills(state: OnboardingState, skills: readonly StudentSkill[]): BoardSkills {
  const answered = Boolean(state.degree_id && state.year && state.university_id) || state.unit_codes.length > 0;
  if (state.signed_in) {
    const suggestions = skills
      .filter(s => s.source === 'inferred')
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
      .map(row => ({ skill_slug: row.skill_slug, confidence: row.confidence, reason: row.reason, row }));
    const anchors = skills.map(({ skill_slug, source, confidence }) => ({ skill_slug, source, confidence }));
    return { answered, suggestions, anchors };
  }
  const suggestions = answered
    ? inferSkillProfile({ degree_id: state.degree_id, year: state.year, unit_codes: state.unit_codes })
      .filter(s => !state.removed_skills.includes(s.skill_slug))
      .map(({ skill_slug, confidence, reason }) => ({ skill_slug, confidence, reason }))
    : [];
  const anchors = suggestions.map(s => ({ skill_slug: s.skill_slug, source: 'inferred' as const, confidence: s.confidence }));
  return { answered, suggestions, anchors };
}

/**
 * What the starting-point column shows: the suggestions; broad first steps
 * when nothing was answered; nothing when the student answered but removed
 * or confirmed every suggestion (first-steps copy would be untrue then).
 */
export function startColumn(answered: boolean, count: number): 'list' | 'first' | 'none' {
  if (count > 0) return 'list';
  return answered ? 'none' : 'first';
}

/** How many new suggestions the ticked units add over the degree alone, leaving out ones removed on this device. */
export function addedByUnits(state: Pick<OnboardingState, 'degree_id' | 'year' | 'removed_skills'>, unit_codes: readonly string[]): number {
  const kept = (codes: readonly string[]) => inferSkillProfile({ degree_id: state.degree_id, year: state.year, unit_codes: [...codes] }).filter(s => !state.removed_skills.includes(s.skill_slug));
  const base = new Set(kept([]).map(s => s.skill_slug));
  return kept(unit_codes).filter(s => !base.has(s.skill_slug)).length;
}

/** Pending focus move after a removal: which row is going, and where focus should land. */
export interface RemovalFocus {
  removed: string;
  /** Slug of the row whose remove button gets focus; null = the section heading. */
  target: string | null;
}

/** Decided before the removal starts: the next row, else the previous one, else the heading. */
export function removalFocus(rows: readonly string[], removed: string): RemovalFocus {
  const i = rows.indexOf(removed);
  if (i < 0) return { removed, target: null };
  return { removed, target: rows[i + 1] ?? rows[i - 1] ?? null };
}

/**
 * Where to move focus once the rows have re-rendered: undefined while the
 * removed row is still listed (removal pending), the target slug (or null for
 * the heading) once it is gone. A target that disappeared too falls back to null.
 */
export function resolveRemovalFocus(pending: RemovalFocus | null, rows: readonly string[]): string | null | undefined {
  if (!pending || rows.includes(pending.removed)) return undefined;
  return pending.target && rows.includes(pending.target) ? pending.target : null;
}
