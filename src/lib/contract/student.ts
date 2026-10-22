import { z } from 'zod';
import { idOutput, noInput, op, slug } from './common';
import { STUDY_YEARS, studentSkillSchema, tierStatus, watchlistItemSchema } from './entities';
import { filterSpecSchema, instrumentSchema, metricReadingSchema, signalSchema } from './market';

// Student desk: onboarding, skill profile, watchlist, gap diagnosis
// (FR-O1–O6, FR-W1–W3, FR-G1–G3). No scores, ranks or percentiles of students.

export const MAX_WATCHLIST_ITEMS = 30;
export const MAX_GAP_PRIORITIES = 3;
export const SINCE_ADDED_THRESHOLD = 0.25;

// ---------------------------------------------------------------- education catalogue

export const universitySchema = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  /** Only the launch school has a unit catalogue. */
  has_units: z.boolean(),
  handbook_url: z.string().nullable(),
});
export const degreeSchema = z.object({ id: z.string(), name: z.string() });
export const courseUnitSchema = z.object({
  code: z.string(),
  title: z.string(),
  university_id: z.string(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(5)]),
});

// ---------------------------------------------------------------- onboarding

export const inferredSkillSchema = z.object({
  skill_slug: slug,
  confidence: z.number().min(0).max(1),
  /** Strongest source: unit code or degree id. */
  reason: z.string(),
  sources: z.array(z.object({ source: z.string(), confidence: z.number() })),
});

export const onboardingResultSchema = z.object({
  /** false = saved on this device only (signed out), merged at sign-in. */
  saved_to_profile: z.boolean(),
  suggestions: z.array(inferredSkillSchema),
});

export const onboardingStateSchema = z.object({
  signed_in: z.boolean(),
  university_id: z.string().nullable(),
  degree_id: z.string().nullable(),
  year: z.enum(STUDY_YEARS).nullable(),
  unit_codes: z.array(z.string()),
  tier0: tierStatus,
  tier1: tierStatus,
});

export const tier0Input = z.object({ university_id: z.string().min(1), degree_id: z.string().min(1), year: z.enum(STUDY_YEARS) });
export const tier1Input = z.object({ unit_codes: z.array(z.string().min(1)).max(60) });

// ---------------------------------------------------------------- skills

export const effort = z.enum(['weeks', 'months', 'year_plus']);
export const transferability = z.enum(['narrow', 'moderate', 'broad']);

export const nextStepSchema = z.object({
  skill: instrumentSchema,
  /** A skill on the profile it is most often asked with. */
  because: instrumentSchema.nullable(),
  affinity: z.number(),
  top_role: z.object({ role: instrumentSchema, weight: z.number() }).nullable(),
  role_count: z.number().int(),
  effort,
  transferability,
});

const boardSkill = z.object({ row: studentSkillSchema, skill: instrumentSchema });
export const skillBoardSchema = z.object({
  confirmed: z.array(boardSkill),
  suggestions: z.array(boardSkill),
  next_steps: z.array(nextStepSchema),
  /** Too little on the profile: show starting points. */
  starting_out: z.boolean(),
});

// ---------------------------------------------------------------- watchlist

export const watchlistRowSchema = z.object({
  item: watchlistItemSchema,
  current: metricReadingSchema,
  /** Relative change since added (FR-W2). */
  since_added: z.number().nullable(),
  signal: signalSchema.nullable(),
});
export const watchlistGroupsSchema = z.object({
  signals: z.array(watchlistRowSchema),
  /** Skills I have. */
  held: z.array(watchlistRowSchema),
  /** Roles I've worked in. */
  worked: z.array(watchlistRowSchema),
  watching: z.array(watchlistRowSchema),
});

export const addWatchlistInput = z.object({
  instrument_slug: slug,
  status: z.enum(['held', 'watching']),
  filter: filterSpecSchema,
  /** Invalid for the type → the type's default. */
  metric: z.string().optional(),
});
export const updateWatchlistInput = z.object({
  id: z.string().min(1),
  status: z.enum(['held', 'watching']).optional(),
  filter: filterSpecSchema.optional(),
  metric: z.string().optional(),
});

// ---------------------------------------------------------------- gap

export const wayToGetItSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('unit'), unit: courseUnitSchema, university_name: z.string(), source_url: z.string().nullable() }),
  /** Not sourced: a project idea in the skill's category. */
  z.object({ kind: z.literal('project'), category: z.string() }),
]);

