import { describe, expect, expectTypeOf, it } from 'vitest';
import { AREAS, CONTRACT, IMPLICIT_ERRORS, API_ERROR_CODES, type OutputOf } from '@/lib/contract';
import { JOB_NAMES } from '@/lib/contract/entities';
import { jobOps } from '@/lib/contract/jobs';
import { COVERAGE_THRESHOLDS, coverageBand, METRIC_KEYS, type Coverage } from '@/lib/contract/market';
import { METRIC_KEYS as REGISTRY_METRIC_KEYS } from '@/lib/metrics/registry';
import * as admin from '@/lib/api/admin';
import * as auth from '@/lib/api/auth';
import * as chat from '@/lib/api/chat';
import * as onboarding from '@/lib/api/onboarding';
import * as practitioner from '@/lib/api/practitioner';
import * as privacy from '@/lib/api/privacy';
import * as safety from '@/lib/api/safety';
import * as skills from '@/lib/api/skills';
import * as watchlist from '@/lib/api/watchlist';

/** Demo actions that exist only for the preview and have no production counterpart. */
const PREVIEW_ONLY = new Set(['setActingPractitioner']);

const isAsyncFunction = (v: unknown): v is (...args: unknown[]) => Promise<unknown> =>
  typeof v === 'function' && v.constructor.name === 'AsyncFunction';

describe('contract registry', () => {
  it('has unique operation names across areas', () => {
    const names = Object.values(AREAS).flatMap(ops => Object.keys(ops));
    expect(names.length).toBe(new Set(names).size);
    expect(Object.keys(CONTRACT).length).toBe(names.length);
  });

  it('describes every operation fully', () => {
    for (const [name, spec] of Object.entries(CONTRACT)) {
      expect(spec.does.length, name).toBeGreaterThan(10);
      if (spec.kind !== 'job') expect(spec.ui.length, `${name}.ui`).toBeGreaterThan(0);
      expect(spec.fr.length, `${name}.fr`).toBeGreaterThan(0);
      if (spec.kind === 'job') expect(spec.access, name).toBe('system');
      if (spec.kind === 'read') expect(spec.errors?.some(e => !e.startsWith('not_found:')) ?? false, `${name}: reads only fail with not_found`).toBe(false);
      for (const e of spec.errors ?? []) {
        expect(API_ERROR_CODES as readonly string[], `${name}: ${e}`).toContain(e.split(':')[0]);
        expect(IMPLICIT_ERRORS, `${name} repeats an implicit error`).not.toContain(e);
      }
    }
  });

  it('uses the same metric keys as the metric registry', () => {
    expect([...METRIC_KEYS].sort()).toEqual([...REGISTRY_METRIC_KEYS].sort());
  });

  it('lists only pipeline jobs that exist as job ops', () => {
    const camel = (name: string) => name.replace(/_(\w)/g, (_, c: string) => c.toUpperCase());
    for (const job of JOB_NAMES) expect(Object.keys(jobOps), job).toContain(camel(job));
    expect(Object.keys(CONTRACT)).not.toContain('ingestAds');
  });

  it('keeps coverage out of the measures', () => {
    expect(METRIC_KEYS as readonly string[]).not.toContain('coverage_ratio');
  });

  it('requires the fields the demo still defaults', () => {
    type Row = OutputOf<'getBoard'>['rows'][number];
    expectTypeOf<Row['coverage']>().toEqualTypeOf<Coverage | null>();
    expectTypeOf<Row['new_today']>().toEqualTypeOf<number | null>();
    expectTypeOf<OutputOf<'getBoard'>['polled_at']>().toEqualTypeOf<string | null>();
  });

  it('covers every action the demo backend exposes', () => {
    const modules = { admin, auth, chat, onboarding, practitioner, privacy, safety, skills, watchlist };
    const missing: string[] = [];
    for (const [file, mod] of Object.entries(modules)) {
      for (const [name, value] of Object.entries(mod)) {
        if (isAsyncFunction(value) && !PREVIEW_ONLY.has(name) && !(name in CONTRACT)) missing.push(`${file}.${name}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('coverage bands', () => {
  it('splits at 40% and 15%', () => {
    expect(coverageBand(0.62)).toBe('normal');
    expect(coverageBand(COVERAGE_THRESHOLDS.normal)).toBe('normal');
    expect(coverageBand(0.39)).toBe('low');
    expect(coverageBand(COVERAGE_THRESHOLDS.low)).toBe('low');
    expect(coverageBand(0.149)).toBe('insufficient');
    expect(coverageBand(0)).toBe('insufficient');
  });

  it('treats a missing or broken ratio as insufficient', () => {
    expect(coverageBand(null)).toBe('insufficient');
    expect(coverageBand(Number.NaN)).toBe('insufficient');
  });
});
