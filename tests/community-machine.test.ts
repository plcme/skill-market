import { describe, expect, it } from 'vitest';
import { allowedEvents, isTerminal, practitionerStatus, studentStatus, transition, TRANSITIONS } from '@/lib/chat/machine';
import type { ChatStatus } from '@/lib/api/types';

describe('chat state machine (ARCHITECTURE §7.2)', () => {
  it('creates requests as pending', () => {
    expect(transition(null, 'create', 'student')).toEqual({ ok: true, to: 'pending' });
    expect(transition(null, 'create', 'practitioner')).toEqual({ ok: false, error: 'actor_not_allowed' });
  });

  it('lets only the practitioner accept, decline or propose a new time', () => {
    expect(transition('pending', 'accept', 'practitioner')).toEqual({ ok: true, to: 'accepted' });
    expect(transition('pending', 'decline', 'practitioner')).toEqual({ ok: true, to: 'declined' });
    expect(transition('pending', 'propose_reschedule', 'practitioner')).toEqual({ ok: true, to: 'reschedule_proposed' });
    for (const event of ['accept', 'decline', 'propose_reschedule'] as const) {
      expect(transition('pending', event, 'student')).toEqual({ ok: false, error: 'actor_not_allowed' });
      expect(transition('pending', event, 'system')).toEqual({ ok: false, error: 'actor_not_allowed' });
    }
  });

  it('expires pending requests only through the system', () => {
    expect(transition('pending', 'expire', 'system')).toEqual({ ok: true, to: 'expired' });
    expect(transition('pending', 'expire', 'practitioner').ok).toBe(false);
  });

  it('handles the reschedule branch', () => {
    expect(transition('reschedule_proposed', 'accept_reschedule', 'student')).toEqual({ ok: true, to: 'accepted' });
    expect(transition('reschedule_proposed', 'decline_reschedule', 'student')).toEqual({ ok: true, to: 'cancelled' });
    expect(transition('reschedule_proposed', 'expire', 'system')).toEqual({ ok: true, to: 'cancelled' });
    expect(transition('reschedule_proposed', 'accept_reschedule', 'practitioner').ok).toBe(false);
  });

  it('lets either side cancel an accepted chat, but only the student cancels a pending one', () => {
    expect(transition('accepted', 'cancel', 'student')).toEqual({ ok: true, to: 'cancelled' });
    expect(transition('accepted', 'cancel', 'practitioner')).toEqual({ ok: true, to: 'cancelled' });
    expect(transition('pending', 'cancel', 'student')).toEqual({ ok: true, to: 'cancelled' });
    expect(transition('pending', 'cancel', 'practitioner')).toEqual({ ok: false, error: 'actor_not_allowed' });
  });

  it('maps absence confirmations to the right no-show state', () => {
    expect(transition('accepted', 'confirm_absent', 'practitioner')).toEqual({ ok: true, to: 'no_show_student' });
    expect(transition('accepted', 'confirm_absent', 'student')).toEqual({ ok: true, to: 'no_show_practitioner' });
    expect(transition('accepted', 'confirm_attended', 'student')).toEqual({ ok: true, to: 'accepted' });
    expect(transition('accepted', 'complete', 'system')).toEqual({ ok: true, to: 'completed' });
    expect(transition('accepted', 'complete', 'student').ok).toBe(false);
  });

  it('rejects every move out of a terminal state', () => {
    const terminal: ChatStatus[] = ['declined', 'expired', 'cancelled', 'completed', 'no_show_student', 'no_show_practitioner'];
    const events = [...new Set(TRANSITIONS.map(r => r.event))];
    for (const status of terminal) {
      expect(isTerminal(status)).toBe(true);
      for (const event of events) {
        for (const actor of ['student', 'practitioner', 'system'] as const) {
          expect(transition(status, event, actor)).toEqual({ ok: false, error: 'invalid_transition' });
        }
      }
    }
  });

  it('lists allowed events per actor', () => {
    expect(allowedEvents('pending', 'practitioner').sort()).toEqual(['accept', 'decline', 'propose_reschedule']);
    expect(allowedEvents('pending', 'student')).toEqual(['cancel']);
    expect(allowedEvents('completed', 'student')).toEqual([]);
  });

  it('never tells students they were declined', () => {
    expect(studentStatus({ status: 'declined', replaced_by: null })).toBe('still_looking');
    expect(studentStatus({ status: 'expired', replaced_by: 'cr-2' })).toBe('still_looking');
    expect(studentStatus({ status: 'declined', replaced_by: null })).toBe(studentStatus({ status: 'expired', replaced_by: null }));
    // A practitioner pulling out of an accepted chat also reads as "still looking".
    expect(studentStatus({ status: 'cancelled', replaced_by: 'cr-3' })).toBe('still_looking');
    expect(studentStatus({ status: 'cancelled', replaced_by: null })).toBe('cancelled');
    expect(studentStatus({ status: 'reschedule_proposed', replaced_by: null })).toBe('new_time');
  });

  it('keeps precise labels on the practitioner side', () => {
    expect(practitionerStatus('pending')).toBe('needs_reply');
    expect(practitionerStatus('declined')).toBe('declined');
    expect(practitionerStatus('no_show_practitioner')).toBe('you_absent');
  });
});
