'use client';

import { z } from 'zod';
import { fail, guard, latency, ok } from './client';
import type { ApiError, ChatEvent, Consent, DemoDB, DeletionRequest, Result, StudentField, StudentProfile, StudyYear, UiMode, VisaStatus } from './types';
import { STUDENT_FIELDS } from './types';
import { transact, uid } from '@/lib/demo/store';
import { getDegree, getUniversity, inferSkillProfile, STUDY_YEARS } from '@/lib/demo/education';
import { DAY, formatDate } from '@/lib/time';
import { applyInference } from './onboarding';

// Profile & privacy domain (FR-A3–A5, FR-W4, FR-C11; ARCHITECTURE §5.2 privacy,
// §8.2). Actions: updateProfile, updateFieldVisibility, updateEmailPreferences,
// setUiMode, requestExport, requestDeletion. Reads: selectConsents, buildExport.

export const PURGE_AFTER_DAYS = 30;
export const DELETE_CONFIRMATION = 'DELETE';

const VISA: [VisaStatus, ...VisaStatus[]] = ['citizen_pr', 'student_visa', 'graduate_visa', 'other', 'prefer_not'];

export const profileInput = z.object({
  display_name: z.string().trim().min(1).max(60),
  university_id: z.string().nullable().refine(v => v === null || Boolean(getUniversity(v)), 'university'),
  degree_id: z.string().nullable().refine(v => v === null || Boolean(getDegree(v)), 'degree'),
  year: z.enum(STUDY_YEARS as [StudyYear, ...StudyYear[]]).nullable(),
  /** Optional and sensitive (FR-A3): null clears it. */
  visa_status: z.enum(VISA).nullable(),
});
export type ProfileInput = z.infer<typeof profileInput>;

/** RLS stand-in: only the signed-in student's own profile. */
function studentOrFail(d: DemoDB): { ok: false; error: ApiError } | StudentProfile {
  const denied = guard(d, 'student');
  if (denied) return { ok: false, error: denied };
  if (!d.student) return fail('not_found', 'notFound');
  return d.student;
}

/** Edit profile fields (APP 13 correction). Changing education re-runs inference for suggestions only. */
export async function updateProfile(input: ProfileInput): Promise<Result<StudentProfile>> {
  await latency();
  const parsed = profileInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation', Object.fromEntries(parsed.error.issues.map(i => [String(i.path[0]), 'required'])));
  return transact((d, now) => {
    const p = studentOrFail(d);
    if ('ok' in p) return p;
    const educationChanged = p.university_id !== parsed.data.university_id || p.degree_id !== parsed.data.degree_id || p.year !== parsed.data.year;
    if (p.university_id !== parsed.data.university_id) p.unit_codes = [];
    Object.assign(p, parsed.data);
    if (d.session) d.session.display_name = p.display_name;
    if (educationChanged) applyInference(d, inferSkillProfile({ degree_id: p.degree_id, year: p.year, unit_codes: p.unit_codes }), now);
    return ok(p);
  });
}

export const visibilityInput = z.object({
  field: z.enum(STUDENT_FIELDS as [StudentField, ...StudentField[]]),
  visibility: z.enum(['private', 'matched_practitioner']),
});
export type VisibilityInput = z.infer<typeof visibilityInput>;

/** Per-field visibility: only me, or practitioners I request a chat with (FR-A4, FR-C11). */
export async function updateFieldVisibility(input: VisibilityInput): Promise<Result<StudentProfile['field_visibility']>> {
  await latency(60, 100);
  const parsed = visibilityInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation');
  return transact(d => {
    const p = studentOrFail(d);
    if ('ok' in p) return p;
    p.field_visibility[parsed.data.field] = parsed.data.visibility;
    return ok(p.field_visibility);
  });
}

export const emailPrefsInput = z.object({
  digest: z.enum(['weekly', 'monthly', 'off']).optional(),
  signal_alerts: z.boolean().optional(),
});
export type EmailPrefsInput = z.infer<typeof emailPrefsInput>;

/** Digest frequency and signal alerts (FR-W4). Transactional request emails are not optional. */
export async function updateEmailPreferences(input: EmailPrefsInput): Promise<Result<StudentProfile['email_prefs']>> {
  await latency(60, 100);
  const parsed = emailPrefsInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation');
  return transact(d => {
    const p = studentOrFail(d);
    if ('ok' in p) return p;
    p.email_prefs = { ...p.email_prefs, ...parsed.data };
    return ok(p.email_prefs);
  });
}

