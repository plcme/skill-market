import { z } from 'zod';
import { idInput, idOutput, noInput, op } from './common';
import { blockSchema, REPORT_REASONS, reportSchema } from './entities';

// Reports and blocks between a student and a practitioner (FR-A7, FR-X1).

export const REPORT_DETAILS_MAX = 1000;
export const REPORTS_PER_DAY = 10;

export const reportInput = z.object({
  target_kind: z.enum(['student', 'practitioner']),
  target_id: z.string().min(1),
  request_id: z.string().min(1).nullable(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(REPORT_DETAILS_MAX).default(''),
}).refine(v => v.reason !== 'other' || v.details.length >= 10, { path: ['details'], message: 'details' });

export const safetyOps = {
  reportUser: op({
    kind: 'action', access: 'signed_in', input: reportInput, output: reportSchema,
    does: 'Report the other person in a chat; goes to the admin queue. "Other" needs 10+ characters. 10 per day.',
    ui: '/chat/[id] "Report" dialog (both views)',
    errors: ['validation:details', 'rate_limited:rateLimited'],
    tables: ['reports', 'rate_limits'], fr: ['FR-A7', 'FR-X1'],
  }),
  blockUser: op({
    kind: 'action', access: 'signed_in', input: z.object({ target_id: z.string().min(1) }), output: blockSchema,
    does: 'Block the other person: takes effect now, closes open requests between you (the student side reads "still looking"), and removes them from matching.',
    ui: '/chat/[id] "Block" (confirm dialog, both views)',
    errors: ['conflict:alreadyBlocked'],
    tables: ['blocks', 'chat_requests', 'availability_slots'], fr: ['FR-A7'],
    delta: 'Production table needs blocker_user_id (demo encodes the blocker in the row id).',
  }),
  unblockUser: op({
    kind: 'action', access: 'signed_in', input: idInput, output: idOutput,
    does: 'Undo a block you made.',
    ui: '/practitioner Blocked list "Unblock"',
    errors: ['not_found:notFound'],
    tables: ['blocks'], fr: ['FR-A7'],
    delta: 'Demo does not check that the caller made the block; production must (RLS).',
  }),
  getMyBlocks: op({
    kind: 'read', access: 'signed_in', input: noInput, output: z.array(blockSchema),
    does: 'Blocks made by the active persona.',
    ui: '/practitioner Blocked list; Block button state on /chat/[id]',
    tables: ['blocks'], fr: ['FR-A7'],
  }),
} as const;
