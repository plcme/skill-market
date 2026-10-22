import { z } from 'zod';
import { isoDateTime, noInput, op, slug } from './common';
import { availabilityWindowSchema, practitionerSelfSchema, slotSchema } from './entities';
import { practitionerInboxSchema } from './chat';

// Practitioner side: join, work-email verification, profile, weekly availability,
// pause and cap, the desk (FR-P1–P6). New practitioners start paused and
// unverified; personal email domains go to manual review (FR-X2).

export const CODE_TTL_MINUTES = 10;
export const CODE_MAX_ATTEMPTS = 3;
export const CODE_RESEND_SECONDS = 30;
export const CAP_MIN = 1;
export const CAP_MAX = 4;
export const MAX_WINDOWS = 14;
export const SLOT_HORIZON_DAYS = 28;
export const PRACTITIONER_TIMEZONES = [
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Adelaide', 'Australia/Perth', 'Australia/Hobart', 'Australia/Darwin',
] as const;
export const TOPICS = [
  'choosing_electives', 'grad_programs', 'internships', 'first_90_days', 'side_projects', 'portfolio',
  'interview_prep', 'visa_work_rights', 'switching_into_tech', 'day_to_day',
] as const;

export const JOIN_STEPS = ['agree', 'email', 'profile', 'availability', 'done'] as const;

export const deskStatsSchema = z.object({
  accepted_this_month: z.number().int(),
  cap: z.number().int(),
  open_slots: z.number().int(),
  suspended_until: isoDateTime.nullable(),
});

export const practitionerProfileInput = z.object({
  current_title: z.string().trim().min(2).max(80),
  current_role_slug: slug,
  employer: z.string().trim().min(2).max(80),
  entry_year: z.number().int().min(1980),
  location_id: z.string().min(1),
  skills: z.array(slug).min(1).max(12),
  topics: z.array(z.enum(TOPICS)).min(1).max(5),
  path: z.string().trim().min(10).max(240),
  bio: z.string().trim().max(400).default(''),
  meeting_link: z.string().trim().url().max(300).refine(u => u.startsWith('https://'), 'https').nullable(),
});

export const availabilityInput = z.object({
  timezone: z.enum(PRACTITIONER_TIMEZONES),
  windows: z.array(availabilityWindowSchema).max(MAX_WINDOWS),
});

export const manualReviewInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  linkedin_url: z.string().trim().url().max(300).refine(u => /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\//i.test(u), 'linkedin'),
  note: z.string().trim().max(400).default(''),
});

