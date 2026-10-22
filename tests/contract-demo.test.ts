import { beforeEach, describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { CONTRACT, apiErrorSchema } from '@/lib/contract';
import { candidateSchema, practitionerInboxSchema, studentRequestGroupsSchema } from '@/lib/contract/chat';
import { chatEventSchema, chatRequestSchema, practitionerCardSchema, sessionSchema } from '@/lib/contract/entities';
import { BOARD_TYPES, BREAKDOWN_DIMENSIONS, METRIC_KEYS } from '@/lib/contract/market';
import { clockNow, getDB, resetPreview, setPersona } from '@/lib/demo/store';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import * as market from '@/lib/queries/market';
import { competencyLevels } from '@/lib/market/competencies';
import { DEGREES, searchUnits, UNIVERSITIES } from '@/lib/demo/education';
import { completeTier0, completeTier1, selectOnboarding, skipOnboarding } from '@/lib/api/onboarding';
import { addSkill, confirmSkill, selectSkillBoard } from '@/lib/api/skills';
import { addWatchlistItem, selectWatchlistGroups, updateWatchlistItem } from '@/lib/api/watchlist';
import { diagnoseGap } from '@/lib/api/gap';
import { requestExport, selectConsents, updateEmailPreferences, updateFieldVisibility, updateProfile } from '@/lib/api/privacy';
import { findCandidates, selectSupply } from '@/lib/api/matching';
import { generateStarters } from '@/lib/api/starters';
import { acceptRequest, createRequest, joinWaitlist, selectPractitionerInbox, selectRequest, selectStudentRequests } from '@/lib/api/chat';
import {
  joinAsPractitioner, selectActingPractitioner, selectDeskStats, selectPractitionerSlots, sendWorkEmailCode, setActingPractitioner,
} from '@/lib/api/practitioner';
import { blockUser, reportUser, selectMyBlocks } from '@/lib/api/safety';
import { rerunJob, selectAliases, selectFunnel, selectPipeline, selectReports, selectReviewQueue } from '@/lib/api/admin';

// The demo backend must already speak the contract: every output it returns
// parses against the contract's output schema. Where production deliberately
// differs (see each op's `delta`), the gap is listed as a todo at the end.

function conforms(schema: z.ZodType, value: unknown, label: string) {
  const r = schema.safeParse(value);
  expect(r.success, `${label}: ${r.success ? '' : JSON.stringify(r.error.issues.slice(0, 3))}`).toBe(true);
}

function data<T>(r: { ok: true; data: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.error)}`);
  return r.data;
}

const F = DEFAULT_FILTER;

/** The demo pipeline still seeds the pre-ATS job names. */
const DEMO_JOBS: Record<string, string> = { ingest_ads: 'poll_ats', ingest_official: 'ingest_jsa' };
const renameJob = <T extends { job: string }>(r: T): Omit<T, 'job'> & { job: string } => ({ ...r, job: DEMO_JOBS[r.job] ?? r.job });
const QUESTION = 'COMP3221 or INFO3333 next semester — is Rust worth it?';

beforeEach(() => resetPreview());

describe('market reads', () => {
  it('boards', () => {
    for (const type of BOARD_TYPES) {
      conforms(CONTRACT.getBoard.input, { type }, `getBoard input ${type}`);
      conforms(CONTRACT.getBoard.output, market.getBoard({ type, filter: F }), `getBoard ${type}`);
    }
    conforms(CONTRACT.getBoard.output, market.getBoard({ type: 'skill', filter: F, sort: 'change', layer: 'technology_tool' }), 'getBoard tools');
  });

  it('detail pages for every type, measure and split', () => {
    for (const slug of ['python', 'software-engineer', 'health-care']) {
      for (const metric of METRIC_KEYS) conforms(CONTRACT.getInstrumentDetail.output, market.getInstrumentDetail(slug, F, metric, null), `detail ${slug} ${metric}`);
      for (const by of BREAKDOWN_DIMENSIONS) conforms(CONTRACT.getInstrumentDetail.output, market.getInstrumentDetail(slug, F, undefined, by), `detail ${slug} by ${by}`);
    }
    expect(market.getInstrumentDetail('no-such-thing', F)).toBeNull();
   }, 60_000);

  it('everything else on public pages', () => {
    conforms(CONTRACT.getCoreCompetencies.output, competencyLevels('software-engineer'), 'competencies');
    conforms(CONTRACT.getComparison.output, market.getComparison('python', 'rust', F), 'comparison');
    conforms(CONTRACT.search.output, market.search('py'), 'search');
    conforms(CONTRACT.searchWithSnapshots.output, market.searchWithSnapshots('data', F), 'searchWithSnapshots');
    conforms(CONTRACT.getTape.output.shape.changes, market.getTape(16), 'tape changes');
    conforms(CONTRACT.getIndustryHeatmap.output, market.getIndustryHeatmap(F), 'heatmap');
    conforms(CONTRACT.getMovers.output, market.getMovers(F, 4), 'movers');
    conforms(CONTRACT.getMetricExamples.output, market.getMetricExamples('ad_count', F), 'metric examples');
    conforms(CONTRACT.getSources.output, market.getSources(), 'sources');
    conforms(CONTRACT.getSupply.output, selectSupply(getDB(), clockNow()), 'supply');
  });
});

describe('student desk', () => {
  it('onboarding, skills, watchlist, gap, settings', async () => {
    conforms(CONTRACT.getEducationOptions.output, { universities: UNIVERSITIES, degrees: DEGREES }, 'education');
    conforms(CONTRACT.searchUnits.output, searchUnits('usyd', 'info'), 'units');
    setPersona('student');
    conforms(CONTRACT.getSession.output, getDB().session, 'session');
    const tier0 = { university_id: 'usyd', degree_id: 'bach-adv-computing', year: '3' } as const;
    conforms(CONTRACT.completeTier0.input, tier0, 'tier0 input');
    conforms(CONTRACT.completeTier0.output, data(await completeTier0(tier0)), 'tier0');
    conforms(CONTRACT.completeTier1.output, data(await completeTier1({ unit_codes: ['INFO1110'] })), 'tier1');
    conforms(CONTRACT.skipOnboarding.output, data(await skipOnboarding({ tier: 'all' })), 'skip');
    conforms(CONTRACT.getOnboarding.output, selectOnboarding(getDB(), null), 'onboarding state');

    const suggestion = getDB().skills.find(s => s.source === 'inferred')!;
    conforms(CONTRACT.confirmSkill.output, data(await confirmSkill(suggestion.id)), 'confirmSkill');
    conforms(CONTRACT.addSkill.output, data(await addSkill({ skill_slug: 'rust' })), 'addSkill');
    conforms(CONTRACT.getSkillBoard.output, selectSkillBoard(getDB()), 'skill board');

    const item = data(await addWatchlistItem({ instrument_slug: 'python', status: 'held', filter: F }));
    conforms(CONTRACT.addWatchlistItem.output, item, 'addWatchlistItem');
    conforms(CONTRACT.updateWatchlistItem.output, data(await updateWatchlistItem({ id: item.id, status: 'watching' })), 'updateWatchlistItem');
    conforms(CONTRACT.addWatchlistItem.output, data(await addWatchlistItem({ instrument_slug: 'software-engineer', status: 'held', filter: F })), 'held role');
    await addWatchlistItem({ instrument_slug: 'health-care', status: 'watching', filter: F });
    conforms(CONTRACT.getWatchlist.output, selectWatchlistGroups(getDB()), 'watchlist');
    const dup = await addWatchlistItem({ instrument_slug: 'python', status: 'held', filter: F });
    expect(dup.ok).toBe(false);
    if (!dup.ok) conforms(apiErrorSchema, dup.error, 'error shape');

    conforms(CONTRACT.diagnoseGap.output, diagnoseGap('software-engineer', getDB().skills, F, 'usyd'), 'gap');
    conforms(CONTRACT.updateProfile.output, data(await updateProfile({ display_name: 'Sam', university_id: 'usyd', degree_id: 'bach-adv-computing', year: '3', visa_status: null })), 'profile');
    conforms(CONTRACT.updateFieldVisibility.output, data(await updateFieldVisibility({ field: 'skills', visibility: 'matched_practitioner' })), 'visibility');
    conforms(CONTRACT.updateEmailPreferences.output, data(await updateEmailPreferences({ digest: 'off' })), 'email prefs');
    conforms(CONTRACT.getConsents.output, selectConsents(getDB()), 'consents');
    conforms(CONTRACT.getProfile.output, getDB().student, 'getProfile');
    conforms(CONTRACT.requestExport.output, data(await requestExport()), 'export');
  });
});

describe('coffee chats', () => {
  it('matching, request, practitioner accept, safety', async () => {
    setPersona('student');
    const student = getDB().session!.user_id;
    const match = findCandidates({ instrument_slug: 'rust', filter: F, decision_question: QUESTION, student_id: student }, getDB(), clockNow());
    expect(match.candidates.length).toBeGreaterThan(0);
    for (const c of match.candidates) conforms(candidateSchema, c, 'candidate');
    const c = match.candidates[0];
    conforms(CONTRACT.generateStarters.output, generateStarters({ instrument_slug: 'rust', signal: null, decision_question: QUESTION, practitioner: c.practitioner, adjacent_skill: c.adjacent_skill }), 'starters');

    const input = {
      instrument_slug: 'rust', filter: F, signal: null, decision_question: QUESTION, practitioner_id: c.practitioner.id,
      slot_id: c.slots[0].id, starters: ['One', 'Two', 'Three'], shared_fields: ['university' as const, 'year' as const], agree_conduct: true as const,
    };
    conforms(CONTRACT.createRequest.input, input, 'createRequest input');
    const req = data(await createRequest(input));
    conforms(CONTRACT.createRequest.output, req, 'createRequest');
    conforms(studentRequestGroupsSchema.omit({ waitlist: true }), selectStudentRequests(getDB(), clockNow()), 'student requests');
    const view = selectRequest(getDB(), req.id)!;
    conforms(chatRequestSchema, view.request, 'student view request');
    conforms(practitionerCardSchema, view.practitioner, 'student view practitioner');
    for (const e of view.events) conforms(chatEventSchema, e, 'event');
    conforms(CONTRACT.joinWaitlist.output, data(await joinWaitlist({ instrument_slug: 'sql', filter: F })), 'waitlist');
    conforms(CONTRACT.reportUser.output, data(await reportUser({ target_kind: 'practitioner', target_id: c.practitioner.id, request_id: req.id, reason: 'spam', details: '' })), 'report');

    setPersona('practitioner');
    data(await setActingPractitioner(c.practitioner.id));
    conforms(chatRequestSchema, data(await acceptRequest(req.id)), 'acceptRequest');
    const me = selectActingPractitioner(getDB())!;
    conforms(CONTRACT.joinAsPractitioner.output, me, 'practitioner self');
    const inbox = selectPractitionerInbox(getDB(), me.id, clockNow());
    for (const group of Object.keys(practitionerInboxSchema.shape) as (keyof typeof inbox)[]) for (const r of inbox[group]) conforms(chatRequestSchema, r, `inbox ${group}`);
    const { deskStatsSchema } = await import('@/lib/contract/practitioner');
    conforms(deskStatsSchema, selectDeskStats(getDB(), me, clockNow()), 'desk stats');
    conforms(CONTRACT.getDesk.output.shape.slots, selectPractitionerSlots(getDB(), me.id, clockNow()), 'desk slots');
    conforms(CONTRACT.blockUser.output, data(await blockUser({ target_id: student })), 'block');
    conforms(CONTRACT.getMyBlocks.output, selectMyBlocks(getDB()), 'blocks');
  });

  it('practitioner join', async () => {
    setPersona('student');
    conforms(CONTRACT.joinAsPractitioner.output, data(await joinAsPractitioner({ agree_18: true, agree_conduct: true })), 'join');
    conforms(CONTRACT.sendWorkEmailCode.output, data(await sendWorkEmailCode({ email: 'me@atlassian.example' })), 'send code');
  });
});

describe('admin', () => {
  it('back office reads and actions', async () => {
    setPersona('admin');
    conforms(CONTRACT.getReports.output, selectReports(getDB()), 'reports');
    conforms(CONTRACT.getReviewQueue.output, selectReviewQueue(getDB()), 'review queue');
    const pipeline = selectPipeline(getDB()).map(row => ({
      ...renameJob(row), last: row.last && renameJob(row.last), lastSuccess: row.lastSuccess && renameJob(row.lastSuccess), runs: row.runs.map(renameJob),
    }));
    conforms(CONTRACT.getPipeline.output, pipeline, 'pipeline');
    conforms(CONTRACT.getFunnel.output, selectFunnel(getDB(), clockNow()), 'funnel');
    conforms(CONTRACT.getAliases.output, selectAliases(getDB()), 'aliases');
    conforms(CONTRACT.rerunJob.output, data(await rerunJob('compute_metrics')), 'rerun');
    conforms(sessionSchema, getDB().session, 'admin session');
  });
});

describe('known gaps the demo closes when pages move to the contract', () => {
  it.todo('getBoard, getIndustryHeatmap, getMovers and getMetricExamples drop the filter argument (national scope only)');
  it.todo('as_of is the compute-metrics finish timestamp, not a date');
  it.todo('snapshots, heat tiles and movers carry coverage; snapshots and tape changes carry new_today; board and detail carry polled_at');
  it.todo('the pipeline uses the production job names (poll_ats … compute_coverage), not ingest_ads / ingest_official');
  it.todo('getTape returns { changes, events, as_of, polled_at } with intraday posting events');
  it.todo('practitioner views carry the frozen shared snapshot (practitionerRequestSchema.student), not the live student profile');
  it.todo('findCandidates returns open_request_id and waitlist_entry');
  it.todo('getStudentRequests includes the waitlist');
  it.todo('getRequest returns blocked / can_cancel / reschedule_slots');
  it.todo('setUiMode, setPaused, updateCap, rerunJob take object inputs');
  it.todo('requestMagicLink stops returning the token outside the preview');
  it.todo('switchPersona replaces the preview setPersona');
  it.todo('cancelRequest emails the other side (request_cancelled)');
});
