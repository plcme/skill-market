import { getInstrument } from '@/lib/market/catalog';
import { transition, type TransitionEvent, type TransitionResult } from '@/lib/chat/machine';
import { DAY, formatDateTime, HOUR } from '@/lib/time';
import { findCandidates, isSuspended, practitionerMatchesInstrument } from './matching';
import type { Actor, ChatEventKind, ChatRequest, ChatStatus, DemoDB, EmailTemplate, OutboxEmail, Practitioner, Slot } from './types';

// Chat domain internals shared by the actions (chat.ts), the scheduled jobs and
// the sample seed. Everything here mutates a draft DemoDB passed in — the
// production equivalents are the SQL functions `transition_chat_request()`,
// `expire_chat_requests()` and `schedule_reminders()` (ARCHITECTURE §5.4, §7.2).

export const REPLY_WINDOW_MS = 72 * HOUR;
/** A pending request lapses at least this long before its slot, so nobody is left hanging. */
export const EXPIRY_BEFORE_SLOT_MS = 12 * HOUR;
export const CANCEL_NOTICE_MS = 24 * HOUR;
export const REMINDER_LEAD_MS = 24 * HOUR;
export const SLOT_LENGTH_MS = 20 * 60_000;
/** Post-chat prompts go out an hour after the slot ends. */
export const PROMPT_DELAY_MS = HOUR;
export const AUTO_COMPLETE_MS = 7 * DAY;
export const NO_SHOW_WINDOW_MS = 30 * DAY;
export const NO_SHOW_LIMIT = 2;
export const NO_SHOW_PAUSE_MS = 30 * DAY;

