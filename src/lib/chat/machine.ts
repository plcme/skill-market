import type { Actor, ChatEventKind, ChatRequest, ChatStatus } from '@/lib/api/types';

// Chat request state machine (ARCHITECTURE §7.2). Pure: the production
// equivalent is the SQL function `transition_chat_request(request_id, event, actor)`.
// Time rules (24h cancellation, slot has ended) are checked by the actions.

/** Events that move a request between states. `reminder_sent` / `replaced` are log-only. */
export type TransitionEvent = Exclude<ChatEventKind, 'reminder_sent' | 'replaced'>;

interface Rule {
  from: ChatStatus | null;
  event: TransitionEvent;
  actors: readonly Actor[];
  to: ChatStatus;
}

/** The full transition table. Anything not listed is rejected. */
export const TRANSITIONS: readonly Rule[] = [
  { from: null, event: 'create', actors: ['student', 'system'], to: 'pending' },
  { from: 'pending', event: 'accept', actors: ['practitioner'], to: 'accepted' },
  { from: 'pending', event: 'decline', actors: ['practitioner'], to: 'declined' },
  { from: 'pending', event: 'propose_reschedule', actors: ['practitioner'], to: 'reschedule_proposed' },
  { from: 'pending', event: 'expire', actors: ['system'], to: 'expired' },
  { from: 'pending', event: 'cancel', actors: ['student'], to: 'cancelled' },
  { from: 'reschedule_proposed', event: 'accept_reschedule', actors: ['student'], to: 'accepted' },
  { from: 'reschedule_proposed', event: 'decline_reschedule', actors: ['student'], to: 'cancelled' },
  { from: 'reschedule_proposed', event: 'expire', actors: ['system'], to: 'cancelled' },
  { from: 'reschedule_proposed', event: 'cancel', actors: ['student'], to: 'cancelled' },
  // Attendance: confirming "it happened" keeps the request accepted until the
  // other side confirms (or stays silent for 7 days) — then the system completes it.
  { from: 'accepted', event: 'confirm_attended', actors: ['student', 'practitioner'], to: 'accepted' },
  { from: 'accepted', event: 'complete', actors: ['system'], to: 'completed' },
  { from: 'accepted', event: 'confirm_absent', actors: ['practitioner'], to: 'no_show_student' },
  { from: 'accepted', event: 'confirm_absent', actors: ['student'], to: 'no_show_practitioner' },
  { from: 'accepted', event: 'cancel', actors: ['student', 'practitioner'], to: 'cancelled' },
];

export const TERMINAL: readonly ChatStatus[] = ['declined', 'expired', 'cancelled', 'completed', 'no_show_student', 'no_show_practitioner'];

export type TransitionError = 'invalid_transition' | 'actor_not_allowed';
export type TransitionResult = { ok: true; to: ChatStatus } | { ok: false; error: TransitionError };

/** `transition(status, event, actor)` → next status, or why the move is not allowed. */
export function transition(status: ChatStatus | null, event: TransitionEvent, actor: Actor): TransitionResult {
  const rules = TRANSITIONS.filter(r => r.from === status && r.event === event);
  if (!rules.length) return { ok: false, error: 'invalid_transition' };
  const rule = rules.find(r => r.actors.includes(actor));
  return rule ? { ok: true, to: rule.to } : { ok: false, error: 'actor_not_allowed' };
}

/** Events the given actor may fire from a status (drives which buttons show). */
export function allowedEvents(status: ChatStatus, actor: Actor): TransitionEvent[] {
  return [...new Set(TRANSITIONS.filter(r => r.from === status && r.actors.includes(actor)).map(r => r.event))];
}

export function isTerminal(status: ChatStatus): boolean {
  return TERMINAL.includes(status);
}

/**
 * What the student sees. Declines, timeouts and practitioner cancellations all read
 * as "still looking" (FR-C7/C8) — the UI never says who declined or why.
 */
export type StudentStatus = 'waiting' | 'new_time' | 'confirmed' | 'still_looking' | 'cancelled' | 'done' | 'missed' | 'did_not_happen';

export function studentStatus(req: Pick<ChatRequest, 'status' | 'replaced_by'>): StudentStatus {
  switch (req.status) {
    case 'pending':
      return 'waiting';
    case 'reschedule_proposed':
      return 'new_time';
    case 'accepted':
      return 'confirmed';
    case 'declined':
    case 'expired':
      return 'still_looking';
    case 'cancelled':
      return req.replaced_by ? 'still_looking' : 'cancelled';
    case 'completed':
      return 'done';
    case 'no_show_student':
      return 'missed';
    case 'no_show_practitioner':
      return 'did_not_happen';
  }
}

/** Practitioner-side label set (they can see their own declines). */
export type PractitionerStatus = 'needs_reply' | 'waiting_on_student' | 'upcoming' | 'declined' | 'lapsed' | 'cancelled' | 'done' | 'student_absent' | 'you_absent';

export function practitionerStatus(status: ChatStatus): PractitionerStatus {
  switch (status) {
    case 'pending':
      return 'needs_reply';
    case 'reschedule_proposed':
      return 'waiting_on_student';
    case 'accepted':
      return 'upcoming';
    case 'declined':
      return 'declined';
    case 'expired':
      return 'lapsed';
    case 'cancelled':
      return 'cancelled';
    case 'completed':
      return 'done';
    case 'no_show_student':
      return 'student_absent';
    case 'no_show_practitioner':
      return 'you_absent';
  }
}
