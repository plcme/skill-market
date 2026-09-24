import type { FilterSpec, MetricKey, Signal } from '@/lib/market/types';

// Entity shapes the UI consumes. They mirror the Supabase tables in
// ARCHITECTURE §5.1 closely enough that the mock store can be replaced by
// Server Actions + RSC reads without touching components.

export type Persona = 'student' | 'practitioner' | 'admin';
export type ViewerRole = 'visitor' | Persona;

export interface Session {
  user_id: string;
  email: string;
  display_name: string;
  /** Personas this account holds; `active` decides which desk the shell shows. */
  personas: Persona[];
  active: Persona;
  auth_method: 'magic_link' | 'google';
  signed_in_at: string;
}

export type UiMode = 'market' | 'plain';
export type ThemePref = 'system' | 'light' | 'dark';
export type Visibility = 'private' | 'matched_practitioner';

/** Fields a student can share with a matched practitioner (FR-C11, FR-A4). */
export type StudentField = 'university' | 'degree' | 'year' | 'skills' | 'watchlist' | 'visa_status';
export const STUDENT_FIELDS: readonly StudentField[] = ['university', 'degree', 'year', 'skills', 'watchlist', 'visa_status'];

export type StudyYear = '1' | '2' | '3' | '4' | '5' | 'postgrad' | 'graduated';
export type VisaStatus = 'citizen_pr' | 'student_visa' | 'graduate_visa' | 'other' | 'prefer_not';
export type TierStatus = 'pending' | 'done' | 'skipped';
export type DigestFrequency = 'weekly' | 'monthly' | 'off';

export interface Consent {
  kind: 'age_18' | 'privacy_notice' | 'terms';
  version: string;
  at: string;
}

export interface StudentProfile {
  user_id: string;
  display_name: string;
  university_id: string | null;
  degree_id: string | null;
  year: StudyYear | null;
  unit_codes: string[];
  /** Optional, sensitive (FR-A3). */
  visa_status: VisaStatus | null;
  onboarding: { tier0: TierStatus; tier1: TierStatus };
  field_visibility: Record<StudentField, Visibility>;
  email_prefs: { digest: DigestFrequency; signal_alerts: boolean };
  ui_mode: UiMode;
  consents: Consent[];
  created_at: string;
}

export type SkillSource = 'self_reported' | 'inferred' | 'confirmed';

export interface StudentSkill {
  id: string;
  skill_slug: string;
  source: SkillSource;
  /** 0–1 for inferred suggestions; null otherwise. */
  confidence: number | null;
  /** Why we suggested it, e.g. "From INFO1110". */
  reason: string | null;
  added_at: string;
}

export type WatchStatus = 'held' | 'watching';

export interface WatchlistItem {
  id: string;
  instrument_slug: string;
  status: WatchStatus;
  /** The filter is part of what is tracked (FR-F6). */
  filter: FilterSpec;
  metric: MetricKey;
  baseline_value: number | null;
  baseline_at: string;
  created_at: string;
}

export type VerificationStatus = 'unverified' | 'code_sent' | 'verified' | 'manual_review' | 'rejected';

export interface AvailabilityWindow {
  /** 1 = Monday … 7 = Sunday */
  weekday: number;
  start: string; // "HH:MM"
  end: string;
}

export interface Practitioner {
  id: string;
  /** Set when the practitioner is the signed-in demo user. */
  user_id: string | null;
  display_name: string;
  initials: string;
  current_title: string;
  current_role_slug: string;
  /** Fictional employers only in fixtures. */
  employer: string;
  work_email_domain: string;
  verification: VerificationStatus;
  entry_year: number;
  location_id: string;
  skills: string[];
  topics: string[];
  /** How they got in — shown as "entry path" (FR-C3). */
  path: string;
  bio: string;
  monthly_cap: number;
  paused: boolean;
  timezone: string;
  availability: AvailabilityWindow[];
  meeting_link: string | null;
  joined_at: string;
  suspended_until: string | null;
}

export interface Slot {
  id: string;
  practitioner_id: string;
  start: string;
  minutes: 20;
  status: 'open' | 'held' | 'booked';
}

export type ChatStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'reschedule_proposed'
  | 'expired'
  | 'cancelled'
  | 'completed'
  | 'no_show_student'
  | 'no_show_practitioner';

export type ChatEventKind =
  | 'create' | 'accept' | 'decline' | 'propose_reschedule' | 'accept_reschedule' | 'decline_reschedule'
  | 'expire' | 'cancel' | 'confirm_attended' | 'confirm_absent' | 'complete' | 'reminder_sent' | 'replaced';

