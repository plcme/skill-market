'use client';

import { z } from 'zod';
import { transact } from '@/lib/demo/store';
import { HOUR } from '@/lib/time';
import { fail, guard, latency, ok } from './client';
import { applyTransition, newId, releaseSlot, replaceRequest } from './chat-jobs';
import { blockerPractitionerId, isBlockedPair, OPEN_STATUSES, practitionerBlockId } from './matching';
import { actingPractitionerId } from './practitioner';
import type { Block, DemoDB, Report, ReportReason, Result } from './types';

// Safety domain (FR-A7). Server Actions: reportUser, blockUser, unblockUser.
// Reads: selectMyBlocks, isBlocked. Blocked people never appear in matching
// again (either direction) and open requests between the two are closed.

export const REPORT_REASONS: readonly ReportReason[] = ['harassment', 'inappropriate', 'no_show', 'spam', 'safety', 'other'];
export const REPORT_DETAILS_MAX = 1000;
export const REPORTS_PER_DAY = 10;

export const reportInput = z.object({
  target_kind: z.enum(['student', 'practitioner']),
  target_id: z.string().min(1),
  request_id: z.string().min(1).nullable(),
  reason: z.enum(['harassment', 'inappropriate', 'no_show', 'spam', 'safety', 'other']),
  details: z.string().trim().max(REPORT_DETAILS_MAX).default(''),
}).refine(v => v.reason !== 'other' || v.details.length >= 10, { path: ['details'], message: 'details' });
export type ReportInput = z.input<typeof reportInput>;

/** Report the other person in a chat. Goes to the admin queue (FR-X1). */
export async function reportUser(input: ReportInput): Promise<Result<Report>> {
  await latency();
  const parsed = reportInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation', { details: 'details' });
  return transact((d, now) => {
    const denied = guard(d);
    if (denied || !d.session) return { ok: false, error: denied ?? { code: 'unauthenticated', message: 'unauthenticated' } };
    const reporter = d.session.active;
    const recent = d.reports.filter(r => r.reporter === reporter && Date.parse(r.created_at) > now - 24 * HOUR).length;
    if (recent >= REPORTS_PER_DAY) return fail('rate_limited', 'rateLimited');
    const report: Report = {
      id: newId('rep'),
      reporter,
      target_kind: parsed.data.target_kind,
      target_id: parsed.data.target_id,
      request_id: parsed.data.request_id,
      reason: parsed.data.reason,
      details: parsed.data.details,
      status: 'open',
      resolution: null,
      created_at: new Date(now).toISOString(),
    };
    d.reports.unshift(report);
    return ok(report);
  });
}

export const blockInput = z.object({ target_id: z.string().min(1) });

/** Close every open request between a practitioner and the student after a block. */
function closeOpenRequests(d: DemoDB, practitionerId: string, studentId: string, by: 'student' | 'practitioner', now: number) {
  for (const req of d.requests.filter(r => r.practitioner_id === practitionerId && r.student_id === studentId && OPEN_STATUSES.includes(r.status))) {
    if (by === 'student') {
      if (req.status === 'accepted' || req.status === 'pending' || req.status === 'reschedule_proposed') applyTransition(d, req, 'cancel', 'student', now);
      releaseSlot(d, req.slot_id, now);
      releaseSlot(d, req.proposed_slot_id, now);
      continue;
    }
    // Practitioner-side blocks read as "still looking" for the student.
    const released = req.status === 'pending'
      ? applyTransition(d, req, 'decline', 'practitioner', now)
      : req.status === 'accepted'
        ? applyTransition(d, req, 'cancel', 'practitioner', now)
        : applyTransition(d, req, 'expire', 'system', now);
    releaseSlot(d, req.slot_id, now);
    releaseSlot(d, req.proposed_slot_id, now);
    if (released.ok) replaceRequest(d, req, now);
  }
}

/** Block the other person (student ↔ practitioner). Takes effect immediately. */
export async function blockUser(input: z.infer<typeof blockInput>): Promise<Result<Block>> {
  await latency();
  const parsed = blockInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation');
  return transact((d, now) => {
    const denied = guard(d);
    if (denied || !d.session) return { ok: false, error: denied ?? { code: 'unauthenticated', message: 'unauthenticated' } };
    const persona = d.session.active;
    if (persona === 'admin') return fail('forbidden', 'forbidden');
    const at = new Date(now).toISOString();
    if (persona === 'student') {
      if (isBlockedPair({ blocks: d.blocks.filter(b => b.blocker === 'student') }, parsed.data.target_id, d.session.user_id)) return fail('conflict', 'alreadyBlocked');
      const block: Block = { id: newId('blk'), blocker: 'student', target_id: parsed.data.target_id, created_at: at };
      d.blocks.push(block);
      closeOpenRequests(d, parsed.data.target_id, d.session.user_id, 'student', now);
      return ok(block);
    }
    const pid = actingPractitionerId(d);
    if (d.blocks.some(b => blockerPractitionerId(b) === pid && b.target_id === parsed.data.target_id)) return fail('conflict', 'alreadyBlocked');
    const block: Block = { id: practitionerBlockId(pid, newId('x').slice(2)), blocker: 'practitioner', target_id: parsed.data.target_id, created_at: at };
    d.blocks.push(block);
    closeOpenRequests(d, pid, parsed.data.target_id, 'practitioner', now);
    return ok(block);
  });
}

/** Undo a block you made. */
export async function unblockUser(id: string): Promise<Result<{ id: string }>> {
  await latency();
  return transact(d => {
    const denied = guard(d);
    if (denied) return { ok: false, error: denied };
    const before = d.blocks.length;
    d.blocks = d.blocks.filter(b => b.id !== id);
    return before === d.blocks.length ? fail('not_found', 'notFound') : ok({ id });
  });
}

/** Blocks made by the current persona. */
export function selectMyBlocks(d: DemoDB): Block[] {
  if (!d.session) return [];
  if (d.session.active === 'student') return d.blocks.filter(b => b.blocker === 'student');
  if (d.session.active === 'practitioner') {
    const pid = actingPractitionerId(d);
    return d.blocks.filter(b => blockerPractitionerId(b) === pid);
  }
  return [];
}

/** Has the current persona blocked this person? */
export function hasBlocked(d: DemoDB, targetId: string): boolean {
  return selectMyBlocks(d).some(b => b.target_id === targetId);
}
