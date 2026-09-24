import { beforeEach, describe, expect, it } from 'vitest';
import { advanceClock, getDB, resetPreview } from '../src/lib/demo/store';
import { completeSignIn, MAGIC_LINK_LIMIT, requestMagicLink, safeNext, selectLatestMagicLink, signInWithGoogle, signOut } from '../src/lib/api/auth';
import { clearAnonymousOnboarding, completeTier0, completeTier1, readAnonymousOnboarding } from '../src/lib/api/onboarding';

const email = 'alex.chen@student.example';
const consent = { age_confirmed: true as const, privacy_acknowledged: true as const };

beforeEach(() => {
  resetPreview();
  clearAnonymousOnboarding();
});

describe('magic link sign-in (FR-A1, FR-A2)', () => {
  it('requires a valid email, 18+ confirmation and the privacy acknowledgement', async () => {
    const bad = await requestMagicLink({ email: 'nope', age_confirmed: false as unknown as true, privacy_acknowledged: true });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error.code).toBe('validation');
      expect(bad.error.fields).toMatchObject({ email: 'emailInvalid', age_confirmed: 'ageRequired' });
    }
    expect(getDB().outbox).toHaveLength(0);
  });

  it('writes the link to the outbox and allows at most 3 per 10 minutes', async () => {
    for (let i = 0; i < MAGIC_LINK_LIMIT; i++) expect((await requestMagicLink({ email, ...consent })).ok).toBe(true);
    const blocked = await requestMagicLink({ email: email.toUpperCase(), ...consent });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.code).toBe('rate_limited');
    expect(getDB().outbox.filter(m => m.template === 'magic_link')).toHaveLength(MAGIC_LINK_LIMIT);
    advanceClock(11 / 60);
    expect((await requestMagicLink({ email, ...consent })).ok).toBe(true);
  });

  it('verifies the link once, records consent and lands on onboarding', async () => {
    const sent = await requestMagicLink({ email, ...consent });
    if (!sent.ok) throw new Error('send failed');
    expect(selectLatestMagicLink(getDB(), email)?.token).toBe(sent.data.token);
    const r = await completeSignIn(sent.data.token);
    expect(r).toEqual({ ok: true, data: { redirect: '/onboarding' } });
    const d = getDB();
    expect(d.session).toMatchObject({ email, active: 'student', auth_method: 'magic_link', display_name: 'Alex Chen' });
    expect(d.student?.consents.map(c => c.kind).sort()).toEqual(['age_18', 'privacy_notice']);
    const again = await completeSignIn(sent.data.token);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.message).toBe('linkUsed');
  });

  it('honours a safe `next` and rejects expired or unknown links', async () => {
    const sent = await requestMagicLink({ email, ...consent, next: '/me/skills' });
    if (!sent.ok) throw new Error('send failed');
    expect(await completeSignIn(sent.data.token)).toEqual({ ok: true, data: { redirect: '/me/skills' } });
    await signOut();
    const old = await requestMagicLink({ email, ...consent, next: '//evil.example' });
    if (!old.ok) throw new Error('send failed');
    advanceClock(2);
    const expired = await completeSignIn(old.data.token);
    expect(!expired.ok && expired.error.message).toBe('linkExpired');
    const unknown = await completeSignIn('ml-nothing');
    expect(!unknown.ok && unknown.error.message).toBe('linkInvalid');
    expect(safeNext('/auth/login')).toBeNull();
    expect(safeNext('https://x.example')).toBeNull();
  });

  it('merges anonymous onboarding answers into the new profile', async () => {
    await completeTier0({ university_id: 'usyd', degree_id: 'bach-data-science', year: '2' });
    await completeTier1({ unit_codes: ['ISYS2120'] });
    expect(getDB().skills).toHaveLength(0);
    expect(readAnonymousOnboarding()?.tier1).toBe('done');
    const sent = await requestMagicLink({ email, ...consent });
    if (!sent.ok) throw new Error('send failed');
    const r = await completeSignIn(sent.data.token);
    expect(r.ok && r.data.redirect).toBe('/me');
    const d = getDB();
    expect(d.student).toMatchObject({ university_id: 'usyd', degree_id: 'bach-data-science', year: '2', unit_codes: ['ISYS2120'], onboarding: { tier0: 'done', tier1: 'done' } });
    const sql = d.skills.find(s => s.skill_slug === 'sql');
    expect(sql).toMatchObject({ source: 'inferred', reason: 'ISYS2120' });
    expect(d.skills.every(s => s.source === 'inferred' && s.confidence !== null)).toBe(true);
    expect(readAnonymousOnboarding()).toBeNull();
  });

  it('signs in with Google (simulated) under the same consent rules, and signs out', async () => {
    const denied = await signInWithGoogle({ age_confirmed: true, privacy_acknowledged: false as unknown as true });
    expect(denied.ok).toBe(false);
    const r = await signInWithGoogle({ ...consent, next: '/me' });
    expect(r.ok && r.data.redirect).toBe('/me');
    expect(getDB().session?.auth_method).toBe('google');
    await signOut();
    expect(getDB().session).toBeNull();
    expect(getDB().student).not.toBeNull();
  });
});
