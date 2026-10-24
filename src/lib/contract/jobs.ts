import { z } from 'zod';
import { op } from './common';
import { EMAIL_TEMPLATES } from './entities';

// Scheduled work. Production: pg_cron → POST /api/jobs/[job] with JOBS_SECRET
// (or a SQL function), each run logged to job_runs. The demo runs the chat and
// slot jobs before every write instead (src/lib/api/jobs.ts, chat-jobs.ts).
// Pipeline jobs in JOB_NAMES (entities.ts) are the snake_case of these keys.

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
  // Data pipeline (ARCHITECTURE §5.4, §6.7, §6.8). Skill-level ads come only
  // from Greenhouse, Lever and Ashby public job-board APIs, via the `employers`
  // register; role-level counts and calibration from JSA IVI. Metrics settle
  // once a day; the hourly polls only feed the intraday layer (new_today, tape).
  pollAts: op({
    kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'Hourly, staggered: for each employer with next_poll_at due, fetch the light job list (id, title, updated time) from its ATS; queue new or changed ids; set closed_at only for ids absent from a successful complete employer snapshot, never on timeout, 429, failed or partial responses; re-estimate post_rate (Poisson λ, last 8 weeks) and set next_poll_at (busy → hourly, quiet → daily, new employers hourly for 2 weeks). Polite: ATS_USER_AGENT, robots.txt, back off on 429.',
    ui: '', tables: ['employers', 'job_ads', 'data_sources', 'ingestion_runs'], fr: ['FR-D1'],
  }),
  fetchAtsDetails: op({
    kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'After poll-ats: fetch full text only for queued new or changed ids; strip recruiter names, emails and phone numbers; dedupe on (employer, normalised title, location, description hash); upsert job_ads (raw_snippet kept 30 days).',
    ui: '', tables: ['employers', 'job_ads', 'ingestion_runs'], fr: ['FR-D1'],
  }),
  extractFeatures: op({
    kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'For each newly fetched ad: seniority, work mode and work rights rules, dictionary skill matching over title + full text, occupation (ANZSCO) from the title; stamp extraction_version.',
    ui: '', tables: ['job_ads', 'job_ad_skills', 'instrument_aliases'], fr: ['FR-D1', 'FR-D6'],
  }),
  computeMetrics: op({
    kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'Daily 04:00: assign each ad its metric_cell, write day metric_points per cell × instrument × metric (share_of_ads reweighted by the latest compute-coverage factors), then revalidateTag("market"). Its finish time is every read\'s as_of.',
    ui: '', tables: ['job_ads', 'job_ad_skills', 'metric_cells', 'metric_points'], fr: ['FR-D1', 'FR-D4', 'FR-D5'],
  }),
  computeRelations: op({
    kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'Weekly (Sunday): recompute skill co-occurrence and role component weights.',
    ui: '', tables: ['job_ad_skills', 'instrument_relations'], fr: ['FR-M3'],
  }),
  ingestJsa: op({
    kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'Monthly (1st) or by hand: download the JSA Internet Vacancy Index and write month metric_points per ANZSCO4 × state (role ad_count and growth_12m history). NERO and SPL come later.',
    ui: '', tables: ['data_sources', 'ingestion_runs', 'metric_points'], fr: ['FR-D1', 'FR-D5'],
  }),
  computeCoverage: op({
    kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'After ingest-jsa: coverage_ratio = our deduped new ads ÷ IVI new ads per ANZSCO4 × state × month (skills weight their main occupations), its band (COVERAGE_THRESHOLDS), and the occupation × state reweighting factors for share_of_ads. Record source, occupation, state, month, numerator, denominator and method version; an IVI occupation estimate does not validate skill-level counts. Suppress estimates below min_sample (default 30), with missing cells or zero denominators.',
    ui: '', tables: ['job_ads', 'metric_points'], fr: ['FR-D1', 'FR-D2'],
  }),
  detectSignals: op({
    kind: 'job', access: 'system', input: jobInput, output: jobOutput,
    does: 'Daily 04:30, after compute-metrics: rise/fall = |change_4w| ≥ 25% and ≥ 10 ads; entry_open = entry share +10pp in 8 weeks; plus since-added on watchlists; none where coverage is insufficient; emails signal_alert to opted-in students.',
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
