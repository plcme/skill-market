'use client';

import { z } from 'zod';
import { getInstrument } from '@/lib/market/catalog';
import { filterSpecSchema, normaliseFilter } from '@/lib/filters/spec';
import type { FilterSpec, Signal } from '@/lib/market/types';
import { transact } from '@/lib/demo/store';
import { HOUR } from '@/lib/time';
import { allowedEvents } from '@/lib/chat/machine';
import { fail, guard, latency, ok } from './client';
import {
  applyPractitionerReliability, applyTransition, CANCEL_NOTICE_MS, emailWhen, enqueue, ensureWaitlist, firstName,
  maybeComplete, practitionerOf, releaseSlot, replaceRequest, setSlot, slotEnd, studentFirstName, studentPausedUntil, insertRequest,
} from './chat-jobs';
import { findCandidates, ineligibility, OPEN_STATUSES } from './matching';
import { actingPractitionerId } from './practitioner';
import type { ApiError, ChatEvent, ChatRequest, DebriefVote, DemoDB, Practitioner, Result, StudentField, WaitlistEntry } from './types';
import { STUDENT_FIELDS } from './types';

// Chat domain (FR-C1–C11, FR-R1–R2). Server Actions: createRequest,
// acceptRequest, declineRequest, proposeReschedule, acceptReschedule,
// declineReschedule, cancelRequest, confirmAttendance, submitDebrief,
// joinWaitlist. Reads: selectStudentRequests, selectPractitionerInbox, selectRequest.
// Every transition goes through the §7.2 state machine and writes an event.

export const DECISION_MIN = 15;
export const DECISION_MAX = 500;
export const STARTER_MAX = 280;
export const NOTE_MAX = 140;
export const DAILY_REQUEST_LIMIT = 5;
/** A reschedule must leave the student at least this long to respond. */
export const RESCHEDULE_MIN_LEAD_MS = 24 * HOUR;

type Fail = { ok: false; error: ApiError };
const denied = (e: ApiError): Fail => ({ ok: false, error: e });

function asStudent(d: DemoDB, id: string): { req: ChatRequest } | Fail {
  const g = guard(d, 'student');
  if (g) return denied(g);
  const req = d.requests.find(r => r.id === id);
  if (!req || req.student_id !== d.session?.user_id) return fail('not_found', 'notFound');
  return { req };
}

function asPractitioner(d: DemoDB, id: string): { req: ChatRequest; p: Practitioner } | Fail {
  const g = guard(d, 'practitioner');
  if (g) return denied(g);
  const req = d.requests.find(r => r.id === id);
  const pid = actingPractitionerId(d);
  const p = practitionerOf(d, pid);
  if (!req || !p || req.practitioner_id !== pid) return fail('not_found', 'notFound');
  return { req, p };
}

const stateChanged = () => fail('conflict', 'chatStateChanged');

// ------------------------------------------------------------------ create

const signalSchema = z.object({
  id: z.string(),
  kind: z.enum(['rise', 'fall', 'entry_open', 'since_added']),
  instrument_slug: z.string(),
  metric: z.string(),
  magnitude: z.number(),
  from: z.number(),
  to: z.number(),
  detected_at: z.string(),
  filter: filterSpecSchema,
}).nullable();

export const createRequestInput = z.object({
  instrument_slug: z.string().min(1),
  filter: filterSpecSchema,
  signal: signalSchema,
  decision_question: z.string().trim().min(DECISION_MIN).max(DECISION_MAX),
  practitioner_id: z.string().min(1),
  slot_id: z.string().min(1),
  starters: z.array(z.string().trim().min(1).max(STARTER_MAX)).min(1).max(3),
  shared_fields: z.array(z.enum(STUDENT_FIELDS as [StudentField, ...StudentField[]])).max(STUDENT_FIELDS.length),
  agree_conduct: z.literal(true),
});
export type CreateRequestInput = z.input<typeof createRequestInput>;

