'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Hourglass } from 'lucide-react';
import { relatedSkills } from '@/lib/market/catalog';
import type { FilterSpec, Instrument } from '@/lib/market/types';
import { chatHref } from '@/lib/links';
import { isWaitlisted, joinWaitlist } from '@/lib/api/chat';
import { useAction } from '@/lib/api/client';
import type { DemoDB } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useErrorText } from './shared';

/** FR-C6: never a dead end — related skills, then waitlist + recruiting. */
export function MatchFallback({ db, instrument, filter, fallback }: { db: DemoDB; instrument: Instrument; filter: FilterSpec; fallback: 'adjacent' | 'waitlist' | null }) {
  const t = useTranslations('NewChat');
  const { toast } = useToast();
  const errorText = useErrorText();
  const [join, state] = useAction(joinWaitlist, () => toast({ tone: 'success', title: t('waitlistJoined', { name: instrument.name }), body: t('waitlistJoinedBody') }));
  if (!fallback) return null;
  const waitlisted = isWaitlisted(db, instrument.slug);
  const joinButton = waitlisted
    ? <p className="text-sm font-medium text-up">{t('waitlistJoined', { name: instrument.name })}</p>
    : <Button variant={fallback === 'waitlist' ? 'primary' : 'subtle'} loading={state.pending} onClick={() => join({ instrument_slug: instrument.slug, filter })}>{t('waitlistJoin')}</Button>;

  if (fallback === 'adjacent') {
    return (
      <Notice tone="signal" className="mt-5" title={t('adjacentTitle', { name: instrument.name })}>
        <p>{t('adjacentBody', { name: instrument.name })}</p>
        <div className="mt-3">{joinButton}</div>
        {state.error ? <p className="mt-2 text-[13px] text-down" role="alert">{errorText(state.error)}</p> : null}
      </Notice>
    );
  }
  const related = instrument.type === 'skill' ? relatedSkills(instrument.slug, 3) : [];
  return (
    <div className="mt-6 grid gap-6 rounded-lg border border-rule bg-surface p-6 md:grid-cols-[1.3fr_1fr] md:p-8">
      <div>
        <Hourglass className="size-6 text-faint" strokeWidth={1.5} aria-hidden />
        <h3 className="mt-3 font-serif text-[26px] leading-tight">{t('waitlistTitle', { name: instrument.name })}</h3>
        <p className="mt-2 text-ink-2">{t('waitlistBody', { name: instrument.name })}</p>
        <div className="mt-5">{joinButton}</div>
        {state.error ? <p className="mt-2 text-[13px] text-down" role="alert">{errorText(state.error)}</p> : null}
      </div>
      <div className="border-t border-rule pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
        <p className="kicker">{t('waitlistAlso')}</p>
        {related.length ? (
          <>
            <p className="mt-2 text-sm font-medium">{t('waitlistRelated')}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {related.map(r => <li key={r.skill.slug}><Link className="link text-sm" href={chatHref(r.skill.slug, filter)}>{r.skill.name}</Link></li>)}
            </ul>
          </>
        ) : null}
        <p className="mt-4 text-sm text-ink-2">{t('waitlistRecruit', { name: instrument.name })}</p>
        <Link href="/practitioner/join" className="link mt-2 inline-block text-sm">{t('waitlistRecruitCta')}</Link>
      </div>
    </div>
  );
}
