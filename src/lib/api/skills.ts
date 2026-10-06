'use client';

import { z } from 'zod';
import { fail, guard, latency, ok } from './client';
import type { DemoDB, Result, StudentSkill } from './types';
import { transact, uid } from '@/lib/demo/store';
import { cooccurrence, getInstrument, instrumentsOfType, rolesForSkill } from '@/lib/market/catalog';
import type { Instrument, LearningEffort, Transferability } from '@/lib/market/types';

// Skills domain (FR-O4–O6, US7; ARCHITECTURE §5.2 skills). Actions: confirmSkill,
// removeSkill, addSkill. Reads: selectSkillBoard, suggestNextSteps. Removing a
// suggestion deletes the row — no "rejected" record is ever kept.

/** A skill counts as held once the student confirmed or added it themselves. */
export const isHeld = (s: Pick<StudentSkill, 'source'>) => s.source === 'confirmed' || s.source === 'self_reported';

/** Confirm an inferred suggestion (one tap, FR-O4). */
export async function confirmSkill(id: string): Promise<Result<StudentSkill>> {
  await latency(60, 120);
  return transact(d => {
    const denied = guard(d, 'student');
    if (denied) return { ok: false, error: denied };
    const skill = d.skills.find(s => s.id === id);
    if (!skill) return fail('not_found', 'notFound');
    if (skill.source === 'inferred') {
      skill.source = 'confirmed';
      skill.confidence = null;
    }
    return ok(skill);
  });
}

/** Remove any skill; for suggestions this is a hard delete, not a rejection record. */
export async function removeSkill(id: string): Promise<Result<StudentSkill>> {
  await latency(60, 120);
  return transact(d => {
    const denied = guard(d, 'student');
    if (denied) return { ok: false, error: denied };
    const skill = d.skills.find(s => s.id === id);
    if (!skill) return fail('not_found', 'notFound');
    d.skills = d.skills.filter(s => s.id !== id);
    return ok(skill);
  });
}

export const addSkillInput = z.object({ skill_slug: z.string().min(1) });
export type AddSkillInput = z.infer<typeof addSkillInput>;

/** Add a catalogue skill as self-reported. An existing suggestion is confirmed instead. */
export async function addSkill(input: AddSkillInput): Promise<Result<StudentSkill>> {
  await latency(60, 120);
  const parsed = addSkillInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation');
  const inst = getInstrument(parsed.data.skill_slug);
  if (!inst || inst.type !== 'skill') return fail('not_found', 'instrumentNotFound');
  return transact((d, now) => {
    const denied = guard(d, 'student');
    if (denied) return { ok: false, error: denied };
    const existing = d.skills.find(s => s.skill_slug === inst.slug);
    if (existing) {
      if (isHeld(existing)) return fail('conflict', 'skillAlreadyAdded');
      existing.source = 'confirmed';
      existing.confidence = null;
      return ok(existing);
    }
    const skill: StudentSkill = { id: uid('sk'), skill_slug: inst.slug, source: 'self_reported', confidence: null, reason: null, added_at: new Date(now).toISOString() };
    d.skills.push(skill);
    return ok(skill);
  });
}

/** Restore a removed skill exactly as it was (undo). */
export async function restoreSkill(skill: StudentSkill): Promise<Result<StudentSkill>> {
  await latency(40, 60);
  return transact(d => {
    const denied = guard(d, 'student');
    if (denied) return { ok: false, error: denied };
    if (d.skills.some(s => s.skill_slug === skill.skill_slug)) return fail('conflict', 'skillAlreadyAdded');
    d.skills.push(skill);
    return ok(skill);
  });
}

export interface NextStep {
  skill: Instrument;
  /** A held/suggested skill it is most often asked with, when there is one. */
  because: Instrument | null;
  /** 0–1 co-occurrence with `because`. */
  affinity: number;
  /** Role that asks for it most, with the share of that role's ads. */
  top_role: { role: Instrument; weight: number } | null;
  /** Number of tracked roles that ask for it. */
  role_count: number;
  effort: LearningEffort;
  transferability: Transferability;
}

