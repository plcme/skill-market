import { describe, expect, it } from 'vitest';
import { parseStoredTheme, resolveTheme, THEME_SCRIPT, toggledTheme } from '../src/lib/theme';
import { accountLinks, accountMenuLinks, deskFor, mobileMenuLinks, PRIMARY_NAV } from '../src/components/shell/nav-model';
import type { Session } from '../src/lib/api/types';

describe('two-state theme', () => {
  it('treats anything but light/dark as "follow the device"', () => {
    expect(parseStoredTheme(null)).toBe('system');
    expect(parseStoredTheme('system')).toBe('system');
    expect(parseStoredTheme('sepia')).toBe('system');
    expect(parseStoredTheme('dark')).toBe('dark');
    expect(parseStoredTheme('light')).toBe('light');
  });
  it('follows the device until a choice is stored, then the choice wins', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
  it('toggles to the opposite of what is on screen', () => {
    expect(toggledTheme('light')).toBe('dark');
    expect(toggledTheme('dark')).toBe('light');
    // From an unset preference on a dark device, one click stores light.
    expect(toggledTheme(resolveTheme('system', true))).toBe('light');
  });
  it('pre-paint script applies the same rules', () => {
    const run = (stored: string | null, systemDark: boolean) => {
      const html = { dataset: {} as Record<string, string> };
      const fn = new Function('localStorage', 'matchMedia', 'document', THEME_SCRIPT);
      fn({ getItem: () => stored }, () => ({ matches: systemDark }), { documentElement: html });
      return html.dataset.theme;
    };
    expect(run(null, true)).toBe('dark');
    expect(run(null, false)).toBe('light');
    expect(run('system', true)).toBe('dark');
    expect(run('light', true)).toBe('light');
    expect(run('dark', false)).toBe('dark');
    const blocked = new Function('localStorage', 'matchMedia', 'document', THEME_SCRIPT);
    const html = { dataset: {} as Record<string, string> };
    blocked({ getItem: () => { throw new Error('blocked'); } }, () => ({ matches: true }), { documentElement: html });
    expect(html.dataset.theme).toBe('dark');
  });
});

describe('navigation model', () => {
  const student = { active: 'student', personas: ['student'] } as unknown as Session;
  const practitioner = { active: 'practitioner', personas: ['practitioner'] } as unknown as Session;
  it('keeps the primary nav to Market and People', () => {
    expect(PRIMARY_NAV.map(l => l.href)).toEqual(['/market', '/people']);
  });
  it('puts the desk first in the account menu, once', () => {
    const desk = deskFor(student);
    expect(desk?.href).toBe('/me');
    expect(accountLinks(student).map(l => l.href)).not.toContain('/me');
    expect(accountMenuLinks(student).map(l => l.href)).toEqual(['/me', '/me/skills', '/me/requests', '/me/settings']);
    expect(accountMenuLinks(practitioner).map(l => l.href)).toEqual(['/practitioner']);
    expect(accountMenuLinks(null)).toEqual([]);
  });
  it('mobile menu sheet keeps to the primary nav (desk and account live in the account menu)', () => {
    expect(mobileMenuLinks(student).map(l => l.href)).toEqual(['/market', '/people']);
    expect(mobileMenuLinks(null).map(l => l.href)).toEqual(['/market', '/people']);
  });
});
