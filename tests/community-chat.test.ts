import { beforeEach, describe, expect, it } from 'vitest';
import { advanceClock as shiftClock, clockNow, getDB, loadSampleStudent, resetPreview, setPersona, transact } from '@/lib/demo/store';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import { findCandidates } from '@/lib/api/matching';
import {
  acceptRequest, acceptReschedule, cancelRequest, confirmAttendance, createRequest, declineRequest, joinWaitlist, proposeReschedule,
  selectPractitionerInbox, selectRequest, selectStudentRequests, submitDebrief,
} from '@/lib/api/chat';
import { setActingPractitioner } from '@/lib/api/practitioner';
import { blockUser, reportUser } from '@/lib/api/safety';
import { studentStatus } from '@/lib/chat/machine';
import { HOUR } from '@/lib/time';
import type { ChatRequest } from '@/lib/api/types';

/** advanceClock runs jobs at the old time; the next write catches up (as the UI's job tick does). */
function advanceClock(hours: number) {
  shiftClock(hours);
  transact(() => undefined);
}

const QUESTION = 'COMP3221 or INFO3333 next semester — is Rust worth it?';

function ok<T>(r: { ok: true; data: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.error)}`);
  return r.data;
}

async function sendRustRequest(practitionerId?: string): Promise<ChatRequest> {
  const d = getDB();
  const match = findCandidates({ instrument_slug: 'rust', filter: DEFAULT_FILTER, decision_question: QUESTION, student_id: d.session!.user_id }, d, clockNow());
  const c = practitionerId ? match.candidates.find(x => x.practitioner.id === practitionerId)! : match.candidates[0];
  return ok(await createRequest({
    instrument_slug: 'rust', filter: DEFAULT_FILTER, signal: null, decision_question: QUESTION, practitioner_id: c.practitioner.id,
    slot_id: c.slots[0].id, starters: ['One', 'Two', 'Three'], shared_fields: ['university', 'year'], agree_conduct: true,
  }));
}

async function asPractitioner(id: string) {
  setPersona('practitioner');
  ok(await setActingPractitioner(id));
}

beforeEach(() => {
  resetPreview();
  setPersona('student');
});

const find = (id: string) => getDB().requests.find(r => r.id === id)!;
const slot = (id: string | null) => getDB().slots.find(s => s.id === id);
const mails = (template: string) => getDB().outbox.filter(m => m.template === template);

describe('createRequest', () => {
  it('holds the slot, opens a 72h window, logs and emails', async () => {
    const req = await sendRustRequest('p-arjun');
    expect(req.status).toBe('pending');
    expect(slot(req.slot_id)?.status).toBe('held');
    expect(Date.parse(req.expires_at) - Date.parse(req.created_at)).toBeLessThanOrEqual(72 * HOUR);
    expect(getDB().events.filter(e => e.request_id === req.id).map(e => e.kind)).toEqual(['create']);
    expect(mails('request_received')).toHaveLength(1);
    expect(req.match_reasons[0].factor).toBe('holds_skill');
    expect(req.shared_fields).toEqual(['university', 'year']);
  });

  it('validates the decision question and the code of conduct', async () => {
    const r = await createRequest({
      instrument_slug: 'rust', filter: DEFAULT_FILTER, signal: null, decision_question: 'too short', practitioner_id: 'p-arjun',
      slot_id: 'x', starters: ['a'], shared_fields: [], agree_conduct: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.fields?.decision_question).toBeDefined();
  });

  it('refuses a slot that is not open', async () => {
    const first = await sendRustRequest('p-arjun');
    const r = await createRequest({
      instrument_slug: 'rust', filter: DEFAULT_FILTER, signal: null, decision_question: QUESTION, practitioner_id: 'p-daniel',
      slot_id: first.slot_id, starters: ['a'], shared_fields: [], agree_conduct: true,
    });
    expect(r).toMatchObject({ ok: false, error: { code: 'conflict', message: 'slotTaken' } });
  });

  it('requires the student persona', async () => {
    setPersona(null);
    const r = await createRequest({
      instrument_slug: 'rust', filter: DEFAULT_FILTER, signal: null, decision_question: QUESTION, practitioner_id: 'p-arjun',
      slot_id: 'x', starters: ['a'], shared_fields: [], agree_conduct: true,
    });
    expect(r).toMatchObject({ ok: false, error: { code: 'unauthenticated' } });
  });
});

describe('practitioner replies', () => {
  it('accept books the slot and shares the meeting link', async () => {
    const req = await sendRustRequest('p-arjun');
    await asPractitioner('p-arjun');
    const accepted = ok(await acceptRequest(req.id));
    expect(accepted.status).toBe('accepted');
    expect(slot(req.slot_id)?.status).toBe('booked');
    expect(accepted.meeting_link).toMatch(/^https:/);
    expect(mails('request_accepted')).toHaveLength(1);
    expect(selectPractitionerInbox(getDB(), 'p-arjun', clockNow()).upcoming.map(r => r.id)).toContain(req.id);
  });

  it('only the addressed practitioner may answer', async () => {
    const req = await sendRustRequest('p-arjun');
    await asPractitioner('p-daniel');
    expect(await acceptRequest(req.id)).toMatchObject({ ok: false, error: { code: 'not_found' } });
  });

  it('decline frees the slot and silently asks someone else', async () => {
    const req = await sendRustRequest('p-arjun');
    await asPractitioner('p-arjun');
    ok(await declineRequest(req.id));
    const old = find(req.id);
    expect(old.status).toBe('declined');
    expect(slot(req.slot_id)?.status).toBe('open');
    expect(old.replaced_by).not.toBeNull();
    const next = find(old.replaced_by!);
    expect(next.status).toBe('pending');
    expect(next.practitioner_id).not.toBe('p-arjun');
    expect(next.tried_practitioner_ids).toEqual(['p-arjun']);
    expect(next.decision_question).toBe(QUESTION);
    expect(mails('request_still_looking')).toHaveLength(1);
    expect(studentStatus(old)).toBe('still_looking');
    // The student's list shows only the live request.
    setPersona('student');
    const groups = selectStudentRequests(getDB(), clockNow());
    expect(groups.waiting.map(r => r.id)).toEqual([next.id]);
    expect(selectRequest(getDB(), req.id)?.replacement?.id).toBe(next.id);
  });

  it('reschedule moves the hold; the student can take the new time', async () => {
    const req = await sendRustRequest('p-arjun');
    await asPractitioner('p-arjun');
    const other = getDB().slots.find(s => s.practitioner_id === 'p-arjun' && s.status === 'open' && s.id !== req.slot_id && Date.parse(s.start) > clockNow() + 30 * HOUR)!;
    ok(await proposeReschedule({ id: req.id, slot_id: other.id }));
    expect(find(req.id).status).toBe('reschedule_proposed');
    expect(slot(req.slot_id)?.status).toBe('open');
    expect(slot(other.id)?.status).toBe('held');
    setPersona('student');
    ok(await acceptReschedule(req.id));
    const after = find(req.id);
    expect(after.status).toBe('accepted');
    expect(after.slot_id).toBe(other.id);
    expect(slot(other.id)?.status).toBe('booked');
  });
});

describe('scheduled jobs', () => {
  it('expires after the reply window and replaces the request', async () => {
    const req = await sendRustRequest('p-arjun');
    advanceClock(73);
    const old = find(req.id);
    expect(old.status).toBe('expired');
    expect(old.replaced_by).not.toBeNull();
    expect(find(old.replaced_by!).practitioner_id).not.toBe('p-arjun');
    expect(getDB().events.some(e => e.request_id === req.id && e.kind === 'expire' && e.actor === 'system')).toBe(true);
  });

  it('sends the 24h reminder once, then post-chat prompts once', async () => {
    const req = await sendRustRequest('p-arjun');
    await asPractitioner('p-arjun');
    ok(await acceptRequest(req.id));
    const hoursToSlot = (Date.parse(req.slot_start) - clockNow()) / HOUR;
    advanceClock(hoursToSlot - 12);
    advanceClock(1);
    expect(mails('reminder_24h')).toHaveLength(2);
    advanceClock(14);
    advanceClock(1);
    expect(mails('debrief_prompt')).toHaveLength(1);
    expect(mails('attendance_prompt')).toHaveLength(1);
  });

  it('auto-completes 7 days after one side confirmed', async () => {
    const req = await sendRustRequest('p-arjun');
    await asPractitioner('p-arjun');
    ok(await acceptRequest(req.id));
    advanceClock((Date.parse(req.slot_start) - clockNow()) / HOUR + 1);
    ok(await confirmAttendance({ id: req.id, as: 'practitioner', attended: true }));
    expect(find(req.id).status).toBe('accepted');
    advanceClock(7 * 24);
    expect(find(req.id).status).toBe('completed');
  });
});

describe('cancelling, attendance and debrief', () => {
  it('enforces 24h notice for accepted chats', async () => {
    const req = await sendRustRequest('p-arjun');
    await asPractitioner('p-arjun');
    ok(await acceptRequest(req.id));
    setPersona('student');
    advanceClock((Date.parse(req.slot_start) - clockNow()) / HOUR - 10);
    expect(await cancelRequest({ id: req.id, as: 'student' })).toMatchObject({ ok: false, error: { message: 'tooLateToCancel' } });
  });

  it('a pending request can be withdrawn and the slot goes back', async () => {
    const req = await sendRustRequest('p-arjun');
    ok(await cancelRequest({ id: req.id, as: 'student' }));
    expect(find(req.id).status).toBe('cancelled');
    expect(slot(req.slot_id)?.status).toBe('open');
  });

  it('one debrief click completes a chat the practitioner already confirmed', async () => {
    const req = await sendRustRequest('p-arjun');
    await asPractitioner('p-arjun');
    ok(await acceptRequest(req.id));
    advanceClock((Date.parse(req.slot_start) - clockNow()) / HOUR + 1);
    ok(await confirmAttendance({ id: req.id, as: 'practitioner', attended: true }));
    setPersona('student');
    const done = ok(await submitDebrief({ id: req.id, vote: 'more_keen', note: 'Worth a semester.' }));
    expect(done.status).toBe('completed');
    expect(done.debrief).toMatchObject({ vote: 'more_keen', note: 'Worth a semester.' });
    expect(done.attendance).toEqual({ student: 'attended', practitioner: 'attended' });
  });

  it('pauses a practitioner after two no-shows in 30 days', async () => {
    for (let i = 0; i < 2; i++) {
      setPersona('student');
      const req = await sendRustRequest('p-arjun');
      await asPractitioner('p-arjun');
      ok(await acceptRequest(req.id));
      advanceClock((Date.parse(req.slot_start) - clockNow()) / HOUR + 1);
      setPersona('student');
      ok(await confirmAttendance({ id: req.id, as: 'student', attended: false }));
      expect(find(req.id).status).toBe('no_show_practitioner');
    }
    const arjun = getDB().practitioners.find(p => p.id === 'p-arjun')!;
    expect(arjun.suspended_until).not.toBeNull();
    expect(Date.parse(arjun.suspended_until!)).toBeGreaterThan(clockNow() + 29 * 24 * HOUR);
  });
});

describe('waitlist, safety and the sample student', () => {
  it('joins the waitlist once per instrument', async () => {
    ok(await joinWaitlist({ instrument_slug: 'gcp', filter: DEFAULT_FILTER }));
    ok(await joinWaitlist({ instrument_slug: 'gcp', filter: DEFAULT_FILTER }));
    expect(getDB().waitlist).toHaveLength(1);
  });

  it('a practitioner block closes the request and reads as still looking', async () => {
    const req = await sendRustRequest('p-arjun');
    await asPractitioner('p-arjun');
    ok(await blockUser({ target_id: req.student_id }));
    expect(find(req.id).status).toBe('declined');
    setPersona('student');
    const again = findCandidates({ instrument_slug: 'rust', filter: DEFAULT_FILTER, student_id: req.student_id }, getDB(), clockNow());
    expect(again.candidates.map(c => c.practitioner.id)).not.toContain('p-arjun');
  });

  it('reports land in the admin queue', async () => {
    const r = ok(await reportUser({ target_kind: 'practitioner', target_id: 'p-arjun', request_id: null, reason: 'spam', details: '' }));
    expect(r.status).toBe('open');
    expect(await reportUser({ target_kind: 'practitioner', target_id: 'p-arjun', request_id: null, reason: 'other', details: 'x' })).toMatchObject({ ok: false });
  });

  it('seeds a consistent sample history', () => {
    loadSampleStudent();
    const d = getDB();
    const mine = d.requests.filter(r => r.student_id === d.session!.user_id);
    const statuses = mine.map(r => `${r.instrument_slug}:${r.status}`).sort();
    expect(statuses).toEqual(['data-engineer:pending', 'dbt:accepted', 'dbt:expired', 'rust:accepted', 'sql:completed']);
    for (const r of mine.filter(x => x.status === 'accepted' || x.status === 'pending')) {
      expect(d.slots.find(s => s.id === r.slot_id)?.status).toBe(r.status === 'pending' ? 'held' : 'booked');
      expect(d.events.some(e => e.request_id === r.id && e.kind === 'create')).toBe(true);
    }
    const groups = selectStudentRequests(d, clockNow());
    expect(groups.needs_you.map(r => r.instrument_slug)).toEqual(['dbt']);
    expect(groups.upcoming.map(r => r.instrument_slug)).toEqual(['rust']);
    expect(groups.waiting.map(r => r.instrument_slug)).toEqual(['data-engineer']);
    expect(groups.past.map(r => r.instrument_slug)).toEqual(['sql']);
    // Loading again replaces rather than duplicates.
    loadSampleStudent();
    expect(getDB().requests.filter(r => r.student_id === d.session!.user_id)).toHaveLength(5);
  });
});
