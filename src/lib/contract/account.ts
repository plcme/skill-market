import { z } from 'zod';
import { isoDateTime, noInput, op } from './common';
import {
  blockSchema, chatEventSchema, chatRequestSchema, consentSchema, deletionRequestSchema, outboxEmailSchema, persona, reportSchema,
  sessionSchema, STUDY_YEARS, studentField, studentProfileSchema, studentSkillSchema, VISA_STATUSES, visibility, waitlistEntrySchema,
  watchlistItemSchema,
} from './entities';

// Sign-in, session, profile, privacy (FR-A1–A8). Production: Supabase Auth
// (magic link + Google, no passwords), consents recorded at sign-up.

export const CONSENT_VERSION = '2026-09';
export const MAGIC_LINK_LIMIT = 3;
export const MAGIC_LINK_WINDOW_MINUTES = 10;
export const MAGIC_LINK_TTL_MINUTES = 60;
export const PURGE_AFTER_DAYS = 30;

const consentFlags = {
  age_confirmed: z.literal(true),
  privacy_acknowledged: z.literal(true),
  /** Same-site path to land on after sign-in; anything else is ignored. */
  next: z.string().max(512).optional(),
};

export const magicLinkInput = z.object({ email: z.string().trim().toLowerCase().email().max(254), ...consentFlags });
export const googleInput = z.object(consentFlags);
export const redirectOutput = z.object({ redirect: z.string() });

export const profileInput = z.object({
  display_name: z.string().trim().min(1).max(60),
  university_id: z.string().nullable(),
  degree_id: z.string().nullable(),
  year: z.enum(STUDY_YEARS).nullable(),
  /** null clears it. */
  visa_status: z.enum(VISA_STATUSES).nullable(),
});

/** Everything held about the student (APP 12), as one JSON file. */
export const studentExportSchema = z.object({
  format: z.literal('student-export/v1'),
  generated_at: isoDateTime,
  account: z.object({ email: z.string(), display_name: z.string(), auth_method: z.string(), signed_in_at: z.string() }),
  profile: studentProfileSchema,
  skills: z.array(studentSkillSchema),
  watchlist: z.array(watchlistItemSchema),
  chat_requests: z.array(chatRequestSchema),
  chat_events: z.array(chatEventSchema),
  waitlist: z.array(waitlistEntrySchema),
  reports_filed: z.array(reportSchema),
  blocks: z.array(blockSchema),
  /** Magic-link emails keep only the address, never the token. */
  emails: z.array(outboxEmailSchema),
});