/** Send a request: holds the slot, 72h reply window, emails the practitioner (FR-C5). */
export async function createRequest(input: CreateRequestInput): Promise<Result<ChatRequest>> {
  await latency();
  const parsed = createRequestInput.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] = String(issue.path[0]);
    return fail('validation', 'validation', fields);
  }
  const data = parsed.data;
  if (!getInstrument(data.instrument_slug)) return fail('not_found', 'instrumentNotFound');
  const filter = normaliseFilter(data.filter as FilterSpec);
  return transact((d, now) => {
    const g = guard(d, 'student');
    if (g || !d.session) return denied(g ?? { code: 'unauthenticated', message: 'unauthenticated' });
    const studentId = d.session.user_id;
    if (studentPausedUntil(d, studentId, now)) return fail('forbidden', 'studentPaused');
    const today = d.requests.filter(r => r.student_id === studentId && Date.parse(r.created_at) > now - 24 * HOUR && d.events.some(e => e.request_id === r.id && e.kind === 'create' && e.actor === 'student'));
    if (today.length >= DAILY_REQUEST_LIMIT) return fail('rate_limited', 'rateLimited');
    const p = practitionerOf(d, data.practitioner_id);
    if (!p) return fail('not_found', 'notFound');
    if (ineligibility(d, p, now, { student_id: studentId })) return fail('conflict', 'candidateUnavailable');
    // Reasons are recomputed on the server; the client's copy is never trusted.
    const match = findCandidates({ instrument_slug: data.instrument_slug, filter, decision_question: data.decision_question, student_id: studentId }, d, now);
    const candidate = match.candidates.find(c => c.practitioner.id === p.id);
    if (!candidate) return fail('conflict', 'candidateUnavailable');
    const slot = d.slots.find(s => s.id === data.slot_id && s.practitioner_id === p.id);
    if (!slot || slot.status !== 'open' || !candidate.slots.some(s => s.id === slot.id)) return fail('conflict', 'slotTaken');
    const shared = STUDENT_FIELDS.filter(f => data.shared_fields.includes(f));
    const req = insertRequest(d, {
      student_id: studentId,
      practitioner: p,
      slot,
      base: {
        instrument_slug: data.instrument_slug,
        filter,
        signal: data.signal as Signal | null,
        decision_question: data.decision_question,
        starters: data.starters,
        shared_fields: shared,
        match_reasons: candidate.reasons,
        tried_practitioner_ids: [],
      },
      actor: 'student',
    }, now);
    // Joining the waitlist is no longer needed once someone has been asked.
    d.waitlist = d.waitlist.filter(w => w.instrument_slug !== data.instrument_slug);
    return ok(req);
  });
}

// ------------------------------------------------------------------ practitioner replies

/** One-click accept (FR-P5): books the slot, shares the meeting link, emails the student. */
export async function acceptRequest(id: string): Promise<Result<ChatRequest>> {
  await latency();
  return transact((d, now) => {
    const ctx = asPractitioner(d, id);
    if ('ok' in ctx) return ctx;
    const { req, p } = ctx;
    if (Date.parse(req.slot_start) <= now) return stateChanged();
    if (!applyTransition(d, req, 'accept', 'practitioner', now).ok) return stateChanged();
    setSlot(d, req.slot_id, 'booked');
    req.meeting_link = p.meeting_link;
    enqueue(d, 'student', 'request_accepted', { practitioner: firstName(p.display_name), when: emailWhen(req.slot_start) }, now, req.id);
    return ok(req);
  });
}

/** Decline without a reason (FR-P5). The student is silently matched with someone else (FR-C8). */
export async function declineRequest(id: string): Promise<Result<ChatRequest>> {
  await latency();
  return transact((d, now) => {
    const ctx = asPractitioner(d, id);
    if ('ok' in ctx) return ctx;
    const { req } = ctx;
    if (!applyTransition(d, req, 'decline', 'practitioner', now).ok) return stateChanged();
    releaseSlot(d, req.slot_id, now);
    replaceRequest(d, req, now);
    return ok(req);
  });
}

export const rescheduleInput = z.object({ id: z.string().min(1), slot_id: z.string().min(1) });

/** Suggest another of your open slots instead (FR-P5). */
export async function proposeReschedule(input: z.infer<typeof rescheduleInput>): Promise<Result<ChatRequest>> {
  await latency();
  const parsed = rescheduleInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation');
  return transact((d, now) => {
    const ctx = asPractitioner(d, parsed.data.id);
    if ('ok' in ctx) return ctx;
    const { req, p } = ctx;
    const slot = d.slots.find(s => s.id === parsed.data.slot_id && s.practitioner_id === p.id);
    if (!slot || slot.status !== 'open' || slot.id === req.slot_id || Date.parse(slot.start) < now + RESCHEDULE_MIN_LEAD_MS) return fail('conflict', 'slotTaken');
    if (!applyTransition(d, req, 'propose_reschedule', 'practitioner', now).ok) return stateChanged();
    releaseSlot(d, req.slot_id, now);
    slot.status = 'held';
    req.proposed_slot_id = slot.id;
    req.proposed_slot_start = slot.start;
    req.expires_at = new Date(Math.min(now + 72 * HOUR, Date.parse(slot.start) - 12 * HOUR)).toISOString();
    enqueue(d, 'student', 'request_rescheduled', { practitioner: firstName(p.display_name) }, now, req.id);
    return ok(req);
  });
}

