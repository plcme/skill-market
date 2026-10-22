'use client';

import { z } from 'zod';
import { getInstrument } from '@/lib/market/catalog';
import { getLocation } from '@/lib/filters/locations';
import { TOPICS } from '@/lib/demo/seed';
import { transact } from '@/lib/demo/store';
import { fail, guard, latency, ok } from './client';
import { newId, notifyWaitlist, practitionerOf } from './chat-jobs';
import { acceptedThisMonth, isSuspended, openSlotsFor } from './matching';
import type { AvailabilityWindow, DemoDB, Practitioner, Result, Slot } from './types';

// Practitioner domain (FR-P1–P6). Server Actions: joinAsPractitioner,
// sendWorkEmailCode, verifyWorkEmailCode, requestManualReview,
// updatePractitionerProfile, updateAvailabilityTemplate, setPaused, updateCap,
// finishPractitionerSetup. Reads: selectActingPractitioner, selectPractitionerSlots.

export const DEFAULT_ACTING_ID = 'p-arjun';
export const CODE_TTL_MS = 10 * 60_000;
export const CODE_MAX_ATTEMPTS = 3;
export const CODE_RESEND_MS = 30_000;
export const CAP_MIN = 1;
export const CAP_MAX = 4;
export const MAX_WINDOWS = 14;
export const PRACTITIONER_TIMEZONES = [
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Adelaide', 'Australia/Perth',
  'Australia/Hobart', 'Australia/Darwin',
] as const;

/** Personal / disposable mail domains can't prove employment (ARCHITECTURE §8.1). */
export const FREE_MAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com', 'yahoo.com.au', 'icloud.com',
  'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'mail.com', 'zoho.com', 'yandex.com', 'bigpond.com',
  'bigpond.net.au', 'optusnet.com.au', 'tpg.com.au', 'iinet.net.au', 'mailinator.com', 'guerrillamail.com', '10minutemail.com',
  'tempmail.com', 'temp-mail.org', 'yopmail.com', 'sharklasers.com',
] as const;

/** Evidence for the manual review path. Production: `work_email_verifications.evidence`. */
export interface ReviewEvidence {
  email: string;
  linkedin_url: string;
  note: string;
  submitted_at: string;
}
export type PractitionerRecord = Practitioner & { review_evidence?: ReviewEvidence };

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split('@')[1] ?? '';
}

/** Personal, disposable or student addresses → manual review instead. */
export function isFreeMailDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  if (FREE_MAIL_DOMAINS.some(f => d === f || d.endsWith(`.${f}`))) return true;
  return /(^|\.)(student|students|uni\.student)\./.test(d) || d.startsWith('student.');
}

/** Practitioner the desk acts as: your own record, else the preview's chosen persona. */
export function actingPractitionerId(d: Pick<DemoDB, 'my_practitioner_id' | 'acting_practitioner_id'>): string {
  return d.my_practitioner_id ?? d.acting_practitioner_id ?? DEFAULT_ACTING_ID;
}

export function selectActingPractitioner(d: DemoDB): PractitionerRecord | null {
  return practitionerOf(d, actingPractitionerId(d)) ?? null;
}

export function selectMyPractitioner(d: DemoDB): PractitionerRecord | null {
  return d.my_practitioner_id ? practitionerOf(d, d.my_practitioner_id) ?? null : null;
}

export type JoinStep = 'agree' | 'email' | 'profile' | 'availability' | 'done';

/** Where a practitioner's own onboarding is up to (resumable). */
export function joinStepFor(p: PractitionerRecord | null, personaHeld: boolean): JoinStep {
  if (!p) return 'agree';
  if (p.verification === 'unverified' || p.verification === 'code_sent' || p.verification === 'rejected') return 'email';
  if (!p.current_title || !p.current_role_slug || !p.skills.length) return 'profile';
  if (!p.availability.length) return 'availability';
  return personaHeld && !p.paused ? 'done' : 'availability';
}

export interface DeskStats {
  accepted_this_month: number;
  cap: number;
  open_slots: number;
  suspended_until: string | null;
}

