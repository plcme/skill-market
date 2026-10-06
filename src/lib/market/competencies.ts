import { getInstrument, normaliseQuery } from './catalog';

// Australian Skills Classification (Jobs and Skills Australia) core
// competencies: ten transferable abilities every job uses. They are NOT
// instruments — we don't track demand for them and they get no metrics
// (GLOSSARY §5). Names and blurbs live in messages under
// `Competencies.items.<slug>`; this file only holds slugs, search aliases and
// the illustrative per-role levels.

export type CompetencySlug =
  | 'digital-engagement'
  | 'initiative-innovation'
  | 'learning'
  | 'numeracy'
  | 'oral-communication'
  | 'planning-organising'
  | 'problem-solving'
  | 'reading'
  | 'teamwork'
  | 'writing';

export interface CoreCompetency {
  slug: CompetencySlug;
  /** Lower-case search terms (English name first). Used only for search, never shown. */
  aliases: readonly string[];
}

/** The ten ASC core competencies, in the ASC's alphabetical order. */
export const CORE_COMPETENCIES: readonly CoreCompetency[] = [
  { slug: 'digital-engagement', aliases: ['digital engagement', 'digital literacy', 'computer skills', 'digital skills'] },
  { slug: 'initiative-innovation', aliases: ['initiative and innovation', 'initiative', 'innovation', 'creativity', 'self-starter'] },
  { slug: 'learning', aliases: ['learning', 'learning agility', 'willingness to learn'] },
  { slug: 'numeracy', aliases: ['numeracy', 'numerical skills', 'maths', 'math'] },
  { slug: 'oral-communication', aliases: ['oral communication', 'communication', 'communication skills', 'verbal communication', 'presentation skills', 'public speaking', 'interpersonal skills'] },
  { slug: 'planning-organising', aliases: ['planning and organising', 'planning and organizing', 'organisation', 'organization', 'time management', 'organisational skills'] },
  { slug: 'problem-solving', aliases: ['problem solving', 'problem-solving', 'critical thinking', 'troubleshooting'] },
  { slug: 'reading', aliases: ['reading', 'reading comprehension'] },
  { slug: 'teamwork', aliases: ['teamwork', 'team work', 'collaboration', 'team player'] },
  { slug: 'writing', aliases: ['writing', 'written communication', 'report writing', 'business writing'] },
];

export const COMPETENCY_SLUGS: readonly CompetencySlug[] = CORE_COMPETENCIES.map(c => c.slug);

/** ASC core competency scale runs 1 (basic) to 10 (highly complex). */
export const COMPETENCY_SCALE_MAX = 10;

type Levels = readonly [number, number, number, number, number, number, number, number, number, number];

// Illustrative fixture levels per role, in CORE_COMPETENCIES order:
// digital, initiative, learning, numeracy, oral, planning, problem, reading, teamwork, writing.
// Shaped like ASC occupation profiles but NOT taken from the ASC dataset.
const ROLE_LEVELS: Record<string, Levels> = {
  'software-engineer': [9, 7, 8, 7, 6, 6, 8, 7, 7, 6],
  'developer-programmer': [9, 6, 7, 7, 5, 6, 8, 7, 6, 5],
  'analyst-programmer': [8, 6, 7, 7, 6, 6, 8, 7, 6, 6],
  'web-developer': [9, 6, 7, 5, 5, 6, 7, 6, 6, 5],
  'data-analyst': [8, 6, 7, 8, 6, 6, 7, 7, 6, 6],
  'data-scientist': [9, 7, 8, 9, 6, 6, 8, 8, 6, 7],
  'data-engineer': [9, 6, 7, 7, 5, 6, 8, 7, 6, 5],
  'ml-engineer': [9, 7, 8, 9, 5, 6, 8, 8, 6, 6],
  'devops-engineer': [9, 6, 7, 6, 5, 7, 8, 7, 7, 5],
  'cloud-engineer': [9, 6, 7, 6, 5, 7, 8, 7, 6, 5],
  'cyber-security-analyst': [9, 6, 7, 6, 6, 6, 8, 7, 6, 6],
  'business-analyst': [7, 6, 6, 6, 8, 7, 7, 8, 7, 8],
  'product-manager': [7, 8, 6, 6, 8, 8, 7, 7, 8, 7],
  'ux-designer': [8, 8, 6, 4, 7, 6, 7, 6, 7, 6],
  'software-tester': [8, 5, 6, 5, 5, 7, 7, 7, 6, 6],
  'database-administrator': [9, 5, 6, 6, 5, 7, 7, 7, 5, 5],
  'network-engineer': [8, 5, 6, 6, 5, 7, 8, 7, 6, 5],
  'ict-project-manager': [7, 7, 6, 6, 8, 9, 7, 7, 8, 7],
  'registered-nurse': [5, 6, 6, 5, 8, 7, 7, 7, 8, 6],
  'aged-care-worker': [3, 4, 4, 3, 6, 5, 5, 4, 7, 4],
  accountant: [7, 5, 6, 9, 6, 7, 7, 7, 5, 6],
  'civil-engineer': [7, 6, 7, 8, 6, 8, 8, 7, 7, 7],
  'architectural-draftsperson': [8, 5, 5, 6, 4, 6, 6, 6, 5, 4],
  'secondary-teacher': [6, 7, 7, 6, 9, 8, 6, 8, 7, 7],
  'policy-analyst': [6, 7, 7, 6, 7, 7, 8, 9, 6, 9],
  'retail-manager': [5, 6, 5, 6, 7, 7, 6, 5, 7, 5],
  'mining-engineer': [7, 6, 6, 8, 6, 8, 8, 7, 7, 6],
};

export interface CompetencyLevel {
  slug: CompetencySlug;
  /** 1–10 on the ASC core competency scale (illustrative fixture). */
  level: number;
}

/** Illustrative ASC core competency levels for a role; null for anything that is not a role we profile. */
export function competencyLevels(roleSlug: string): CompetencyLevel[] | null {
  const levels = ROLE_LEVELS[roleSlug];
  if (!levels || getInstrument(roleSlug)?.type !== 'role') return null;
  return CORE_COMPETENCIES.map((c, i) => ({ slug: c.slug, level: levels[i] }));
}

export interface CompetencyHit {
  slug: CompetencySlug;
  /** The alias that matched, lower-case. */
  matched: string;
}

/**
 * Search the core competencies by alias, so "communication" or "teamwork"
 * lands on an explainer rather than a ticker. Exact alias first, then prefix.
 */
export function searchCompetencies(q: string, limit = 3): CompetencyHit[] {
  const needle = normaliseQuery(q);
  if (needle.length < 3) return [];
  const exact: CompetencyHit[] = [];
  const prefix: CompetencyHit[] = [];
  for (const c of CORE_COMPETENCIES) {
    const hit = c.aliases.find(a => a === needle);
    if (hit) { exact.push({ slug: c.slug, matched: hit }); continue; }
    const pre = c.aliases.find(a => a.startsWith(needle));
    if (pre) prefix.push({ slug: c.slug, matched: pre });
  }
  return [...exact, ...prefix].slice(0, limit);
}

/** Where a competency is explained (anchor on the metrics guide). */
export function competencyHref(slug: CompetencySlug): string {
  return `/metrics#competency-${slug}`;
}
