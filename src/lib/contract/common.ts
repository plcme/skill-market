import { z } from 'zod';

// Shared building blocks of the API contract. Every read, action and job is
// described once with `op()`; the demo backend (src/lib/api, localStorage) and
// the Supabase backend both implement the same operations, and
// tests/contract-*.test.ts checks each implementation against these schemas.

/** Error codes. `message` is always a key under `Errors` in messages/en, never prose. */
export const API_ERROR_CODES = ['unauthenticated', 'forbidden', 'validation', 'not_found', 'conflict', 'rate_limited', 'unavailable'] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const apiErrorSchema = z.object({
  code: z.enum(API_ERROR_CODES),
  /** Key under `Errors` in messages (the UI translates it). */
  message: z.string().min(1),
  /** Field name → message key, for inline form errors. */
  fields: z.record(z.string(), z.string()).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export const resultSchema = <T extends z.ZodType>(data: T) =>
  z.discriminatedUnion('ok', [z.object({ ok: z.literal(true), data }), z.object({ ok: z.literal(false), error: apiErrorSchema })]);

/**
 * Who may call an operation. Production enforces it twice: route/action guard
 * plus Postgres RLS. `system` = pg_cron / job runner with JOBS_SECRET only.
 */
export type Access = 'public' | 'signed_in' | 'student' | 'practitioner' | 'admin' | 'system';

/** `read` = no side effects (RSC / select); `action` = Server Action; `job` = scheduled. */
export type OpKind = 'read' | 'action' | 'job';

/** `code:messageKey`, e.g. `conflict:alreadyWatching`. */
export type ErrorCase = `${ApiErrorCode}:${string}`;

/** Every operation may also fail with these; they are not repeated per operation. */
export const IMPLICIT_ERRORS: readonly ErrorCase[] = ['unauthenticated:unauthenticated', 'forbidden:forbidden', 'validation:validation', 'unavailable:generic'];

export interface OpSpec<I extends z.ZodType = z.ZodType, O extends z.ZodType = z.ZodType> {
  kind: OpKind;
  access: Access;
  input: I;
  output: O;
  /** What it does, in one line. */
  does: string;
  /** The page / control that triggers it. Empty for jobs. */
  ui: string;
  /** Errors beyond IMPLICIT_ERRORS. */
  errors?: readonly ErrorCase[];
  /** Tables it reads or writes in production (ARCHITECTURE §5.1). */
  tables: readonly string[];
  /** PRD requirement ids. */
  fr: readonly string[];
  /** Where production intentionally differs from today's demo implementation. */
  delta?: string;
  /**
   * `later` = the page exists (coursework) but the backend is not built for the
   * first public launch; the entry point is closed or replaced by the waitlist.
   * Default: in the launch.
   */
  phase?: 'later';
}

export const op = <I extends z.ZodType, O extends z.ZodType>(spec: OpSpec<I, O>): OpSpec<I, O> => spec;

/** Operations that take no input. */
export const noInput = z.object({}).strict();
export const idInput = z.object({ id: z.string().min(1) });
export const idOutput = z.object({ id: z.string() });

export const isoDateTime = z.string().refine(v => !Number.isNaN(Date.parse(v)), 'iso');
export const slug = z.string().min(1).max(80);
