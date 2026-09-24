'use client';

import { z } from 'zod';
import { getInstrument, INSTRUMENTS, normaliseQuery } from '@/lib/market/catalog';
import { transact } from '@/lib/demo/store';
import { DAY, HOUR } from '@/lib/time';
import { fail, guard, latency, ok } from './client';
import { newId, notifyWaitlist, practitionerOf } from './chat-jobs';
import { selectSupply } from './matching';
import type { PractitionerRecord } from './practitioner';
import type { AliasOverride, DemoDB, PipelineRun, Practitioner, Report, Result } from './types';

// Admin domain (FR-X1–X5), all behind `is_admin()`. Server Actions:
// resolveReport, suspendUser, approvePractitioner, rejectPractitioner,
// rerunJob, upsertAlias, removeAlias. Reads: selectReports, selectReviewQueue,
// selectPipeline, selectFunnel, selectAliases.

export const SUSPEND_DAYS = 30;
/** Below this many observations a rate is shown with a small-number warning. */
export const SMALL_N = 10;

const adminDenied = (d: DemoDB) => guard(d, 'admin') ?? (d.session?.active !== 'admin' ? { code: 'forbidden' as const, message: 'forbidden' } : null);

// ------------------------------------------------------------------ reports

export const resolveInput = z.object({
  id: z.string().min(1),
  status: z.enum(['resolved', 'dismissed']),
  resolution: z.string().trim().min(3).max(500),
});

/** Close a report with a note (FR-X1). */
export async function resolveReport(input: z.infer<typeof resolveInput>): Promise<Result<Report>> {
  await latency();
  const parsed = resolveInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation', { resolution: 'resolution' });
  return transact(d => {
    const denied = adminDenied(d);
    if (denied) return { ok: false, error: denied };
    const report = d.reports.find(r => r.id === parsed.data.id);
    if (!report) return fail('not_found', 'notFound');
    report.status = parsed.data.status;
    report.resolution = parsed.data.resolution;
    return ok(report);
  });
}

export const suspendInput = z.object({ practitioner_id: z.string().min(1), report_id: z.string().nullable() });

/** Pause a practitioner from matching for 30 days (FR-X1). */
export async function suspendUser(input: z.infer<typeof suspendInput>): Promise<Result<Practitioner>> {
  await latency();
  const parsed = suspendInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation');
  return transact((d, now) => {
    const denied = adminDenied(d);
    if (denied) return { ok: false, error: denied };
    const p = practitionerOf(d, parsed.data.practitioner_id);
    if (!p) return fail('not_found', 'notFound');
    p.suspended_until = new Date(now + SUSPEND_DAYS * DAY).toISOString();
    const report = parsed.data.report_id ? d.reports.find(r => r.id === parsed.data.report_id) : undefined;
    if (report && report.status === 'open') {
      report.status = 'resolved';
      report.resolution = report.resolution ?? `Suspended for ${SUSPEND_DAYS} days.`;
    }
    return ok(p);
  });
}

/** Lift a suspension early. */
export async function liftSuspension(practitionerId: string): Promise<Result<Practitioner>> {
  await latency();
  return transact(d => {
    const denied = adminDenied(d);
    if (denied) return { ok: false, error: denied };
    const p = practitionerOf(d, practitionerId);
    if (!p) return fail('not_found', 'notFound');
    p.suspended_until = null;
    return ok(p);
  });
}

