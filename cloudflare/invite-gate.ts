import { SignJWT, jwtVerify } from 'jose';
export interface GateEnv {
  INVITE_CODE: string;
  INVITE_SESSION_SECRET: string;
  INVITE_RATE_LIMITER: { limit(options: { key: string }): Promise<{ success: boolean }> };
}
const COOKIE = '__Host-brewdex_invite';
const TTL = 172800;
const encoder = new TextEncoder();
const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const cookie = (value: string, age = TTL) => `${COOKIE}=${value}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;
export function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || /[\\\r\n]/.test(value)) return '/';
  try {
    const url = new URL(value, 'https://brewdex.app');
    return url.origin !== 'https://brewdex.app' || url.pathname.startsWith('/invite') ? '/' : url.pathname + url.search;
  } catch { return '/'; }
}
function redirect(location: string, session?: string) {
  return new Response(null, { status: 303, headers: { ...headers, Location: location, ...(session ? { 'Set-Cookie': session } : {}) } });
}
function page(next: string, error = '', status = 200) {
  const escaped = next.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Brewdex · Invitation</title><style>body{margin:0;min-height:100svh;display:grid;place-items:center;background:#f3f1ea;color:#252820;font:16px system-ui}main{width:min(360px,calc(100% - 48px));padding:48px 0}small{letter-spacing:.15em}h1{font:42px Georgia;margin:24px 0 16px}p{line-height:1.6;color:#616653}label{display:block;margin:28px 0 8px;font-size:14px}input,button{box-sizing:border-box;width:100%;border-radius:8px;font:inherit;padding:14px}input{background:#fff;color:#252820;border:1px solid #c6cabb}button{margin-top:12px;background:#293d2b;color:#fff;border:0;cursor:pointer}.error{color:#a23524;min-height:24px}</style><main><small>BREWDEX / PRIVATE ACCESS</small><h1>A place for your<br>next discovery.</h1><p>Enter your invite code to explore Brewdex.<br>Your access lasts for 48 hours.</p><form method="post" action="/invite"><input type="hidden" name="next" value="${escaped}"><label for="code">Invite code</label><input id="code" name="code" type="password" autocomplete="off" maxlength="128" required autofocus><button type="submit">Enter Brewdex →</button><p class="error" role="alert">${error}</p></form></main></html>`, { status, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" } });
}
async function matches(a: string, b: string) {
  const [left, right] = await Promise.all([a, b].map(v => crypto.subtle.digest('SHA-256', encoder.encode(v))));
  const x = new Uint8Array(left), y = new Uint8Array(right);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
export async function inviteGate(request: Request, env: GateEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!env.INVITE_CODE || env.INVITE_CODE.length < 16 || !env.INVITE_SESSION_SECRET || env.INVITE_SESSION_SECRET.length < 32 || !env.INVITE_RATE_LIMITER) return new Response('Access is being configured. Please try again shortly.', { status: 503, headers });
  if (url.pathname === '/healthz') return Response.json({ ok: true }, { headers });
  const key = encoder.encode(env.INVITE_SESSION_SECRET);
  if (url.pathname === '/invite' && request.method === 'POST') {
    if (request.headers.get('origin') !== url.origin) return new Response('Forbidden', { status: 403, headers });
    if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return new Response('Unsupported form', { status: 415, headers });
    if (!(await env.INVITE_RATE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' })).success) return new Response('Too many attempts. Try again in one minute.', { status: 429, headers: { ...headers, 'Retry-After': '60' } });
    const reader = request.body?.getReader();
    let body = '';
    if (reader) {
      let length = 0;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 2048) { await reader.cancel(); return new Response('Form too large', { status: 413, headers }); }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    }
    const form = new URLSearchParams(body);
    const next = safeNext(form.get('next'));
    if (!await matches(form.get('code') || '', env.INVITE_CODE)) return page(next, 'That invite code is not valid.', 401);
    const token = await new SignJWT({ access: 'invite' }).setProtectedHeader({ alg: 'HS256' }).setIssuer('brewdex').setAudience('brewdex-invite').setIssuedAt().setExpirationTime(`${TTL}s`).sign(key);
    return redirect(next, cookie(token));
  }
  if (url.pathname === '/invite/logout' && request.method === 'POST') {
    if (request.headers.get('origin') !== url.origin) return new Response('Forbidden', { status: 403, headers });
    return redirect('/invite', cookie('', 0));
  }
  let valid = false;
  const token = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (token) {
    try { const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'], issuer: 'brewdex', audience: 'brewdex-invite', maxTokenAge: `${TTL}s` }); valid = payload.access === 'invite'; } catch { /* Expired or invalid session. */ }
  }
  if (url.pathname === '/invite' && request.method === 'GET') return valid ? redirect(safeNext(url.searchParams.get('next'))) : page(safeNext(url.searchParams.get('next')));
  if (valid) return null;
  if (!['GET', 'HEAD'].includes(request.method) || url.pathname.startsWith('/api/')) return Response.json({ error: 'invite_required' }, { status: 401, headers });
  return redirect(`/invite?next=${encodeURIComponent(url.pathname + url.search)}`);
}
