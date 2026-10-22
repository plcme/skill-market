import { describe, expect, it } from 'vitest';
import { AREAS, CONTRACT, IMPLICIT_ERRORS, API_ERROR_CODES } from '@/lib/contract';
import { METRIC_KEYS } from '@/lib/contract/market';
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
