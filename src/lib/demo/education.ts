import type { StudyYear } from '@/lib/api/types';

// Education catalogue for onboarding (FR-O1, FR-O2) and gap "ways to get it"
// (FR-G3). Mirrors the `universities`, `course_units` and `course_unit_skills`
// tables (ARCHITECTURE §5.1). Unit codes and titles follow the public USyd
// handbook; the skill mappings and confidences are illustrative parameters,
// not an official statement of learning outcomes.

export interface University {
  id: string;
  name: string;
  short: string;
  /** Launch school: the only one with a unit catalogue at launch (PRD §12.2). */
  has_units: boolean;
  handbook_url: string | null;
}

export interface SkillPrior {
  skill_slug: string;
  /** Probability a student at the end of the degree has used this skill (0–1). */
  confidence: number;
}

export interface Degree {
  id: string;
  name: string;
  /** Typical skills by the final year. Scaled by study year. */
  skills: SkillPrior[];
}

export interface CourseUnit {
  code: string;
  title: string;
  university_id: string;
  /** Typical year a student takes the unit. */
  level: 1 | 2 | 3 | 5;
  skills: SkillPrior[];
}

export const LAUNCH_UNIVERSITY_ID = 'usyd';

export const UNIVERSITIES: readonly University[] = [
  { id: 'usyd', name: 'The University of Sydney', short: 'USyd', has_units: true, handbook_url: 'https://www.sydney.edu.au/units' },
  { id: 'unsw', name: 'UNSW Sydney', short: 'UNSW', has_units: false, handbook_url: null },
  { id: 'uts', name: 'University of Technology Sydney', short: 'UTS', has_units: false, handbook_url: null },
  { id: 'monash', name: 'Monash University', short: 'Monash', has_units: false, handbook_url: null },
  { id: 'unimelb', name: 'The University of Melbourne', short: 'UniMelb', has_units: false, handbook_url: null },
];

const S = (skill_slug: string, confidence: number): SkillPrior => ({ skill_slug, confidence });

export const DEGREES: readonly Degree[] = [
  { id: 'bach-adv-computing', name: 'Bachelor of Advanced Computing', skills: [S('python', 0.7), S('git', 0.55), S('java', 0.5), S('sql', 0.55), S('communication', 0.45), S('agile', 0.4), S('data-analysis', 0.35), S('testing', 0.35), S('linux', 0.35)] },
  { id: 'bach-computer-science', name: 'Bachelor of Computer Science', skills: [S('python', 0.7), S('java', 0.55), S('git', 0.5), S('sql', 0.45), S('linux', 0.45), S('cpp', 0.4), S('statistics', 0.3)] },
  { id: 'bach-it', name: 'Bachelor of Information Technology', skills: [S('javascript', 0.55), S('sql', 0.55), S('communication', 0.5), S('networking', 0.45), S('agile', 0.45), S('git', 0.4), S('project-management', 0.3)] },
  { id: 'bach-data-science', name: 'Bachelor of Data Science', skills: [S('python', 0.75), S('statistics', 0.7), S('data-analysis', 0.65), S('sql', 0.6), S('machine-learning', 0.4), S('communication', 0.4), S('excel', 0.35)] },
  { id: 'bach-eng-software', name: 'Bachelor of Engineering Honours (Software)', skills: [S('python', 0.6), S('java', 0.55), S('git', 0.55), S('agile', 0.5), S('communication', 0.5), S('testing', 0.45), S('cpp', 0.45)] },
  { id: 'bach-commerce-bis', name: 'Bachelor of Commerce (Business Information Systems)', skills: [S('excel', 0.7), S('communication', 0.6), S('data-analysis', 0.5), S('sql', 0.45), S('stakeholder-management', 0.45), S('project-management', 0.4), S('powerbi', 0.35)] },
  { id: 'bach-design-computing', name: 'Bachelor of Design Computing', skills: [S('figma', 0.7), S('ux-research', 0.55), S('communication', 0.55), S('javascript', 0.5), S('react', 0.3)] },
  { id: 'master-it', name: 'Master of Information Technology', skills: [S('python', 0.5), S('sql', 0.5), S('communication', 0.45), S('javascript', 0.4), S('agile', 0.4), S('cybersecurity', 0.3)] },
];

