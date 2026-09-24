'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Coffee, Compass, Layers } from 'lucide-react';
import type { ChatRequest, DemoDB } from '@/lib/api/types';
import type { SkillBoard } from '@/lib/api/skills';
import { clockNow } from '@/lib/demo/store';
import { getInstrument } from '@/lib/market/catalog';
import { formatDateTime } from '@/lib/time';
import { Card } from '@/components/ui/primitives';

const SLOT_MS = 20 * 60_000;

export interface ChatSummary {
  waiting: ChatRequest[];
  upcoming: ChatRequest[];
  debrief: ChatRequest[];
}

/** Coffee-chat counts for the desk, straight from the requests table (FR-M6). */
export function selectChatSummary(d: DemoDB, now: number): ChatSummary {
  const slotEnd = (r: ChatRequest) => Date.parse(r.slot_start) + SLOT_MS;
  return {
    waiting: d.requests.filter(r => r.status === 'pending' || r.status === 'reschedule_proposed'),
    upcoming: d.requests.filter(r => r.status === 'accepted' && Date.parse(r.slot_start) > now).sort((a, b) => a.slot_start.localeCompare(b.slot_start)),
    debrief: d.requests.filter(r => (r.status === 'accepted' || r.status === 'completed') && slotEnd(r) < now && !r.debrief),
  };
}

function SideCard({ icon: Icon, kicker, title, children, footer }: { icon: typeof Coffee; kicker: string; title: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <Card as="section" className="p-5">
      <p className="kicker flex items-center gap-1.5"><Icon className="size-3.5" aria-hidden />{kicker}</p>
      <h2 className="mt-1.5 font-serif text-[22px] leading-tight">{title}</h2>
      <div className="mt-4">{children}</div>
      <div className="mt-4 border-t border-rule pt-3 text-sm">{footer}</div>
    </Card>
  );
}

function Count({ n, label }: { n: number; label: string }) {
  return (
    <div className="min-w-0">
      <p className="serif-num text-[30px] leading-none">{n}</p>
      <p className="mt-1 text-[12.5px] leading-snug text-muted">{label}</p>
    </div>
  );
}

export function SkillsCard({ board }: { board: SkillBoard }) {
  const t = useTranslations('Desk');
  return (
    <SideCard icon={Layers} kicker={t('skillsKicker')} title={t('skillsTitle')} footer={<Link href="/me/skills" className="link inline-flex items-center gap-1">{board.suggestions.length ? t('skillsReview', { n: board.suggestions.length }) : t('skillsOpen')}<ArrowRight className="size-3.5" aria-hidden /></Link>}>
      <div className="grid grid-cols-3 gap-3">
        <Count n={board.confirmed.length} label={t('skillsConfirmed')} />
        <Count n={board.suggestions.length} label={t('skillsSuggested')} />
        <Count n={board.next_steps.length} label={t('skillsNext')} />
      </div>
      <p className="mt-3 text-[12.5px] text-muted">{t('skillsNote')}</p>
    </SideCard>
  );
}

export function ChatsCard({ db }: { db: DemoDB }) {
  const t = useTranslations('Desk');
  const summary = selectChatSummary(db, clockNow(db));
  const nameOf = (r: ChatRequest) => db.practitioners.find(p => p.id === r.practitioner_id)?.display_name ?? '';
  const total = db.requests.length;
  const highlight = [...summary.debrief.slice(0, 1), ...summary.upcoming.slice(0, 2)];
  return (
    <SideCard icon={Coffee} kicker={t('chatsKicker')} title={t('chatsTitle')} footer={<Link href="/me/requests" className="link inline-flex items-center gap-1">{t('chatsAll')}<ArrowRight className="size-3.5" aria-hidden /></Link>}>
      {total === 0 ? (
        <p className="text-sm text-ink-2">{t('chatsEmpty')} <Link href="/people" className="link">{t('chatsBrowse')}</Link></p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Count n={summary.waiting.length} label={t('chatsWaiting')} />
            <Count n={summary.upcoming.length} label={t('chatsUpcoming')} />
            <Count n={summary.debrief.length} label={t('chatsDebrief')} />
          </div>
          {highlight.length ? (
            <ul className="mt-4 divide-y divide-rule border-t border-rule">
              {highlight.map(r => {
                const isDebrief = summary.debrief.includes(r);
                return (
                  <li key={r.id} className="py-2.5">
                    <Link href={`/chat/${r.id}`} className="block text-sm font-medium hover:underline">
                      {t(isDebrief ? 'chatDebriefLine' : 'chatUpcomingLine', { name: nameOf(r), topic: getInstrument(r.instrument_slug)?.name ?? r.instrument_slug })}
                    </Link>
                    <p className="text-[12.5px] text-muted">{isDebrief ? t('chatDebriefHint') : formatDateTime(r.slot_start)}</p>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {summary.waiting.length ? <p className="mt-3 text-[12.5px] text-muted">{t('chatsWaitingNote')}</p> : null}
        </>
      )}
    </SideCard>
  );
}

export function NextStepCard({ roleSlug }: { roleSlug: string | null }) {
  const t = useTranslations('Desk');
  const role = roleSlug ? getInstrument(roleSlug) : undefined;
  return (
    <SideCard
      icon={Compass}
      kicker={t('nextKicker')}
      title={role ? t('nextRoleTitle', { role: role.name }) : t('nextTitle')}
      footer={<Link href={role ? `/me/gap?role=${role.slug}` : '/me/gap'} className="link inline-flex items-center gap-1">{role ? t('nextRoleCta') : t('nextCta')}<ArrowRight className="size-3.5" aria-hidden /></Link>}
    >
      <p className="text-sm text-ink-2">{role ? t('nextRoleBody') : t('nextBody')}</p>
    </SideCard>
  );
}
