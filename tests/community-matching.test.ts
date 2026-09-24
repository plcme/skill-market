import { describe, expect, it } from 'vitest';
import { createSeed } from '@/lib/demo/store';
import { decodeFilter, DEFAULT_FILTER } from '@/lib/filters/spec';
import {
  acceptedThisMonth, findCandidates, ineligibility, MIN_SLOT_LEAD_MS, practitionerBlockId, SCORE, selectSupply, topicsForQuestion,
} from '@/lib/api/matching';
import { generateStarters, STARTER_COUNT } from '@/lib/api/starters';
import type { ChatRequest, DemoDB } from '@/lib/api/types';

const NOW = Date.parse('2026-09-24T00:00:00Z');
const SYDNEY = decodeFilter('ohr.au-nsw-sydney_all_all');
const STUDENT = 'u-student';

function db(): DemoDB {
  return createSeed(NOW);
}

function acceptedFor(d: DemoDB, practitionerId: string, n: number) {
  for (let i = 0; i < n; i++) {
    d.requests.push({
      id: `cr-${practitionerId}-${i}`, student_id: `u-other-${i}`, practitioner_id: practitionerId, instrument_slug: 'rust', filter: DEFAULT_FILTER,
      signal: null, decision_question: 'x'.repeat(20), starters: [], shared_fields: [], slot_id: `s-${i}`, slot_start: new Date(NOW + 2 * 86_400_000).toISOString(),
      proposed_slot_id: null, proposed_slot_start: null, status: 'accepted', match_reasons: [], tried_practitioner_ids: [], replaced_by: null, meeting_link: null,
      created_at: new Date(NOW).toISOString(), expires_at: new Date(NOW).toISOString(), updated_at: new Date(NOW).toISOString(),
      attendance: { student: null, practitioner: null }, debrief: null,
    } satisfies ChatRequest);
  }
}

const ids = (r: ReturnType<typeof findCandidates>) => r.candidates.map(c => c.practitioner.id);