const U = (code: string, title: string, level: CourseUnit['level'], skills: SkillPrior[]): CourseUnit => ({ code, title, university_id: 'usyd', level, skills });

export const COURSE_UNITS: readonly CourseUnit[] = [
  U('INFO1110', 'Introduction to Programming', 1, [S('python', 0.75), S('git', 0.3)]),
  U('INFO1111', 'Computing 1A Professionalism', 1, [S('communication', 0.5), S('agile', 0.35), S('project-management', 0.3)]),
  U('INFO1113', 'Object-Oriented Programming', 1, [S('java', 0.75), S('git', 0.4), S('testing', 0.3)]),
  U('DATA1001', 'Foundations of Data Science', 1, [S('statistics', 0.61), S('data-analysis', 0.55), S('excel', 0.3)]),
  U('DATA1002', 'Informatics: Data and Computation', 1, [S('python', 0.6), S('data-analysis', 0.55), S('sql', 0.3)]),
  U('COMP2123', 'Data Structures and Algorithms', 2, [S('java', 0.42), S('python', 0.4)]),
  U('COMP2017', 'Systems Programming', 2, [S('linux', 0.6), S('cpp', 0.55), S('git', 0.35)]),
  U('DATA2001', 'Data Science, Big Data and Data Variety', 2, [S('data-analysis', 0.74), S('sql', 0.55), S('python', 0.5)]),
  U('DATA2002', 'Data Analytics: Learning from Data', 2, [S('statistics', 0.7), S('data-analysis', 0.6)]),
  U('ISYS2120', 'Data and Information Management', 2, [S('sql', 0.8), S('postgresql', 0.5)]),
  U('ISYS2110', 'Analysis and Design of Web Information Systems', 2, [S('javascript', 0.5), S('figma', 0.3), S('ux-research', 0.3)]),
  U('INFO2222', 'Computing 2 Usability and Security', 2, [S('cybersecurity', 0.55), S('ux-research', 0.45), S('javascript', 0.35)]),
  U('SOFT2412', 'Agile Software Development Practices', 2, [S('agile', 0.8), S('git', 0.6), S('cicd', 0.45), S('testing', 0.45)]),
  U('ELEC3506', 'Data Communications and the Internet', 3, [S('networking', 0.7), S('linux', 0.3)]),
  U('COMP3221', 'Distributed Systems', 3, [S('linux', 0.4), S('docker', 0.35)]),
  U('COMP3308', 'Introduction to Artificial Intelligence', 3, [S('machine-learning', 0.6), S('python', 0.5)]),
  U('SOFT3888', 'Software Development Project', 3, [S('agile', 0.6), S('communication', 0.6), S('stakeholder-management', 0.45), S('project-management', 0.45)]),
  U('COMP5318', 'Machine Learning and Data Mining', 5, [S('machine-learning', 0.75), S('python', 0.6)]),
];

export const STUDY_YEARS: readonly StudyYear[] = ['1', '2', '3', '4', '5', 'postgrad', 'graduated'];

/** How far through the degree a student is; early years get softer suggestions. */
export const YEAR_FACTOR: Record<StudyYear, number> = { '1': 0.55, '2': 0.8, '3': 1, '4': 1.05, '5': 1.05, postgrad: 1.05, graduated: 1.1 };

/** Suggestions below this confidence are not shown at all. */
export const MIN_SUGGESTION_CONFIDENCE = 0.3;
/** Nothing we infer is ever presented as certain. */
export const MAX_SUGGESTION_CONFIDENCE = 0.9;

const UNI_BY_ID = new Map(UNIVERSITIES.map(u => [u.id, u]));
const DEGREE_BY_ID = new Map(DEGREES.map(d => [d.id, d]));
const UNIT_BY_CODE = new Map(COURSE_UNITS.map(u => [u.code, u]));

export function getUniversity(id: string | null | undefined): University | undefined {
  return id ? UNI_BY_ID.get(id) : undefined;
}

export function getDegree(id: string | null | undefined): Degree | undefined {
  return id ? DEGREE_BY_ID.get(id) : undefined;
}

export function getUnit(code: string | null | undefined): CourseUnit | undefined {
  return code ? UNIT_BY_CODE.get(code.toUpperCase()) : undefined;
}