export type Actor = 'student' | 'practitioner' | 'system';

export interface MatchReason {
  factor: 'holds_skill' | 'entry_recent' | 'top_role' | 'topic_overlap' | 'same_state' | 'adjacent_skill';
  /** Values to fill the reason template in messages. */
  vars: Record<string, string | number>;
}

export type DebriefVote = 'more_keen' | 'less_keen' | 'no_change';

export interface ChatRequest {
  id: string;
  student_id: string;
  practitioner_id: string;
  instrument_slug: string;
  filter: FilterSpec;
  signal: Signal | null;
  decision_question: string;
  starters: string[];
  shared_fields: StudentField[];
  slot_id: string;
  slot_start: string;
  proposed_slot_id: string | null;
  proposed_slot_start: string | null;
  status: ChatStatus;
  match_reasons: MatchReason[];
  /** Practitioners already tried for this ask — the next match skips them silently. */
  tried_practitioner_ids: string[];
  /** When a request is released (declined/expired), the replacement request id. */
  replaced_by: string | null;
  meeting_link: string | null;
  created_at: string;
  expires_at: string;
  updated_at: string;
  attendance: { student: 'attended' | 'absent' | null; practitioner: 'attended' | 'absent' | null };
  debrief: { vote: DebriefVote; note: string; at: string } | null;
}

export interface ChatEvent {
  id: string;
  request_id: string;
  at: string;
  actor: Actor;
  kind: ChatEventKind;
  from: ChatStatus | null;
  to: ChatStatus | null;
}

export type ReportReason = 'harassment' | 'inappropriate' | 'no_show' | 'spam' | 'safety' | 'other';

export interface Report {
  id: string;
  reporter: Persona;
  target_kind: 'student' | 'practitioner';
  target_id: string;
  request_id: string | null;
  reason: ReportReason;
  details: string;
  status: 'open' | 'resolved' | 'dismissed';
  resolution: string | null;
  created_at: string;
}

export interface Block {
  id: string;
  blocker: Persona;
  target_id: string;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  instrument_slug: string;
  filter: FilterSpec;
  created_at: string;
}

export type EmailTemplate =
  | 'magic_link' | 'work_email_code' | 'request_received' | 'request_accepted' | 'request_rescheduled'
  | 'request_still_looking' | 'reminder_24h' | 'debrief_prompt' | 'attendance_prompt' | 'waitlist_match'
  | 'signal_alert' | 'digest' | 'export_ready' | 'deletion_scheduled';

/** notifications_outbox — in the preview these are shown, never sent. */
export interface OutboxEmail {
  id: string;
  to: 'student' | 'practitioner' | 'admin';
  template: EmailTemplate;
  vars: Record<string, string | number>;
  at: string;
  request_id: string | null;
}

export interface PipelineRun {
  id: string;
  job: 'ingest_ads' | 'ingest_official' | 'compute_metrics' | 'detect_signals' | 'expire_requests' | 'send_outbox' | 'purge_deleted';
  status: 'succeeded' | 'failed' | 'running';
  started_at: string;
  finished_at: string | null;
  stats: Record<string, number>;
  error: string | null;
}

export interface AliasOverride {
  id: string;
  alias: string;
  instrument_slug: string;
  created_at: string;
}

export interface DeletionRequest {
  requested_at: string;
  purge_after: string;
}

export interface DemoDB {
  version: 1;
  /** Simulated clock offset, lets the preview fast-forward timeouts. */
  clock_offset_ms: number;
  session: Session | null;
  student: StudentProfile | null;
  skills: StudentSkill[];
  watchlist: WatchlistItem[];
  practitioners: Practitioner[];
  slots: Slot[];
  requests: ChatRequest[];
  events: ChatEvent[];
  waitlist: WaitlistEntry[];
  reports: Report[];
  blocks: Block[];
  outbox: OutboxEmail[];
  pipeline_runs: PipelineRun[];
  alias_overrides: AliasOverride[];
  /** The practitioner record owned by the signed-in user, if any. */
  my_practitioner_id: string | null;
  /** Pending work-email code for the demo (hashed in production). */
  work_email_code: { email: string; code: string; sent_at: string; attempts: number } | null;
  deletion: DeletionRequest | null;
  /** Which practitioner the practitioner desk acts as when the user has none of their own. */
  acting_practitioner_id: string | null;
}

export type ApiErrorCode = 'unauthenticated' | 'forbidden' | 'validation' | 'not_found' | 'conflict' | 'rate_limited' | 'unavailable';

export interface ApiError {
  code: ApiErrorCode;
  /** Key under `Errors` in messages. */
  message: string;
  fields?: Record<string, string>;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError };
