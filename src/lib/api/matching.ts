import { cooccurrence, getInstrument, instrumentsOfType, ROLE_COMPONENTS, rolesForSkill } from '@/lib/market/catalog';
import { getLocation, stateOf } from '@/lib/filters/locations';
import type { FilterSpec } from '@/lib/market/types';
import { TOPICS, type Topic } from '@/lib/demo/seed';
import { DAY, HOUR, zonedDay } from '@/lib/time';
import type { Block, ChatRequest, ChatStatus, DemoDB, MatchReason, Practitioner, Slot } from './types';

// Deterministic, explainable matching (ARCHITECTURE §7.1, FR-C2/C3/C6). Pure:
// reads the store snapshot it is given. Production: a SQL function over
// `practitioner_cards` + `availability_slots` with the same factors.

export const MATCH_LIMIT = 3;
/** Slots must start at least this far ahead so the practitioner has time to reply. */
export const MIN_SLOT_LEAD_MS = 48 * HOUR;
export const ADJACENT_THRESHOLD = 0.3;
/** Top role components a practitioner must hold ≥ 2 of to match a role. */
export const ROLE_TOP_COMPONENTS = 5;
export const ROLE_MIN_COMPONENTS = 2;

export const SCORE = {
  holds_skill: 40,
  adjacent_skill: 20,
  entry_1_3: 25,
  entry_4_6: 10,
  top_role: 15,
  topic_overlap: 10,
  same_state: 10,
  per_accepted_this_month: -5,
} as const;

/** Statuses that mean the practitioner said yes (count towards the monthly cap). */
const ACCEPTED_LIKE: readonly ChatStatus[] = ['accepted', 'completed', 'no_show_student', 'no_show_practitioner'];
/** Statuses where a request is still live between a student and a practitioner. */
export const OPEN_STATUSES: readonly ChatStatus[] = ['pending', 'reschedule_proposed', 'accepted'];

// ------------------------------------------------------------------ topics