export const gapDiagnosisSchema = z.object({
  role: instrumentSchema,
  filter: filterSpecSchema,
  /** At most three, each with its four reasons. */
  priorities: z.array(z.object({
    skill: instrumentSchema,
    relevance: z.number(),
    entry_share: metricReadingSchema,
    transferability,
    role_count: z.number().int(),
    effort,
    ways: z.array(wayToGetItSchema),
  })).max(MAX_GAP_PRIORITIES),
  have: z.array(z.object({ skill: instrumentSchema, relevance: z.number(), source: studentSkillSchema.shape.source, suggested: z.boolean() })),
  later: z.array(instrumentSchema),
});

// ---------------------------------------------------------------- operations

export const studentOps = {
  getEducationOptions: op({
    kind: 'read', access: 'public', input: noInput, output: z.object({ universities: z.array(universitySchema), degrees: z.array(degreeSchema) }),
    does: 'Universities and degrees for the onboarding and settings pickers.',
    ui: '/onboarding step 1, /me/settings Profile',
    tables: ['universities', 'degrees'], fr: ['FR-O1'],
  }),
  searchUnits: op({
    kind: 'read', access: 'public', input: z.object({ university_id: z.string(), q: z.string().max(40).default('') }), output: z.array(courseUnitSchema),
    does: 'Units of a university matching a code or title (all units when q is empty).',
    ui: '/onboarding?step=units search box and list',
    tables: ['course_units'], fr: ['FR-O2'],
  }),
  getOnboarding: op({
    kind: 'read', access: 'public', input: noInput, output: onboardingStateSchema,
    does: 'Current answers: the profile\'s when signed in, else this device\'s.',
    ui: '/onboarding (resume), home and desk prompts',
    tables: ['student_profiles'], fr: ['FR-O3'],
  }),
  completeTier0: op({
    kind: 'action', access: 'public', input: tier0Input, output: onboardingResultSchema,
    does: 'University + degree + year → suggested skills. Works signed out (kept on device, merged at sign-in).',
    ui: '/onboarding step 1 "Continue"',
    errors: ['validation:university', 'validation:degree'],
    tables: ['student_profiles', 'student_skills', 'degree_skill_priors'], fr: ['FR-O1'],
  }),
  completeTier1: op({
    kind: 'action', access: 'public', input: tier1Input, output: onboardingResultSchema,
    does: 'Ticked units → more suggestions. Replaces only inferred rows; confirmed and self-added skills stay.',
    ui: '/onboarding?step=units "Continue"',
    errors: ['validation:unit_codes'],
    tables: ['student_profiles', 'student_skills', 'course_unit_skills'], fr: ['FR-O2', 'FR-O4'],
  }),
  skipOnboarding: op({
    kind: 'action', access: 'public', input: z.object({ tier: z.enum(['tier0', 'tier1', 'all']) }), output: z.object({ tier0: tierStatus, tier1: tierStatus }),
    does: 'Skip a step or the rest; never blocks the product.',
    ui: '/onboarding "Skip for now"',
    tables: ['student_profiles'], fr: ['FR-O3'],
  }),
  getSkillBoard: op({
    kind: 'read', access: 'student', input: z.object({ next_limit: z.number().int().min(1).max(8).default(4) }), output: skillBoardSchema,
    does: 'Confirmed · Suggestions · Next steps (adjacent skills by co-occurrence × ease × transferability).',
    ui: '/me/skills, /me',
    tables: ['student_skills', 'instrument_relations'], fr: ['FR-O5', 'FR-O6'],
  }),
  confirmSkill: op({
    kind: 'action', access: 'student', input: z.object({ id: z.string().min(1) }), output: studentSkillSchema,
    does: 'One tap: a suggestion becomes confirmed.',
    ui: '/me/skills suggestion "Confirm"',
    errors: ['not_found:notFound'],
    tables: ['student_skills'], fr: ['FR-O4'],
  }),
  removeSkill: op({
    kind: 'action', access: 'student', input: z.object({ id: z.string().min(1) }), output: studentSkillSchema,
    does: 'Delete the row (no rejection record). Returns it so Undo can restore.',
    ui: '/me/skills "Not me" on a suggestion, remove on a confirmed skill (toast with Undo)',
    errors: ['not_found:notFound'],
    tables: ['student_skills'], fr: ['FR-O4'],
  }),
  restoreSkill: op({
    kind: 'action', access: 'student', input: studentSkillSchema, output: studentSkillSchema,
    does: 'Undo a removal exactly as it was.',
    ui: 'Undo in the removal toast',
    errors: ['conflict:skillAlreadyAdded'],
    tables: ['student_skills'], fr: ['FR-O4'],
  }),
  addSkill: op({
    kind: 'action', access: 'student', input: z.object({ skill_slug: slug }), output: studentSkillSchema,
    does: 'Add a catalogue skill as self-reported; an existing suggestion is confirmed instead.',
    ui: '/me/skills "Add a skill" search',
    errors: ['not_found:instrumentNotFound', 'conflict:skillAlreadyAdded'],
    tables: ['student_skills'], fr: ['FR-O4'],
  }),
  getWatchlist: op({
    kind: 'read', access: 'student', input: noInput, output: watchlistGroupsSchema,
    does: 'Watchlist with live values, change since added and signals; grouped Signals / Skills I have / Roles I\'ve worked in / Watching.',
    ui: '/me desk; /market Watching tab',
    tables: ['watchlist_items', 'metric_points', 'signals'], fr: ['FR-W1', 'FR-W2', 'FR-W3'],
  }),
  findWatchItem: op({
    kind: 'read', access: 'student', input: z.object({ instrument_slug: slug, filter: filterSpecSchema }), output: watchlistItemSchema.nullable(),
    does: 'The item for this instrument + filter, if watched (drives the Watch button state).',
    ui: 'Watch button on detail pages',
    tables: ['watchlist_items'], fr: ['FR-W1'],
  }),
  addWatchlistItem: op({
    kind: 'action', access: 'student', input: addWatchlistInput, output: watchlistItemSchema,
    does: 'Track instrument + filter + metric, recording today\'s value as the baseline. Held = "I have this" (skills) or "I\'ve worked in this role" (roles); industries are only watched.',
    ui: 'Detail page "Watch" (primary header action) → I have this / I\'ve worked in this role / Watch',
    errors: ['not_found:instrumentNotFound', 'validation:industriesCannotBeHeld', 'conflict:alreadyWatching', 'validation:watchlistFull'],
    tables: ['watchlist_items'], fr: ['FR-W1', 'FR-F6'],
  }),
  updateWatchlistItem: op({
    kind: 'action', access: 'student', input: updateWatchlistInput, output: watchlistItemSchema,
    does: 'Change Held/Watching, filter or metric; a new filter or metric restarts the baseline.',
    ui: 'Watch button menu; /me row menu',
    errors: ['not_found:notFound', 'validation:industriesCannotBeHeld', 'conflict:alreadyWatching'],
    tables: ['watchlist_items'], fr: ['FR-W1'],
  }),
  removeWatchlistItem: op({
    kind: 'action', access: 'student', input: z.object({ id: z.string().min(1) }), output: idOutput,
    does: 'Stop tracking.',
    ui: 'Watch button "Remove from watchlist"; /me row remove (toast with Undo)',
    errors: ['not_found:notFound'],
    tables: ['watchlist_items'], fr: ['FR-W1'],
  }),
  restoreWatchlistItem: op({
    kind: 'action', access: 'student', input: watchlistItemSchema, output: watchlistItemSchema,
    does: 'Undo a removal, baseline included.',
    ui: 'Undo in the removal toast',
    errors: ['conflict:alreadyWatching', 'validation:watchlistFull'],
    tables: ['watchlist_items'], fr: ['FR-W1'],
  }),
  diagnoseGap: op({
    kind: 'read', access: 'student', input: z.object({ role: slug, filter: filterSpecSchema }), output: gapDiagnosisSchema.nullable(),
    does: 'Compare a role\'s skills with my profile: ≤ 3 next steps with relevance, entry-level share, transferability, effort and where to learn it. null = not a role.',
    ui: '/me/gap?role=',
    tables: ['instrument_components', 'student_skills', 'course_unit_skills', 'metric_points'], fr: ['FR-G1', 'FR-G2', 'FR-G3'],
    delta: 'Demo is a pure function taking the skills list; production reads the caller\'s own skills.',
  }),
} as const;
