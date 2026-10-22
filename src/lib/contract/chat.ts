import { z } from 'zod';
import { idInput, idOutput, noInput, op, slug } from './common';
import {
  chatEventSchema, chatRequestSchema, matchReasonSchema, practitionerCardSchema, sharedSnapshotSchema, slotSchema, studentField,
  waitlistEntrySchema,
} from './entities';
import { filterSpecSchema, signalSchema } from './market';

// Coffee chats: matching, requests, the state machine, attendance, debrief,
// waitlist (FR-C1–C11, FR-R1–R2). Rules that matter for copy: a decline,
// expiry or practitioner cancel is never shown to the student as rejection —
// the ask moves on to the next match silently ("still looking").

export const MATCH_LIMIT = 3;
export const DECISION_MIN = 15;
export const DECISION_MAX = 500;
export const STARTER_MAX = 280;
export const NOTE_MAX = 140;
export const DAILY_REQUEST_LIMIT = 5;
/** Reply window and timing rules (also enforced by jobs, see jobs.ts). */
export const TIMING = {
  reply_window_hours: 72,
  expire_before_slot_hours: 12,
  min_slot_lead_hours: 48,
  reschedule_min_lead_hours: 24,
  cancel_notice_hours: 24,
  reminder_before_hours: 24,
  prompt_after_slot_hours: 1,
  auto_complete_days: 7,
} as const;

/** Allowed transitions; SQL transition_chat_request() must use the same table. */
export { TRANSITIONS } from '@/lib/chat/machine';

// ---------------------------------------------------------------- read models

export const candidateSchema = z.object({
  practitioner: practitionerCardSchema,
  reasons: z.array(matchReasonSchema),
  /** Open slots ≥ 48h ahead, soonest first. */
  slots: z.array(slotSchema),
  /** Set when matched through a related skill (badge "Related"). */
  adjacent_skill: z.string().nullable(),
  years_since_entry: z.number().int(),
});

export const matchResultSchema = z.object({
  candidates: z.array(candidateSchema).max(MATCH_LIMIT),
  /** adjacent = only related-skill matches; waitlist = nobody, offer the waitlist. Never a blank page. */
  fallback: z.enum(['adjacent', 'waitlist']).nullable(),
  /** The student's live request for this instrument, if any (avoid duplicate asks). */
  open_request_id: z.string().nullable(),
  waitlist_entry: waitlistEntrySchema.nullable(),
});

export const starterSchema = z.object({ id: z.string(), vars: z.record(z.string(), z.union([z.string(), z.number()])) });

export const studentRequestGroupsSchema = z.object({
  /** Reschedule to answer, or a finished chat to confirm / debrief. */
  needs_you: z.array(chatRequestSchema),
  upcoming: z.array(chatRequestSchema),
  /** Pending, or released and waitlisted ("still looking"). */
  waiting: z.array(chatRequestSchema),
  past: z.array(chatRequestSchema),
  waitlist: z.array(waitlistEntrySchema),
});

/** What a practitioner sees of a request: the frozen shared snapshot, never the live profile. */
export const practitionerRequestSchema = chatRequestSchema.extend({ student: sharedSnapshotSchema });

export const practitionerInboxSchema = z.object({
  pending: z.array(practitionerRequestSchema),
  waiting_on_student: z.array(practitionerRequestSchema),
  upcoming: z.array(practitionerRequestSchema),
  /** Past slots still missing your attendance confirmation. */
  confirm: z.array(practitionerRequestSchema),
  past: z.array(practitionerRequestSchema),
});

export const requestViewSchema = z.discriminatedUnion('viewer', [
  z.object({
    viewer: z.literal('student'),
    request: chatRequestSchema,
    practitioner: practitionerCardSchema.nullable(),
    events: z.array(chatEventSchema),
    /** Where this ask moved to, if released. */
    replacement: chatRequestSchema.nullable(),
    earlier: z.array(chatRequestSchema),
    blocked: z.boolean(),
    can_cancel: z.boolean(),
  }),
  z.object({
    viewer: z.literal('practitioner'),
    request: practitionerRequestSchema,
    events: z.array(chatEventSchema),
    /** Your own open slots, for "Suggest another time". */
    reschedule_slots: z.array(slotSchema),
    blocked: z.boolean(),
    can_cancel: z.boolean(),
  }),
]);

export const supplySchema = z.object({
  available: z.number().int(),
  verified: z.number().int(),
  byRole: z.array(z.object({ role_slug: z.string(), name: z.string(), count: z.number().int() })),
  byState: z.array(z.object({ state_id: z.string(), name: z.string(), count: z.number().int() })),
});

// ---------------------------------------------------------------- inputs

