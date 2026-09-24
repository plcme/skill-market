'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BadgeCheck, Check } from 'lucide-react';
import {
  CODE_MAX_ATTEMPTS, finishPractitionerSetup, joinAsPractitioner, joinStepFor, requestManualReview, selectMyPractitioner,
  sendWorkEmailCode, verifyWorkEmailCode, type JoinStep,
} from '@/lib/api/practitioner';
import { useAction } from '@/lib/api/client';
import { clockNow } from '@/lib/demo/store';
import type { DemoDB } from '@/lib/api/types';
import { RequireSession } from '@/components/shell/require-session';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/form';
import { Card, Container, Notice, PageHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { AvailabilityEditor } from './availability-editor';
import { ProfileForm } from './profile-form';
import { useErrorText } from './shared';

const STEPS: JoinStep[] = ['agree', 'email', 'profile', 'availability', 'done'];

/** /practitioner/join — FR-P1–P3: agreement → work email → profile → availability. */
export function PractitionerJoin() {
  return <RequireSession>{db => <Flow db={db} />}</RequireSession>;
}

function Flow({ db }: { db: DemoDB }) {
  const t = useTranslations('PractitionerJoin');
  const mine = selectMyPractitioner(db);
  const holds = db.session?.personas.includes('practitioner') ?? false;
  const derived = joinStepFor(mine, holds);
  // Let people revisit earlier steps without losing progress.
  const [override, setOverride] = useState<JoinStep | null>(null);
  const step = override && STEPS.indexOf(override) <= STEPS.indexOf(derived) ? override : derived;
  const index = STEPS.indexOf(step);
  const goNext = () => setOverride(null);

  return (
    <Container className="pb-24">
      <PageHeader kicker={t('kicker')} title={t('title')} lede={t('lede')} />
      <ol className="mb-8 grid grid-cols-5 gap-2 border-y border-rule py-3" aria-label={t('stepOf', { n: index + 1, total: STEPS.length })}>
        {STEPS.map((s, i) => (
          <li key={s} aria-current={s === step ? 'step' : undefined} className="flex min-w-0 flex-col gap-1.5">
            <span className={cn('h-1 rounded-full', i < index ? 'bg-ink' : i === index ? 'bg-accent' : 'bg-rule')} aria-hidden />
            <button
              type="button"
              disabled={i > STEPS.indexOf(derived) || s === 'done' || s === 'agree'}
              onClick={() => setOverride(s)}
              className={cn('truncate text-left text-[12.5px]', i <= index ? 'text-ink' : 'text-muted', s === step && 'font-medium')}
            >
              {i < index ? <Check className="mr-1 inline size-3" aria-hidden /> : null}{t(`steps.${s}`)}
            </button>
          </li>
        ))}
      </ol>
      <div className="max-w-3xl" aria-live="polite">
        {step === 'agree' ? <AgreeStep /> : null}
        {step === 'email' && mine ? <EmailStep db={db} onDone={goNext} /> : null}
        {step === 'profile' && mine ? (
          <section>
            <h2 className="font-serif text-[28px] leading-tight">{t('profileTitle')}</h2>
            <p className="mb-6 mt-2 text-ink-2">{t('profileBody')}</p>
            <ProfileForm practitioner={mine} now={clockNow(db)} submitLabel={t('profileSave')} onSaved={goNext} />
          </section>
        ) : null}
        {step === 'availability' && mine ? <AvailabilityStep db={db} /> : null}
        {step === 'done' && mine ? <DoneStep pending={mine.verification !== 'verified'} /> : null}
      </div>
    </Container>
  );
}

function AgreeStep() {
  const t = useTranslations('PractitionerJoin');
  const errorText = useErrorText();
  const [adult, setAdult] = useState(false);
  const [conduct, setConduct] = useState(false);
  const [tried, setTried] = useState(false);
  const [join, state] = useAction(joinAsPractitioner);
  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-serif text-[28px] leading-tight">{t('agreeTitle')}</h2>
      <ul className="flex flex-col gap-2 text-ink-2">
        {(['p1', 'p2', 'p3', 'p4'] as const).map(k => <li key={k} className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-up" aria-hidden />{t(`agreePoints.${k}`)}</li>)}
      </ul>
      <Card className="flex flex-col gap-4 p-5">
        <Checkbox label={t('agree18')} checked={adult} onCheckedChange={v => setAdult(v === true)} />
        <Checkbox label={t('agreeConduct')} checked={conduct} onCheckedChange={v => setConduct(v === true)} description={<Link href="/legal/conduct" className="link" target="_blank">{t('agreeConductLink')}</Link>} />
      </Card>
      {tried && (!adult || !conduct) ? <p role="alert" className="text-[13px] font-medium text-down">{errorText({ code: 'validation', message: 'agreeRequired' })}</p> : null}
      {state.error ? <Notice tone="warn">{errorText(state.error)}</Notice> : null}
      <div>
        <Button size="lg" loading={state.pending} onClick={() => { setTried(true); if (adult && conduct) void join({ agree_18: true, agree_conduct: true }); }}>{t('agreeCta')}</Button>
      </div>
    </section>
  );
}

function EmailStep({ db, onDone }: { db: DemoDB; onDone: () => void }) {
  const t = useTranslations('PractitionerJoin');
  const errorText = useErrorText();
  const { toast } = useToast();
  const mine = selectMyPractitioner(db)!;
  const pendingCode = db.work_email_code;
  const [email, setEmail] = useState(pendingCode?.email ?? '');
  const [code, setCode] = useState('');
  const [manual, setManual] = useState(mine.verification === 'manual_review');
  const [linkedin, setLinkedin] = useState('');
  const [note, setNote] = useState('');
  const [send, sendState] = useAction(sendWorkEmailCode);
  const [verify, verifyState] = useAction(verifyWorkEmailCode, p => { toast({ tone: 'success', title: t('verified', { domain: p.work_email_domain }) }); onDone(); });
  const [review, reviewState] = useAction(requestManualReview, () => onDone());
  const freeMail = sendState.error?.message === 'freeEmailDomain';
  const remaining = verifyState.error?.fields?.remaining;

  if (mine.verification === 'verified') {
    return (
      <section className="flex flex-col items-start gap-4">
        <p className="flex items-center gap-2 font-serif text-2xl"><BadgeCheck className="size-6 text-up" aria-hidden />{t('verified', { domain: mine.work_email_domain })}</p>
        <Button onClick={onDone}>{t('profileSave')}</Button>
      </section>
    );
  }

  if (manual) {
    return (
      <section className="flex flex-col gap-5">
        <h2 className="font-serif text-[28px] leading-tight">{t('manualTitle')}</h2>
        <p className="text-ink-2">{t('manualBody')}</p>
        {mine.verification === 'manual_review' ? <Notice>{t('manualPending')}</Notice> : null}
        <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); void review({ email, linkedin_url: linkedin, note }); }}>
          <Field label={t('manualEmail')} error={reviewState.error?.fields?.email ? errorText({ code: 'validation', message: 'invalidEmail' }) : undefined}>
            {({ id, invalid }) => <Input id={id} type="email" autoComplete="email" aria-invalid={invalid} value={email} onChange={e => setEmail(e.target.value)} />}
          </Field>
          <Field label={t('manualLinkedin')} hint={t('manualLinkedinHint')} error={reviewState.error?.fields?.linkedin_url ? t('manualLinkedinHint') : undefined}>
            {({ id, describedBy, invalid }) => <Input id={id} type="url" aria-describedby={describedBy} aria-invalid={invalid} value={linkedin} onChange={e => setLinkedin(e.target.value)} />}
          </Field>
          <Field label={t('manualNote')}>{({ id }) => <Textarea id={id} rows={2} className="min-h-16" maxLength={400} value={note} onChange={e => setNote(e.target.value)} />}</Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={reviewState.pending}>{t('manualSubmit')}</Button>
            {mine.verification === 'manual_review' ? <Button variant="subtle" onClick={onDone}>{t('profileSave')}</Button> : null}
            <Button variant="ghost" onClick={() => setManual(false)}>{t('useWorkEmail')}</Button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-serif text-[28px] leading-tight">{t('emailTitle')}</h2>
      <p className="text-ink-2">{t('emailBody')}</p>
      {mine.verification === 'rejected' ? <Notice tone="warn">{t('manualRejected')}</Notice> : null}
      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={e => { e.preventDefault(); void send({ email }); }}>
        <Field label={t('emailLabel')} className="flex-1" error={sendState.error && !freeMail ? errorText(sendState.error) : undefined}>
          {({ id, describedBy, invalid }) => <Input id={id} type="email" autoComplete="email" aria-describedby={describedBy} aria-invalid={invalid} placeholder={t('emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} />}
        </Field>
        <Button type="submit" variant={pendingCode ? 'subtle' : 'primary'} loading={sendState.pending}>{pendingCode ? t('emailResend') : t('emailSend')}</Button>
      </form>
      {freeMail ? (
        <Notice tone="warn" title={t('freeMailTitle')} action={<Button size="sm" variant="subtle" onClick={() => setManual(true)}>{t('manualCta')}</Button>}>{t('freeMailBody')}</Notice>
      ) : null}
      {pendingCode ? (
        <Card className="flex flex-col gap-4 p-5">
          <p className="text-sm">{t('codeSent', { email: pendingCode.email })}</p>
          <p className="text-[13px] text-muted">{t('codePreview')}</p>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={e => { e.preventDefault(); void verify({ code }); }}>
            <Field
              label={t('codeLabel')}
              className="sm:w-56"
              hint={t('codeRemaining', { n: remaining ? Number(remaining) : CODE_MAX_ATTEMPTS - pendingCode.attempts })}
              error={verifyState.error ? errorText(verifyState.error) : undefined}
            >
              {({ id, describedBy, invalid }) => <Input id={id} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-describedby={describedBy} aria-invalid={invalid} className="num tracking-[0.3em]" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />}
            </Field>
            <Button type="submit" loading={verifyState.pending} disabled={code.length !== 6}>{t('codeVerify')}</Button>
          </form>
        </Card>
      ) : null}
      {freeMail ? null : <div><Button variant="link" onClick={() => setManual(true)}>{t('manualCta')}</Button></div>}
    </section>
  );
}

function AvailabilityStep({ db }: { db: DemoDB }) {
  const t = useTranslations('PractitionerJoin');
  const errorText = useErrorText();
  const mine = selectMyPractitioner(db)!;
  const [finish, state] = useAction(finishPractitionerSetup);
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="font-serif text-[28px] leading-tight">{t('availabilityTitle')}</h2>
        <p className="mt-2 text-ink-2">{t('availabilityBody')}</p>
      </div>
      <AvailabilityEditor practitioner={mine} />
      {state.error ? <Notice tone="warn">{errorText(state.error)}</Notice> : null}
      <div className="border-t border-rule pt-5">
        <Button size="lg" disabled={!mine.availability.length} loading={state.pending} onClick={() => finish()}>{t('finish')}</Button>
      </div>
    </section>
  );
}

function DoneStep({ pending }: { pending: boolean }) {
  const t = useTranslations('PractitionerJoin');
  const router = useRouter();
  return (
    <section className="flex flex-col items-start gap-4">
      <BadgeCheck className="size-8 text-up" aria-hidden />
      <h2 className="font-serif text-[32px] leading-tight">{t('doneTitle')}</h2>
      <p className="max-w-xl text-ink-2">{pending ? t('donePending') : t('doneBody')}</p>
      <Button size="lg" onClick={() => router.push('/practitioner')}>{t('doneCta')}</Button>
    </section>
  );
}