describe('findCandidates (ARCHITECTURE §7.1)', () => {
  it('returns at most three people and puts direct skill holders first', () => {
    const r = findCandidates({ instrument_slug: 'rust', filter: DEFAULT_FILTER, student_id: STUDENT }, db(), NOW);
    expect(r.candidates.length).toBeLessThanOrEqual(3);
    expect(ids(r).slice(0, 2).sort()).toEqual(['p-arjun', 'p-daniel']);
    expect(r.fallback).toBeNull();
    for (const c of r.candidates.slice(0, 2)) {
      expect(c.reasons[0]).toEqual({ factor: 'holds_skill', vars: { kind: 'skill', name: 'Rust' } });
      expect(c.adjacent_skill).toBeNull();
      expect(c.slots.every(s => Date.parse(s.start) >= NOW + MIN_SLOT_LEAD_MS && s.status === 'open')).toBe(true);
    }
  });

  it('tops up with related-skill practitioners, labelled as such', () => {
    const r = findCandidates({ instrument_slug: 'rust', filter: DEFAULT_FILTER }, db(), NOW);
    const third = r.candidates[2];
    if (third) {
      expect(third.adjacent_skill).not.toBeNull();
      expect(third.reasons[0].factor).toBe('adjacent_skill');
    }
  });

  it('scores recency, topics and location with explainable reasons', () => {
    const r = findCandidates({ instrument_slug: 'rust', filter: SYDNEY, decision_question: 'COMP3221 vs INFO3333 next semester?', student_id: STUDENT }, db(), NOW);
    const arjun = r.candidates.find(c => c.practitioner.id === 'p-arjun');
    const daniel = r.candidates.find(c => c.practitioner.id === 'p-daniel');
    expect(arjun?.reasons.map(x => x.factor)).toEqual(['holds_skill', 'entry_recent', 'topic_overlap', 'same_state']);
    expect(arjun?.reasons.find(x => x.factor === 'topic_overlap')?.vars.topic).toBe('choosing_electives');
    expect(arjun?.score).toBe(SCORE.holds_skill + SCORE.entry_1_3 + SCORE.topic_overlap + SCORE.same_state);
    expect(daniel?.reasons.map(x => x.factor)).toEqual(['holds_skill', 'entry_recent', 'same_state']);
    expect(ids(r)[0]).toBe('p-arjun');
  });

  it('balances load: −5 per chat accepted this month', () => {
    const d = db();
    acceptedFor(d, 'p-arjun', 1);
    expect(acceptedThisMonth(d, d.practitioners.find(p => p.id === 'p-arjun')!, NOW)).toBe(1);
    const r = findCandidates({ instrument_slug: 'rust', filter: SYDNEY, student_id: STUDENT }, d, NOW);
    const arjun = r.candidates.find(c => c.practitioner.id === 'p-arjun');
    const daniel = r.candidates.find(c => c.practitioner.id === 'p-daniel');
    expect(arjun!.score).toBe(daniel!.score + SCORE.per_accepted_this_month);
    expect(ids(r)[0]).toBe('p-daniel');
  });

  it('applies the hard filters', () => {
    const d = db();
    const arjun = d.practitioners.find(p => p.id === 'p-arjun')!;
    expect(ineligibility(d, arjun, NOW, { student_id: STUDENT })).toBeNull();

    arjun.paused = true;
    expect(ineligibility(d, arjun, NOW)).toBe('paused');
    arjun.paused = false;

    arjun.suspended_until = new Date(NOW + 86_400_000).toISOString();
    expect(ineligibility(d, arjun, NOW)).toBe('suspended');
    arjun.suspended_until = new Date(NOW - 1).toISOString();
    expect(ineligibility(d, arjun, NOW)).toBeNull();

    arjun.verification = 'manual_review';
    expect(ineligibility(d, arjun, NOW)).toBe('unverified');
    arjun.verification = 'verified';

    acceptedFor(d, 'p-arjun', arjun.monthly_cap);
    expect(ineligibility(d, arjun, NOW)).toBe('at_cap');
    d.requests = [];

    const saved = d.slots;
    d.slots = d.slots.filter(s => s.practitioner_id !== 'p-arjun' || Date.parse(s.start) < NOW + MIN_SLOT_LEAD_MS);
    expect(ineligibility(d, arjun, NOW)).toBe('no_slots');
    d.slots = saved;

    expect(ineligibility(d, arjun, NOW, { exclude_ids: ['p-arjun'] })).toBe('excluded');
  });

  it('never matches people blocked in either direction', () => {
    const d = db();
    d.blocks.push({ id: 'blk-1', blocker: 'student', target_id: 'p-arjun', created_at: new Date(NOW).toISOString() });
    expect(ids(findCandidates({ instrument_slug: 'rust', filter: DEFAULT_FILTER, student_id: STUDENT }, d, NOW))).not.toContain('p-arjun');
    const d2 = db();
    d2.blocks.push({ id: practitionerBlockId('p-daniel', 'x1'), blocker: 'practitioner', target_id: STUDENT, created_at: new Date(NOW).toISOString() });
    const r2 = findCandidates({ instrument_slug: 'rust', filter: DEFAULT_FILTER, student_id: STUDENT }, d2, NOW);
    expect(ids(r2)).toContain('p-arjun');
    expect(ids(r2)).not.toContain('p-daniel');
    // Another student is unaffected by that block.
    expect(ids(findCandidates({ instrument_slug: 'rust', filter: DEFAULT_FILTER, student_id: 'u-else' }, d2, NOW))).toContain('p-daniel');
  });

  it('matches roles by current role or by ≥ 2 top component skills', () => {
    const r = findCandidates({ instrument_slug: 'data-engineer', filter: DEFAULT_FILTER }, db(), NOW);
    expect(r.candidates).toHaveLength(3);
    const kinds = r.candidates.map(c => c.reasons[0].vars.kind);
    expect(kinds).toContain('role');
    for (const c of r.candidates) expect(['role', 'components']).toContain(c.reasons[0].vars.kind);
  });

  it('falls back to related skills when nobody holds the skill', () => {
    const r = findCandidates({ instrument_slug: 'gcp', filter: DEFAULT_FILTER }, db(), NOW);
    expect(r.fallback).toBe('adjacent');
    expect(r.candidates.length).toBeGreaterThan(0);
    for (const c of r.candidates) {
      expect(c.adjacent_skill).not.toBeNull();
      expect(c.reasons[0]).toMatchObject({ factor: 'adjacent_skill', vars: { original: 'Google Cloud' } });
    }
  });

  it('offers the waitlist when nobody is free', () => {
    const d = db();
    for (const p of d.practitioners) p.paused = true;
    expect(findCandidates({ instrument_slug: 'rust', filter: DEFAULT_FILTER }, d, NOW)).toEqual({ candidates: [], fallback: 'waitlist' });
    expect(selectSupply(d, NOW).available).toBe(0);
  });

  it('is deterministic', () => {
    const a = findCandidates({ instrument_slug: 'python', filter: SYDNEY, decision_question: 'grad programs or internships?' }, db(), NOW);
    const b = findCandidates({ instrument_slug: 'python', filter: SYDNEY, decision_question: 'grad programs or internships?' }, db(), NOW);
    expect(ids(a)).toEqual(ids(b));
    expect(a.candidates.map(c => c.reasons)).toEqual(b.candidates.map(c => c.reasons));
  });

  it('summarises supply without exposing a directory', () => {
    const s = selectSupply(db(), NOW);
    expect(s.verified).toBe(13);
    expect(s.available).toBe(12); // Sofia is paused; Ngaio is not verified.
    expect(s.byRole.reduce((n, r) => n + r.count, 0)).toBe(s.available);
  });
});

