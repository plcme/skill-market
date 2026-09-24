'use client';

import { useCallback, useRef, useState } from 'react';
import type { ApiError, ApiErrorCode, DemoDB, Persona, Result } from './types';

// Helpers every mock action uses. Actions are async and return Result<T> exactly
// like the Server Actions in ARCHITECTURE §5.2 will; reads are synchronous
// selectors over the store (they become RSC / Supabase selects).

export const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
export const fail = (code: ApiErrorCode, message: string, fields?: Record<string, string>): { ok: false; error: ApiError } =>
  ({ ok: false, error: { code, message, fields } });

/** Simulated network latency so pending states are real. */
export function latency(min = 140, spread = 220): Promise<void> {
  const ms = process.env.NODE_ENV === 'test' ? 0 : min + Math.random() * spread;
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** RLS stand-in: the caller must be signed in with the given persona. */
export function guard(db: DemoDB, persona?: Persona): ApiError | null {
  if (!db.session) return { code: 'unauthenticated', message: 'unauthenticated' };
  if (persona && !db.session.personas.includes(persona)) return { code: 'forbidden', message: 'forbidden' };
  return null;
}

export interface ActionState {
  pending: boolean;
  error: ApiError | null;
}

/**
 * Wrap an action for a component: tracks pending/error and ignores double submits.
 * `onSuccess` runs after a successful result.
 */
export function useAction<A extends unknown[], T>(
  action: (...args: A) => Promise<Result<T>>,
  onSuccess?: (data: T) => void,
): [(...args: A) => Promise<Result<T> | null>, ActionState] {
  const [state, setState] = useState<ActionState>({ pending: false, error: null });
  const inFlight = useRef(false);
  const run = useCallback(async (...args: A) => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setState({ pending: true, error: null });
    try {
      const result = await action(...args);
      setState({ pending: false, error: result.ok ? null : result.error });
      if (result.ok) onSuccess?.(result.data);
      return result;
    } finally {
      inFlight.current = false;
    }
  }, [action, onSuccess]);
  return [run, state];
}
