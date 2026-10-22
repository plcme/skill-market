import { z } from 'zod';
import { filterSpecSchema } from '@/lib/filters/spec';
import { isoDateTime, slug } from './common';
import { metricKey, signalSchema } from './market';

// Row shapes the UI receives for user-owned data. Each maps to a Supabase table
// (ARCHITECTURE §5.1); fields the caller is not allowed to see are left out of
// the schema, and the server must strip them (RLS + explicit column lists).

export const PERSONAS = ['student', 'practitioner', 'admin'] as const;
export const persona = z.enum(PERSONAS);

/** The signed-in account. `active` = which desk the shell shows (profiles.active_persona). */
export const sessionSchema = z.object({
  user_id: z.string(),
  email: z.string(),
  display_name: z.string(),
  personas: z.array(persona).min(1),
  active: persona,
  auth_method: z.enum(['magic_link', 'google']),
  signed_in_at: isoDateTime,
});

export const STUDENT_FIELDS = ['university', 'degree', 'year', 'skills', 'watchlist', 'visa_status'] as const;
export const studentField = z.enum(STUDENT_FIELDS);
export const STUDY_YEARS = ['1', '2', '3', '4', '5', 'postgrad', 'graduated'] as const;
export const VISA_STATUSES = ['citizen_pr', 'student_visa', 'graduate_visa', 'other', 'prefer_not'] as const;
export const tierStatus = z.enum(['pending', 'done', 'skipped']);
export const visibility = z.enum(['private', 'matched_practitioner']);

export const consentSchema = z.object({
  kind: z.enum(['age_18', 'privacy_notice', 'terms']),
  version: z.string(),
  at: isoDateTime,
});

/** student_profiles (+ email_preferences, consents). Only the owner can read it. */
export const studentProfileSchema = z.object({
  user_id: z.string(),
  display_name: z.string(),
  university_id: z.string().nullable(),
  degree_id: z.string().nullable(),
  year: z.enum(STUDY_YEARS).nullable(),
  unit_codes: z.array(z.string()),
  /** Optional and sensitive (FR-A3). */
  visa_status: z.enum(VISA_STATUSES).nullable(),
  onboarding: z.object({ tier0: tierStatus, tier1: tierStatus }),
  /** Per field: only me, or practitioners I send a request to (FR-A4, FR-C11). */
  field_visibility: z.record(studentField, visibility),
  email_prefs: z.object({ digest: z.enum(['weekly', 'monthly', 'off']), signal_alerts: z.boolean() }),
  ui_mode: z.enum(['market', 'plain']),
  consents: z.array(consentSchema),
  created_at: isoDateTime,
});

/** student_skills. `inferred` rows are suggestions until confirmed; removing deletes the row. */
export const studentSkillSchema = z.object({
  id: z.string(),
  skill_slug: slug,
  source: z.enum(['self_reported', 'inferred', 'confirmed']),
  /** 0–1 for suggestions, null otherwise. */
  confidence: z.number().min(0).max(1).nullable(),
  /** Why we suggested it, e.g. "From INFO1110". */
  reason: z.string().nullable(),
  added_at: isoDateTime,
});

/** watchlist_items. The filter is part of what is tracked (FR-F6). */
export const watchlistItemSchema = z.object({
  id: z.string(),
  instrument_slug: slug,
  /** Only skills can be `held`. */
  status: z.enum(['held', 'watching']),
  filter: filterSpecSchema,
  metric: metricKey,
  baseline_value: z.number().nullable(),
  baseline_at: isoDateTime,
  created_at: isoDateTime,
});

export const availabilityWindowSchema = z.object({
  /** 1 = Monday … 7 = Sunday */
  weekday: z.number().int().min(1).max(7),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

export const VERIFICATION_STATUSES = ['unverified', 'code_sent', 'verified', 'manual_review', 'rejected'] as const;

/** What a student sees of a practitioner (view `practitioner_cards`, signed-in only). */
export const practitionerCardSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  initials: z.string(),
  current_title: z.string(),
  current_role_slug: z.string(),
  employer: z.string(),
  entry_year: z.number().int(),
  location_id: z.string(),
  skills: z.array(slug),
  topics: z.array(z.string()),
  /** How they got in (FR-C3). */
  path: z.string(),
  bio: z.string(),
  /** Slot times are shown in both zones. */
  timezone: z.string(),
});

/** The practitioner's own record (practitioner_profiles + availability_templates). */
export const practitionerSelfSchema = practitionerCardSchema.extend({
  user_id: z.string().nullable(),
  work_email_domain: z.string(),
  verification: z.enum(VERIFICATION_STATUSES),
  monthly_cap: z.number().int().min(1).max(4),
  paused: z.boolean(),
  availability: z.array(availabilityWindowSchema),
  meeting_link: z.string().nullable(),
  joined_at: isoDateTime,
  suspended_until: isoDateTime.nullable(),
});

/** Admin review queue row: own record plus manual-review evidence. */
export const practitionerReviewSchema = practitionerSelfSchema.extend({
  review_evidence: z.object({ email: z.string(), linkedin_url: z.string(), note: z.string(), submitted_at: isoDateTime }).optional(),
});

/** availability_slots: 20-minute slots generated from the weekly template. */
export const slotSchema = z.object({
  id: z.string(),
  practitioner_id: z.string(),
  start: isoDateTime,
  minutes: z.literal(20),
  status: z.enum(['open', 'held', 'booked']),
});