export const findCandidatesInput = z.object({
  instrument_slug: slug,
  filter: filterSpecSchema,
  decision_question: z.string().max(DECISION_MAX).optional(),
});

export const createRequestInput = z.object({
  instrument_slug: slug,
  filter: filterSpecSchema,
  signal: signalSchema.nullable(),
  decision_question: z.string().trim().min(DECISION_MIN).max(DECISION_MAX),
  practitioner_id: z.string().min(1),
  slot_id: z.string().min(1),
  starters: z.array(z.string().trim().min(1).max(STARTER_MAX)).min(1).max(3),
  shared_fields: z.array(studentField),
  agree_conduct: z.literal(true),
});

const as = z.enum(['student', 'practitioner']);

// ---------------------------------------------------------------- operations

export const chatOps = {
  getSupply: op({
    kind: 'read', access: 'public', input: noInput, output: supplySchema,
    does: 'Counts of available practitioners by role and state — no directory.',
    ui: '/people',
    tables: ['practitioner_cards'], fr: ['FR-C2'],
  }),
  findCandidates: op({
    kind: 'read', access: 'student', input: findCandidatesInput, output: matchResultSchema,
    does: 'Up to 3 practitioners who hold the skill (or related ones), each with reasons and open slots; else the waitlist fallback.',
    ui: '/chat/new step 1 (from "Talk to someone" on a detail page or signal)',
    tables: ['practitioner_cards', 'availability_slots', 'chat_requests', 'blocks', 'instrument_relations'], fr: ['FR-C1', 'FR-C2', 'FR-C3', 'FR-C6'],
    delta: 'Adds open_request_id and waitlist_entry (demo: openRequestFor / isWaitlisted selectors). Candidates carry the public card only.',
  }),
  generateStarters: op({
    kind: 'read', access: 'student',
    input: z.object({ instrument_slug: slug, signal: signalSchema.nullable(), decision_question: z.string(), practitioner_id: z.string(), adjacent_skill: z.string().nullable() }),
    output: z.array(starterSchema).length(3),
    does: 'Exactly three conversation starters from templates (signal, decision, practitioner topics). No LLM.',
    ui: '/chat/new review step (editable before sending)',
    tables: ['practitioner_cards'], fr: ['FR-C4'],
  }),
  createRequest: op({
    kind: 'action', access: 'student', input: createRequestInput, output: chatRequestSchema,
    does: 'Send the request: hold the slot, start the reply window (min(72h, slot − 12h)), freeze shared fields, email the practitioner.',
    ui: '/chat/new "Send request" (conduct checkbox required)',
    errors: ['not_found:instrumentNotFound', 'not_found:notFound', 'forbidden:studentPaused', 'rate_limited:rateLimited', 'conflict:candidateUnavailable', 'conflict:slotTaken'],
    tables: ['chat_requests', 'chat_request_events', 'availability_slots', 'notifications_outbox', 'waitlist_entries'], fr: ['FR-C5', 'FR-C11'],
    delta: 'Production stores shared_snapshot on the request (demo reads the live profile).',
  }),
  getStudentRequests: op({
    kind: 'read', access: 'student', input: noInput, output: studentRequestGroupsSchema,
    does: 'My requests grouped Needs you / Upcoming / Waiting / Past; superseded requests folded into their replacement. No decline counts.',
    ui: '/me/requests, /me',
    tables: ['chat_requests', 'waitlist_entries'], fr: ['FR-C7', 'FR-C8'],
  }),
  getRequest: op({
    kind: 'read', access: 'signed_in', input: idInput, output: requestViewSchema.nullable(),
    does: 'One request as the caller may see it (student or practitioner view); null when not theirs.',
    ui: '/chat/[id]',
    tables: ['chat_requests', 'chat_request_events', 'practitioner_cards', 'blocks'], fr: ['FR-C7', 'FR-C9'],
  }),
  getDebriefsFor: op({
    kind: 'read', access: 'student', input: z.object({ instrument_slug: slug }), output: z.array(chatRequestSchema),
    does: 'My past debriefs for an instrument (only I see them).',
    ui: 'Detail page "My notes"',
    tables: ['chat_requests'], fr: ['FR-R1'],
  }),
  acceptRequest: op({
    kind: 'action', access: 'practitioner', input: idInput, output: practitionerRequestSchema,
    does: 'One click: book the slot, share the meeting link, email the student (with .ics).',
    ui: '/chat/[id] practitioner "Accept"',
    errors: ['not_found:notFound', 'conflict:chatStateChanged'],
    tables: ['chat_requests', 'chat_request_events', 'availability_slots', 'notifications_outbox'], fr: ['FR-P5'],
  }),
  declineRequest: op({
    kind: 'action', access: 'practitioner', input: idInput, output: practitionerRequestSchema,
    does: 'Decline without a reason; frees the slot and silently re-matches the student.',
    ui: '/chat/[id] practitioner "Decline" (confirm dialog)',
    errors: ['not_found:notFound', 'conflict:chatStateChanged'],
    tables: ['chat_requests', 'chat_request_events', 'availability_slots', 'notifications_outbox'], fr: ['FR-P5', 'FR-C8'],
  }),
  proposeReschedule: op({
    kind: 'action', access: 'practitioner', input: z.object({ id: z.string().min(1), slot_id: z.string().min(1) }), output: practitionerRequestSchema,
    does: 'Offer another of your open slots (≥ 24h ahead); the student gets a new reply window.',
    ui: '/chat/[id] practitioner "Suggest another time" dialog',
    errors: ['not_found:notFound', 'conflict:slotTaken', 'conflict:chatStateChanged'],
    tables: ['chat_requests', 'chat_request_events', 'availability_slots', 'notifications_outbox'], fr: ['FR-P5'],
  }),
  acceptReschedule: op({
    kind: 'action', access: 'student', input: idInput, output: chatRequestSchema,
    does: 'Take the suggested time: accepted at the new slot.',
    ui: '/chat/[id] student "Take the new time"',
    errors: ['not_found:notFound', 'conflict:chatStateChanged'],
    tables: ['chat_requests', 'chat_request_events', 'availability_slots', 'notifications_outbox'], fr: ['FR-C9'],
  }),
  declineReschedule: op({
    kind: 'action', access: 'student', input: idInput, output: chatRequestSchema,
    does: 'Say no to the suggested time; the request closes and slots are freed.',
    ui: '/chat/[id] student "Doesn’t work for me"',
    errors: ['not_found:notFound', 'conflict:chatStateChanged'],
    tables: ['chat_requests', 'chat_request_events', 'availability_slots'], fr: ['FR-C9'],
  }),
  cancelRequest: op({
    kind: 'action', access: 'signed_in', input: z.object({ id: z.string().min(1), as }), output: chatRequestSchema,
    does: 'Cancel: student while pending / rescheduling; either side once accepted, up to 24h before. A practitioner cancel re-matches the student.',
    ui: '/chat/[id] "Cancel this chat" (both views)',
    errors: ['not_found:notFound', 'conflict:tooLateToCancel', 'conflict:chatStateChanged'],
    tables: ['chat_requests', 'chat_request_events', 'availability_slots', 'notifications_outbox'], fr: ['FR-C10'],
    delta: 'Production should email the other side (new template request_cancelled).',
  }),
  confirmAttendance: op({
    kind: 'action', access: 'signed_in', input: z.object({ id: z.string().min(1), as, attended: z.boolean() }), output: chatRequestSchema,
    does: '"It happened" or "they didn\'t come". Two no-shows in 30 days pause that person for 30 days.',
    ui: '/chat/[id] after the slot: practitioner "Yes, we talked" / "{name} didn’t come"; student "{name} didn’t come" (a student debrief vote counts as attended)',
    errors: ['not_found:notFound', 'conflict:tooEarlyToConfirm', 'conflict:chatStateChanged'],
    tables: ['chat_requests', 'chat_request_events', 'attendance_confirmations', 'reliability_records'], fr: ['FR-R2', 'FR-C10'],
  }),
  submitDebrief: op({
    kind: 'action', access: 'student', input: z.object({ id: z.string().min(1), vote: z.enum(['more_keen', 'no_change', 'less_keen']), note: z.string().trim().max(NOTE_MAX).default('') }), output: chatRequestSchema,
    does: 'One click: how keen am I now; also counts as my attendance.',
    ui: '/chat/[id] debrief buttons (also linked from the debrief_prompt email)',
    errors: ['not_found:notFound', 'conflict:tooEarlyToConfirm', 'conflict:chatStateChanged'],
    tables: ['chat_requests', 'debrief_votes'], fr: ['FR-R1'],
  }),
  joinWaitlist: op({
    kind: 'action', access: 'student', input: z.object({ instrument_slug: slug, filter: filterSpecSchema }), output: waitlistEntrySchema,
    does: 'Nobody free: email me when someone who fits joins.',
    ui: '/chat/new fallback "Join the waitlist"',
    errors: ['not_found:instrumentNotFound'],
    tables: ['waitlist_entries'], fr: ['FR-C6'],
  }),
  leaveWaitlist: op({
    kind: 'action', access: 'student', input: idInput, output: idOutput,
    does: 'Leave the waitlist for an instrument.',
    ui: '/me/requests waitlist row "Leave"',
    errors: ['not_found:notFound'],
    tables: ['waitlist_entries'], fr: ['FR-C6'],
  }),
} as const;
