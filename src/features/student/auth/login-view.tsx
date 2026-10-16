'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, MailCheck, MailOpen } from 'lucide-react';
import { useDB } from '@/lib/demo/store';
import { requestMagicLink, safeNext, signInWithGoogle } from '@/lib/api/auth';
import { useAction } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input } from '@/components/ui/form';
import { Card, Container, Divider, Kicker, Notice, PageSkeleton } from '@/components/ui/primitives';
import { useAppName } from '@/components/shell/app-provider';
import { useErrorText } from '../shared';

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden className="size-4">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

type Sent = { email: string; token: string };

/** `/auth/login`: magic link or (simulated) Google, 18+ and privacy notice first (FR-A1, FR-A2, FR-A6). */
export function LoginView() {
  const t = useTranslations('Auth');
  const tc = useTranslations('Common');
  const appName = useAppName();
  const errorText = useErrorText();
  const db = useDB();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next')) ?? '';
  const [email, setEmail] = useState('');
  const [age, setAge] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<Sent | null>(null);
  const [send, sendState] = useAction(requestMagicLink);
  const [google, googleState] = useAction(signInWithGoogle);

  if (!db) return <Container><PageSkeleton label={tc('loading')} /></Container>;

  const consentErrors = () => {
    const e: Record<string, string> = {};
    if (!age) e.age_confirmed = 'ageRequired';
    if (!privacy) e.privacy_acknowledged = 'privacyRequired';
    return e;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const local = consentErrors();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) local.email = 'emailInvalid';
    setFields(local);
    if (Object.keys(local).length) return;
    const r = await send({ email, age_confirmed: true, privacy_acknowledged: true, next: next || undefined });
    if (!r) return;
    if (r.ok) setSent({ email: r.data.email, token: r.data.token });
    else setFields(r.error.fields ?? {});
  };

  const onGoogle = async () => {
    const local = consentErrors();
    setFields(local);
    if (Object.keys(local).length) return;
    const r = await google({ age_confirmed: true, privacy_acknowledged: true, next: next || undefined });
    if (r?.ok) router.push(r.data.redirect);
  };

  const signedIn = db.session?.personas.includes('student') ? db.session : null;
  const formError = sendState.error && sendState.error.code !== 'validation' ? sendState.error : googleState.error && googleState.error.code !== 'validation' ? googleState.error : null;

  return (
    <Container className="grid grid-cols-[minmax(0,1fr)] gap-10 pb-20 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-20">
      <div className="max-w-xl">
        <Kicker>{t('kicker')}</Kicker>
        <h1 className="display mt-3 text-[40px] sm:text-[56px]">{t('title')}</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">{t('lede', { app: appName })}</p>
        <ul className="mt-8 flex flex-col gap-4 border-t border-rule pt-6">
          {(['b1', 'b2', 'b3'] as const).map(k => (
            <li key={k} className="flex gap-3 text-[15px] text-ink-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <span>{t(`benefits.${k}`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[13px] text-muted">{t('free')}</p>
      </div>

      <Card className="h-fit p-5 sm:p-7">
        {signedIn && !sent ? (
          <div className="flex flex-col gap-4">
            <Notice tone="success" title={t('alreadyTitle')}>{t('alreadyBody', { email: signedIn.email })}</Notice>
            <div className="flex flex-wrap gap-2">
              <Button asChild><Link href={next || '/me'}>{t('goDesk')}<ArrowRight aria-hidden /></Link></Button>
              <Button asChild variant="ghost"><Link href="/auth/signout">{t('signOutInstead')}</Link></Button>
            </div>
          </div>
        ) : sent ? (
          <div className="flex flex-col gap-4" aria-live="polite">
            <MailCheck className="size-7 text-accent" aria-hidden strokeWidth={1.5} />
            <h2 className="font-serif text-[28px] leading-tight">{t('sentTitle')}</h2>
            <p className="break-words text-[15px] text-ink-2">{t('sentBody', { email: sent.email })}</p>
            <p className="text-[13px] text-muted">{t('sentHint')}</p>
            <div className="rounded-md border border-dashed border-rule bg-paper p-4">
              <p className="kicker">{t('previewKicker')}</p>
              <p className="mt-1 text-[13px] text-ink-2">{t('previewBody')}</p>
              <Button asChild variant="accent" className="mt-3 h-auto min-h-10 w-full whitespace-normal py-2 sm:w-auto">
                <Link href={`/auth/callback?${new URLSearchParams({ token: sent.token, ...(next ? { next } : {}) }).toString()}`}>
                  <MailOpen aria-hidden />{t('openPreview')}
                </Link>
              </Button>
            </div>
            {sendState.error ? <p role="alert" className="text-[13px] font-medium text-danger">{errorText(sendState.error)}</p> : null}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Button variant="link" loading={sendState.pending} onClick={async () => { const r = await send({ email: sent.email, age_confirmed: true, privacy_acknowledged: true, next: next || undefined }); if (r?.ok) setSent({ email: r.data.email, token: r.data.token }); }}>{t('resend')}</Button>
              <Button variant="link" onClick={() => { setSent(null); setFields({}); }}>{t('differentEmail')}</Button>
            </div>
          </div>
        ) : (
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
            <h2 className="font-serif text-[26px] leading-tight">{t('formTitle')}</h2>
            <Field label={t('email')} hint={t('emailHint')} error={fields.email ? errorText(fields.email) : undefined}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} placeholder={t('emailPlaceholder')} />
              )}
            </Field>
            <div className="flex flex-col gap-3 border-t border-rule pt-4">
              <div>
                <Checkbox checked={age} onCheckedChange={v => setAge(v === true)} label={t('age')} description={t('ageHint')} aria-invalid={Boolean(fields.age_confirmed)} />
                {fields.age_confirmed ? <p className="ml-[30px] mt-1 text-[13px] font-medium text-danger">{errorText(fields.age_confirmed)}</p> : null}
              </div>
              <div>
                <Checkbox
                  checked={privacy}
                  onCheckedChange={v => setPrivacy(v === true)}
                  label={t('privacy')}
                  description={t.rich('privacyHint', { link: chunks => <Link href="/legal/privacy" className="link" target="_blank">{chunks}</Link> })}
                  aria-invalid={Boolean(fields.privacy_acknowledged)}
                />
                {fields.privacy_acknowledged ? <p className="ml-[30px] mt-1 text-[13px] font-medium text-danger">{errorText(fields.privacy_acknowledged)}</p> : null}
              </div>
            </div>
            {formError ? <Notice tone="warn">{errorText(formError)}</Notice> : null}
            <Button type="submit" size="lg" loading={sendState.pending}>{t('submit')}</Button>
            <div className="flex items-center gap-3" aria-hidden>
              <Divider className="flex-1" />
              <span className="kicker">{tc('or')}</span>
              <Divider className="flex-1" />
            </div>
            <Button variant="subtle" size="lg" loading={googleState.pending} onClick={onGoogle}>
              {!googleState.pending ? <GoogleMark /> : null}{t('google')}
            </Button>
            <p className="text-[12.5px] text-muted">{t('googleNote')}</p>
          </form>
        )}
      </Card>
    </Container>
  );
}
