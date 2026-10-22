import { describe, expect, it } from 'vitest';
import * as icons from 'simple-icons';
import { getInstrument, INSTRUMENTS } from '@/lib/market/catalog';
import { logoFor, SKILL_LOGO_SLUGS, SKILL_LOGOS } from '@/lib/market/logos';

const bySlug = new Map(Object.values(icons).filter((x): x is icons.SimpleIcon => typeof x === 'object' && x !== null && 'slug' in x).map(x => [x.slug, x]));

describe('skill logos', () => {
  it('maps only skills in the catalogue', () => {
    for (const slug of Object.keys(SKILL_LOGOS)) expect(getInstrument(slug)?.type, slug).toBe('skill');
  });

  it('every mapped Simple Icons slug resolves to an icon with a path', () => {
    for (const [skill, iconSlug] of Object.entries(SKILL_LOGO_SLUGS)) {
      const icon = bySlug.get(iconSlug);
      expect(icon, `${skill} → ${iconSlug}`).toBeDefined();
      expect(icon?.path.length, skill).toBeGreaterThan(10);
    }
  });

  it('pins the intended mapping', () => {
    expect(SKILL_LOGO_SLUGS).toMatchObject({ python: 'python', nodejs: 'nodedotjs', java: 'openjdk', cpp: 'cplusplus', gcp: 'googlecloud', spark: 'apachespark', revit: 'autodeskrevit' });
  });

  it('roles, industries and unmapped skills keep letters', () => {
    for (const i of INSTRUMENTS.filter(x => x.type !== 'skill')) expect(logoFor(i.slug)).toBeNull();
    for (const slug of ['sql', 'aws', 'azure', 'excel', 'data-analysis', 'toString', '__proto__']) expect(logoFor(slug)).toBeNull();
  });
});