// ------------------------------------------------------------------ student replies

/** Take the suggested time: the request is accepted at the new slot. */
export async function acceptReschedule(id: string): Promise<Result<ChatRequest>> {
  await latency();
  return transact((d, now) => {
    const ctx = asStudent(d, id);
    if ('ok' in ctx) return ctx;
    const { req } = ctx;
    if (!req.proposed_slot_id || !req.proposed_slot_start || Date.parse(req.proposed_slot_start) <= now) return stateChanged();
    if (!applyTransition(d, req, 'accept_reschedule', 'student', now).ok) return stateChanged();
    req.slot_id = req.proposed_slot_id;
    req.slot_start = req.proposed_slot_start;
    req.proposed_slot_id = null;
    req.proposed_slot_start = null;
    setSlot(d, req.slot_id, 'booked');
    const p = practitionerOf(d, req.practitioner_id);
    req.meeting_link = p?.meeting_link ?? null;
    enqueue(d, 'practitioner', 'request_accepted', { practitioner: studentFirstName(d), when: emailWhen(req.slot_start, p?.timezone) }, now, req.id);
    return ok(req);
  });
}

/** Say no to the suggested time; the request closes and both slots are freed. */
export async function declineReschedule(id: string): Promise<Result<ChatRequest>> {
  await latency();
  return transact((d, now) => {
    const ctx = asStudent(d, id);
    if ('ok' in ctx) return ctx;
    const { req } = ctx;
    if (!applyTransition(d, req, 'decline_reschedule', 'student', now).ok) return stateChanged();
    releaseSlot(d, req.proposed_slot_id, now);
    return ok(req);
  });
}

export const cancelInput = z.object({ id: z.string().min(1), as: z.enum(['student', 'practitioner']) });

/** Can this side still cancel? Accepted chats need ≥ 24h notice (FR-C10). */
export function canCancel(req: Pick<ChatRequest, 'status' | 'slot_start'>, as: 'student' | 'practitioner', now: number): boolean {
  if (!allowedEvents(req.status, as).includes('cancel')) return false;
  return req.status !== 'accepted' || Date.parse(req.slot_start) - now >= CANCEL_NOTICE_MS;
}

/** Cancel: pending/new-time by the student; accepted by either side up to 24h before. */
export async function cancelRequest(input: z.infer<typeof cancelInput>): Promise<Result<ChatRequest>> {
  await latency();
  const parsed = cancelInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation');
  return transact((d, now) => {
    const ctx = parsed.data.as === 'student' ? asStudent(d, parsed.data.id) : asPractitioner(d, parsed.data.id);
    if ('ok' in ctx) return ctx;
    const { req } = ctx;
    if (req.status === 'accepted' && Date.parse(req.slot_start) - now < CANCEL_NOTICE_MS) return fail('conflict', 'tooLateToCancel');
    const wasAccepted = req.status === 'accepted';
    if (!applyTransition(d, req, 'cancel', parsed.data.as, now).ok) return stateChanged();
    releaseSlot(d, req.slot_id, now);
    releaseSlot(d, req.proposed_slot_id, now);
    // A practitioner pulling out is handled like a decline for the student.
    if (parsed.data.as === 'practitioner' && wasAccepted) replaceRequest(d, req, now);
    return ok(req);
  });
}

// ------------------------------------------------------------------ after the chat

export const attendanceInput = z.object({ id: z.string().min(1), as: z.enum(['student', 'practitioner']), attended: z.boolean() });

/** L2 attendance (FR-R2, FR-C10): "it happened" or "they didn't come". */
export async function confirmAttendance(input: z.infer<typeof attendanceInput>): Promise<Result<ChatRequest>> {
  await latency();
  const parsed = attendanceInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation');
  const { id, as, attended } = parsed.data;
  return transact((d, now) => {
    const ctx = as === 'student' ? asStudent(d, id) : asPractitioner(d, id);
    if ('ok' in ctx) return ctx;
    const { req } = ctx;
    if (Date.parse(req.slot_start) > now) return fail('conflict', 'tooEarlyToConfirm');
    const other = as === 'student' ? 'practitioner' : 'student';
    if (attended) {
      if (req.status === 'completed') return ok(req);
      if (!applyTransition(d, req, 'confirm_attended', as, now).ok) return stateChanged();
      req.attendance[as] = 'attended';
      maybeComplete(d, req, now);
    } else {
      if (!applyTransition(d, req, 'confirm_absent', as, now).ok) return stateChanged();
      req.attendance[as] = 'attended';
      req.attendance[other] = 'absent';
      if (as === 'student') applyPractitionerReliability(d, req.practitioner_id, now);
    }
    return ok(req);
  });
}