export function unitsFor(universityId: string | null | undefined): CourseUnit[] {
  return COURSE_UNITS.filter(u => u.university_id === universityId);
}

/** Case-insensitive search over code and title. */
export function searchUnits(universityId: string | null | undefined, q: string): CourseUnit[] {
  const needle = q.trim().toLowerCase();
  const units = unitsFor(universityId);
  if (!needle) return units;
  return units.filter(u => u.code.toLowerCase().includes(needle) || u.title.toLowerCase().includes(needle));
}

/** Units that teach a skill, strongest first (FR-G3 "ways to get it"). */
export function unitsTeaching(skillSlug: string, universityId: string | null | undefined = LAUNCH_UNIVERSITY_ID): Array<{ unit: CourseUnit; confidence: number }> {
  return unitsFor(universityId)
    .flatMap(unit => unit.skills.filter(s => s.skill_slug === skillSlug).map(s => ({ unit, confidence: s.confidence })))
    .sort((a, b) => b.confidence - a.confidence);
}

export interface InferenceInput {
  degree_id: string | null;
  year: StudyYear | null;
  unit_codes: string[];
}

export interface InferredSkill {
  skill_slug: string;
  /** Combined confidence, 0–1, two decimals. */
  confidence: number;
  /** Strongest single source: a unit code or a degree id. */
  reason: string;
  /** Every source that contributed, strongest first. */
  sources: Array<{ source: string; confidence: number }>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Tier 0 + Tier 1 skill inference (FR-O1, FR-O2). Each source is treated as
 * independent evidence and combined with a noisy-OR: 1 − Π(1 − cᵢ). Degree priors
 * are scaled by study year; units count in full because the student ticked them.
 * Deterministic and pure so it can run server-side unchanged.
 */
export function inferSkillProfile(input: InferenceInput): InferredSkill[] {
  const evidence = new Map<string, Array<{ source: string; confidence: number }>>();
  const add = (slug: string, source: string, confidence: number) => {
    if (confidence <= 0) return;
    const list = evidence.get(slug) ?? [];
    list.push({ source, confidence: Math.min(confidence, MAX_SUGGESTION_CONFIDENCE) });
    evidence.set(slug, list);
  };
  const degree = getDegree(input.degree_id);
  if (degree) {
    const factor = input.year ? YEAR_FACTOR[input.year] : 0.8;
    for (const s of degree.skills) add(s.skill_slug, degree.id, s.confidence * factor);
  }
  for (const code of new Set(input.unit_codes.map(c => c.toUpperCase()))) {
    const unit = getUnit(code);
    if (!unit) continue;
    for (const s of unit.skills) add(s.skill_slug, unit.code, s.confidence);
  }
  const out: InferredSkill[] = [];
  for (const [skill_slug, list] of evidence) {
    const sources = [...list].sort((a, b) => b.confidence - a.confidence || a.source.localeCompare(b.source)).map(s => ({ ...s, confidence: round2(s.confidence) }));
    const combined = 1 - list.reduce((acc, s) => acc * (1 - s.confidence), 1);
    const confidence = round2(Math.min(combined, MAX_SUGGESTION_CONFIDENCE));
    if (confidence < MIN_SUGGESTION_CONFIDENCE) continue;
    // Prefer naming a unit: "from COMP2123" is more checkable than "from your degree".
    const unitSource = sources.find(s => getUnit(s.source));
    const reason = unitSource && unitSource.confidence >= sources[0].confidence - 0.15 ? unitSource.source : sources[0].source;
    out.push({ skill_slug, confidence, reason, sources });
  }
  return out.sort((a, b) => b.confidence - a.confidence || a.skill_slug.localeCompare(b.skill_slug));
}

/** What a stored `reason` refers to, for display. */
export type ReasonRef = { kind: 'unit'; unit: CourseUnit } | { kind: 'degree'; degree: Degree } | { kind: 'other'; text: string };

export function describeReason(reason: string | null): ReasonRef | null {
  if (!reason) return null;
  const unit = getUnit(reason);
  if (unit) return { kind: 'unit', unit };
  const degree = getDegree(reason);
  if (degree) return { kind: 'degree', degree };
  return { kind: 'other', text: reason };
}
