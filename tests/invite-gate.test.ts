import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { inviteGate, safeNext, type GateEnv } from '../cloudflare/invite-gate';
const env: GateEnv = { INVITE_CODE: 'test-invite-code-only', INVITE_SESSION_SECRET: 'test-session-key-not-for-production-12345', INVITE_RATE_LIMITER: { limit: async () => ({ success: true }) } };
const get = (path: string, cookie?: string) => new Request(`https://brewdex.app${path}`, { headers: cookie ? { cookie } : {} });
const post = (code: string, origin = 'https://brewdex.app', next = '/') => new Request('https://brewdex.app/invite', { method: 'POST', headers: { origin, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, next }) });
describe('invite boundary', () => {
  it('fails closed before configuration', async () => { expect((await inviteGate(get('/'), { ...env, INVITE_SESSION_SECRET: '' }))?.status).toBe(503); });
  it('protects pages, static assets and Next data requests', async () => {
    for (const path of ['/', '/me', '/_next/static/chunk.js', '/skills?_rsc=1']) expect((await inviteGate(get(path), env))?.status).toBe(303);
    expect((await inviteGate(get('/api/private'), env))?.status).toBe(401);
  });
  it('rejects wrong code and cross-origin submission', async () => {
    expect((await inviteGate(post('wrong'), env))?.status).toBe(401);
    expect((await inviteGate(post(env.INVITE_CODE, 'https://evil.example'), env))?.status).toBe(403);
  });
  it('limits attempts and request size', async () => {
    expect((await inviteGate(post(env.INVITE_CODE), { ...env, INVITE_RATE_LIMITER: { limit: async () => ({ success: false }) } }))?.status).toBe(429);
    expect((await inviteGate(post('x'.repeat(3000)), env))?.status).toBe(413);
  });
  it('issues a secure 48-hour session and preserves destination', async () => {
    const res = await inviteGate(post(env.INVITE_CODE, undefined, '/me?tab=saved'), env);
    expect(res?.headers.get('location')).toBe('/me?tab=saved');
    const cookie = res!.headers.get('set-cookie')!;
    for (const attr of ['__Host-brewdex_invite=', 'Max-Age=172800', 'HttpOnly', 'Secure', 'SameSite=Lax']) expect(cookie).toContain(attr);
    expect(await inviteGate(get('/me', cookie.split(';')[0]), env)).toBeNull();
    expect((await inviteGate(get('/me', cookie.split(';')[0] + 'tampered'), env))?.status).toBe(303);
    expect((await inviteGate(get('/me', cookie.split(';')[0]), { ...env, INVITE_SESSION_SECRET: 'another-key-12345678901234567890123456789' }))?.status).toBe(303);
  });
  it('rejects expired sessions', async () => {
    const token = await new SignJWT({ access: 'invite' }).setProtectedHeader({ alg: 'HS256' }).setIssuer('brewdex').setAudience('brewdex-invite').setIssuedAt(1).setExpirationTime(2).sign(new TextEncoder().encode(env.INVITE_SESSION_SECRET));
    expect((await inviteGate(get('/', `__Host-brewdex_invite=${token}`), env))?.status).toBe(303);
  });
  it('prevents open redirects and escapes form markup', async () => {
    for (const value of ['//evil.example', '/\\evil.example', 'https://evil.example', '/invite', '/\n/evil']) expect(safeNext(value)).toBe('/');
    const res = await inviteGate(get('/invite?next=' + encodeURIComponent('/?q="<script>')), env);
    expect(await res!.text()).not.toContain('<script>');
  });
  it('clears the cookie on same-origin logout', async () => {
    const res = await inviteGate(new Request('https://brewdex.app/invite/logout', { method: 'POST', headers: { origin: 'https://brewdex.app' } }), env);
    expect(res?.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