export const debriefInput = z.object({
  id: z.string().min(1),
  vote: z.enum(['more_keen', 'no_change', 'less_keen']),
  note: z.string().trim().max(NOTE_MAX).default(''),
});

/** L0 debrief (FR-R1): one click records the vote and that the chat happened. */
export async function submitDebrief(input: z.input<typeof debriefInput>): Promise<Result<ChatRequest>> {
  await latency();
  const parsed = debriefInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation', { note: 'note' });
  return transact((d, now) => {
    const ctx = asStudent(d, parsed.data.id);
    if ('ok' in ctx) return ctx;
    const { req } = ctx;
    if (slotEnd(req) > now) return fail('conflict', 'tooEarlyToConfirm');
    if (req.status !== 'accepted' && req.status !== 'completed') return stateChanged();
    req.debrief = { vote: parsed.data.vote as DebriefVote, note: parsed.data.note, at: new Date(now).toISOString() };
    req.updated_at = new Date(now).toISOString();
    if (req.status === 'accepted' && req.attendance.student !== 'attended') {
      applyTransition(d, req, 'confirm_attended', 'student', now);
      req.attendance.student = 'attended';
    }
    maybeComplete(d, req, now);
    return ok(req);
  });
}

export const waitlistInput = z.object({ instrument_slug: z.string().min(1), filter: filterSpecSchema });

/** Nobody free: we email you when someone who fits joins (FR-C6). */
export async function joinWaitlist(input: z.infer<typeof waitlistInput>): Promise<Result<WaitlistEntry>> {
  await latency();
  const parsed = waitlistInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation');
  if (!getInstrument(parsed.data.instrument_slug)) return fail('not_found', 'instrumentNotFound');
  return transact((d, now) => {
    const g = guard(d, 'student');
    if (g) return denied(g);
    ensureWaitlist(d, { instrument_slug: parsed.data.instrument_slug, filter: normaliseFilter(parsed.data.filter as FilterSpec) }, now);
    const entry = d.waitlist.find(w => w.instrument_slug === parsed.data.instrument_slug);
    return entry ? ok(entry) : fail('unavailable', 'generic');
  });
}

/** Leave the waitlist for an instrument. */
export async function leaveWaitlist(id: string): Promise<Result<{ id: string }>> {
  await latency();
  return transact(d => {
    const g = guard(d, 'student');
    if (g) return denied(g);
    const before = d.waitlist.length;
    d.waitlist = d.waitlist.filter(w => w.id !== id);
    return before === d.waitlist.length ? fail('not_found', 'notFound') : ok({ id });
  });
}

// ------------------------------------------------------------------ reads

export function isWaitlisted(d: DemoDB, slug: string): WaitlistEntry | undefined {
  return d.waitlist.find(w => w.instrument_slug === slug);
}

/** Follow `replaced_by` to the request that currently stands for this ask. */
export function latestInChain(d: DemoDB, req: ChatRequest): ChatRequest {
  let cur = req;
  for (let i = 0; i < 20 && cur.replaced_by; i++) {
    const next = d.requests.find(r => r.id === cur.replaced_by);
    if (!next) break;
    cur = next;
  }
  return cur;
}

export interface StudentRequestGroups {
  /** Reschedule to answer, or a finished chat to confirm / debrief. */
  needs_you: ChatRequest[];
  upcoming: ChatRequest[];
  /** Pending, plus asks where we're still looking (waitlisted). */
  waiting: ChatRequest[];
  past: ChatRequest[];
}

export function needsStudent(req: ChatRequest, now: number): boolean {
  if (req.status === 'reschedule_proposed') return true;
  return req.status === 'accepted' && slotEnd(req) <= now && !req.debrief;
}

