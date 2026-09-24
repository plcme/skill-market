'use client';

import { z } from 'zod';
import { fail, latency, ok } from './client';
import type { Consent, DemoDB, OutboxEmail, Result, Session } from './types';
import { defaultStudentProfile, transact, uid } from '@/lib/demo/store';
import { clearAnonymousOnboarding, mergeAnonymousOnboarding, readAnonymousOnboarding } from './onboarding';

// Auth domain (FR-A1, FR-A2, FR-A6; ARCHITECTURE §5.3). Actions: requestMagicLink,
// completeSignIn, signInWithGoogle, signOut. In production Supabase Auth issues
// and verifies the link; here the link lands in the preview outbox instead of
// an inbox. No passwords, ever.

export const CONSENT_VERSION = '2026-09';
export const MAGIC_LINK_LIMIT = 3;
export const MAGIC_LINK_WINDOW_MS = 10 * 60_000;
export const MAGIC_LINK_TTL_MS = 60 * 60_000;

/** Only same-site paths; never bounce back into the auth routes. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/auth')) return null;
  return next;
}

export const magicLinkInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  age_confirmed: z.literal(true),
  privacy_acknowledged: z.literal(true),
  next: z.string().max(512).optional(),
});
export type MagicLinkInput = z.input<typeof magicLinkInput>;

function fieldErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(error.issues.map(i => {
    const field = String(i.path[0] ?? 'form');
    return [field, field === 'email' ? 'emailInvalid' : field === 'age_confirmed' ? 'ageRequired' : field === 'privacy_acknowledged' ? 'privacyRequired' : 'required'];
  }));
}

/** Magic-link emails sent to an address within the rate-limit window. */
export function recentMagicLinks(d: DemoDB, email: string, now: number): OutboxEmail[] {
  return d.outbox.filter(m => m.template === 'magic_link' && m.vars.email === email && now - Date.parse(m.at) < MAGIC_LINK_WINDOW_MS);
}

/** Send a sign-in link (writes `magic_link` to the outbox). Max 3 per 10 minutes per address. */
export async function requestMagicLink(input: MagicLinkInput): Promise<Result<{ email: string; token: string; expires_at: string }>> {
  await latency();
  const parsed = magicLinkInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation', fieldErrors(parsed.error));
  const { email } = parsed.data;
  const next = safeNext(parsed.data.next) ?? '';
  return transact((d, now) => {
    if (recentMagicLinks(d, email, now).length >= MAGIC_LINK_LIMIT) return fail('rate_limited', 'rateLimited');
    const token = uid('ml') + uid('').slice(1);
    const at = new Date(now).toISOString();
    d.outbox.push({ id: uid('mail'), to: 'student', template: 'magic_link', vars: { email, token, next, consent_version: CONSENT_VERSION, consented_at: at, used: 0 }, at, request_id: null });
    return ok({ email, token, expires_at: new Date(now + MAGIC_LINK_TTL_MS).toISOString() });
  });
}

/** The newest unused link for an address, so the preview can "open" it. */
export function selectLatestMagicLink(d: DemoDB, email: string): { token: string; next: string } | null {
  const mail = [...d.outbox].reverse().find(m => m.template === 'magic_link' && m.vars.email === email && !m.vars.used);
  return mail ? { token: String(mail.vars.token), next: String(mail.vars.next ?? '') } : null;
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  const words = local.split(/[._-]+/).filter(Boolean).slice(0, 2);
  const name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).replace(/\d+/g, '')).join(' ').trim();
  return name || 'there';
}

function startStudentSession(d: DemoDB, email: string, method: Session['auth_method'], consents: Consent[], now: number) {
  const iso = new Date(now).toISOString();
  if (!d.session) {
    // The preview holds one account per browser: signing back in resumes it.
    d.session = {
      user_id: d.student?.user_id ?? uid('u'),
      email,
      display_name: d.student?.display_name ?? nameFromEmail(email),
      personas: ['student'],
      active: 'student',
      auth_method: method,
      signed_in_at: iso,
    };
  } else {
    d.session.email = email;
    if (!d.session.personas.includes('student')) d.session.personas.push('student');
    d.session.active = 'student';
    d.session.auth_method = method;
    d.session.signed_in_at = iso;
  }
  if (!d.student) {
    d.student = defaultStudentProfile(d.session, now);
    d.student.consents = consents;
  } else {
    for (const c of consents) if (!d.student.consents.some(x => x.kind === c.kind && x.version === c.version)) d.student.consents.push(c);
  }
  // Deleted data was already cleared (the server-side purge still runs); a new
  // sign-in starts a clean account, so the old deletion notice no longer applies.
  d.deletion = null;
  const merged = mergeAnonymousOnboarding(d, readAnonymousOnboarding(), now);
  if (merged) clearAnonymousOnboarding();
}

function landing(d: DemoDB, next: string | null): string {
  if (next) return next;
  return d.student?.onboarding.tier0 === 'pending' ? '/onboarding' : '/me';
}

/** Verify a magic link (the `/auth/callback` step) and start a student session. */
export async function completeSignIn(token: string): Promise<Result<{ redirect: string }>> {
  await latency();
  if (!token) return fail('validation', 'linkInvalid');
  return transact((d, now) => {
    const mail = d.outbox.find(m => m.template === 'magic_link' && m.vars.token === token);
    if (!mail) return fail('not_found', 'linkInvalid');
    if (mail.vars.used) return fail('conflict', 'linkUsed');
    if (now - Date.parse(mail.at) > MAGIC_LINK_TTL_MS) return fail('validation', 'linkExpired');
    mail.vars.used = 1;
    const at = String(mail.vars.consented_at);
    const version = String(mail.vars.consent_version);
    startStudentSession(d, String(mail.vars.email), 'magic_link', [{ kind: 'age_18', version, at }, { kind: 'privacy_notice', version, at }], now);
    return ok({ redirect: landing(d, safeNext(String(mail.vars.next ?? ''))) });
  });
}

export const googleInput = z.object({
  age_confirmed: z.literal(true),
  privacy_acknowledged: z.literal(true),
  next: z.string().max(512).optional(),
});
export type GoogleInput = z.input<typeof googleInput>;

/** Simulated Google OAuth round trip; same consent rules as the magic link. */
export async function signInWithGoogle(input: GoogleInput): Promise<Result<{ redirect: string }>> {
  await latency(300, 300);
  const parsed = googleInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation', fieldErrors(parsed.error));
  return transact((d, now) => {
    const at = new Date(now).toISOString();
    const email = d.session?.email ?? 'you@gmail.example';
    startStudentSession(d, email, 'google', [{ kind: 'age_18', version: CONSENT_VERSION, at }, { kind: 'privacy_notice', version: CONSENT_VERSION, at }], now);
    return ok({ redirect: landing(d, safeNext(parsed.data.next)) });
  });
}

/** End the session on this device. Account data stays. */
export async function signOut(): Promise<Result<{ signed_out: true }>> {
  await latency(60, 80);
  return transact(d => {
    d.session = null;
    return ok({ signed_out: true as const });
  });
}
