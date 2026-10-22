'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { instrumentsOfType } from '@/lib/market/catalog';
import { LOCATIONS } from '@/lib/filters/locations';
import { TOPICS, type Topic } from '@/lib/demo/seed';
import { CAP_MAX, CAP_MIN, updateCap, updatePractitionerProfile } from '@/lib/api/practitioner';
import { useAction } from '@/lib/api/client';
import type { Practitioner } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { ChipToggleGroup, Field, Input, Select, Segmented, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/primitives';
import { useErrorText } from './shared';

const SKILLS = instrumentsOfType('skill');
const ROLES = instrumentsOfType('role');
const PLACES = LOCATIONS.filter(l => l.level !== 'country' && l.level !== 'state');

/** Public card fields (FR-P2). Used in the join flow and on the desk. */
export function ProfileForm({ practitioner, now, submitLabel, onSaved, defaultRole }: { practitioner: Practitioner; now: number; submitLabel: string; onSaved: () => void; defaultRole?: string }) {
  const t = useTranslations('PractitionerJoin');
  const errorText = useErrorText();
  const year = new Date(now).getUTCFullYear();
  const [title, setTitle] = useState(practitioner.current_title);
  const [role, setRole] = useState(practitioner.current_role_slug || (defaultRole && ROLES.some(r => r.slug === defaultRole) ? defaultRole : ''));
  const [employer, setEmployer] = useState(practitioner.employer);
  const [entryYear, setEntryYear] = useState(practitioner.entry_year);
  const [location, setLocation] = useState(practitioner.location_id);
  const [skills, setSkills] = useState<string[]>(practitioner.skills);
  const [topics, setTopics] = useState<Topic[]>(practitioner.topics.filter((x): x is Topic => (TOPICS as readonly string[]).includes(x)));
  const [path, setPath] = useState(practitioner.path);
  const [bio, setBio] = useState(practitioner.bio);
  const [link, setLink] = useState(practitioner.meeting_link ?? '');
  const [cap, setCap] = useState(String(practitioner.monthly_cap));
  const [skillFilter, setSkillFilter] = useState('');
  const [saveCap] = useAction(updateCap);
  const [save, state] = useAction(updatePractitionerProfile, async () => {
    await saveCap(Number(cap));
    onSaved();
  });
  const fields = state.error?.fields ?? {};
  const err = (k: string) => (fields[k] ? t(`fieldErrors.${k}`) : undefined);
  const shownSkills = useMemo(() => SKILLS.filter(s => !skillFilter || s.name.toLowerCase().includes(skillFilter.toLowerCase()) || skills.includes(s.slug)), [skillFilter, skills]);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={e => {
        e.preventDefault();
        void save({
          current_title: title, current_role_slug: role, employer, entry_year: entryYear, location_id: location,
          skills, topics, path, bio, meeting_link: link.trim() ? link.trim() : null,
        });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t('fTitle')} error={err('current_title')}>{({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={title} placeholder={t('fTitlePlaceholder')} onChange={e => setTitle(e.target.value)} />}</Field>
        <Field label={t('fRole')} hint={t('fRoleHint')} error={err('current_role_slug')}>
          {({ id, describedBy, invalid }) => (
            <Select id={id} aria-describedby={describedBy} aria-invalid={invalid} value={role} onChange={e => setRole(e.target.value)}>
              <option value="">{t('fRolePick')}</option>
              {ROLES.map(r => <option key={r.slug} value={r.slug}>{r.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t('fEmployer')} hint={t('fEmployerHint')} error={err('employer')}>{({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={employer} onChange={e => setEmployer(e.target.value)} />}</Field>
        <Field label={t('fEntryYear')} error={err('entry_year')}>
          {({ id, describedBy, invalid }) => (
            <Select id={id} aria-describedby={describedBy} aria-invalid={invalid} value={entryYear} onChange={e => setEntryYear(Number(e.target.value))}>
              {Array.from({ length: 30 }, (_, i) => year - i).map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t('fLocation')} error={err('location_id')}>
          {({ id }) => (
            <Select id={id} value={location} onChange={e => setLocation(e.target.value)}>
              {PLACES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t('fCap')} hint={t('fCapHint')}>
          {() => (
            <Segmented label={t('fCap')} value={cap} onValueChange={setCap} options={Array.from({ length: CAP_MAX - CAP_MIN + 1 }, (_, i) => String(CAP_MIN + i)).map(v => ({ value: v, label: v }))} />
          )}
        </Field>
      </div>
      <Field label={t('fSkills')} hint={`${t('fSkillsHint')} ${t('fSkillsCount', { n: skills.length })}`} error={err('skills')}>
        {({ id }) => (
          <div className="flex flex-col gap-2">
            <Input id={id} className="max-w-xs" placeholder={t('fSkillsSearch')} value={skillFilter} onChange={e => setSkillFilter(e.target.value)} />
            <ChipToggleGroup label={t('fSkills')} value={skills} onValueChange={v => setSkills(v.slice(0, 12))} options={shownSkills.map(s => ({ value: s.slug, label: s.name }))} />
          </div>
        )}
      </Field>
      <Field label={t('fTopics')} hint={t('fTopicsHint')} error={err('topics')}>
        {() => <ChipToggleGroup<Topic> label={t('fTopics')} value={topics} onValueChange={v => setTopics(v.slice(0, 5))} options={TOPICS.map(x => ({ value: x, label: <TopicLabel topic={x} /> }))} />}
      </Field>
      <Field label={t('fPath')} hint={t('fPathHint')} error={err('path')}>{({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} aria-invalid={invalid} rows={2} className="min-h-16" maxLength={240} value={path} placeholder={t('fPathPlaceholder')} onChange={e => setPath(e.target.value)} />}</Field>
      <Field label={t('fBio')} error={err('bio')}>{({ id }) => <Textarea id={id} rows={2} className="min-h-16" maxLength={400} value={bio} placeholder={t('fBioPlaceholder')} onChange={e => setBio(e.target.value)} />}</Field>
      <Field label={t('fLink')} hint={t('fLinkHint')} error={err('meeting_link')}>{({ id, describedBy, invalid }) => <Input id={id} type="url" aria-describedby={describedBy} aria-invalid={invalid} value={link} placeholder={t('fLinkPlaceholder')} onChange={e => setLink(e.target.value)} />}</Field>
      {state.error && !Object.keys(fields).length ? <Notice tone="warn">{errorText(state.error)}</Notice> : null}
      {Object.keys(fields).length ? <p role="alert" className="text-[13px] font-medium text-danger">{errorText(state.error)}</p> : null}
      <div><Button type="submit" loading={state.pending}>{submitLabel}</Button></div>
    </form>
  );
}

function TopicLabel({ topic }: { topic: Topic }) {
  const t = useTranslations('Topics');
  const s = t(topic);
  return <>{s.charAt(0).toUpperCase() + s.slice(1)}</>;
}