describe('topicsForQuestion', () => {
  it('reads plain-language topics from a decision question', () => {
    expect(topicsForQuestion('COMP3xxx vs INFO3xxx next semester')).toEqual(['choosing_electives']);
    expect(topicsForQuestion('Will my 485 visa matter for grad programs?')).toEqual(['grad_programs', 'visa_work_rights']);
    expect(topicsForQuestion('Should I build a side project for my portfolio?')).toEqual(['side_projects', 'portfolio']);
    expect(topicsForQuestion('')).toEqual([]);
  });
});

describe('generateStarters (FR-C4)', () => {
  const arjun = { topics: ['choosing_electives', 'side_projects', 'first_90_days', 'day_to_day'], skills: ['rust'] };

  it('always returns exactly three distinct starters', () => {
    const picks = generateStarters({ instrument_slug: 'rust', signal: { kind: 'rise', from: 120, to: 166 }, decision_question: 'COMP3221 vs INFO3333 next semester?', practitioner: arjun });
    expect(picks).toHaveLength(STARTER_COUNT);
    expect(new Set(picks.map(p => p.id)).size).toBe(3);
    expect(picks[0]).toEqual({ id: 'signal_rise', vars: { instrument: 'Rust', from: 120, to: 166 } });
    expect(picks[1].id).toBe('choosing_electives');
    expect(picks[2].id).toBe('side_projects');
  });

  it('uses the decision question when no topic matches', () => {
    const picks = generateStarters({ instrument_slug: 'rust', signal: null, decision_question: 'Honestly not sure what to ask here yet.', practitioner: { topics: [], skills: [] } });
    expect(picks.map(p => p.id)).toEqual(['no_signal', 'decision', 'day_to_day']);
    expect(picks[1].vars.question).toBe('Honestly not sure what to ask here yet');
  });

  it('leads with the related skill for adjacent matches, and with the path for roles', () => {
    expect(generateStarters({ instrument_slug: 'gcp', signal: null, decision_question: '', practitioner: arjun, adjacent_skill: 'aws' })[0]).toEqual({ id: 'adjacent', vars: { instrument: 'Google Cloud', adjacent: 'AWS' } });
    expect(generateStarters({ instrument_slug: 'data-engineer', signal: null, decision_question: '', practitioner: arjun })[0].id).toBe('role_path');
  });

  it('is deterministic', () => {
    const ctx = { instrument_slug: 'sql', signal: { kind: 'entry_open' as const, from: 0.1, to: 0.2 }, decision_question: 'Which internship applications first?', practitioner: arjun };
    expect(generateStarters(ctx)).toEqual(generateStarters(ctx));
  });
});