/** Private numbers for the practitioner's own desk (never shown to students). */
export function selectDeskStats(d: DemoDB, p: Practitioner, now: number): DeskStats {
  return {
    accepted_this_month: acceptedThisMonth(d, p, now),
    cap: p.monthly_cap,
    open_slots: openSlotsFor(d, p.id, now, 0).length,
    suspended_until: isSuspended(p, now) ? p.suspended_until : null,
  };
}

/** Upcoming generated slots for the practitioner's calendar preview. */
export function selectPractitionerSlots(d: DemoDB, practitionerId: string, now: number, days = 14): Slot[] {
  return d.slots.filter(s => s.practitioner_id === practitionerId && Date.parse(s.start) > now && Date.parse(s.start) < now + days * 86_400_000);
}

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function mine(d: DemoDB): PractitionerRecord | null {
  return d.my_practitioner_id ? practitionerOf(d, d.my_practitioner_id) ?? null : null;
}

// ------------------------------------------------------------------ join

export const joinInput = z.object({ agree_18: z.literal(true), agree_conduct: z.literal(true) });

/** Start practitioner onboarding: creates your (paused, unverified) record. */
export async function joinAsPractitioner(input: z.infer<typeof joinInput>): Promise<Result<Practitioner>> {
  await latency();
  const parsed = joinInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation', { agree: 'agreeRequired' });
  return transact((d, now) => {
    const denied = guard(d);
    if (denied || !d.session) return { ok: false, error: denied ?? { code: 'unauthenticated', message: 'unauthenticated' } };
    const existing = mine(d);
    if (existing) return ok(existing);
    const name = d.session.display_name;
    const p: PractitionerRecord = {
      id: newId('p'),
      user_id: d.session.user_id,
      display_name: name,
      initials: initialsOf(name),
      current_title: '',
      current_role_slug: '',
      employer: '',
      work_email_domain: '',
      verification: 'unverified',
      entry_year: new Date(now).getUTCFullYear() - 1,
      location_id: 'au-nsw-sydney',
      skills: [],
      topics: [],
      path: '',
      bio: '',
      monthly_cap: 2,
      paused: true,
      timezone: 'Australia/Sydney',
      availability: [],
      meeting_link: null,
      joined_at: new Date(now).toISOString(),
      suspended_until: null,
    };
    d.practitioners.push(p);
    d.my_practitioner_id = p.id;
    return ok(p);
  });
}

export const sendCodeInput = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

/** Email a 6-digit code to a work address (10-minute expiry, 3 tries). */
export async function sendWorkEmailCode(input: z.infer<typeof sendCodeInput>): Promise<Result<{ email: string; expires_at: string }>> {
  await latency();
  const parsed = sendCodeInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'invalidEmail', { email: 'invalidEmail' });
  const email = parsed.data.email;
  if (isFreeMailDomain(emailDomain(email))) return fail('validation', 'freeEmailDomain', { email: 'freeEmailDomain' });
  return transact((d, now) => {
    const denied = guard(d);
    if (denied) return { ok: false, error: denied };
    const p = mine(d);
    if (!p) return fail('not_found', 'notFound');
    if (p.verification === 'verified') return fail('conflict', 'alreadyVerified');
    const prev = d.work_email_code;
    if (prev && prev.email === email && now - Date.parse(prev.sent_at) < CODE_RESEND_MS) return fail('rate_limited', 'rateLimited');
    const code = String(Math.floor(100000 + Math.random() * 900000));
    d.work_email_code = { email, code, sent_at: new Date(now).toISOString(), attempts: 0 };
    p.verification = 'code_sent';
    d.outbox.push({ id: newId('mail'), to: 'practitioner', template: 'work_email_code', vars: { code }, at: new Date(now).toISOString(), request_id: null });
    return ok({ email, expires_at: new Date(now + CODE_TTL_MS).toISOString() });
  });
}

export const verifyCodeInput = z.object({ code: z.string().trim().regex(/^\d{6}$/) });

