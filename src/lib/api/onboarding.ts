'use client';

import { z } from 'zod';
import { fail, latency, ok } from './client';
import type { DemoDB, Result, StudentProfile, StudentSkill, StudyYear, TierStatus } from './types';
import { transact, uid } from '@/lib/demo/store';
import { getDegree, getUniversity, getUnit, inferSkillProfile, STUDY_YEARS, type InferredSkill } from '@/lib/demo/education';

// Onboarding domain (FR-O1–O3, ARCHITECTURE §5.2 onboarding). Actions:
// completeTier0, completeTier1, skipOnboarding. Tier 0/1 work without an account:
// answers are kept on the device and merged into the profile on sign-in
// (production keeps them in a cookie).

export const ANON_ONBOARDING_KEY = 'sm-onboarding:v1';
/** Fired on window whenever the device-local answers change. */
export const ANON_ONBOARDING_EVENT = 'sm-onboarding-change';

function notifyAnon() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ANON_ONBOARDING_EVENT));
}

/** Answers given before signing in. */
export interface AnonymousOnboarding {
  university_id: string | null;
  degree_id: string | null;
  year: StudyYear | null;
  unit_codes: string[];
  tier0: TierStatus;
  tier1: TierStatus;
  updated_at: string;
}

export const EMPTY_ONBOARDING: AnonymousOnboarding = { university_id: null, degree_id: null, year: null, unit_codes: [], tier0: 'pending', tier1: 'pending', updated_at: '' };

