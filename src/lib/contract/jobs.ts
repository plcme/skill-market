import { z } from 'zod';
import { op } from './common';
import { EMAIL_TEMPLATES } from './entities';

// Scheduled work. Production: pg_cron → POST /api/jobs/[job] with JOBS_SECRET
// (or a SQL function), each run logged to job_runs. The demo runs the chat and
// slot jobs before every write instead (src/lib/api/jobs.ts, chat-jobs.ts).

const jobInput = z.object({
  /** Override "now" for tests and replays (pgTAP: set_config('app.now')). */
  now: z.string().optional(),
});
const jobOutput = z.object({ stats: z.record(z.string(), z.number()) });

export const jobOps = {
  refreshSlots: op({
    phase: 'later', kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'Generate 20-minute open slots for the next 28 days from each weekly template; drop past open slots and ones the template no longer covers.',
    ui: '', tables: ['availability_templates', 'availability_slots'], fr: ['FR-P3'],
  }),
  expireRequests: op({
    phase: 'later', kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'Pending past expires_at → expired, free the slot and silently re-match (skipping tried practitioners, email request_still_looking); unanswered reschedule → cancelled.',
    ui: '', tables: ['chat_requests', 'chat_request_events', 'availability_slots', 'notifications_outbox', 'waitlist_entries'], fr: ['FR-C7', 'FR-C8'],
  }),
  chatReminders: op({
    phase: 'later', kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'Once per chat: reminder_24h to both sides 24h before; 1h after the slot, debrief_prompt to the student and attendance_prompt to the practitioner.',
    ui: '', tables: ['chat_requests', 'chat_request_events', 'notifications_outbox'], fr: ['FR-C9', 'FR-R1', 'FR-R2'],
  }),
  completeChats: op({
    phase: 'later', kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'Both sides confirmed, or one side confirmed 7 days ago → completed. Two no-shows in 30 days pause that person for 30 days.',
    ui: '', tables: ['chat_requests', 'reliability_records', 'practitioner_profiles'], fr: ['FR-R2', 'FR-C10'],
  }),
  sendOutbox: op({
    kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'Send queued emails through Resend with retry and backoff; above the daily free quota, the rest stay queued.',
    ui: '', tables: ['notifications_outbox'], fr: ['FR-C9'],
  }),
  ingestAds: op({
    kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'Pull job ads from licensed sources (fixture until the source decision), dedupe, store.',
    ui: '', tables: ['data_sources', 'ingestion_runs', 'job_ads'], fr: ['FR-D1'],
  }),
  ingestOfficial: op({
    kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'Import official series (JSA Internet Vacancy Index, ASC).',
    ui: '', tables: ['data_sources', 'ingestion_runs', 'metric_points'], fr: ['FR-D1'],
  }),
  computeMetrics: op({
    kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'Extract features (seniority, work mode, work rights, skills), assign cells, compute metric_points, then revalidateTag("market").',
    ui: '', tables: ['job_ads', 'job_ad_skills', 'metric_cells', 'metric_points', 'instrument_relations'], fr: ['FR-D4', 'FR-D5'],
  }),
  detectSignals: op({
    kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'rise/fall = |change_4w| ≥ 25% and ≥ 10 ads; entry_open = entry share +10pp in 8 weeks; plus since-added on watchlists; emails signal_alert to opted-in students.',
    ui: '', tables: ['signals', 'watchlist_items', 'notifications_outbox'], fr: ['FR-M6', 'FR-W3', 'FR-W4'],
  }),
  purgeDeleted: op({
    kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'Hard-delete every row of accounts whose 30-day deletion window has passed.',
    ui: '', tables: ['account_deletions', 'profiles', 'student_profiles', 'student_skills', 'watchlist_items', 'signals', 'consents'], fr: ['FR-A5'],
  }),
} as const;

/**
 * Emails the backend sends. Subjects live in messages/en/common.json `Outbox.templates`.
 * `request_cancelled` is new (the demo does not notify the other side on cancel).
 */
export const EMAILS = [...EMAIL_TEMPLATES, 'request_cancelled'] as const;