export function selectReports(d: DemoDB): { open: Report[]; closed: Report[] } {
  return {
    open: d.reports.filter(r => r.status === 'open').sort((a, b) => a.created_at.localeCompare(b.created_at)),
    closed: d.reports.filter(r => r.status !== 'open').sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

// ------------------------------------------------------------------ review

export function selectReviewQueue(d: DemoDB): PractitionerRecord[] {
  return d.practitioners.filter(p => p.verification === 'manual_review');
}

/** Approve a manually reviewed practitioner (FR-X2). */
export async function approvePractitioner(id: string): Promise<Result<Practitioner>> {
  await latency();
  return transact((d, now) => {
    const denied = adminDenied(d);
    if (denied) return { ok: false, error: denied };
    const p = practitionerOf(d, id);
    if (!p || p.verification !== 'manual_review') return fail('not_found', 'notFound');
    p.verification = 'verified';
    notifyWaitlist(d, p, now);
    return ok(p);
  });
}

export const rejectInput = z.object({ id: z.string().min(1), note: z.string().trim().min(3).max(500) });

/** Reject a manual review (the person can try again with a work email). */
export async function rejectPractitioner(input: z.infer<typeof rejectInput>): Promise<Result<Practitioner>> {
  await latency();
  const parsed = rejectInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation', { note: 'note' });
  return transact(d => {
    const denied = adminDenied(d);
    if (denied) return { ok: false, error: denied };
    const p = practitionerOf(d, parsed.data.id) as PractitionerRecord | undefined;
    if (!p || p.verification !== 'manual_review') return fail('not_found', 'notFound');
    p.verification = 'rejected';
    if (p.review_evidence) p.review_evidence = { ...p.review_evidence, note: parsed.data.note };
    return ok(p);
  });
}

// ------------------------------------------------------------------ pipeline

export const JOBS: readonly PipelineRun['job'][] = ['ingest_ads', 'ingest_official', 'compute_metrics', 'detect_signals', 'expire_requests', 'send_outbox', 'purge_deleted'];

export interface PipelineRow {
  job: PipelineRun['job'];
  last: PipelineRun | null;
  lastSuccess: PipelineRun | null;
  runs: PipelineRun[];
}

/** Latest run per job, failures first (FR-X3). */
export function selectPipeline(d: DemoDB): PipelineRow[] {
  return JOBS.map(job => {
    const runs = d.pipeline_runs.filter(r => r.job === job).sort((a, b) => b.started_at.localeCompare(a.started_at));
    return { job, last: runs[0] ?? null, lastSuccess: runs.find(r => r.status === 'succeeded') ?? null, runs };
  }).sort((a, b) => Number(b.last?.status === 'failed') - Number(a.last?.status === 'failed'));
}

/** Run a job again now (preview: completes immediately). */
export async function rerunJob(job: PipelineRun['job']): Promise<Result<PipelineRun>> {
  await latency(600, 400);
  if (!JOBS.includes(job)) return fail('validation', 'validation');
  return transact((d, now) => {
    const denied = adminDenied(d);
    if (denied) return { ok: false, error: denied };
    const prev = d.pipeline_runs.filter(r => r.job === job && r.status === 'succeeded').sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
    const stats: Record<string, number> = job === 'expire_requests'
      ? { expired: d.requests.filter(r => r.status === 'expired').length, replaced: d.requests.filter(r => r.replaced_by).length }
      : job === 'send_outbox' ? { sent: 0, held_in_preview: d.outbox.length } : { ...(prev?.stats ?? {}) };
    const run: PipelineRun = { id: newId('run'), job, status: 'succeeded', started_at: new Date(now - 40_000).toISOString(), finished_at: new Date(now).toISOString(), stats, error: null };
    d.pipeline_runs.unshift(run);
    return ok(run);
  });
}

// ------------------------------------------------------------------ metrics

export interface Rate {
  numerator: number;
  denominator: number;
  value: number | null;
  small: boolean;
}

const rate = (numerator: number, denominator: number): Rate => ({ numerator, denominator, value: denominator ? numerator / denominator : null, small: denominator < SMALL_N });

export interface Funnel {
  created: number;
  student_created: number;
  accepted_72h: Rate;
  completed: number;
  debriefed: Rate;
  attendance: Rate;
  supply: number;
  north_star: number;
  waitlist: number;
}

/** Funnel and North Star computed from requests + events (FR-X4, PRD §4.2). */
export function selectFunnel(d: DemoDB, now: number): Funnel {
  const reqs = d.requests;
  const createdAt = new Map(reqs.map(r => [r.id, Date.parse(r.created_at)]));
  const acceptedFast = new Set(d.events.filter(e => (e.kind === 'accept' || e.kind === 'accept_reschedule') && Date.parse(e.at) - (createdAt.get(e.request_id) ?? 0) <= 72 * HOUR).map(e => e.request_id));
  const settled = reqs.filter(r => r.status !== 'pending' || Date.parse(r.created_at) < now - 72 * HOUR);
  const completed = reqs.filter(r => r.status === 'completed');
  const noShows = reqs.filter(r => r.status === 'no_show_student' || r.status === 'no_show_practitioner');
  const studentCreated = new Set(d.events.filter(e => e.kind === 'create' && e.actor === 'student').map(e => e.request_id));
  const weekAgo = now - 7 * DAY;
  const loops = new Set(completed.filter(r => r.signal && Date.parse(r.slot_start) >= weekAgo).map(r => r.student_id));
  return {
    created: reqs.length,
    student_created: studentCreated.size,
    accepted_72h: rate(settled.filter(r => acceptedFast.has(r.id)).length, settled.length),
    completed: completed.length,
    debriefed: rate(completed.filter(r => r.debrief).length, completed.length),
    attendance: rate(completed.length, completed.length + noShows.length),
    supply: selectSupply(d, now).available,
    north_star: loops.size,
    waitlist: d.waitlist.length,
  };
}

// ------------------------------------------------------------------ taxonomy

export const ALIAS_PATTERN = /^[a-z0-9][a-z0-9 +#./-]{0,39}$/;
export const aliasInput = z.object({ alias: z.string().transform(normaliseQuery).pipe(z.string().regex(ALIAS_PATTERN)), instrument_slug: z.string().min(1) });

export interface AliasRow {
  alias: string;
  instrument_slug: string;
  source: 'catalogue' | 'override';
  override_id: string | null;
}

/** All aliases: catalogue + admin overrides (FR-X5). */
export function selectAliases(d: DemoDB): AliasRow[] {
  const rows: AliasRow[] = INSTRUMENTS.flatMap(i => i.aliases.map(alias => ({ alias, instrument_slug: i.slug, source: 'catalogue' as const, override_id: null })));
  for (const o of d.alias_overrides) rows.push({ alias: o.alias, instrument_slug: o.instrument_slug, source: 'override', override_id: o.id });
  return rows.sort((a, b) => a.alias.localeCompare(b.alias));
}

/** Where an alias already points, if anywhere (names and symbols count too). */
export function aliasOwner(d: DemoDB, alias: string): string | null {
  const a = normaliseQuery(alias);
  for (const i of INSTRUMENTS) {
    if (i.name.toLowerCase() === a || i.symbol.toLowerCase() === a || i.aliases.includes(a)) return i.slug;
  }
  return d.alias_overrides.find(o => o.alias === a)?.instrument_slug ?? null;
}

/** Add an alias → instrument mapping, refusing conflicts. */
export async function upsertAlias(input: z.input<typeof aliasInput>): Promise<Result<AliasOverride>> {
  await latency();
  const parsed = aliasInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'aliasInvalid', { alias: 'aliasInvalid' });
  if (!getInstrument(parsed.data.instrument_slug)) return fail('not_found', 'instrumentNotFound', { instrument_slug: 'instrumentNotFound' });
  return transact((d, now) => {
    const denied = adminDenied(d);
    if (denied) return { ok: false, error: denied };
    const owner = aliasOwner(d, parsed.data.alias);
    if (owner === parsed.data.instrument_slug) return fail('conflict', 'aliasExists', { alias: 'aliasExists' });
    if (owner) return fail('conflict', 'aliasConflict', { alias: 'aliasConflict', owner });
    const row: AliasOverride = { id: newId('al'), alias: parsed.data.alias, instrument_slug: parsed.data.instrument_slug, created_at: new Date(now).toISOString() };
    d.alias_overrides.push(row);
    return ok(row);
  });
}

export async function removeAlias(id: string): Promise<Result<{ id: string }>> {
  await latency();
  return transact(d => {
    const denied = adminDenied(d);
    if (denied) return { ok: false, error: denied };
    const before = d.alias_overrides.length;
    d.alias_overrides = d.alias_overrides.filter(o => o.id !== id);
    return before === d.alias_overrides.length ? fail('not_found', 'notFound') : ok({ id });
  });
}