/** Market metaphor on or off (PRD Q7). */
export async function setUiMode(mode: UiMode): Promise<Result<UiMode>> {
  await latency(40, 60);
  if (mode !== 'market' && mode !== 'plain') return fail('validation', 'validation');
  return transact(d => {
    const p = studentOrFail(d);
    if ('ok' in p) return p;
    p.ui_mode = mode;
    return ok(mode);
  });
}

export interface StudentExport {
  format: 'student-export/v1';
  generated_at: string;
  account: { email: string; display_name: string; auth_method: string; signed_in_at: string };
  profile: StudentProfile;
  skills: DemoDB['skills'];
  watchlist: DemoDB['watchlist'];
  chat_requests: DemoDB['requests'];
  chat_events: ChatEvent[];
  waitlist: DemoDB['waitlist'];
  reports_filed: DemoDB['reports'];
  blocks: DemoDB['blocks'];
  emails: DemoDB['outbox'];
}

/**
 * Everything we hold about the signed-in student (APP 12). The preview store holds
 * a single student, so every chat request in it is theirs.
 */
export function buildExport(d: DemoDB, now: number): StudentExport | null {
  if (!d.session || !d.student) return null;
  const requestIds = new Set(d.requests.map(r => r.id));
  return {
    format: 'student-export/v1',
    generated_at: new Date(now).toISOString(),
    account: { email: d.session.email, display_name: d.session.display_name, auth_method: d.session.auth_method, signed_in_at: d.session.signed_in_at },
    profile: d.student,
    skills: d.skills,
    watchlist: d.watchlist,
    chat_requests: d.requests,
    chat_events: d.events.filter(e => requestIds.has(e.request_id)),
    waitlist: d.waitlist,
    reports_filed: d.reports.filter(r => r.reporter === 'student'),
    blocks: d.blocks.filter(b => b.blocker === 'student'),
    // Sign-in tokens are credentials: never part of an export.
    emails: d.outbox.filter(m => m.to === 'student').map(m => (m.template === 'magic_link' ? { ...m, vars: { email: m.vars.email } } : m)),
  };
}

/** Build the JSON export and notify by email (`export_ready`). Production stores it with a 24 h signed URL. */
export async function requestExport(): Promise<Result<StudentExport>> {
  await latency(300, 300);
  return transact((d, now) => {
    const p = studentOrFail(d);
    if ('ok' in p) return p;
    const data = buildExport(d, now);
    if (!data) return fail('not_found', 'notFound');
    d.outbox.push({ id: uid('mail'), to: 'student', template: 'export_ready', vars: {}, at: new Date(now).toISOString(), request_id: null });
    return ok(data);
  });
}

export const deletionInput = z.object({ confirmation: z.literal(DELETE_CONFIRMATION) });
export type DeletionInput = z.input<typeof deletionInput>;

const ACTIVE = new Set(['pending', 'accepted', 'reschedule_proposed']);

/**
 * Delete the account (FR-A5): personal data is cleared now, the backend purges
 * everything within 30 days. Open chat requests are cancelled so practitioners
 * are not left waiting, then the session ends.
 */
export async function requestDeletion(input: DeletionInput): Promise<Result<DeletionRequest>> {
  await latency(300, 300);
  const parsed = deletionInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'deleteConfirmMismatch', { confirmation: 'deleteConfirmMismatch' });
  return transact((d, now) => {
    const p = studentOrFail(d);
    if ('ok' in p) return p;
    const iso = new Date(now).toISOString();
    const deletion: DeletionRequest = { requested_at: iso, purge_after: new Date(now + PURGE_AFTER_DAYS * DAY).toISOString() };
    for (const r of d.requests) {
      if (!ACTIVE.has(r.status)) continue;
      d.events.push({ id: uid('ev'), request_id: r.id, at: iso, actor: 'system', kind: 'cancel', from: r.status, to: 'cancelled' });
      r.status = 'cancelled';
      r.updated_at = iso;
      for (const slotId of [r.slot_id, r.proposed_slot_id]) {
        const slot = d.slots.find(s => s.id === slotId);
        if (slot && slot.status !== 'open') slot.status = 'open';
      }
    }
    d.outbox.push({ id: uid('mail'), to: 'student', template: 'deletion_scheduled', vars: { date: formatDate(deletion.purge_after) }, at: iso, request_id: null });
    d.student = null;
    d.skills = [];
    d.watchlist = [];
    d.waitlist = [];
    d.blocks = d.blocks.filter(b => b.blocker !== 'student');
    d.deletion = deletion;
    d.session = null;
    return ok(deletion);
  });
}

/** What the student agreed to and when (APP 3 consent record). */
export function selectConsents(d: DemoDB): Consent[] {
  return [...(d.student?.consents ?? [])].sort((a, b) => b.at.localeCompare(a.at));
}