/** Check the code; success marks the practitioner verified by work-email domain (FR-P1). */
export async function verifyWorkEmailCode(input: z.infer<typeof verifyCodeInput>): Promise<Result<Practitioner>> {
  await latency();
  const parsed = verifyCodeInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'codeFormat', { code: 'codeFormat' });
  return transact((d, now) => {
    const denied = guard(d);
    if (denied) return { ok: false, error: denied };
    const p = mine(d);
    const pending = d.work_email_code;
    if (!p || !pending) return fail('not_found', 'codeExpired');
    if (now - Date.parse(pending.sent_at) > CODE_TTL_MS) {
      d.work_email_code = null;
      p.verification = 'unverified';
      return fail('validation', 'codeExpired', { code: 'codeExpired' });
    }
    if (pending.attempts >= CODE_MAX_ATTEMPTS) return fail('rate_limited', 'codeAttempts', { code: 'codeAttempts' });
    if (pending.code !== parsed.data.code) {
      pending.attempts += 1;
      if (pending.attempts >= CODE_MAX_ATTEMPTS) {
        d.work_email_code = null;
        p.verification = 'unverified';
        return fail('rate_limited', 'codeAttempts', { code: 'codeAttempts' });
      }
      return fail('validation', 'codeIncorrect', { code: 'codeIncorrect', remaining: String(CODE_MAX_ATTEMPTS - pending.attempts) });
    }
    p.verification = 'verified';
    p.work_email_domain = emailDomain(pending.email);
    d.work_email_code = null;
    return ok(p);
  });
}

export const manualReviewInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  linkedin_url: z.string().trim().url().max(300).refine(u => /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\//i.test(u), 'linkedin'),
  note: z.string().trim().max(400).default(''),
});

/** Personal-email path: queue for a human to check (FR-X2, PRD Q5). */
export async function requestManualReview(input: z.input<typeof manualReviewInput>): Promise<Result<Practitioner>> {
  await latency();
  const parsed = manualReviewInput.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] = issue.path[0] === 'linkedin_url' ? 'linkedinUrl' : 'invalidEmail';
    return fail('validation', 'validation', fields);
  }
  return transact((d, now) => {
    const denied = guard(d);
    if (denied) return { ok: false, error: denied };
    const p = mine(d);
    if (!p) return fail('not_found', 'notFound');
    if (p.verification === 'verified') return fail('conflict', 'alreadyVerified');
    p.verification = 'manual_review';
    p.work_email_domain = emailDomain(parsed.data.email);
    p.review_evidence = { email: parsed.data.email, linkedin_url: parsed.data.linkedin_url, note: parsed.data.note, submitted_at: new Date(now).toISOString() };
    d.work_email_code = null;
    return ok(p);
  });
}

// ------------------------------------------------------------------ profile

const skillSlug = z.string().refine(s => getInstrument(s)?.type === 'skill', 'skill');
export const profileInput = z.object({
  current_title: z.string().trim().min(2).max(80),
  current_role_slug: z.string().refine(s => getInstrument(s)?.type === 'role', 'role'),
  employer: z.string().trim().min(2).max(80),
  entry_year: z.number().int().min(1980),
  location_id: z.string().refine(id => Boolean(getLocation(id)), 'location'),
  skills: z.array(skillSlug).min(1).max(12),
  topics: z.array(z.enum(TOPICS)).min(1).max(5),
  path: z.string().trim().min(10).max(240),
  bio: z.string().trim().max(400).default(''),
  meeting_link: z.string().trim().url().max(300).refine(u => u.startsWith('https://'), 'https').nullable(),
});
export type ProfileInput = z.input<typeof profileInput>;

function issuesToFields(issues: z.core.$ZodIssue[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!fields[key]) fields[key] = key;
  }
  return fields;
}

/** Edit the public card fields (FR-P2). Acts on the desk's practitioner. */
export async function updatePractitionerProfile(input: ProfileInput): Promise<Result<Practitioner>> {
  await latency();
  const parsed = profileInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation', issuesToFields(parsed.error.issues));
  return transact((d, now) => {
    const denied = guard(d);
    if (denied) return { ok: false, error: denied };
    const p = practitionerOf(d, actingPractitionerId(d));
    if (!p) return fail('not_found', 'notFound');
    if (parsed.data.entry_year > new Date(now).getUTCFullYear()) return fail('validation', 'validation', { entry_year: 'entry_year' });
    Object.assign(p, parsed.data, { skills: [...new Set(parsed.data.skills)], topics: [...new Set(parsed.data.topics)] });
    return ok(p);
  });
}

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const availabilityInput = z.object({
  timezone: z.enum(PRACTITIONER_TIMEZONES),
  windows: z.array(z.object({ weekday: z.number().int().min(1).max(7), start: hhmm, end: hhmm })).max(MAX_WINDOWS),
});

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