export const accountOps = {
  getSession: op({
    kind: 'read', access: 'public', input: noInput, output: sessionSchema.nullable(),
    does: 'Who is signed in, which personas they hold and which desk is active; null when signed out.',
    ui: 'Header avatar menu, every guarded page',
    tables: ['auth.users', 'profiles'], fr: ['FR-A1'],
  }),
  requestMagicLink: op({
    kind: 'action', access: 'public', input: magicLinkInput, output: z.object({ email: z.string(), expires_at: isoDateTime }),
    does: 'Email a one-hour sign-in link; records the 18+ and privacy consents with the link. Max 3 per 10 minutes per address.',
    ui: '/auth/login "Email me a sign-in link" (both checkboxes required)',
    errors: ['validation:emailInvalid', 'validation:ageRequired', 'validation:privacyRequired', 'rate_limited:rateLimited'],
    tables: ['auth.users', 'consents'], fr: ['FR-A1', 'FR-A2'],
    delta: 'Demo also returns the token so the preview can open the link; production never returns it (Supabase signInWithOtp).',
  }),
  completeSignIn: op({
    kind: 'action', access: 'public', input: z.object({ token: z.string().min(1) }), output: redirectOutput,
    does: 'The /auth/callback step: verify the link, create profile on first sign-in, merge onboarding answers given while signed out, then redirect (next → /onboarding if Tier 0 pending → /me).',
    ui: '/auth/callback (opened from the email)',
    errors: ['not_found:linkInvalid', 'conflict:linkUsed', 'validation:linkExpired'],
    tables: ['auth.users', 'profiles', 'student_profiles', 'student_skills', 'consents'], fr: ['FR-A1', 'FR-O1'],
    delta: 'Production receives Supabase `code`/`token_hash` from the callback URL; anonymous onboarding answers move from localStorage to a cookie the server can read.',
  }),
  signInWithGoogle: op({
    kind: 'action', access: 'public', input: googleInput, output: redirectOutput,
    does: 'Start Google OAuth with the same consent rules; returns where to go after the round trip.',
    ui: '/auth/login "Continue with Google"',
    errors: ['validation:ageRequired', 'validation:privacyRequired'],
    tables: ['auth.users', 'profiles', 'consents'], fr: ['FR-A1'],
    delta: 'Production returns the Google authorize URL first, then completes in /auth/callback.',
  }),
  signOut: op({
    kind: 'action', access: 'signed_in', input: noInput, output: z.object({ signed_out: z.literal(true) }),
    does: 'End the session on this device; data stays.',
    ui: 'Avatar menu "Sign out", /auth/signout',
    tables: [], fr: ['FR-A6'],
  }),
  switchPersona: op({
    kind: 'action', access: 'signed_in', input: z.object({ persona }), output: sessionSchema,
    does: 'Switch the active desk (student / practitioner / admin) among personas the account holds.',
    ui: 'Avatar menu "Switch to …"; "Switch" button on a guarded page or a request page opened in the other persona',
    tables: ['profiles'], fr: ['FR-A1'],
    delta: 'Demo uses the preview-only setPersona, which also grants personas; production only switches among held ones.',
  }),
  getProfile: op({
    kind: 'read', access: 'student', input: noInput, output: studentProfileSchema,
    does: 'The signed-in student\'s profile, visibility, email preferences and consents.',
    ui: '/me, /me/settings, onboarding',
    errors: ['not_found:notFound'],
    tables: ['student_profiles', 'email_preferences', 'consents'], fr: ['FR-A3'],
  }),
  updateProfile: op({
    kind: 'action', access: 'student', input: profileInput, output: studentProfileSchema,
    does: 'Edit name, university, degree, year, visa status (APP 13). Changing education re-infers suggestions only; changing university clears ticked units.',
    ui: '/me/settings "Save profile"',
    errors: ['not_found:notFound'],
    tables: ['student_profiles', 'student_skills'], fr: ['FR-A3'],
  }),
  updateFieldVisibility: op({
    kind: 'action', access: 'student', input: z.object({ field: studentField, visibility }), output: z.record(studentField, visibility),
    does: 'Per field: only me, or practitioners I send a request to.',
    ui: '/me/settings Privacy, one control per field',
    tables: ['student_profiles'], fr: ['FR-A4', 'FR-C11'],
  }),
  updateEmailPreferences: op({
    kind: 'action', access: 'student',
    input: z.object({ digest: z.enum(['weekly', 'monthly', 'off']).optional(), signal_alerts: z.boolean().optional() }),
    output: studentProfileSchema.shape.email_prefs,
    does: 'Digest frequency and signal alerts. Request emails cannot be turned off.',
    ui: '/me/settings Email',
    tables: ['email_preferences'], fr: ['FR-W4'],
  }),
  setUiMode: op({
    kind: 'action', access: 'student', input: z.object({ mode: z.enum(['market', 'plain']) }), output: z.enum(['market', 'plain']),
    does: 'Market words on or off (plain mode hides the tape and uses literal labels).',
    ui: '/me/settings Display',
    tables: ['student_profiles'], fr: ['PRD Q7'],
    delta: 'Demo takes the mode as a bare string argument.',
  }),
  getConsents: op({
    kind: 'read', access: 'student', input: noInput, output: z.array(consentSchema),
    does: 'What the student agreed to and when, newest first.',
    ui: '/me/settings Privacy',
    tables: ['consents'], fr: ['FR-A2'],
  }),
  requestExport: op({
    kind: 'action', access: 'student', input: noInput, output: studentExportSchema,
    does: 'Build the JSON export (downloaded in the browser) and send an export_ready email.',
    ui: '/me/settings "Download my data"',
    tables: ['student_profiles', 'student_skills', 'watchlist_items', 'chat_requests', 'chat_request_events', 'waitlist_entries', 'reports', 'blocks', 'notifications_outbox'], fr: ['FR-A5'],
  }),
  requestDeletion: op({
    kind: 'action', access: 'student', input: z.object({ confirmation: z.literal('DELETE') }), output: deletionRequestSchema,
    does: 'Delete the account: cancel open requests (freeing slots), clear personal data now, purge everything after 30 days, email deletion_scheduled, sign out.',
    ui: '/me/settings "Delete account" → type DELETE → "Delete my account"',
    errors: ['validation:deleteConfirmMismatch'],
    tables: ['account_deletions', 'student_profiles', 'student_skills', 'watchlist_items', 'waitlist_entries', 'blocks', 'chat_requests'], fr: ['FR-A5'],
  }),
} as const;