export const practitionerOps = {
  getMyPractitioner: op({
    kind: 'read', access: 'signed_in', input: noInput,
    output: z.object({ record: practitionerSelfSchema.nullable(), step: z.enum(JOIN_STEPS) }),
    does: 'My practitioner record (null before joining) and where the join flow is up to (resumable).',
    ui: '/practitioner/join, /practitioner',
    tables: ['practitioner_profiles', 'work_email_verifications', 'availability_templates'], fr: ['FR-P1'],
  }),
  joinAsPractitioner: op({
    kind: 'action', access: 'signed_in', input: z.object({ agree_18: z.literal(true), agree_conduct: z.literal(true) }), output: practitionerSelfSchema,
    does: 'Start onboarding: create my record, paused and unverified. Idempotent.',
    ui: '/practitioner/join step 1 "Start" (two checkboxes)',
    errors: ['validation:agreeRequired'],
    tables: ['practitioner_profiles', 'consents'], fr: ['FR-P1'],
  }),
  sendWorkEmailCode: op({
    kind: 'action', access: 'signed_in', input: z.object({ email: z.string().trim().toLowerCase().email().max(254) }),
    output: z.object({ email: z.string(), expires_at: isoDateTime }),
    does: 'Email a 6-digit code to a work address (10-minute expiry). Personal/free domains are refused and pointed to manual review.',
    ui: '/practitioner/join step 2 "Send code" / "Resend"',
    errors: ['validation:invalidEmail', 'validation:freeEmailDomain', 'not_found:notFound', 'conflict:alreadyVerified', 'rate_limited:rateLimited'],
    tables: ['work_email_verifications', 'rate_limits', 'notifications_outbox'], fr: ['FR-P1'],
    delta: 'Production stores only a hash of the code; the demo shows the code in the preview outbox.',
  }),
  verifyWorkEmailCode: op({
    kind: 'action', access: 'signed_in', input: z.object({ code: z.string().trim().regex(/^\d{6}$/) }), output: practitionerSelfSchema,
    does: 'Check the code (3 tries); success marks me verified by work-email domain.',
    ui: '/practitioner/join step 2 "Verify"',
    errors: ['validation:codeFormat', 'validation:codeExpired', 'not_found:codeExpired', 'validation:codeIncorrect', 'rate_limited:codeAttempts'],
    tables: ['work_email_verifications', 'practitioner_profiles'], fr: ['FR-P1'],
  }),
  requestManualReview: op({
    kind: 'action', access: 'signed_in', input: manualReviewInput, output: practitionerSelfSchema,
    does: 'No work email: queue for a human with a LinkedIn profile link.',
    ui: '/practitioner/join step 2 "Ask for a manual review"',
    errors: ['validation:linkedinUrl', 'validation:invalidEmail', 'not_found:notFound', 'conflict:alreadyVerified'],
    tables: ['practitioner_profiles', 'work_email_verifications'], fr: ['FR-X2'],
    delta: 'Evidence needs a column: practitioner_profiles.review_evidence jsonb (or its own table).',
  }),
  updatePractitionerProfile: op({
    kind: 'action', access: 'signed_in', input: practitionerProfileInput, output: practitionerSelfSchema,
    does: 'Edit the card students see: title, role, employer, entry year, location, skills, topics, path, bio, meeting link.',
    ui: '/practitioner/join step 3 and /practitioner Profile "Save"',
    errors: ['not_found:notFound', 'validation:entry_year'],
    tables: ['practitioner_profiles', 'practitioner_skills', 'practitioner_topics'], fr: ['FR-P2'],
  }),
  updateAvailabilityTemplate: op({
    kind: 'action', access: 'signed_in', input: availabilityInput, output: practitionerSelfSchema,
    does: 'Replace the weekly template (each window ≥ 20 min, no overlaps); slots for the next 28 days regenerate.',
    ui: '/practitioner/join step 4 and /practitioner Availability "Save"',
    errors: ['validation:availabilityInvalid', 'not_found:notFound'],
    tables: ['availability_templates', 'availability_slots'], fr: ['FR-P3'],
  }),
  finishPractitionerSetup: op({
    kind: 'action', access: 'signed_in', input: noInput, output: practitionerSelfSchema,
    does: 'Open for requests: unpause, add the practitioner persona and switch to it; notify matching waitlisted students if verified.',
    ui: '/practitioner/join last step "Finish and open my desk"',
    errors: ['not_found:notFound', 'validation:profileIncomplete', 'validation:availabilityMissing'],
    tables: ['practitioner_profiles', 'profiles', 'waitlist_entries', 'notifications_outbox'], fr: ['FR-P1'],
  }),
  setPaused: op({
    kind: 'action', access: 'practitioner', input: z.object({ paused: z.boolean() }), output: practitionerSelfSchema,
    does: 'Pause or resume new requests; existing chats are unaffected.',
    ui: '/practitioner "Pause new requests" switch',
    errors: ['not_found:notFound'],
    tables: ['practitioner_profiles'], fr: ['FR-P6'],
    delta: 'Demo takes a bare boolean argument.',
  }),
  updateCap: op({
    kind: 'action', access: 'practitioner', input: z.object({ cap: z.number().int().min(CAP_MIN).max(CAP_MAX) }), output: practitionerSelfSchema,
    does: 'Monthly chat cap, 1–4.',
    ui: '/practitioner Profile "Chats per month"',
    errors: ['not_found:notFound'],
    tables: ['practitioner_profiles'], fr: ['FR-P2'],
    delta: 'Demo takes a bare number argument.',
  }),
  getDesk: op({
    kind: 'read', access: 'practitioner', input: noInput,
    output: z.object({ record: practitionerSelfSchema, stats: deskStatsSchema, inbox: practitionerInboxSchema, slots: z.array(slotSchema) }),
    does: 'My desk: private stats (never shown to students), requests grouped Pending / Waiting on student / Upcoming / Confirm / Past, and the next 14 days of slots.',
    ui: '/practitioner',
    tables: ['practitioner_profiles', 'chat_requests', 'availability_slots'], fr: ['FR-P4', 'FR-P6'],
    delta: 'Demo spreads this over selectActingPractitioner / selectDeskStats / selectPractitionerInbox / selectPractitionerSlots, and lets the preview act as a seeded practitioner (setActingPractitioner) — preview only, not in production.',
  }),
} as const;