/** The student's requests, grouped for /me/requests. Superseded requests are folded into their replacement. */
export function selectStudentRequests(d: DemoDB, now: number): StudentRequestGroups {
  const me = d.session?.user_id;
  const mine = d.requests.filter(r => r.student_id === me && !r.replaced_by);
  const groups: StudentRequestGroups = { needs_you: [], upcoming: [], waiting: [], past: [] };
  for (const r of mine) {
    if (needsStudent(r, now)) groups.needs_you.push(r);
    else if (r.status === 'accepted') groups.upcoming.push(r);
    else if (r.status === 'pending') groups.waiting.push(r);
    else if ((r.status === 'declined' || r.status === 'expired' || r.status === 'cancelled') && isWaitlisted(d, r.instrument_slug) && r.status !== 'cancelled') groups.waiting.push(r);
    else groups.past.push(r);
  }
  const bySlot = (a: ChatRequest, b: ChatRequest) => a.slot_start.localeCompare(b.slot_start);
  groups.needs_you.sort(bySlot);
  groups.upcoming.sort(bySlot);
  groups.waiting.sort((a, b) => b.created_at.localeCompare(a.created_at));
  groups.past.sort((a, b) => b.slot_start.localeCompare(a.slot_start));
  return groups;
}

export interface PractitionerInbox {
  pending: ChatRequest[];
  waiting_on_student: ChatRequest[];
  upcoming: ChatRequest[];
  /** Past slots still missing your attendance confirmation. */
  confirm: ChatRequest[];
  past: ChatRequest[];
}

/** Requests addressed to a practitioner, pending first (FR-P4). */
export function selectPractitionerInbox(d: DemoDB, practitionerId: string, now: number): PractitionerInbox {
  const rows = d.requests.filter(r => r.practitioner_id === practitionerId);
  const inbox: PractitionerInbox = { pending: [], waiting_on_student: [], upcoming: [], confirm: [], past: [] };
  for (const r of rows) {
    if (r.status === 'pending') inbox.pending.push(r);
    else if (r.status === 'reschedule_proposed') inbox.waiting_on_student.push(r);
    else if (r.status === 'accepted' && Date.parse(r.slot_start) > now) inbox.upcoming.push(r);
    else if (r.status === 'accepted' && !r.attendance.practitioner) inbox.confirm.push(r);
    else inbox.past.push(r);
  }
  inbox.pending.sort((a, b) => a.expires_at.localeCompare(b.expires_at));
  inbox.upcoming.sort((a, b) => a.slot_start.localeCompare(b.slot_start));
  inbox.confirm.sort((a, b) => a.slot_start.localeCompare(b.slot_start));
  inbox.past.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return inbox;
}

export type RequestViewer = 'student' | 'practitioner';

export interface RequestView {
  request: ChatRequest;
  practitioner: Practitioner | null;
  viewer: RequestViewer;
  events: ChatEvent[];
  /** Where this ask moved to, if it was released (student side only). */
  replacement: ChatRequest | null;
  /** Earlier requests for the same ask (student side only). */
  earlier: ChatRequest[];
}

/** One request as the current session may see it; `null` when it isn't theirs. */
export function selectRequest(d: DemoDB, id: string): RequestView | null {
  const req = d.requests.find(r => r.id === id);
  if (!req || !d.session) return null;
  const events = d.events.filter(e => e.request_id === id).sort((a, b) => a.at.localeCompare(b.at));
  const practitioner = practitionerOf(d, req.practitioner_id) ?? null;
  const asStudentView = req.student_id === d.session.user_id && d.session.active === 'student';
  const asPractitionerView = d.session.active === 'practitioner' && req.practitioner_id === actingPractitionerId(d);
  if (asPractitionerView) return { request: req, practitioner, viewer: 'practitioner', events, replacement: null, earlier: [] };
  if (!asStudentView) return null;
  const latest = latestInChain(d, req);
  const earlier = d.requests.filter(r => r.replaced_by && latestInChain(d, r).id === req.id && r.id !== req.id);
  return { request: req, practitioner, viewer: 'student', events, replacement: latest.id !== req.id ? latest : null, earlier };
}

/** Is there already a live request for this instrument? (Avoid duplicate asks.) */
export function openRequestFor(d: DemoDB, slug: string): ChatRequest | undefined {
  const me = d.session?.user_id;
  return d.requests.find(r => r.student_id === me && r.instrument_slug === slug && OPEN_STATUSES.includes(r.status));
}

/** Past debriefs for an instrument ("your notes on Rust"). */
export function selectDebriefsFor(d: DemoDB, slug: string): ChatRequest[] {
  const me = d.session?.user_id;
  return d.requests.filter(r => r.student_id === me && r.instrument_slug === slug && r.debrief).sort((a, b) => b.slot_start.localeCompare(a.slot_start));
}

