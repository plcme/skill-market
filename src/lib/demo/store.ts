'use client';

import { useSyncExternalStore } from 'react';
import type { DemoDB, Persona, Session, StudentProfile } from '@/lib/api/types';
import { STUDENT_FIELDS } from '@/lib/api/types';
import { runScheduledJobs } from '@/lib/api/jobs';
import { seedSampleActivity } from '@/lib/api/sample';
import { seedPipelineRuns, seedPractitioners } from './seed';
import { HOUR } from '@/lib/time';

// Browser-only preview store. Plays the part of Supabase (tables + RLS) and
// pg_cron (scheduled jobs) so every flow is interactive without a backend.
// Nothing here leaves the browser.

const STORAGE_KEY = 'sm-preview:v1';

let db: DemoDB | null = null;
const listeners = new Set<() => void>();

export function uid(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

export function clockNow(state: Pick<DemoDB, 'clock_offset_ms'> | null = db): number {
  return Date.now() + (state?.clock_offset_ms ?? 0);
}

export function isoNow(state: Pick<DemoDB, 'clock_offset_ms'> | null = db): string {
  return new Date(clockNow(state)).toISOString();
}

export function createSeed(nowMs = Date.now()): DemoDB {
  const seed: DemoDB = {
    version: 1,
    clock_offset_ms: 0,
    session: null,
    student: null,
    skills: [],
    watchlist: [],
    practitioners: seedPractitioners(),
    slots: [],
    requests: [],
    events: [],
    waitlist: [],
    reports: [],
    blocks: [],
    outbox: [],
    pipeline_runs: seedPipelineRuns(nowMs),
    alias_overrides: [],
    my_practitioner_id: null,
    work_email_code: null,
    deletion: null,
    acting_practitioner_id: null,
  };
  runScheduledJobs(seed, nowMs);
  return seed;
}

function load(): DemoDB {
  if (typeof window === 'undefined') return createSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDB;
      if (parsed?.version === 1) return parsed;
    }
  } catch {
    // Corrupt or blocked storage: fall back to a fresh seed.
  }
  return createSeed();
}

function persist(next: DemoDB) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked (private mode): keep working in memory.
  }
}

function emit() {
  for (const l of listeners) l();
}

export function getDB(): DemoDB {
  if (!db) {
    db = load();
    runScheduledJobs(db, clockNow(db));
  }
  return db;
}

/**
 * Apply a change atomically. The recipe mutates a draft copy; scheduled jobs run
 * first so timeouts behave like pg_cron would have already processed them.
 */
export function transact<T>(recipe: (draft: DemoDB, now: number) => T): T {
  const draft = structuredClone(getDB());
  const now = clockNow(draft);
  runScheduledJobs(draft, now);
  const result = recipe(draft, now);
  db = draft;
  persist(draft);
  emit();
  return result;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    db = null;
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

const getServerSnapshot = () => null;

/** Current store (null during SSR and the hydration pass — render a skeleton). */
export function useDB(): DemoDB | null {
  return useSyncExternalStore(subscribe, getDB, getServerSnapshot);
}

// --- Preview controls -------------------------------------------------------

export function defaultStudentProfile(session: Session, now: number): StudentProfile {
  return {
    user_id: session.user_id,
    display_name: session.display_name,
    university_id: null,
    degree_id: null,
    year: null,
    unit_codes: [],
    visa_status: null,
    onboarding: { tier0: 'pending', tier1: 'pending' },
    field_visibility: Object.fromEntries(STUDENT_FIELDS.map(f => [f, f === 'visa_status' ? 'private' : 'matched_practitioner'])) as StudentProfile['field_visibility'],
    email_prefs: { digest: 'weekly', signal_alerts: true },
    ui_mode: 'market',
    consents: [
      { kind: 'age_18', version: '2026-09', at: new Date(now).toISOString() },
      { kind: 'privacy_notice', version: '2026-09', at: new Date(now).toISOString() },
    ],
    created_at: new Date(now).toISOString(),
  };
}

/** Switch persona from the preview dock. `null` signs out. */
export function setPersona(persona: Persona | null) {
  transact((d, now) => {
    if (!persona) {
      d.session = null;
      return;
    }
    if (!d.session) {
      d.session = {
        user_id: 'u-preview',
        email: 'you@student.example',
        display_name: 'Sam Taylor',
        personas: [persona],
        active: persona,
        auth_method: 'magic_link',
        signed_in_at: new Date(now).toISOString(),
      };
    }
    if (!d.session.personas.includes(persona)) d.session.personas.push(persona);
    d.session.active = persona;
    if (persona === 'student' && !d.student) d.student = defaultStudentProfile(d.session, now);
  });
}

export function advanceClock(hours: number) {
  transact(d => {
    d.clock_offset_ms += hours * HOUR;
    // Jobs ran at the old time inside transact; catch up to the new time now.
    runScheduledJobs(d, clockNow(d));
  });
}

export function resetPreview() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  db = createSeed();
  persist(db);
  emit();
}

/** Fills the store with a signed-in student who has used the product for a few weeks. */
export function loadSampleStudent() {
  transact((d, now) => {
    d.session = {
      user_id: 'u-preview',
      email: 'sam.taylor@student.example',
      display_name: 'Sam Taylor',
      personas: ['student'],
      active: 'student',
      auth_method: 'magic_link',
      signed_in_at: new Date(now).toISOString(),
    };
    const profile = defaultStudentProfile(d.session, now - 21 * 24 * HOUR);
    profile.university_id = 'usyd';
    profile.degree_id = 'bach-adv-computing';
    profile.year = '3';
    profile.unit_codes = ['INFO1110', 'DATA1001', 'COMP2123', 'DATA2001', 'ISYS2120'];
    profile.onboarding = { tier0: 'done', tier1: 'done' };
    d.student = profile;
    const at = (daysAgo: number) => new Date(now - daysAgo * 24 * HOUR).toISOString();
    d.skills = [
      { id: uid('sk'), skill_slug: 'python', source: 'confirmed', confidence: null, reason: 'INFO1110', added_at: at(21) },
      { id: uid('sk'), skill_slug: 'sql', source: 'confirmed', confidence: null, reason: 'ISYS2120', added_at: at(21) },
      { id: uid('sk'), skill_slug: 'git', source: 'self_reported', confidence: null, reason: null, added_at: at(20) },
      { id: uid('sk'), skill_slug: 'data-analysis', source: 'inferred', confidence: 0.74, reason: 'DATA2001', added_at: at(21) },
      { id: uid('sk'), skill_slug: 'statistics', source: 'inferred', confidence: 0.61, reason: 'DATA1001', added_at: at(21) },
      { id: uid('sk'), skill_slug: 'java', source: 'inferred', confidence: 0.42, reason: 'COMP2123', added_at: at(21) },
    ];
    seedSampleActivity(d, now);
  });
}