/** Validate a weekly template: each window ≥ 20 min, no overlaps on the same day. */
export function availabilityProblems(windows: AvailabilityWindow[]): Record<number, 'order' | 'short' | 'overlap'> {
  const out: Record<number, 'order' | 'short' | 'overlap'> = {};
  windows.forEach((w, i) => {
    const s = toMin(w.start);
    const e = toMin(w.end);
    if (e <= s) out[i] = 'order';
    else if (e - s < 20) out[i] = 'short';
    else if (windows.some((o, j) => j !== i && o.weekday === w.weekday && toMin(o.start) < e && s < toMin(o.end))) out[i] = 'overlap';
  });
  return out;
}

/** Replace the weekly availability template; slots regenerate from it (FR-P3). */
export async function updateAvailabilityTemplate(input: z.input<typeof availabilityInput>): Promise<Result<Practitioner>> {
  await latency();
  const parsed = availabilityInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation');
  const windows = [...parsed.data.windows].sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));
  if (Object.keys(availabilityProblems(windows)).length) return fail('validation', 'availabilityInvalid');
  return transact(d => {
    const denied = guard(d);
    if (denied) return { ok: false, error: denied };
    const p = practitionerOf(d, actingPractitionerId(d));
    if (!p) return fail('not_found', 'notFound');
    p.availability = windows;
    p.timezone = parsed.data.timezone;
    return ok(p);
  });
}

/** Pause or resume new requests at any time (FR-P6). Existing chats are unaffected. */
export async function setPaused(paused: boolean): Promise<Result<Practitioner>> {
  await latency();
  return transact(d => {
    const denied = guard(d, 'practitioner');
    if (denied) return { ok: false, error: denied };
    const p = practitionerOf(d, actingPractitionerId(d));
    if (!p) return fail('not_found', 'notFound');
    p.paused = paused;
    return ok(p);
  });
}

/** Monthly chat cap, 1–4 (FR-P2). */
export async function updateCap(cap: number): Promise<Result<Practitioner>> {
  await latency();
  const parsed = z.number().int().min(CAP_MIN).max(CAP_MAX).safeParse(cap);
  if (!parsed.success) return fail('validation', 'validation');
  return transact(d => {
    const denied = guard(d);
    if (denied) return { ok: false, error: denied };
    const p = practitionerOf(d, actingPractitionerId(d));
    if (!p) return fail('not_found', 'notFound');
    p.monthly_cap = parsed.data;
    return ok(p);
  });
}

/** Last join step: open for requests, add the practitioner persona and switch to it. */
export async function finishPractitionerSetup(): Promise<Result<Practitioner>> {
  await latency();
  return transact((d, now) => {
    const denied = guard(d);
    if (denied || !d.session) return { ok: false, error: denied ?? { code: 'unauthenticated', message: 'unauthenticated' } };
    const p = mine(d);
    if (!p) return fail('not_found', 'notFound');
    if (!p.current_title || !p.current_role_slug || !p.skills.length) return fail('validation', 'profileIncomplete');
    if (!p.availability.length) return fail('validation', 'availabilityMissing');
    p.paused = false;
    if (!d.session.personas.includes('practitioner')) d.session.personas.push('practitioner');
    d.session.active = 'practitioner';
    if (p.verification === 'verified') notifyWaitlist(d, p, now);
    return ok(p);
  });
}

/** Preview only: choose which fictional practitioner the desk acts as. */
export async function setActingPractitioner(id: string): Promise<Result<{ id: string }>> {
  return transact(d => {
    if (!practitionerOf(d, id)) return fail('not_found', 'notFound');
    d.acting_practitioner_id = id;
    return ok({ id });
  });
}
