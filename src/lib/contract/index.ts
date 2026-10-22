import type { z } from 'zod';
import { accountOps } from './account';
import { adminOps } from './admin';
import { chatOps } from './chat';
import type { OpSpec, Result } from './common';
import { jobOps } from './jobs';
import { marketOps } from './market';
import { practitionerOps } from './practitioner';
import { safetyOps } from './safety';
import { studentOps } from './student';

// The API contract between the pages and any backend.
//
// Read order: common.ts (Result, errors, op shape) → entities.ts (rows) → one
// domain file per area: market, account, student, chat, practitioner, safety,
// admin, jobs. Each operation lists who may call it, its input and output
// schemas, the errors it can return, the button that triggers it and the
// tables behind it.
//
// Two implementations: the demo (src/lib/api + src/lib/queries, localStorage
// and the synthetic market engine) and Supabase. Pages should only depend on
// `Backend`; switching an area from demo to Supabase must not touch a component.

export const CONTRACT = {
  ...marketOps,
  ...accountOps,
  ...studentOps,
  ...chatOps,
  ...practitionerOps,
  ...safetyOps,
  ...adminOps,
  ...jobOps,
} as const;

export type OperationName = keyof typeof CONTRACT;
export type InputOf<K extends OperationName> = z.input<(typeof CONTRACT)[K]['input']>;
export type OutputOf<K extends OperationName> = z.output<(typeof CONTRACT)[K]['output']>;

/** What a backend must provide: every operation, same input, Result-wrapped output. */
export type Backend = { [K in OperationName]: (input: InputOf<K>) => Promise<Result<OutputOf<K>>> };

/** Operations grouped by area, for tests and tooling. */
export const AREAS: Record<string, Record<string, OpSpec>> = {
  market: marketOps,
  account: accountOps,
  student: studentOps,
  chat: chatOps,
  practitioner: practitionerOps,
  safety: safetyOps,
  admin: adminOps,
  jobs: jobOps,
};

export * from './common';
