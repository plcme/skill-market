import { getInstrument, ROLE_COMPONENTS, rolesForSkill } from '@/lib/market/catalog';
import { computeMetric } from '@/lib/market/engine';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import type { FilterSpec, Instrument, LearningEffort, MetricReading, Transferability } from '@/lib/market/types';
import { getUniversity, LAUNCH_UNIVERSITY_ID, unitsTeaching, type CourseUnit } from '@/lib/demo/education';
import type { SkillSource, StudentSkill } from './types';

// Gap diagnosis (FR-G1–G3, ARCHITECTURE §5.2 gap: no writes, a pure function over
// the role's component skills and the student's profile). Framed as direction —
// "your next three steps" — never as a percent-ready score.

export const MAX_PRIORITIES = 3;

/** Relative weight of each reason in the ordering. Documented so it can be explained. */
export const GAP_WEIGHTS = { relevance: 0.5, entry: 0.2, transfer: 0.15, effort: 0.15 } as const;
const EFFORT_EASE: Record<LearningEffort, number> = { weeks: 1, months: 0.65, year_plus: 0.3 };
const TRANSFER: Record<Transferability, number> = { broad: 1, moderate: 0.65, narrow: 0.3 };
/** Entry-level share at which the entry reason counts in full. */
const ENTRY_FULL = 0.3;

export type WayToGetIt =
  | { kind: 'unit'; unit: CourseUnit; university_name: string; source_url: string | null }
  | { kind: 'project'; category: string };

export interface GapPriority {
  skill: Instrument;
  /** Relevance: share of this role's ads that mention the skill (0–1). */
  relevance: number;
  /** Entry-level applicability: entry-level share of the skill's own ads. */
  entry_share: MetricReading;
  transferability: Transferability;
  /** Roles we track that ask for it — the evidence behind transferability. */
  role_count: number;
  effort: LearningEffort;
  ways: WayToGetIt[];
}

export interface GapHave {
  skill: Instrument;
  relevance: number;
  source: SkillSource;
  /** Inferred rows are suggestions until the student confirms them. */
  suggested: boolean;
}

export interface GapDiagnosis {
  role: Instrument;
  filter: FilterSpec;
  priorities: GapPriority[];
  have: GapHave[];
  /** Other component skills not in the top three (named, not counted against anyone). */
  later: Instrument[];
}

export function priorityScore(relevance: number, entryShare: number | null, transfer: Transferability, effort: LearningEffort): number {
  const entry = entryShare === null ? 0.5 : Math.min(entryShare / ENTRY_FULL, 1);
  return GAP_WEIGHTS.relevance * relevance + GAP_WEIGHTS.entry * entry + GAP_WEIGHTS.transfer * TRANSFER[transfer] + GAP_WEIGHTS.effort * EFFORT_EASE[effort];
}

/**
 * Compare a role's component skills with a profile and return at most three next
 * steps, each with its reasons (FR-G1, FR-G2) and ways to get it (FR-G3).
 * Everything already on the profile — held or suggested — is excluded from the
 * priorities and listed under "you already have".
 */
export function diagnoseGap(
  roleSlug: string,
  skills: Pick<StudentSkill, 'skill_slug' | 'source'>[],
  filter: FilterSpec = DEFAULT_FILTER,
  universityId: string | null = null,
): GapDiagnosis | null {
  const role = getInstrument(roleSlug);
  const components = ROLE_COMPONENTS[roleSlug];
  if (!role || role.type !== 'role' || !components) return null;
  const bySlug = new Map(skills.map(s => [s.skill_slug, s]));
  const have: GapHave[] = [];
  const missing: Array<GapPriority & { score: number }> = [];
  const uni = getUniversity(universityId);
  const unitUni = uni?.has_units ? uni : getUniversity(LAUNCH_UNIVERSITY_ID);
  for (const c of components) {
    const skill = getInstrument(c.skill_slug);
    if (!skill) continue;
    const mine = bySlug.get(c.skill_slug);
    if (mine) {
      have.push({ skill, relevance: c.weight, source: mine.source, suggested: mine.source === 'inferred' });
      continue;
    }
    const entry_share = computeMetric(skill.slug, 'entry_level_share', filter);
    const ways: WayToGetIt[] = unitsTeaching(skill.slug, unitUni?.id)
      .slice(0, 2)
      .map(({ unit }) => ({ kind: 'unit' as const, unit, university_name: unitUni?.name ?? '', source_url: unitUni?.handbook_url ?? null }));
    ways.push({ kind: 'project', category: skill.category });
    missing.push({
      skill,
      relevance: c.weight,
      entry_share,
      transferability: skill.transferability,
      role_count: rolesForSkill(skill.slug).length,
      effort: skill.learning_effort,
      ways,
      score: priorityScore(c.weight, entry_share.status === 'ok' ? entry_share.value : null, skill.transferability, skill.learning_effort),
    });
  }
  missing.sort((a, b) => b.score - a.score || b.relevance - a.relevance || a.skill.name.localeCompare(b.skill.name));
  const priorities = missing.slice(0, MAX_PRIORITIES).map(({ score: _score, ...p }) => p);
  const later = missing.slice(MAX_PRIORITIES).map(m => m.skill);
  have.sort((a, b) => Number(a.suggested) - Number(b.suggested) || b.relevance - a.relevance);
  return { role, filter, priorities, have, later };
}
