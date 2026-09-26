'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download, Trash2 } from 'lucide-react';
import { RequireSession } from '@/components/shell/require-session';
import { useTheme } from '@/components/shell/app-provider';
import type { ResolvedTheme } from '@/lib/theme';
import type { DemoDB, DigestFrequency, StudentField, StudentProfile, StudyYear, UiMode, Visibility, VisaStatus } from '@/lib/api/types';
import { STUDENT_FIELDS } from '@/lib/api/types';
import { DELETE_CONFIRMATION, PURGE_AFTER_DAYS, requestDeletion, requestExport, selectConsents, setUiMode, updateEmailPreferences, updateFieldVisibility, updateProfile } from '@/lib/api/privacy';
import { useAction } from '@/lib/api/client';
import { DEGREES, STUDY_YEARS, UNIVERSITIES } from '@/lib/demo/education';
import { formatDate, formatDateTime } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Field, Input, RadioCards, Segmented, Select, Switch } from '@/components/ui/form';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/overlay';
import { Card, Container, Notice, PageHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useErrorText } from '../shared';

const SECTIONS = ['profile', 'visibility', 'email', 'display', 'data'] as const;
const VISA: VisaStatus[] = ['citizen_pr', 'student_visa', 'graduate_visa', 'other', 'prefer_not'];