const EFFORT_EASE: Record<LearningEffort, number> = { weeks: 1, months: 0.7, year_plus: 0.4 };
const TRANSFER: Record<Transferability, number> = { broad: 1, moderate: 0.75, narrow: 0.5 };
/** Broad, quick-to-start skills for students with (almost) nothing on their profile (FR-O6). */
export const FIRST_STEPS = ['sql', 'git', 'python', 'excel', 'agile'] as const;

function toStep(skill: Instrument, because: Instrument | null, affinity: number): NextStep {
  const roles = rolesForSkill(skill.slug);
  return { skill, because, affinity, top_role: roles[0] ?? null, role_count: roles.length, effort: skill.learning_effort, transferability: skill.transferability };
}

/**
 * Skills adjacent to what the student has (FR-O5 "next steps"). Score = strongest
 * co-occurrence with a skill on the profile (suggestions weighted by confidence)
 * × ease of learning × transferability. Demand is one input, never the only one.
 */
export function suggestNextSteps(skills: Pick<StudentSkill, 'skill_slug' | 'source' | 'confidence'>[], limit = 4): NextStep[] {
  const owned = new Set(skills.map(s => s.skill_slug));
  const anchors = skills
    .map(s => ({ inst: getInstrument(s.skill_slug), w: isHeld(s) ? 1 : (s.confidence ?? 0.5) }))
    .filter((a): a is { inst: Instrument; w: number } => Boolean(a.inst));
  if (anchors.length < 2) {
    return FIRST_STEPS.filter(slug => !owned.has(slug))
      .map(slug => getInstrument(slug))
      .filter((i): i is Instrument => Boolean(i))
      .slice(0, limit)
      .map(i => toStep(i, null, 0));
  }
  const scored = instrumentsOfType('skill')
    .filter(s => !owned.has(s.slug))
    .map(skill => {
      let best: { inst: Instrument; affinity: number; weighted: number } | null = null;
      for (const a of anchors) {
        const affinity = cooccurrence(a.inst.slug, skill.slug);
        const weighted = affinity * a.w;
        if (!best || weighted > best.weighted) best = { inst: a.inst, affinity, weighted };
      }
      const score = (best?.weighted ?? 0) * EFFORT_EASE[skill.learning_effort] * TRANSFER[skill.transferability];
      return { skill, best, score };
    })
    .filter(x => x.score > 0.05)
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name));
  return scored.slice(0, limit).map(x => toStep(x.skill, x.best?.inst ?? null, x.best?.affinity ?? 0));
}

export interface BoardSkill {
  row: StudentSkill;
  skill: Instrument;
}

export interface SkillBoard {
  confirmed: BoardSkill[];
  suggestions: BoardSkill[];
  next_steps: NextStep[];
  /** True when there is too little on the profile for adjacency: show a starting point. */
  starting_out: boolean;
}

/** Confirmed · Suggestions · Next steps (FR-O5). No scores, no ranks. */
export function selectSkillBoard(d: DemoDB, nextLimit = 4): SkillBoard {
  const rows = d.skills
    .map(row => ({ row, skill: getInstrument(row.skill_slug) }))
    .filter((x): x is BoardSkill => Boolean(x.skill) && x.skill?.type === 'skill');
  const confirmed = rows.filter(r => isHeld(r.row)).sort((a, b) => a.skill.name.localeCompare(b.skill.name));
  const suggestions = rows.filter(r => r.row.source === 'inferred').sort((a, b) => (b.row.confidence ?? 0) - (a.row.confidence ?? 0));
  const next_steps = suggestNextSteps(d.skills, nextLimit);
  return { confirmed, suggestions, next_steps, starting_out: rows.length < 2 };
}