/** Plain-word patterns per topic; matched against the student's decision question. */
export const TOPIC_PATTERNS: Record<Topic, RegExp> = {
  choosing_electives: /\b(electives?|units?|subjects?|courses?|semesters?|majors?|minors?|vs|versus|[a-z]{4}\d(?:\d{3}|xxx))\b/i,
  grad_programs: /\b(grad|graduate|grad programs?|rotations?)\b/i,
  internships: /\b(intern|internships?|summer|placements?|vacation program)\b/i,
  first_90_days: /\b(first (job|90|year|role)|onboarding|new starter|junior)\b/i,
  side_projects: /\b(side projects?|projects?|github|hackathons?|build)\b/i,
  portfolio: /\b(portfolio|cv|resume|résumé|showcase)\b/i,
  interview_prep: /\b(interviews?|leetcode|technical test|assessments?|coding tests?|applications?|apply)\b/i,
  visa_work_rights: /\b(visa|pr|permanent residen\w*|485|subclass|sponsor\w*|work rights|citizen\w*|international student)\b/i,
  switching_into_tech: /\b(switch\w*|career change|bootcamp|non-cs|background|pivot\w*|change careers?)\b/i,
  day_to_day: /\b(day[- ]to[- ]day|daily|actually do|typical|normal week|what it'?s like)\b/i,
};

/** Topics a decision question touches, in `TOPICS` order (FR-C4). */
export function topicsForQuestion(question: string | undefined | null): Topic[] {
  if (!question) return [];
  return TOPICS.filter(topic => TOPIC_PATTERNS[topic].test(question));
}

// ------------------------------------------------------------------ blocks

/**
 * The preview's `blocks` row has no blocker id column, so practitioner-side blocks
 * carry the practitioner id inside the row id (`blk:<practitioner>:<rand>`).
 * Production: `blocks(blocker_user_id, blocked_user_id)`.
 */
export function practitionerBlockId(practitionerId: string, rand: string): string {
  return `blk:${practitionerId}:${rand}`;
}

export function blockerPractitionerId(block: Block): string | null {
  if (block.blocker !== 'practitioner') return null;
  const parts = block.id.split(':');
  return parts.length === 3 && parts[0] === 'blk' ? parts[1] : null;
}

/** True when either side has blocked the other. */
export function isBlockedPair(db: Pick<DemoDB, 'blocks'>, practitionerId: string, studentId: string | null): boolean {
  return db.blocks.some(b =>
    (b.blocker === 'student' && b.target_id === practitionerId)
    || (b.blocker === 'practitioner' && b.target_id === studentId && blockerPractitionerId(b) === practitionerId),
  );
}

// ------------------------------------------------------------------ capacity

function monthKey(ms: number, tz: string): string {
  return zonedDay(ms, tz).ymd.slice(0, 7);
}

/** Chats this practitioner has said yes to in the current calendar month (their time zone). */
export function acceptedThisMonth(db: Pick<DemoDB, 'requests'>, p: Pick<Practitioner, 'id' | 'timezone'>, now: number): number {
  const month = monthKey(now, p.timezone);
  return db.requests.filter(r => r.practitioner_id === p.id && ACCEPTED_LIKE.includes(r.status) && monthKey(Date.parse(r.slot_start), p.timezone) === month).length;
}

/** Open slots at least `leadMs` ahead, soonest first. */
export function openSlotsFor(db: Pick<DemoDB, 'slots'>, practitionerId: string, now: number, leadMs = MIN_SLOT_LEAD_MS): Slot[] {
  return db.slots
    .filter(s => s.practitioner_id === practitionerId && s.status === 'open' && Date.parse(s.start) >= now + leadMs)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function isSuspended(p: Pick<Practitioner, 'suspended_until'>, now: number): boolean {
  return p.suspended_until !== null && Date.parse(p.suspended_until) > now;
}

export type Ineligibility = 'unverified' | 'paused' | 'suspended' | 'blocked' | 'at_cap' | 'no_slots' | 'self' | 'excluded' | 'open_request';

/** Hard filters (§7.1 step 1). `null` = matchable. */
export function ineligibility(db: DemoDB, p: Practitioner, now: number, opts: { student_id?: string | null; exclude_ids?: readonly string[] } = {}): Ineligibility | null {
  const studentId = opts.student_id ?? null;
  if (opts.exclude_ids?.includes(p.id)) return 'excluded';
  if (studentId && p.user_id === studentId) return 'self';
  if (p.verification !== 'verified') return 'unverified';
  if (p.paused) return 'paused';
  if (isSuspended(p, now)) return 'suspended';
  if (isBlockedPair(db, p.id, studentId)) return 'blocked';
  if (acceptedThisMonth(db, p, now) >= p.monthly_cap) return 'at_cap';
  if (studentId && db.requests.some(r => r.student_id === studentId && r.practitioner_id === p.id && OPEN_STATUSES.includes(r.status))) return 'open_request';
  if (!openSlotsFor(db, p.id, now).length) return 'no_slots';
  return null;
}

// ------------------------------------------------------------------ scoring

export interface FindCandidatesInput {
  instrument_slug: string;
  filter: FilterSpec;
  decision_question?: string;
  /** State-level location id of the student, if known (adds to the filter's states). */
  student_state?: string | null;
  student_id?: string | null;
  exclude_ids?: readonly string[];
}

export interface Candidate {
  practitioner: Practitioner;
  /** Internal ordering only — never shown. */
  score: number;
  reasons: MatchReason[];
  /** Next open slots ≥ 48h ahead. */
  slots: Slot[];
  /** Set when matched through a related skill (FR-C6 fallback). */
  adjacent_skill: string | null;
  years_since_entry: number;
}

export interface MatchResult {
  candidates: Candidate[];
  /** `adjacent`: nobody holds the skill with time right now; `waitlist`: nobody at all. */
  fallback: 'adjacent' | 'waitlist' | null;
}

export function yearsSinceEntry(p: Pick<Practitioner, 'entry_year'>, now: number): number {
  return Math.max(0, new Date(now).getUTCFullYear() - p.entry_year);
}

/** States named by the filter (city/region picks count as their state). */
export function filterStates(filter: FilterSpec): Set<string> {
  const out = new Set<string>();
  for (const rule of filter.rules) {
    for (const id of rule.location_ids) {
      const loc = getLocation(id);
      if (!loc || loc.level === 'country') continue;
      const st = stateOf(id);
      if (st) out.add(st);
    }
  }
  return out;
}

type SkillMatch = { kind: 'direct'; reason: MatchReason } | { kind: 'adjacent'; skill: string; weight: number } | null;

function roleTopComponents(roleSlug: string): string[] {
  return (ROLE_COMPONENTS[roleSlug] ?? []).slice(0, ROLE_TOP_COMPONENTS).map(c => c.skill_slug);
}

function skillMatch(p: Practitioner, slug: string): SkillMatch {
  const inst = getInstrument(slug);
  if (!inst) return null;
  if (inst.type === 'skill') {
    if (p.skills.includes(slug)) return { kind: 'direct', reason: { factor: 'holds_skill', vars: { kind: 'skill', name: inst.name } } };
    const adj = instrumentsOfType('skill')
      .filter(s => s.slug !== slug && p.skills.includes(s.slug))
      .map(s => ({ slug: s.slug, weight: cooccurrence(slug, s.slug) }))
      .filter(x => x.weight >= ADJACENT_THRESHOLD)
      .sort((a, b) => b.weight - a.weight || a.slug.localeCompare(b.slug))[0];
    return adj ? { kind: 'adjacent', skill: adj.slug, weight: adj.weight } : null;
  }
  if (p.current_role_slug === slug) return { kind: 'direct', reason: { factor: 'holds_skill', vars: { kind: 'role', name: inst.name } } };
  const top = roleTopComponents(slug);
  const held = top.filter(s => p.skills.includes(s));
  if (held.length >= ROLE_MIN_COMPONENTS) return { kind: 'direct', reason: { factor: 'holds_skill', vars: { kind: 'components', name: inst.name, count: held.length } } };
  if (held.length === 1) return { kind: 'adjacent', skill: held[0], weight: 0.5 };
  return null;
}

function score(db: DemoDB, p: Practitioner, slug: string, match: Exclude<SkillMatch, null>, input: FindCandidatesInput, now: number): Candidate {
  const inst = getInstrument(slug);
  const reasons: MatchReason[] = [];
  let total = 0;
  if (match.kind === 'direct') {
    reasons.push(match.reason);
    total += SCORE.holds_skill;
  } else {
    reasons.push({ factor: 'adjacent_skill', vars: { skill: getInstrument(match.skill)?.name ?? match.skill, original: inst?.name ?? slug } });
    total += SCORE.adjacent_skill;
  }
  const years = yearsSinceEntry(p, now);
  if (years <= 3) {
    total += SCORE.entry_1_3;
    reasons.push({ factor: 'entry_recent', vars: { years } });
  } else if (years <= 6) {
    total += SCORE.entry_4_6;
    reasons.push({ factor: 'entry_recent', vars: { years } });
  }
  if (inst?.type === 'skill') {
    const top = rolesForSkill(slug).slice(0, 3).map(r => r.role.slug);
    if (top.includes(p.current_role_slug)) {
      total += SCORE.top_role;
      reasons.push({ factor: 'top_role', vars: { role: getInstrument(p.current_role_slug)?.name ?? p.current_role_slug, skill: inst.name } });
    }
  }
  const wanted = topicsForQuestion(input.decision_question);
  const topic = wanted.find(t => p.topics.includes(t));
  if (topic) {
    total += SCORE.topic_overlap;
    reasons.push({ factor: 'topic_overlap', vars: { topic } });
  }
  const states = filterStates(input.filter);
  if (input.student_state) states.add(input.student_state);
  const pState = stateOf(p.location_id);
  if (pState && states.has(pState)) {
    total += SCORE.same_state;
    reasons.push({ factor: 'same_state', vars: { place: getLocation(p.location_id)?.name ?? p.location_id } });
  }
  total += SCORE.per_accepted_this_month * acceptedThisMonth(db, p, now);
  return {
    practitioner: p,
    score: total,
    reasons,
    slots: openSlotsFor(db, p.id, now).slice(0, 12),
    adjacent_skill: match.kind === 'adjacent' ? match.skill : null,
    years_since_entry: years,
  };
}

const byScore = (a: Candidate, b: Candidate) => b.score - a.score || a.practitioner.id.localeCompare(b.practitioner.id);

/**
 * `findCandidates` (§5.2 chat, read): hard filters → skill match → scored factors →
 * top 3; tops up with related-skill practitioners; `waitlist` when nobody is free.
 */
export function findCandidates(input: FindCandidatesInput, db: DemoDB, now: number): MatchResult {
  if (!getInstrument(input.instrument_slug)) return { candidates: [], fallback: 'waitlist' };
  const direct: Candidate[] = [];
  const adjacent: Candidate[] = [];
  for (const p of db.practitioners) {
    if (ineligibility(db, p, now, { student_id: input.student_id, exclude_ids: input.exclude_ids })) continue;
    const match = skillMatch(p, input.instrument_slug);
    if (!match) continue;
    (match.kind === 'direct' ? direct : adjacent).push(score(db, p, input.instrument_slug, match, input, now));
  }
  direct.sort(byScore);
  adjacent.sort(byScore);
  const candidates = [...direct.slice(0, MATCH_LIMIT), ...adjacent].slice(0, MATCH_LIMIT);
  if (!candidates.length) return { candidates, fallback: 'waitlist' };
  return { candidates, fallback: direct.length ? null : 'adjacent' };
}

// ------------------------------------------------------------------ supply

export interface SupplyStats {
  /** Verified, not paused, with an open slot ≥ 48h ahead and room under their cap. */
  available: number;
  verified: number;
  byRole: Array<{ role_slug: string; name: string; count: number }>;
  byState: Array<{ state_id: string; name: string; count: number }>;
}

/** Public supply summary for /people — counts only, no directory (FR-C2, §10.6). */
export function selectSupply(db: DemoDB, now: number): SupplyStats {
  const verified = db.practitioners.filter(p => p.verification === 'verified');
  const available = verified.filter(p => !ineligibility(db, p, now));
  const roleCounts = new Map<string, number>();
  const stateCounts = new Map<string, number>();
  for (const p of available) {
    roleCounts.set(p.current_role_slug, (roleCounts.get(p.current_role_slug) ?? 0) + 1);
    const st = stateOf(p.location_id) ?? p.location_id;
    stateCounts.set(st, (stateCounts.get(st) ?? 0) + 1);
  }
  return {
    available: available.length,
    verified: verified.length,
    byRole: [...roleCounts].map(([role_slug, count]) => ({ role_slug, name: getInstrument(role_slug)?.name ?? role_slug, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    byState: [...stateCounts].map(([state_id, count]) => ({ state_id, name: getLocation(state_id)?.short ?? state_id, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

/** Practitioners who hold a skill at all (used for "nobody free right now" copy). */
export function holdersOf(db: DemoDB, slug: string): Practitioner[] {
  return db.practitioners.filter(p => p.verification === 'verified' && (p.skills.includes(slug) || p.current_role_slug === slug));
}

/** Whether a practitioner would match a waitlisted instrument directly (for waitlist emails). */
export function practitionerMatchesInstrument(p: Practitioner, slug: string): boolean {
  return skillMatch(p, slug)?.kind === 'direct';
}

export const DAYS_30 = 30 * DAY;

/** Helper for tests / jobs: the request's slot in the store. */
export function slotOf(db: Pick<DemoDB, 'slots'>, req: Pick<ChatRequest, 'slot_id'>): Slot | undefined {
  return db.slots.find(s => s.id === req.slot_id);
}
