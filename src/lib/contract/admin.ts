import { z } from 'zod';
import { idInput, idOutput, noInput, op, slug } from './common';
import { aliasOverrideSchema, JOB_NAMES, pipelineRunSchema, practitionerReviewSchema, practitionerSelfSchema, reportSchema } from './entities';

// Admin back office (FR-X1–X5). Access = is_admin(); everyone else gets 404.

export const SUSPEND_DAYS = 30;
/** Rates over fewer than this many cases are flagged "small sample". */
export const SMALL_N = 10;

export const rateSchema = z.object({ numerator: z.number(), denominator: z.number(), value: z.number().nullable(), small: z.boolean() });

export const funnelSchema = z.object({
  created: z.number().int(),
  student_created: z.number().int(),
  accepted_72h: rateSchema,
  completed: z.number().int(),
  debriefed: rateSchema,
  attendance: rateSchema,
  supply: z.number().int(),
  /** Students who completed a chat that started from a signal in the last 7 days (PRD §4.2). */
  north_star: z.number().int(),
  waitlist: z.number().int(),
});

export const pipelineRowSchema = z.object({
  job: z.enum(JOB_NAMES),
  last: pipelineRunSchema.nullable(),
  lastSuccess: pipelineRunSchema.nullable(),
  runs: z.array(pipelineRunSchema),
});

export const aliasRowSchema = z.object({
  alias: z.string(),
  instrument_slug: slug,
  source: z.enum(['catalogue', 'override']),
  override_id: z.string().nullable(),
});

export const adminOps = {
  getReports: op({
    phase: 'later', kind: 'read', access: 'admin', input: noInput, output: z.object({ open: z.array(reportSchema), closed: z.array(reportSchema) }),
    does: 'Reports, open first.',
    ui: '/admin/reports',
    tables: ['reports'], fr: ['FR-X1'],
  }),
  resolveReport: op({
    phase: 'later', kind: 'action', access: 'admin', input: z.object({ id: z.string().min(1), status: z.enum(['resolved', 'dismissed']), resolution: z.string().trim().min(3).max(500) }), output: reportSchema,
    does: 'Close a report with a note.',
    ui: '/admin/reports "Resolve" / "Dismiss"',
    errors: ['not_found:notFound'],
    tables: ['reports'], fr: ['FR-X1'],
  }),
  suspendUser: op({
    phase: 'later', kind: 'action', access: 'admin', input: z.object({ practitioner_id: z.string().min(1), report_id: z.string().nullable() }), output: practitionerSelfSchema,
    does: 'Suspend a practitioner for 30 days (drops out of matching).',
    ui: '/admin/reports "Suspend 30 days"',
    errors: ['not_found:notFound'],
    tables: ['practitioner_profiles', 'reports'], fr: ['FR-X1'],
    delta: 'Students cannot be suspended yet; needs profiles.suspended_until.',
  }),
  liftSuspension: op({
    phase: 'later', kind: 'action', access: 'admin', input: idInput, output: practitionerSelfSchema,
    does: 'End a suspension early.',
    ui: '/admin/reports "Lift suspension"',
    errors: ['not_found:notFound'],
    tables: ['practitioner_profiles'], fr: ['FR-X1'],
  }),
  getReviewQueue: op({
    phase: 'later', kind: 'read', access: 'admin', input: noInput, output: z.array(practitionerReviewSchema),
    does: 'Practitioners waiting for a manual check, with their evidence.',
    ui: '/admin/review',
    tables: ['practitioner_profiles', 'work_email_verifications'], fr: ['FR-X2'],
  }),
  approvePractitioner: op({
    phase: 'later', kind: 'action', access: 'admin', input: idInput, output: practitionerSelfSchema,
    does: 'Mark verified.',
    ui: '/admin/review "Approve"',
    errors: ['not_found:notFound'],
    tables: ['practitioner_profiles'], fr: ['FR-X2'],
  }),
  rejectPractitioner: op({
    phase: 'later', kind: 'action', access: 'admin', input: z.object({ id: z.string().min(1), note: z.string().trim().min(3).max(500) }), output: practitionerSelfSchema,
    does: 'Reject with a note.',
    ui: '/admin/review "Reject"',
    errors: ['not_found:notFound'],
    tables: ['practitioner_profiles'], fr: ['FR-X2'],
  }),
  getPipeline: op({
    kind: 'read', access: 'admin', input: noInput, output: z.array(pipelineRowSchema),
    does: 'Latest run per job, failures first.',
    ui: '/admin/pipeline',
    tables: ['job_runs', 'ingestion_runs'], fr: ['FR-X3'],
  }),
  rerunJob: op({
    kind: 'action', access: 'admin', input: z.object({ job: z.enum(JOB_NAMES) }), output: pipelineRunSchema,
    does: 'Run a job again now.',
    ui: '/admin/pipeline "Re-run"',
    tables: ['job_runs'], fr: ['FR-X3'],
    delta: 'Demo takes a bare job name; production calls /api/jobs/[job] and returns the started run.',
  }),
  getFunnel: op({
    phase: 'later', kind: 'read', access: 'admin', input: noInput, output: funnelSchema,
    does: 'Activation → request → accept in 72h → completed → debriefed, plus North Star; each rate with its numerator and denominator.',
    ui: '/admin/metrics',
    tables: ['chat_requests', 'chat_request_events', 'waitlist_entries'], fr: ['FR-X4'],
  }),
  getAliases: op({
    kind: 'read', access: 'admin', input: noInput, output: z.array(aliasRowSchema),
    does: 'All aliases: catalogue plus admin overrides.',
    ui: '/admin/taxonomy',
    tables: ['instrument_aliases'], fr: ['FR-X5'],
  }),
  upsertAlias: op({
    kind: 'action', access: 'admin', input: z.object({ alias: z.string().min(1).max(40), instrument_slug: slug }), output: aliasOverrideSchema,
    does: 'Map a new alias to an instrument; refuses one that already points somewhere.',
    ui: '/admin/taxonomy "Add alias"',
    errors: ['validation:aliasInvalid', 'not_found:instrumentNotFound', 'conflict:aliasExists', 'conflict:aliasConflict'],
    tables: ['instrument_aliases'], fr: ['FR-X5'],
  }),
  removeAlias: op({
    kind: 'action', access: 'admin', input: idInput, output: idOutput,
    does: 'Remove an admin-added alias.',
    ui: '/admin/taxonomy row "Remove"',
    errors: ['not_found:notFound'],
    tables: ['instrument_aliases'], fr: ['FR-X5'],
  }),
} as const;
