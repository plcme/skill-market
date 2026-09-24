import { decodeFilter, DEFAULT_FILTER } from '@/lib/filters/spec';
import { detectSignal } from '@/lib/market/engine';
import type { FilterSpec } from '@/lib/market/types';
import { addDaysYmd, DAY, HOUR, zonedDay, zonedToUtc } from '@/lib/time';
import { emailWhen, expiresAtFor, instrumentName, newId, practitionerOf, SLOT_LENGTH_MS } from './chat-jobs';
import type { Actor, ChatEventKind, ChatRequest, ChatStatus, DemoDB, EmailTemplate, MatchReason, OutboxEmail, Slot, StudentField } from './types';

// Sample coffee-chat history for the preview's sample student: one upcoming
// Rust chat, one finished dbt chat waiting for a debrief (after an earlier ask
// lapsed and was quietly passed on), one completed SQL chat, one pending ask.

const iso = (ms: number) => new Date(ms).toISOString();
const SHARED: StudentField[] = ['university', 'degree', 'year', 'skills', 'watchlist'];

/** Most recent start of a practitioner's template window at least `minAgoMs` ago. */
function pastTemplateStart(d: DemoDB, practitionerId: string, now: number, minAgoMs: number): number {
  const p = practitionerOf(d, practitionerId);
  if (!p) return now - minAgoMs;
  const { ymd } = zonedDay(now, p.timezone);
  for (let i = 0; i < 21; i++) {
    const day = addDaysYmd(ymd, -i);
    const { weekday } = zonedDay(zonedToUtc(day, '12:00', p.timezone), p.timezone);
    for (const w of p.availability.filter(a => a.weekday === weekday)) {
      const start = zonedToUtc(day, w.start, p.timezone);
      if (start <= now - minAgoMs) return start;
    }
  }
  return now - minAgoMs;
}

function futureOpenSlot(d: DemoDB, practitionerId: string, notBefore: number): Slot | undefined {
  return d.slots.filter(s => s.practitioner_id === practitionerId && s.status === 'open' && Date.parse(s.start) >= notBefore).sort((a, b) => a.start.localeCompare(b.start))[0];
}

function slotAt(practitionerId: string, start: number): Slot {
  return { id: `${practitionerId}@${iso(start)}`, practitioner_id: practitionerId, start: iso(start), minutes: 20, status: 'booked' };
}

/** A booked slot in the past (kept by the slot job because it is not open). */
function pastSlot(d: DemoDB, practitionerId: string, start: number): Slot {
  const slot = slotAt(practitionerId, start);
  d.slots.push(slot);
  return slot;
}

interface Draft {
  practitioner_id: string;
  instrument_slug: string;
  filter: FilterSpec;
  question: string;
  starters: string[];
  reasons: MatchReason[];
  slot: Slot;
  created: number;
  status: ChatStatus;
  tried?: string[];
}