export const CHAT_STATUSES = ['pending', 'accepted', 'declined', 'reschedule_proposed', 'expired', 'cancelled', 'completed', 'no_show_student', 'no_show_practitioner'] as const;
export const chatStatus = z.enum(CHAT_STATUSES);
export const CHAT_EVENT_KINDS = [
  'create', 'accept', 'decline', 'propose_reschedule', 'accept_reschedule', 'decline_reschedule',
  'expire', 'cancel', 'confirm_attended', 'confirm_absent', 'complete', 'reminder_sent', 'replaced',
] as const;
export const actor = z.enum(['student', 'practitioner', 'system']);

export const matchReasonSchema = z.object({
  factor: z.enum(['holds_skill', 'entry_recent', 'top_role', 'topic_overlap', 'same_state', 'adjacent_skill']),
  /** Values for the reason sentence in messages. */
  vars: z.record(z.string(), z.union([z.string(), z.number()])),
});

export const debriefVote = z.enum(['more_keen', 'no_change', 'less_keen']);
const attendanceMark = z.enum(['attended', 'absent']).nullable();

/** chat_requests. Students never see `declined` as such: the UI maps it to "still looking". */
export const chatRequestSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  practitioner_id: z.string(),
  instrument_slug: slug,
  filter: filterSpecSchema,
  signal: signalSchema.nullable(),
  decision_question: z.string(),
  starters: z.array(z.string()),
  shared_fields: z.array(studentField),
  slot_id: z.string(),
  slot_start: isoDateTime,
  proposed_slot_id: z.string().nullable(),
  proposed_slot_start: isoDateTime.nullable(),
  status: chatStatus,
  match_reasons: z.array(matchReasonSchema),
  /** Practitioners already tried for this ask; the next match skips them. */
  tried_practitioner_ids: z.array(z.string()),
  /** When released (declined/expired), the replacement request. */
  replaced_by: z.string().nullable(),
  /** Only after accept. */
  meeting_link: z.string().nullable(),
  created_at: isoDateTime,
  expires_at: isoDateTime,
  updated_at: isoDateTime,
  attendance: z.object({ student: attendanceMark, practitioner: attendanceMark }),
  debrief: z.object({ vote: debriefVote, note: z.string(), at: isoDateTime }).nullable(),
});

/** chat_request_events: append-only audit of every transition. */
export const chatEventSchema = z.object({
  id: z.string(),
  request_id: z.string(),
  at: isoDateTime,
  actor,
  kind: z.enum(CHAT_EVENT_KINDS),
  from: chatStatus.nullable(),
  to: chatStatus.nullable(),
});

/**
 * Student fields frozen when the request is created, limited to `shared_fields`
 * (FR-C11). This is all a practitioner ever sees of a student.
 */
export const sharedSnapshotSchema = z.object({
  first_name: z.string(),
  university: z.string().optional(),
  degree: z.string().optional(),
  year: z.enum(STUDY_YEARS).optional(),
  skills: z.array(slug).optional(),
  watchlist: z.array(slug).optional(),
  visa_status: z.enum(VISA_STATUSES).optional(),
});

export const REPORT_REASONS = ['harassment', 'inappropriate', 'no_show', 'spam', 'safety', 'other'] as const;

export const reportSchema = z.object({
  id: z.string(),
  reporter: persona,
  target_kind: z.enum(['student', 'practitioner']),
  target_id: z.string(),
  request_id: z.string().nullable(),
  reason: z.enum(REPORT_REASONS),
  details: z.string(),
  status: z.enum(['open', 'resolved', 'dismissed']),
  resolution: z.string().nullable(),
  created_at: isoDateTime,
});

export const blockSchema = z.object({
  id: z.string(),
  blocker: persona,
  target_id: z.string(),
  created_at: isoDateTime,
});

export const waitlistEntrySchema = z.object({
  id: z.string(),
  instrument_slug: slug,
  filter: filterSpecSchema,
  created_at: isoDateTime,
});

export const EMAIL_TEMPLATES = [
  'magic_link', 'work_email_code', 'request_received', 'request_accepted', 'request_rescheduled', 'request_still_looking',
  'reminder_24h', 'debrief_prompt', 'attendance_prompt', 'waitlist_match', 'signal_alert', 'digest', 'export_ready', 'deletion_scheduled',
] as const;

/** notifications_outbox → Resend. */
export const outboxEmailSchema = z.object({
  id: z.string(),
  to: z.enum(['student', 'practitioner', 'admin']),
  template: z.enum(EMAIL_TEMPLATES),
  vars: z.record(z.string(), z.union([z.string(), z.number()])),
  at: isoDateTime,
  request_id: z.string().nullable(),
});

export const JOB_NAMES = ['ingest_ads', 'ingest_official', 'compute_metrics', 'detect_signals', 'expire_requests', 'send_outbox', 'purge_deleted'] as const;

/** job_runs / ingestion_runs. */
export const pipelineRunSchema = z.object({
  id: z.string(),
  job: z.enum(JOB_NAMES),
  status: z.enum(['succeeded', 'failed', 'running']),
  started_at: isoDateTime,
  finished_at: isoDateTime.nullable(),
  stats: z.record(z.string(), z.number()),
  error: z.string().nullable(),
});

export const aliasOverrideSchema = z.object({
  id: z.string(),
  alias: z.string(),
  instrument_slug: slug,
  created_at: isoDateTime,
});

export const deletionRequestSchema = z.object({ requested_at: isoDateTime, purge_after: isoDateTime });

export type Session = z.infer<typeof sessionSchema>;
export type StudentProfile = z.infer<typeof studentProfileSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type PractitionerCard = z.infer<typeof practitionerCardSchema>;
export type SharedSnapshot = z.infer<typeof sharedSnapshotSchema>;