export function newId(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

const iso = (ms: number) => new Date(ms).toISOString();

export function instrumentName(slug: string): string {
  return getInstrument(slug)?.name ?? slug;
}

/** First name only — what the other side sees in emails. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function studentFirstName(d: DemoDB): string {
  return firstName(d.student?.display_name ?? d.session?.display_name ?? 'A student');
}

export function practitionerOf(d: Pick<DemoDB, 'practitioners'>, id: string): Practitioner | undefined {
  return d.practitioners.find(p => p.id === id);
}

export function slotEnd(req: Pick<ChatRequest, 'slot_start'>): number {
  return Date.parse(req.slot_start) + SLOT_LENGTH_MS;
}

/** `min(created + 72h, slot − 12h)` — the reply window. */
export function expiresAtFor(createdMs: number, slotStartMs: number): string {
  return iso(Math.max(createdMs + HOUR, Math.min(createdMs + REPLY_WINDOW_MS, slotStartMs - EXPIRY_BEFORE_SLOT_MS)));
}

export function enqueue(d: DemoDB, to: OutboxEmail['to'], template: EmailTemplate, vars: OutboxEmail['vars'], now: number, requestId: string | null) {
  d.outbox.push({ id: newId('mail'), to, template, vars, at: iso(now), request_id: requestId });
}

function sent(d: DemoDB, requestId: string, template: EmailTemplate): boolean {
  return d.outbox.some(m => m.request_id === requestId && m.template === template);
}

export function logEvent(d: DemoDB, req: ChatRequest, kind: ChatEventKind, actor: Actor, from: ChatStatus | null, to: ChatStatus | null, now: number) {
  d.events.push({ id: newId('ev'), request_id: req.id, at: iso(now), actor, kind, from, to });
}

/** Run one state-machine step on a draft request and write the event row. */
export function applyTransition(d: DemoDB, req: ChatRequest, event: TransitionEvent, actor: Actor, now: number): TransitionResult {
  const result = transition(req.status, event, actor);
  if (!result.ok) return result;
  const from = req.status;
  req.status = result.to;
  req.updated_at = iso(now);
  logEvent(d, req, event, actor, from, result.to, now);
  return result;
}

export function setSlot(d: DemoDB, slotId: string | null, status: Slot['status']) {
  if (!slotId) return;
  const slot = d.slots.find(s => s.id === slotId);
  if (slot) slot.status = status;
}

/** Give a slot back to the practitioner's calendar (if it is still in the future). */
export function releaseSlot(d: DemoDB, slotId: string | null, now: number) {
  if (!slotId) return;
  const i = d.slots.findIndex(s => s.id === slotId);
  if (i < 0) return;
  if (Date.parse(d.slots[i].start) > now) d.slots[i].status = 'open';
  else d.slots.splice(i, 1);
}

export interface NewRequestParams {
  student_id: string;
  practitioner: Practitioner;
  slot: Slot;
  base: Pick<ChatRequest, 'instrument_slug' | 'filter' | 'signal' | 'decision_question' | 'starters' | 'shared_fields' | 'match_reasons' | 'tried_practitioner_ids'>;
  actor: Actor;
}

/** Insert a pending request, hold its slot, notify the practitioner. */
export function insertRequest(d: DemoDB, params: NewRequestParams, now: number): ChatRequest {
  const { practitioner: p, slot } = params;
  const req: ChatRequest = {
    id: newId('cr'),
    student_id: params.student_id,
    practitioner_id: p.id,
    ...params.base,
    slot_id: slot.id,
    slot_start: slot.start,
    proposed_slot_id: null,
    proposed_slot_start: null,
    status: 'pending',
    replaced_by: null,
    meeting_link: null,
    created_at: iso(now),
    expires_at: expiresAtFor(now, Date.parse(slot.start)),
    updated_at: iso(now),
    attendance: { student: null, practitioner: null },
    debrief: null,
  };
  d.requests.push(req);
  logEvent(d, req, 'create', params.actor, null, 'pending', now);
  slot.status = 'held';
  enqueue(d, 'practitioner', 'request_received', { student: studentFirstName(d), instrument: instrumentName(req.instrument_slug) }, now, req.id);
  return req;
}

/** Add the student to the waitlist for this instrument (no duplicates). */
export function ensureWaitlist(d: DemoDB, req: Pick<ChatRequest, 'instrument_slug' | 'filter'>, now: number) {
  if (d.waitlist.some(w => w.instrument_slug === req.instrument_slug)) return;
  d.waitlist.push({ id: newId('wl'), instrument_slug: req.instrument_slug, filter: req.filter, created_at: iso(now) });
}

/**
 * Silently find the next person for a released request (FR-C7/C8). Skips everyone
 * already tried. Falls back to the waitlist when nobody is free.
 */
export function replaceRequest(d: DemoDB, old: ChatRequest, now: number): ChatRequest | null {
  const tried = [...new Set([...old.tried_practitioner_ids, old.practitioner_id])];
  const match = findCandidates({
    instrument_slug: old.instrument_slug,
    filter: old.filter,
    decision_question: old.decision_question,
    student_id: old.student_id,
    exclude_ids: tried,
  }, d, now);
  enqueue(d, 'student', 'request_still_looking', { instrument: instrumentName(old.instrument_slug) }, now, old.id);
  const next = match.candidates[0];
  const slot = next?.slots[0] ? d.slots.find(s => s.id === next.slots[0].id) : undefined;
  if (!next || !slot) {
    ensureWaitlist(d, old, now);
    return null;
  }
  const req = insertRequest(d, {
    student_id: old.student_id,
    practitioner: next.practitioner,
    slot,
    base: {
      instrument_slug: old.instrument_slug,
      filter: old.filter,
      signal: old.signal,
      decision_question: old.decision_question,
      starters: old.starters,
      shared_fields: old.shared_fields,
      match_reasons: next.reasons,
      tried_practitioner_ids: tried,
    },
    actor: 'system',
  }, now);
  old.replaced_by = req.id;
  logEvent(d, old, 'replaced', 'system', old.status, old.status, now);
  return req;
}

/** No-shows by a practitioner within the 30-day window, not counting ones before their last pause. */
export function recentPractitionerNoShows(d: DemoDB, p: Practitioner, now: number): number {
  const since = Math.max(now - NO_SHOW_WINDOW_MS, p.suspended_until ? Date.parse(p.suspended_until) - NO_SHOW_PAUSE_MS : 0);
  return d.requests.filter(r => r.practitioner_id === p.id && r.status === 'no_show_practitioner' && Date.parse(r.slot_start) >= since && Date.parse(r.slot_start) <= now).length;
}

/** Reliability rule (FR-C10): ≥ 2 no-shows in 30 days pauses matching for 30 days. */
export function applyPractitionerReliability(d: DemoDB, practitionerId: string, now: number) {
  const p = practitionerOf(d, practitionerId);
  if (!p || isSuspended(p, now)) return;
  if (recentPractitionerNoShows(d, p, now) >= NO_SHOW_LIMIT) p.suspended_until = iso(now + NO_SHOW_PAUSE_MS);
}

/** Students with ≥ 2 no-shows in 30 days can't send new requests until 30 days after the latest. */
export function studentPausedUntil(d: DemoDB, studentId: string, now: number): number | null {
  const misses = d.requests
    .filter(r => r.student_id === studentId && r.status === 'no_show_student' && Date.parse(r.slot_start) >= now - NO_SHOW_WINDOW_MS && Date.parse(r.slot_start) <= now)
    .map(r => Date.parse(r.slot_start))
    .sort((a, b) => a - b);
  if (misses.length < NO_SHOW_LIMIT) return null;
  const until = misses[misses.length - 1] + NO_SHOW_PAUSE_MS;
  return until > now ? until : null;
}

/** Email waitlisted students when a newly matchable practitioner covers their instrument. */
export function notifyWaitlist(d: DemoDB, p: Practitioner, now: number) {
  const hits = d.waitlist.filter(w => practitionerMatchesInstrument(p, w.instrument_slug));
  for (const w of hits) enqueue(d, 'student', 'waitlist_match', { instrument: instrumentName(w.instrument_slug) }, now, null);
  d.waitlist = d.waitlist.filter(w => !hits.includes(w));
}

/** Both sides said it happened (or one did and the other stayed silent for 7 days). */
export function maybeComplete(d: DemoDB, req: ChatRequest, now: number) {
  if (req.status !== 'accepted') return;
  const { student, practitioner } = req.attendance;
  const both = student === 'attended' && practitioner === 'attended';
  const oneSilent = (student === 'attended' && practitioner === null) || (practitioner === 'attended' && student === null);
  if (both || (oneSilent && now >= slotEnd(req) + AUTO_COMPLETE_MS)) applyTransition(d, req, 'complete', 'system', now);
}

/**
 * pg_cron stand-in for the chat domain: expiry + silent replacement, reschedule
 * timeouts, 24h reminders, post-chat prompts and auto-completion.
 */
export function runChatJobs(d: DemoDB, now: number): void {
  // Iterate over a snapshot: replacements append new requests.
  for (const req of [...d.requests]) {
    if (req.status === 'pending' && Date.parse(req.expires_at) <= now) {
      applyTransition(d, req, 'expire', 'system', now);
      releaseSlot(d, req.slot_id, now);
      replaceRequest(d, req, now);
      continue;
    }
    if (req.status === 'reschedule_proposed' && Date.parse(req.expires_at) <= now) {
      applyTransition(d, req, 'expire', 'system', now);
      releaseSlot(d, req.proposed_slot_id, now);
      continue;
    }
    if (req.status !== 'accepted') continue;
    const start = Date.parse(req.slot_start);
    const end = slotEnd(req);
    if (now >= start - REMINDER_LEAD_MS && now < start && !sent(d, req.id, 'reminder_24h')) {
      const vars = { instrument: instrumentName(req.instrument_slug) };
      enqueue(d, 'student', 'reminder_24h', vars, now, req.id);
      enqueue(d, 'practitioner', 'reminder_24h', vars, now, req.id);
      logEvent(d, req, 'reminder_sent', 'system', req.status, req.status, now);
    }
    if (now >= end + PROMPT_DELAY_MS && !sent(d, req.id, 'debrief_prompt') && !sent(d, req.id, 'attendance_prompt')) {
      const askStudent = !req.debrief;
      const askPractitioner = !req.attendance.practitioner;
      if (askStudent) enqueue(d, 'student', 'debrief_prompt', { instrument: instrumentName(req.instrument_slug) }, now, req.id);
      if (askPractitioner) enqueue(d, 'practitioner', 'attendance_prompt', { student: studentFirstName(d) }, now, req.id);
      if (askStudent || askPractitioner) logEvent(d, req, 'reminder_sent', 'system', req.status, req.status, now);
    }
    maybeComplete(d, req, now);
  }
}

/**
 * Would `runChatJobs` change anything at `now`? Lets the UI catch up after the
 * preview clock jumps (the store runs jobs before a write, not on reads).
 */
export function chatJobsDue(d: DemoDB, now: number): boolean {
  return d.requests.some(req => {
    if ((req.status === 'pending' || req.status === 'reschedule_proposed') && Date.parse(req.expires_at) <= now) return true;
    if (req.status !== 'accepted') return false;
    const start = Date.parse(req.slot_start);
    if (now >= start - REMINDER_LEAD_MS && now < start && !sent(d, req.id, 'reminder_24h')) return true;
    if (now >= slotEnd(req) + PROMPT_DELAY_MS && !sent(d, req.id, 'debrief_prompt') && !sent(d, req.id, 'attendance_prompt') && (!req.debrief || !req.attendance.practitioner)) return true;
    const { student, practitioner } = req.attendance;
    return ((student === 'attended') !== (practitioner === 'attended')) && (student === null || practitioner === null) && now >= slotEnd(req) + AUTO_COMPLETE_MS;
  });
}

/** Format used in emails ("Tue 29 Sept, 6:00 pm AEST"). */
export function emailWhen(slotStart: string, tz?: string): string {
  return formatDateTime(slotStart, tz);
}