export function seedSampleChats(d: DemoDB, now: number): void {
  const studentId = d.session?.user_id;
  if (!studentId) return;
  // Start from a clean history for this student.
  const old = new Set(d.requests.filter(r => r.student_id === studentId).map(r => r.id));
  for (const r of d.requests.filter(r => old.has(r.id))) {
    for (const id of [r.slot_id, r.proposed_slot_id]) {
      const s = d.slots.find(x => x.id === id);
      if (s) s.status = 'open';
    }
  }
  d.requests = d.requests.filter(r => !old.has(r.id));
  d.events = d.events.filter(e => !old.has(e.request_id));
  d.outbox = d.outbox.filter(m => !m.request_id || !old.has(m.request_id));
  d.waitlist = [];

  const student = d.student?.display_name.split(' ')[0] ?? 'Sam';
  const make = (x: Draft): ChatRequest => {
    const req: ChatRequest = {
      id: newId('cr'),
      student_id: studentId,
      practitioner_id: x.practitioner_id,
      instrument_slug: x.instrument_slug,
      filter: x.filter,
      signal: detectSignal(x.instrument_slug, x.filter),
      decision_question: x.question,
      starters: x.starters,
      shared_fields: SHARED,
      slot_id: x.slot.id,
      slot_start: x.slot.start,
      proposed_slot_id: null,
      proposed_slot_start: null,
      status: x.status,
      match_reasons: x.reasons,
      tried_practitioner_ids: x.tried ?? [],
      replaced_by: null,
      meeting_link: null,
      created_at: iso(x.created),
      expires_at: expiresAtFor(x.created, Date.parse(x.slot.start)),
      updated_at: iso(x.created),
      attendance: { student: null, practitioner: null },
      debrief: null,
    };
    d.requests.push(req);
    return req;
  };
  const event = (req: ChatRequest, at: number, actor: Actor, kind: ChatEventKind, from: ChatStatus | null, to: ChatStatus | null) => {
    d.events.push({ id: newId('ev'), request_id: req.id, at: iso(at), actor, kind, from, to });
    if (at > Date.parse(req.updated_at)) req.updated_at = iso(at);
  };
  const mail = (req: ChatRequest | null, at: number, to: OutboxEmail['to'], template: EmailTemplate, vars: OutboxEmail['vars']) => {
    d.outbox.push({ id: newId('mail'), to, template, vars, at: iso(at), request_id: req?.id ?? null });
  };

  // 1. Completed SQL chat with Grace, twelve days ago, with a debrief.
  const graceStart = pastTemplateStart(d, 'p-grace', now, 11 * DAY);
  const grace = make({
    practitioner_id: 'p-grace', instrument_slug: 'sql', filter: DEFAULT_FILTER, created: graceStart - 5 * DAY, status: 'completed',
    slot: pastSlot(d, 'p-grace', graceStart),
    question: 'Is SQL enough to get a data analyst internship, or do I need Power BI and Python too before applying this summer?',
    starters: [
      'What does a normal week look like for you, and where does SQL come in?',
      'Would SQL alone have helped you get an internship, or is it something you learn on the job?',
      'How did SQL come up in interviews for roles like yours?',
    ],
    reasons: [
      { factor: 'holds_skill', vars: { kind: 'skill', name: 'SQL' } },
      { factor: 'entry_recent', vars: { years: 1 } },
      { factor: 'top_role', vars: { role: 'Data Analyst', skill: 'SQL' } },
      { factor: 'topic_overlap', vars: { topic: 'internships' } },
    ],
  });
  event(grace, graceStart - 5 * DAY, 'student', 'create', null, 'pending');
  mail(grace, graceStart - 5 * DAY, 'practitioner', 'request_received', { student, instrument: 'SQL' });
  event(grace, graceStart - 4.6 * DAY, 'practitioner', 'accept', 'pending', 'accepted');
  mail(grace, graceStart - 4.6 * DAY, 'student', 'request_accepted', { practitioner: 'Grace', when: emailWhen(iso(graceStart)) });
  grace.meeting_link = practitionerOf(d, 'p-grace')?.meeting_link ?? null;
  event(grace, graceStart - DAY, 'system', 'reminder_sent', 'accepted', 'accepted');
  event(grace, graceStart + 2 * HOUR, 'practitioner', 'confirm_attended', 'accepted', 'accepted');
  event(grace, graceStart + 3 * HOUR, 'student', 'confirm_attended', 'accepted', 'accepted');
  event(grace, graceStart + 3 * HOUR, 'system', 'complete', 'accepted', 'completed');
  grace.attendance = { student: 'attended', practitioner: 'attended' };
  grace.debrief = { vote: 'more_keen', note: 'Learn window functions properly before applying — that came up twice.', at: iso(graceStart + 3 * HOUR) };

  // 2. dbt: the first ask (Omar) lapsed after 72h and was passed to Chloe; the chat happened two days ago.
  const chloeStart = pastTemplateStart(d, 'p-chloe', now, 40 * HOUR);
  const dbtQuestion = 'I’m from a Commerce/IT double degree — is dbt worth learning now, or should I get better at Python first?';
  const dbtStarters = [
    'Ads mentioning dbt have been climbing. Does that match what you see at work?',
    'How did you learn dbt coming from outside a CS degree?',
    'What’s a small project I could build with dbt that would teach me the right things?',
  ];
  const lapsedCreated = chloeStart - 9 * DAY;
  const lapsed = make({
    practitioner_id: 'p-omar', instrument_slug: 'dbt', filter: DEFAULT_FILTER, created: lapsedCreated, status: 'expired',
    // The lapsed request's slot went back to Omar's calendar long ago, so it isn't stored.
    slot: slotAt('p-omar', lapsedCreated + 4 * DAY), question: dbtQuestion, starters: dbtStarters,
    reasons: [{ factor: 'holds_skill', vars: { kind: 'skill', name: 'dbt' } }, { factor: 'top_role', vars: { role: 'Data Engineer', skill: 'dbt' } }],
  });
  event(lapsed, lapsedCreated, 'student', 'create', null, 'pending');
  mail(lapsed, lapsedCreated, 'practitioner', 'request_received', { student, instrument: 'dbt' });
  const lapsedAt = Date.parse(lapsed.expires_at);
  event(lapsed, lapsedAt, 'system', 'expire', 'pending', 'expired');
  mail(lapsed, lapsedAt, 'student', 'request_still_looking', { instrument: 'dbt' });

  const chloe = make({
    practitioner_id: 'p-chloe', instrument_slug: 'dbt', filter: DEFAULT_FILTER, created: lapsedAt, status: 'accepted',
    slot: pastSlot(d, 'p-chloe', chloeStart), question: dbtQuestion, starters: dbtStarters, tried: ['p-omar'],
    reasons: [
      { factor: 'holds_skill', vars: { kind: 'skill', name: 'dbt' } },
      { factor: 'entry_recent', vars: { years: 2 } },
      { factor: 'top_role', vars: { role: 'Data Engineer', skill: 'dbt' } },
      { factor: 'topic_overlap', vars: { topic: 'switching_into_tech' } },
    ],
  });
  lapsed.replaced_by = chloe.id;
  event(lapsed, lapsedAt, 'system', 'replaced', 'expired', 'expired');
  event(chloe, lapsedAt, 'system', 'create', null, 'pending');
  mail(chloe, lapsedAt, 'practitioner', 'request_received', { student, instrument: 'dbt' });
  event(chloe, lapsedAt + 7 * HOUR, 'practitioner', 'accept', 'pending', 'accepted');
  mail(chloe, lapsedAt + 7 * HOUR, 'student', 'request_accepted', { practitioner: 'Chloe', when: emailWhen(chloe.slot_start) });
  chloe.meeting_link = practitionerOf(d, 'p-chloe')?.meeting_link ?? null;
  event(chloe, chloeStart - DAY, 'system', 'reminder_sent', 'accepted', 'accepted');
  mail(chloe, chloeStart - DAY, 'student', 'reminder_24h', { instrument: 'dbt' });
  mail(chloe, chloeStart - DAY, 'practitioner', 'reminder_24h', { instrument: 'dbt' });
  const promptAt = chloeStart + SLOT_LENGTH_MS + HOUR;
  event(chloe, promptAt, 'system', 'reminder_sent', 'accepted', 'accepted');
  mail(chloe, promptAt, 'student', 'debrief_prompt', { instrument: 'dbt' });
  mail(chloe, promptAt, 'practitioner', 'attendance_prompt', { student });
  event(chloe, promptAt + 2 * HOUR, 'practitioner', 'confirm_attended', 'accepted', 'accepted');
  chloe.attendance = { student: null, practitioner: 'attended' };

  // 3. Upcoming Rust chat with Arjun, accepted yesterday.
  const rustFilter = decodeFilter('ohr.au-nsw-sydney*r.au_entry_all');
  const arjunSlot = futureOpenSlot(d, 'p-arjun', now + 30 * HOUR);
  if (arjunSlot) {
    const created = Math.min(now - 30 * HOUR, Date.parse(arjunSlot.start) - 72 * HOUR);
    const rust = make({
      practitioner_id: 'p-arjun', instrument_slug: 'rust', filter: rustFilter, created, status: 'accepted', slot: arjunSlot,
      question: 'COMP3221 (Distributed Systems) or INFO3333 next semester — and is learning Rust on the side worth it for a systems grad role?',
      starters: [
        'Ads mentioning Rust in Sydney went up over the last 4 weeks. Does that match what you see at work?',
        'If you were choosing units again, would you spend a semester on distributed systems? What would you pair it with?',
        'What’s a small project I could build with Rust that would teach me the right things?',
      ],
      reasons: [
        { factor: 'holds_skill', vars: { kind: 'skill', name: 'Rust' } },
        { factor: 'entry_recent', vars: { years: 2 } },
        { factor: 'topic_overlap', vars: { topic: 'choosing_electives' } },
        { factor: 'same_state', vars: { place: 'Sydney CBD' } },
      ],
    });
    arjunSlot.status = 'booked';
    event(rust, created, 'student', 'create', null, 'pending');
    mail(rust, created, 'practitioner', 'request_received', { student, instrument: instrumentName('rust') });
    const acceptedAt = Math.min(created + 20 * HOUR, now - 2 * HOUR);
    event(rust, acceptedAt, 'practitioner', 'accept', 'pending', 'accepted');
    mail(rust, acceptedAt, 'student', 'request_accepted', { practitioner: 'Arjun', when: emailWhen(rust.slot_start) });
    rust.meeting_link = practitionerOf(d, 'p-arjun')?.meeting_link ?? null;
  }

  // 4. Pending data engineer ask with Omar, sent last night.
  const pendingCreated = now - 20 * HOUR;
  const omarSlot = futureOpenSlot(d, 'p-omar', pendingCreated + 60 * HOUR);
  if (omarSlot) {
    const req = make({
      practitioner_id: 'p-omar', instrument_slug: 'data-engineer', filter: decodeFilter('ohr.au-nsw_entry_all'), created: pendingCreated, status: 'pending', slot: omarSlot,
      question: 'Should I aim for a data engineering grad role straight away, or start as an analyst and move across?',
      starters: [
        'What would you tell someone aiming to become a Data Engineer next year?',
        'How much did the role you started in matter when you moved into data engineering?',
        'What did you wish you knew in your first 90 days?',
      ],
      reasons: [
        { factor: 'holds_skill', vars: { kind: 'role', name: 'Data Engineer' } },
        { factor: 'entry_recent', vars: { years: 5 } },
        { factor: 'topic_overlap', vars: { topic: 'first_90_days' } },
      ],
    });
    omarSlot.status = 'held';
    event(req, pendingCreated, 'student', 'create', null, 'pending');
    mail(req, pendingCreated, 'practitioner', 'request_received', { student, instrument: instrumentName('data-engineer') });
  }
  d.slots.sort((a, b) => a.start.localeCompare(b.start));
}
