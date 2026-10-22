'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight, BookOpen, Check, ExternalLink, Hammer, MessagesSquare } from 'lucide-react';
import { RequireSession } from '@/components/shell/require-session';
import type { DemoDB } from '@/lib/api/types';
import { diagnoseGap, GAP_WEIGHTS, type GapPriority, type WayToGetIt } from '@/lib/api/gap';
import { isHeld } from '@/lib/api/skills';
import { instrumentsOfType, rolesForSkill } from '@/lib/market/catalog';
import type { FilterSpec } from '@/lib/market/types';
import { chatHref, instrumentPath } from '@/lib/links';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/form';
import { Badge, Card, Container, EmptyState, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { FilterReadback } from '@/components/market/filter-readback';
import { MetricValue } from '@/components/market/metric-value';
import { MetricInfo } from '@/components/market/metric-info';
import { WatchButton } from '@/components/market/watch-button';
import { useSetParams, useUrlFilter } from '@/components/market/use-url-state';
import { EffortText, TransferText } from '../shared';

function Way({ way, skillName }: { way: WayToGetIt; skillName: string }) {
  const t = useTranslations('Gap');
  const ts = useTranslations('StudentShared');
  if (way.kind === 'unit') {
    return (
      <li className="flex items-start gap-2.5">
        <BookOpen className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
        <span className="min-w-0 text-[13.5px]">
          <span className="font-mono text-[12.5px] font-medium">{way.unit.code}</span>{' '}
          <span>{way.unit.title}</span>
          <span className="block text-[12px] text-muted">
            {t('waySourceUnit', { university: way.university_name })}
            {way.source_url ? <> · <a href={way.source_url} className="link inline-flex items-center gap-0.5" target="_blank" rel="noreferrer">{t('handbook')}<ExternalLink className="size-3" aria-hidden /></a></> : null}
          </span>
        </span>
      </li>
    );
  }
  const slug = way.category.toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');
  const category = ts.has(`projects.${slug}`) ? `projects.${slug}` : 'projects.default';
  return (
    <li className="flex items-start gap-2.5">
      <Hammer className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
      <span className="min-w-0 text-[13.5px]">
        <span>{ts(category, { skill: skillName })}</span>
        <span className="block text-[12px] text-muted">{t('waySourceIdea')}</span>
      </span>
    </li>
  );
}

function Priority({ p, index, roleName, filter }: { p: GapPriority; index: number; roleName: string; filter: FilterSpec }) {
  const t = useTranslations('Gap');
  return (
    <li>
      <Card as="article" className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <span className="serif-num text-[40px] leading-none text-ink/25 before:content-[attr(data-n)]" aria-hidden data-n={String(index + 1).padStart(2, '0')} />
            <div className="min-w-0">
              <h3 className="font-serif text-[26px] leading-tight">
                <Link href={instrumentPath('skill', p.skill.slug)} className="hover:underline">{p.skill.name}</Link>
              </h3>
              <p className="text-[13px] text-muted">{p.skill.blurb}</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-rule pt-4 sm:grid-cols-2">
            <div>
              <dt className="kicker">{t('relevance')}</dt>
              <dd className="mt-1 text-sm"><span className="num font-medium">{t('relevanceValue', { pct: Math.round(p.relevance * 100), role: roleName })}</span></dd>
            </div>
            <div>
              <dt className="kicker flex items-center gap-1">{t('entry')}<MetricInfo metric="entry_level_share" type="skill" reading={p.entry_share} /></dt>
              <dd className="mt-1"><MetricValue reading={p.entry_share} size="sm" /></dd>
            </div>
            <div>
              <dt className="kicker">{t('transfer')}</dt>
              <dd className="mt-1 text-sm"><TransferText transfer={p.transferability} /><span className="block text-[12px] text-muted">{t('transferDetail', { n: p.role_count })}</span></dd>
            </div>
            <div>
              <dt className="kicker">{t('effort')}</dt>
              <dd className="mt-1 text-sm"><EffortText effort={p.effort} /></dd>
            </div>
          </dl>
        </div>
        <div className="min-w-0 border-t border-rule pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="kicker">{t('ways')}</p>
          <ul className="mt-3 flex flex-col gap-3">{p.ways.map((w, i) => <Way key={i} way={w} skillName={p.skill.name} />)}</ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <WatchButton slug={p.skill.slug} filter={filter} />
            <Button asChild variant="ghost" size="sm"><Link href={instrumentPath('skill', p.skill.slug, filter)}>{t('openSkill', { name: p.skill.name })}<ArrowRight aria-hidden /></Link></Button>
          </div>
        </div>
      </Card>
    </li>
  );
}

function RolePicker({ value, suggested }: { value: string; suggested: string[] }) {
  const t = useTranslations('Gap');
  const { set, pending } = useSetParams();
  const roles = instrumentsOfType('role').sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  const categories = [...new Set(roles.map(r => r.category))];
  return (
    <Field label={t('pickLabel')} hint={t('pickHint')} className="max-w-md">
      {({ id, describedBy }) => (
        <Select id={id} value={value} aria-describedby={describedBy} aria-busy={pending || undefined} onChange={e => set({ role: e.target.value || null })}>
          <option value="">{t('pickPlaceholder')}</option>
          {suggested.length ? (
            <optgroup label={t('pickSuggested')}>
              {suggested.map(slug => <option key={`s-${slug}`} value={slug}>{roles.find(r => r.slug === slug)?.name}</option>)}
            </optgroup>
          ) : null}
          {categories.map(c => (
            <optgroup key={c} label={c}>
              {roles.filter(r => r.category === c).map(r => <option key={r.slug} value={r.slug}>{r.name}</option>)}
            </optgroup>
          ))}
        </Select>
      )}
    </Field>
  );
}

/** Roles worth suggesting: watched roles first, then those that ask for skills on the profile. */
function suggestedRoles(db: DemoDB): string[] {
  const watched = db.watchlist.map(w => w.instrument_slug).filter(slug => instrumentsOfType('role').some(r => r.slug === slug));
  const score = new Map<string, number>();
  for (const s of db.skills) {
    for (const { role, weight } of rolesForSkill(s.skill_slug)) score.set(role.slug, (score.get(role.slug) ?? 0) + weight * (isHeld(s) ? 1 : (s.confidence ?? 0.5)));
  }
  const fromSkills = [...score.entries()].sort((a, b) => b[1] - a[1]).map(([slug]) => slug);
  return [...new Set([...watched, ...fromSkills])].slice(0, 4);
}

function Gap({ db }: { db: DemoDB }) {
  const t = useTranslations('Gap');
  const params = useSearchParams();
  const [filter] = useUrlFilter();
  const roleSlug = params.get('role') ?? '';
  const diagnosis = roleSlug ? diagnoseGap(roleSlug, db.skills, filter, db.student?.university_id ?? null) : null;
  const suggested = suggestedRoles(db);
  const role = diagnosis?.role;

  return (
    <Container className="pb-20">
      <PageHeader
        kicker={t('kicker')}
        title={role ? t('title', { role: role.name }) : t('titleEmpty')}
        lede={role ? t('lede') : t('ledeEmpty')}
      />
      <RolePicker value={diagnosis ? roleSlug : ''} suggested={suggested} />

      {roleSlug && !diagnosis ? <p role="alert" className="mt-4 text-sm text-danger">{t('unknownRole')}</p> : null}

      {!diagnosis ? (
        suggested.length ? (
          <section aria-labelledby="quick-h" className="mt-12">
            <SectionHeader id="quick-h" kicker={t('quickKicker')} title={t('quickTitle')} />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {suggested.map(slug => {
                const r = instrumentsOfType('role').find(x => x.slug === slug);
                if (!r) return null;
                return (
                  <li key={slug}>
                    <Link href={`/me/gap?role=${slug}`} className="flex h-full flex-col gap-1 rounded-md border border-rule bg-surface p-4 transition-colors hover:border-ink/40">
                      <span className="font-serif text-[20px] leading-tight">{r.name}</span>
                      <span className="text-[13px] text-muted">{r.blurb}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null
      ) : (
        <div aria-live="polite">
          <p className="mt-4 text-[13px] text-muted">{t('basedOn')} <FilterReadback filter={diagnosis.filter} /></p>

          {diagnosis.have.length ? (
            <section aria-labelledby="have-h" className="mt-10">
              <SectionHeader id="have-h" kicker={t('haveKicker')} title={t('haveTitle')} />
              <ul className="flex flex-wrap gap-2">
                {diagnosis.have.map(h => (
                  <li key={h.skill.slug}>
                    <Link href={h.suggested ? '/me/skills' : instrumentPath('skill', h.skill.slug)} className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-1.5 text-sm hover:border-ink/40">
                      {!h.suggested ? <Check className="size-3.5 text-success" aria-hidden /> : null}
                      {h.skill.name}
                      {h.suggested ? <Badge tone="outline" className="ml-1">{t('haveSuggested')}</Badge> : null}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[13px] text-muted">{diagnosis.have.some(h => h.suggested) ? t('haveNoteSuggested') : t('haveNote')}</p>
            </section>
          ) : null}

          <section aria-labelledby="steps-h" className="mt-12">
            <SectionHeader id="steps-h" kicker={t('stepsKicker')} title={diagnosis.priorities.length ? t('stepsTitle', { n: diagnosis.priorities.length, role: diagnosis.role.name }) : t('stepsDoneTitle')} />
            {diagnosis.priorities.length ? (
              <ol className="flex flex-col gap-4">
                {diagnosis.priorities.map((p, i) => <Priority key={p.skill.slug} p={p} index={i} roleName={diagnosis.role.name} filter={diagnosis.filter} />)}
              </ol>
            ) : (
              <EmptyState title={t('coveredTitle')}>{t('coveredBody', { role: diagnosis.role.name })}</EmptyState>
            )}
            {diagnosis.later.length ? (
              <p className="mt-5 text-sm text-ink-2">
                {t('later')}{' '}
                {diagnosis.later.map((s, i) => (
                  <span key={s.slug}>
                    <Link href={instrumentPath('skill', s.slug)} className="link">{s.name}</Link>
                    {i < diagnosis.later.length - 1 ? ', ' : null}
                  </span>
                ))}
              </p>
            ) : null}
          </section>

          <section aria-labelledby="act-h" className="mt-12 grid gap-6 rounded-lg bg-night p-6 text-night-ink sm:p-8 md:grid-cols-[1.3fr_auto] md:items-center">
            <div>
              <p className="kicker text-night-ink/60">{t('actKicker')}</p>
              <h2 id="act-h" className="mt-2 font-serif text-[28px] leading-tight">{t('actTitle', { role: diagnosis.role.name })}</h2>
              <p className="mt-2 max-w-xl text-night-ink/80">{t('actBody')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="signal" size="lg"><Link href={chatHref(diagnosis.role.slug, filter)}><MessagesSquare aria-hidden />{t('talk')}</Link></Button>
              <div className="[&_button]:border-night-ink/40 [&_button]:bg-night [&_button]:text-night-ink [&_button:hover]:bg-night-ink [&_button:hover]:text-night">
                <WatchButton slug={diagnosis.role.slug} filter={filter} size="md" />
              </div>
            </div>
          </section>

          <details className="mt-10 max-w-3xl rounded-md border border-rule bg-surface px-5 py-4 text-sm">
            <summary className="cursor-pointer font-medium">{t('methodTitle')}</summary>
            <p className="mt-3 text-ink-2">{t('methodBody', { relevance: GAP_WEIGHTS.relevance * 100, entry: GAP_WEIGHTS.entry * 100, transfer: GAP_WEIGHTS.transfer * 100, effort: GAP_WEIGHTS.effort * 100 })}</p>
            <Link href={instrumentPath('role', diagnosis.role.slug, filter)} className="link mt-2 inline-flex items-center gap-1">{t('roleMarket', { role: diagnosis.role.name })}<ArrowRight className="size-3.5" aria-hidden /></Link>
          </details>
        </div>
      )}
    </Container>
  );
}

/** `/me/gap?role=`: at most three next steps toward a role, each with its reasons (FR-G1–G3). */
export function GapView() {
  return <RequireSession persona="student">{db => <Gap db={db} />}</RequireSession>;
}