// In-memory fallback when localStorage is unavailable (tests, blocked storage).
let memoryAnon: AnonymousOnboarding | null = null;

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Device-local onboarding answers of a visitor (null when none). */
export function readAnonymousOnboarding(): AnonymousOnboarding | null {
  const s = storage();
  if (!s) return memoryAnon;
  try {
    const raw = s.getItem(ANON_ONBOARDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AnonymousOnboarding>;
    return { ...EMPTY_ONBOARDING, ...parsed, unit_codes: Array.isArray(parsed.unit_codes) ? parsed.unit_codes : [] };
  } catch {
    return memoryAnon;
  }
}

export function writeAnonymousOnboarding(next: AnonymousOnboarding) {
  memoryAnon = next;
  const s = storage();
  try {
    s?.setItem(ANON_ONBOARDING_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the in-memory copy keeps the session working.
  }
  notifyAnon();
}

export function clearAnonymousOnboarding() {
  memoryAnon = null;
  try {
    storage()?.removeItem(ANON_ONBOARDING_KEY);
  } catch {
    // ignore
  }
  notifyAnon();
}

/** Replace the inferred rows with a fresh inference; held skills are never touched (FR-O4). */
export function applyInference(d: DemoDB, inferred: InferredSkill[], now: number) {
  const iso = new Date(now).toISOString();
  const wanted = new Map(inferred.map(s => [s.skill_slug, s]));
  const next: StudentSkill[] = [];
  for (const s of d.skills) {
    if (s.source !== 'inferred') {
      next.push(s);
      continue;
    }
    const w = wanted.get(s.skill_slug);
    if (w) next.push({ ...s, confidence: w.confidence, reason: w.reason });
  }
  for (const w of inferred) {
    if (next.some(s => s.skill_slug === w.skill_slug)) continue;
    next.push({ id: uid('sk'), skill_slug: w.skill_slug, source: 'inferred', confidence: w.confidence, reason: w.reason, added_at: iso });
  }
  d.skills = next;
}

function reinfer(d: DemoDB, profile: StudentProfile, now: number): InferredSkill[] {
  const inferred = inferSkillProfile({ degree_id: profile.degree_id, year: profile.year, unit_codes: profile.unit_codes });
  applyInference(d, inferred, now);
  return inferred;
}

/**
 * Merge a visitor's onboarding answers into a freshly signed-in profile.
 * Answers the profile already has win; unit lists are unioned.
 */
export function mergeAnonymousOnboarding(d: DemoDB, anon: AnonymousOnboarding | null, now: number): boolean {
  if (!d.student || !anon) return false;
  const p = d.student;
  const touched = anon.tier0 !== 'pending' || anon.tier1 !== 'pending';
  if (!touched) return false;
  p.university_id = p.university_id ?? anon.university_id;
  p.degree_id = p.degree_id ?? anon.degree_id;
  p.year = p.year ?? anon.year;
  p.unit_codes = [...new Set([...p.unit_codes, ...anon.unit_codes])];
  const rank: Record<TierStatus, number> = { pending: 0, skipped: 1, done: 2 };
  if (rank[anon.tier0] > rank[p.onboarding.tier0]) p.onboarding.tier0 = anon.tier0;
  if (rank[anon.tier1] > rank[p.onboarding.tier1]) p.onboarding.tier1 = anon.tier1;
  reinfer(d, p, now);
  return true;
}

export const tier0Input = z.object({
  university_id: z.string().refine(v => Boolean(getUniversity(v)), 'university'),
  degree_id: z.string().refine(v => Boolean(getDegree(v)), 'degree'),
  year: z.enum(STUDY_YEARS as [StudyYear, ...StudyYear[]]),
});
export type Tier0Input = z.infer<typeof tier0Input>;

export const tier1Input = z.object({
  unit_codes: z.array(z.string().min(1)).max(60).refine(codes => codes.every(c => Boolean(getUnit(c))), 'unit_codes'),
});
export type Tier1Input = z.infer<typeof tier1Input>;

export interface OnboardingResult {
  /** True when the answers were saved to a signed-in profile; false = kept on this device. */
  saved_to_profile: boolean;
  suggestions: InferredSkill[];
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(error.issues.map(i => [String(i.path[0] ?? 'form'), 'required']));
}

function signedInStudent(d: DemoDB): StudentProfile | null {
  return d.session?.personas.includes('student') && d.student ? d.student : null;
}

/** Tier 0: university + degree + year → inferred skill profile (FR-O1). Works signed out. */
export async function completeTier0(input: Tier0Input): Promise<Result<OnboardingResult>> {
  await latency(80, 120);
  const parsed = tier0Input.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation', fieldErrors(parsed.error));
  const { university_id, degree_id, year } = parsed.data;
  return transact((d, now) => {
    const p = signedInStudent(d);
    if (!p) {
      const prev = readAnonymousOnboarding() ?? EMPTY_ONBOARDING;
      // Units from another university no longer apply.
      const unit_codes = prev.university_id === university_id ? prev.unit_codes : [];
      writeAnonymousOnboarding({ ...prev, university_id, degree_id, year, unit_codes, tier0: 'done', updated_at: new Date(now).toISOString() });
      return ok({ saved_to_profile: false, suggestions: inferSkillProfile({ degree_id, year, unit_codes }) });
    }
    if (p.university_id !== university_id) p.unit_codes = [];
    p.university_id = university_id;
    p.degree_id = degree_id;
    p.year = year;
    p.onboarding.tier0 = 'done';
    return ok({ saved_to_profile: true, suggestions: reinfer(d, p, now) });
  });
}

/** Tier 1: ticked unit codes → more suggested skills (FR-O2). Works signed out. */
export async function completeTier1(input: Tier1Input): Promise<Result<OnboardingResult>> {
  await latency(80, 120);
  const parsed = tier1Input.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation', fieldErrors(parsed.error));
  const unit_codes = [...new Set(parsed.data.unit_codes.map(c => c.toUpperCase()))];
  return transact((d, now) => {
    const p = signedInStudent(d);
    if (!p) {
      const prev = readAnonymousOnboarding() ?? EMPTY_ONBOARDING;
      writeAnonymousOnboarding({ ...prev, unit_codes, tier1: 'done', updated_at: new Date(now).toISOString() });
      return ok({ saved_to_profile: false, suggestions: inferSkillProfile({ degree_id: prev.degree_id, year: prev.year, unit_codes }) });
    }
    p.unit_codes = unit_codes;
    p.onboarding.tier1 = 'done';
    return ok({ saved_to_profile: true, suggestions: reinfer(d, p, now) });
  });
}

export const skipInput = z.object({ tier: z.enum(['tier0', 'tier1', 'all']) });
export type SkipInput = z.infer<typeof skipInput>;

/** Skip a tier, or the rest of onboarding (FR-O3). Never blocks the product. */
export async function skipOnboarding(input: SkipInput): Promise<Result<{ tier0: TierStatus; tier1: TierStatus }>> {
  await latency(40, 80);
  const parsed = skipInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation');
  const { tier } = parsed.data;
  const skip = (s: { tier0: TierStatus; tier1: TierStatus }) => {
    if ((tier === 'tier0' || tier === 'all') && s.tier0 === 'pending') s.tier0 = 'skipped';
    if ((tier === 'tier1' || tier === 'all') && s.tier1 === 'pending') s.tier1 = 'skipped';
    return { tier0: s.tier0, tier1: s.tier1 };
  };
  return transact((d, now) => {
    const p = signedInStudent(d);
    if (!p) {
      const next = { ...(readAnonymousOnboarding() ?? EMPTY_ONBOARDING), updated_at: new Date(now).toISOString() };
      const out = skip(next);
      writeAnonymousOnboarding(next);
      return ok(out);
    }
    return ok(skip(p.onboarding));
  });
}

export interface OnboardingState extends Omit<AnonymousOnboarding, 'updated_at'> {
  signed_in: boolean;
}

/** Current answers: the profile's when signed in as a student, else this device's. */
export function selectOnboarding(d: DemoDB, anon: AnonymousOnboarding | null): OnboardingState {
  const p = signedInStudent(d);
  if (p) return { signed_in: true, university_id: p.university_id, degree_id: p.degree_id, year: p.year, unit_codes: p.unit_codes, tier0: p.onboarding.tier0, tier1: p.onboarding.tier1 };
  const a = anon ?? EMPTY_ONBOARDING;
  return { signed_in: false, university_id: a.university_id, degree_id: a.degree_id, year: a.year, unit_codes: a.unit_codes, tier0: a.tier0, tier1: a.tier1 };
}