function Section({ id, title, lede, children }: { id: string; title: string; lede?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 border-t-2 border-rule-strong pt-3">
      <h2 id={`${id}-h`} className="font-serif text-[26px] leading-tight">{title}</h2>
      {lede ? <p className="mt-1 max-w-2xl text-sm text-muted">{lede}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ProfileForm({ profile, email, method }: { profile: StudentProfile; email: string; method: string }) {
  const t = useTranslations('Settings');
  const to = useTranslations('Onboarding');
  const errorText = useErrorText();
  const { toast } = useToast();
  const [name, setName] = useState(profile.display_name);
  const [university, setUniversity] = useState(profile.university_id ?? '');
  const [degree, setDegree] = useState(profile.degree_id ?? '');
  const [year, setYear] = useState<string>(profile.year ?? '');
  const [visa, setVisa] = useState<string>(profile.visa_status ?? '');
  const [save, state] = useAction(updateProfile);
  const fields = state.error?.fields ?? {};
  const dirty = name !== profile.display_name || university !== (profile.university_id ?? '') || degree !== (profile.degree_id ?? '') || year !== (profile.year ?? '') || visa !== (profile.visa_status ?? '');
  const educationChanged = university !== (profile.university_id ?? '') || degree !== (profile.degree_id ?? '') || year !== (profile.year ?? '');
  return (
    <form
      noValidate
      className="grid max-w-2xl gap-5"
      onSubmit={async e => {
        e.preventDefault();
        const r = await save({ display_name: name, university_id: university || null, degree_id: degree || null, year: (year || null) as StudyYear | null, visa_status: (visa || null) as VisaStatus | null });
        if (r?.ok) toast({ tone: 'success', title: t('profileSaved'), body: educationChanged ? t('profileSavedInference') : undefined });
      }}
    >
      <p className="text-sm text-ink-2">{t('signedInAs', { email, method: t(`methods.${method}`) })}</p>
      <Field label={t('name')} hint={t('nameHint')} error={fields.display_name ? errorText('nameRequired') : undefined}>
        {({ id, describedBy, invalid }) => <Input id={id} value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" aria-describedby={describedBy} aria-invalid={invalid} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={to('university')}>
          {({ id }) => (
            <Select id={id} value={university} onChange={e => setUniversity(e.target.value)}>
              <option value="">{t('notSet')}</option>
              {UNIVERSITIES.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label={to('year')}>
          {({ id }) => (
            <Select id={id} value={year} onChange={e => setYear(e.target.value)}>
              <option value="">{t('notSet')}</option>
              {STUDY_YEARS.map(y => <option key={y} value={y}>{to(`years.${y}`)}</option>)}
            </Select>
          )}
        </Field>
      </div>
      <Field label={to('degree')} hint={educationChanged ? t('educationHint') : undefined}>
        {({ id, describedBy }) => (
          <Select id={id} value={degree} onChange={e => setDegree(e.target.value)} aria-describedby={describedBy}>
            <option value="">{t('notSet')}</option>
            {DEGREES.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label={t('visa')} optional optionalLabel={t('optional')} hint={t('visaHint')}>
        {({ id, describedBy }) => (
          <Select id={id} value={visa} onChange={e => setVisa(e.target.value)} aria-describedby={describedBy}>
            <option value="">{t('visaUnset')}</option>
            {VISA.map(v => <option key={v} value={v}>{t(`visaOptions.${v}`)}</option>)}
          </Select>
        )}
      </Field>
      <details className="rounded-md border border-rule bg-paper px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">{t('visaWhyTitle')}</summary>
        <p className="mt-2 text-ink-2">{t('visaWhyBody')}</p>
      </details>
      {state.error && state.error.code !== 'validation' ? <Notice tone="warn">{errorText(state.error)}</Notice> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={state.pending} disabled={!dirty}>{t('saveProfile')}</Button>
        {!dirty ? <span className="text-[13px] text-muted">{t('noChanges')}</span> : null}
      </div>
    </form>
  );
}

function VisibilityRow({ field, value }: { field: StudentField; value: Visibility }) {
  const t = useTranslations('Settings');
  const errorText = useErrorText();
  const { toast } = useToast();
  const [save, state] = useAction(updateFieldVisibility);
  return (
    <li className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,300px)] sm:items-center sm:gap-6">
      <div>
        <p className="text-sm font-medium" id={`vis-${field}`}>{t(`fields.${field}`)}</p>
        <p className="text-[13px] text-muted">{t(`fieldHints.${field}`)}</p>
      </div>
      <Select
        aria-labelledby={`vis-${field}`}
        value={value}
        disabled={state.pending}
        onChange={async e => {
          const r = await save({ field, visibility: e.target.value as Visibility });
          if (r?.ok) toast({ tone: 'success', title: t('visibilitySaved', { field: t(`fields.${field}`) }) });
          else if (r) toast({ tone: 'warn', title: errorText(r.error) });
        }}
      >
        <option value="private">{t('visibility.private')}</option>
        <option value="matched_practitioner">{t('visibility.matched_practitioner')}</option>
      </Select>
    </li>
  );
}

function EmailPrefs({ prefs }: { prefs: StudentProfile['email_prefs'] }) {
  const t = useTranslations('Settings');
  const { toast } = useToast();
  const [save, state] = useAction(updateEmailPreferences);
  const saved = (r: Awaited<ReturnType<typeof save>>) => { if (r?.ok) toast({ tone: 'success', title: t('emailSaved') }); };
  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <p className="mb-2 text-sm font-medium">{t('digest')}</p>
        <Segmented<DigestFrequency>
          label={t('digest')}
          value={prefs.digest}
          onValueChange={async v => saved(await save({ digest: v }))}
          options={(['weekly', 'monthly', 'off'] as const).map(v => ({ value: v, label: t(`digestOptions.${v}`), disabled: state.pending }))}
        />
        <p className="mt-1.5 text-[13px] text-muted">{t('digestHint')}</p>
      </div>
      <Switch
        checked={prefs.signal_alerts}
        disabled={state.pending}
        onCheckedChange={async v => saved(await save({ signal_alerts: v }))}
        label={t('alerts')}
        description={t('alertsHint')}
      />
      <Notice title={t('transactionalTitle')}>{t('transactionalBody')}</Notice>
    </div>
  );
}

function Display({ mode }: { mode: UiMode }) {
  const t = useTranslations('Settings');
  const tn = useTranslations('Nav');
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const [save] = useAction(setUiMode);
  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <p className="mb-2 text-sm font-medium">{t('mode')}</p>
        <RadioCards<UiMode>
          label={t('mode')}
          value={mode}
          columns={2}
          onValueChange={async v => { const r = await save(v); if (r?.ok) toast({ tone: 'success', title: t('modeSaved') }); }}
          options={(['market', 'plain'] as const).map(v => ({ value: v, label: t(`modes.${v}`), description: t(`modeHints.${v}`) }))}
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">{tn('theme')}</p>
        <Segmented<ResolvedTheme> label={tn('theme')} value={resolvedTheme} onValueChange={setTheme} options={(['light', 'dark'] as const).map(v => ({ value: v, label: tn(`themes.${v}`) }))} />
        <p className="mt-1.5 text-[13px] text-muted">
          {t('themeHint')}
          {theme !== 'system' ? <>{' '}<button type="button" className="link" onClick={() => setTheme('system')}>{tn('matchDevice')}</button></> : null}
        </p>
      </div>
    </div>
  );
}

function DeleteAccount() {
  const t = useTranslations('Settings');
  const tc = useTranslations('Common');
  const errorText = useErrorText();
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const [del, state] = useAction(requestDeletion);
  const matches = typed === DELETE_CONFIRMATION;
  return (
    <Dialog onOpenChange={o => { if (!o) setTyped(''); }}>
      <DialogTrigger asChild>
        <Button variant="danger"><Trash2 aria-hidden />{t('delete')}</Button>
      </DialogTrigger>
      <DialogContent title={t('deleteTitle')} description={t('deleteDescription')} closeLabel={tc('close')}>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-2">
          <li>{t('deleteNow')}</li>
          <li>{t('deleteRequests')}</li>
          <li>{t('deletePurge', { days: PURGE_AFTER_DAYS })}</li>
          <li>{t('deleteExportFirst')}</li>
        </ul>
        <form
          className="mt-5 flex flex-col gap-4"
          onSubmit={async e => {
            e.preventDefault();
            if (!matches) return;
            const r = await del({ confirmation: DELETE_CONFIRMATION });
            if (r?.ok) router.push('/auth/signout?deleted=1');
          }}
        >
          <Field label={t('deleteType', { word: DELETE_CONFIRMATION })} error={state.error ? errorText(state.error) : undefined}>
            {({ id, describedBy, invalid }) => <Input id={id} value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" spellCheck={false} aria-describedby={describedBy} aria-invalid={invalid} className="font-mono" />}
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="submit" variant="danger" disabled={!matches} loading={state.pending}>{t('deleteConfirm')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function YourData({ db }: { db: DemoDB }) {
  const t = useTranslations('Settings');
  const errorText = useErrorText();
  const { toast } = useToast();
  const [exportData, state] = useAction(requestExport);
  const consents = selectConsents(db);
  const onExport = async () => {
    const r = await exportData();
    if (!r?.ok) {
      if (r) toast({ tone: 'warn', title: errorText(r.error) });
      return;
    }
    const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-data-${r.data.generated_at.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ tone: 'success', title: t('exportDone'), body: t('exportDoneBody') });
  };
  return (
    <div className="grid gap-8">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="font-medium">{t('exportTitle')}</p>
          <p className="mt-1 text-sm text-muted">{t('exportBody')}</p>
        </div>
        <Button variant="outline" loading={state.pending} onClick={onExport}>{!state.pending ? <Download aria-hidden /> : null}{t('export')}</Button>
      </Card>

      <div>
        <h3 className="kicker mb-2">{t('consentsTitle')}</h3>
        {consents.length ? (
          <ul className="divide-y divide-rule border-y border-rule">
            {consents.map(c => (
              <li key={`${c.kind}-${c.version}-${c.at}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm">
                <span>
                  {c.kind === 'privacy_notice' ? <Link href="/legal/privacy" className="link">{t(`consents.${c.kind}`)}</Link> : t(`consents.${c.kind}`)}
                  <span className="ml-2 font-mono text-[12px] text-muted">{t('consentVersion', { version: c.version })}</span>
                </span>
                <span className="num text-[13px] text-muted">{formatDateTime(c.at)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">{t('consentsNone')}</p>}
      </div>

      <Card className="flex flex-col gap-4 border-down/30 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="font-medium">{t('deleteTitle')}</p>
          <p className="mt-1 text-sm text-muted">{t('deleteSummary', { days: PURGE_AFTER_DAYS })}</p>
        </div>
        <DeleteAccount />
      </Card>
      <p className="text-[12.5px] text-muted">{t('dataRegion', { date: formatDate(db.student?.created_at ?? new Date().toISOString()) })}</p>
    </div>
  );
}

function Settings({ db }: { db: DemoDB }) {
  const t = useTranslations('Settings');
  const profile = db.student;
  const session = db.session;
  if (!profile || !session) return null;
  return (
    <Container className="pb-20">
      <PageHeader kicker={t('kicker')} title={t('title')} lede={t('lede')} />
      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
        <nav aria-label={t('sectionsLabel')} className="lg:sticky lg:top-24 lg:h-fit">
          <ul className="flex gap-1 overflow-x-auto pb-1 scrollbar-none lg:flex-col lg:overflow-visible">
            {SECTIONS.map(s => (
              <li key={s} className="shrink-0">
                <a href={`#${s}`} className="block rounded-[4px] px-3 py-1.5 text-sm text-ink-2 hover:bg-sunken hover:text-ink">{t(`sections.${s}`)}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-w-0 flex-col gap-14">
          <Section id="profile" title={t('sections.profile')} lede={t('profileLede')}>
            <ProfileForm key={`${profile.display_name}|${profile.university_id}|${profile.degree_id}|${profile.year}|${profile.visa_status}`} profile={profile} email={session.email} method={session.auth_method} />
          </Section>
          <Section id="visibility" title={t('sections.visibility')} lede={t('visibilityLede')}>
            <ul className="max-w-3xl divide-y divide-rule border-y border-rule">
              {STUDENT_FIELDS.map(f => <VisibilityRow key={f} field={f} value={profile.field_visibility[f]} />)}
            </ul>
            <p className="mt-3 max-w-3xl text-[13px] text-muted">{t('visibilityNote')}</p>
          </Section>
          <Section id="email" title={t('sections.email')} lede={t('emailLede')}>
            <EmailPrefs prefs={profile.email_prefs} />
          </Section>
          <Section id="display" title={t('sections.display')} lede={t('displayLede')}>
            <Display mode={profile.ui_mode} />
          </Section>
          <Section id="data" title={t('sections.data')} lede={t('dataLede')}>
            <YourData db={db} />
          </Section>
        </div>
      </div>
    </Container>
  );
}

/** `/me/settings`: profile, field visibility, email, display, export and deletion (FR-A3–A5, FR-W4, Q7). */
export function SettingsView() {
  return <RequireSession persona="student">{db => <Settings db={db} />}</RequireSession>;
}
