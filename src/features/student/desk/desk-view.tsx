'use client';

import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';
import { RequireSession } from '@/components/shell/require-session';
import type { DemoDB } from '@/lib/api/types';
import { selectWatchlistGroups, type WatchlistRow } from '@/lib/api/watchlist';
import { selectSkillBoard } from '@/lib/api/skills';
import { clockNow } from '@/lib/demo/store';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import { getInstrument } from '@/lib/market/catalog';
import { DEFAULT_TZ, formatDate } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Container, EmptyState, Monogram, Notice, SectionHeader } from '@/components/ui/primitives';
import { WatchButton } from '@/components/market/watch-button';
import { useModeT } from '../shared';
import { ChatsCard, NextStepCard, SkillsCard } from './side-cards';
import { SignalCard, WatchHead, WatchRow } from './watchlist';

function greetingKey(now: number): 'morning' | 'afternoon' | 'evening' {
  const hour = Number(new Intl.DateTimeFormat('en-AU', { hour: 'numeric', hour12: false, timeZone: DEFAULT_TZ }).format(now));
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

function Group({ title, rows, emptyText }: { title: string; rows: WatchlistRow[]; emptyText: string }) {
  return (
    <section aria-label={title} className="mt-6">
      <h3 className="kicker mb-2 flex items-center gap-2">{title}<span className="num normal-case tracking-normal text-faint">{rows.length}</span></h3>
      {rows.length ? (
        <>
          <WatchHead />
          <ul className="divide-y divide-rule border-b border-rule">{rows.map(r => <WatchRow key={r.item.id} row={r} />)}</ul>
        </>
      ) : <p className="border-y border-rule py-4 text-sm text-muted">{emptyText}</p>}
    </section>
  );
}

function EmptyWatchlist({ db }: { db: DemoDB }) {
  const t = useModeT('Desk');
  const board = selectSkillBoard(db);
  const picks = [...board.confirmed, ...board.suggestions].slice(0, 4).map(b => b.skill);
  const fallback = picks.length ? picks : board.next_steps.map(s => s.skill).slice(0, 4);
  return (
    <EmptyState title={t('emptyTitle')} action={<Button asChild><Link href="/market">{t('browse')}<ArrowRight aria-hidden /></Link></Button>}>
      <p>{t('emptyBody')}</p>
      {fallback.length ? (
        <div className="mt-5">
          <p className="kicker mb-2">{picks.length ? t('emptyFromProfile') : t('emptyStarters')}</p>
          <ul className="divide-y divide-rule rounded-md border border-rule bg-surface">
            {fallback.map(s => (
              <li key={s.slug} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Monogram size="sm">{s.symbol}</Monogram>
                  <Link href={`/s/${s.slug}`} className="truncate font-medium hover:underline">{s.name}</Link>
                </span>
                <WatchButton slug={s.slug} filter={DEFAULT_FILTER} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </EmptyState>
  );
}

function Desk({ db }: { db: DemoDB }) {
  const t = useModeT('Desk');
  const now = clockNow(db);
  const groups = selectWatchlistGroups(db);
  const board = selectSkillBoard(db);
  const name = (db.student?.display_name ?? db.session?.display_name ?? '').split(' ')[0];
  const total = groups.held.length + groups.watching.length;
  const watchedRole = db.watchlist.find(w => getInstrument(w.instrument_slug)?.type === 'role')?.instrument_slug ?? null;
  const setupPending = db.student?.onboarding.tier0 === 'pending';

  return (
    <Container className="pb-20">
      <header className="flex flex-col gap-3 pb-6 pt-8 sm:pt-12">
        <p className="kicker">{t('kicker', { date: formatDate(new Date(now).toISOString(), { weekday: 'long', day: 'numeric', month: 'long' }) })}</p>
        <h1 className="display text-[40px] sm:text-[56px]">{name ? t(`greeting.${greetingKey(now)}`, { name }) : t('title')}</h1>
        <p className="max-w-2xl text-[17px] leading-relaxed text-ink-2" aria-live="polite">
          {total === 0 ? t('ledeEmpty') : groups.signals.length ? t('ledeSignals', { n: groups.signals.length }) : t('ledeQuiet')}
        </p>
      </header>

      {setupPending ? (
        <Notice tone="signal" title={t('setupTitle')} action={<Button asChild size="sm"><Link href="/onboarding">{t('setupCta')}</Link></Button>} className="mb-8">
          {t('setupBody')}
        </Notice>
      ) : null}

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
        <div className="min-w-0">
          {total > 0 ? (
            <section aria-labelledby="signals-h" className="mb-12">
              <SectionHeader id="signals-h" kicker={t('signalsKicker')} title={t('signalsTitle')} />
              {groups.signals.length ? (
                <ul className="flex flex-col gap-3">{groups.signals.map(r => <SignalCard key={r.item.id} row={r} />)}</ul>
              ) : (
                <p className="flex items-start gap-2 text-sm text-muted"><Zap className="mt-0.5 size-4 shrink-0" aria-hidden />{t('signalsNone')}</p>
              )}
            </section>
          ) : null}

          <section aria-labelledby="watch-h">
            <SectionHeader
              id="watch-h"
              kicker={t('watchKicker')}
              title={t('watchTitle')}
              action={total ? <Link href="/market" className="link text-sm">{t('addMore')}</Link> : null}
            />
            {total === 0 ? <EmptyWatchlist db={db} /> : (
              <>
                <p className="text-[13px] text-muted">{t('watchNote')}</p>
                <Group title={t('held')} rows={groups.held} emptyText={t('heldEmpty')} />
                <Group title={t('watching')} rows={groups.watching} emptyText={t('watchingEmpty')} />
              </>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4" aria-label={t('sideLabel')}>
          <SkillsCard board={board} />
          <ChatsCard db={db} />
          <NextStepCard roleSlug={watchedRole} />
        </aside>
      </div>
    </Container>
  );
}

/** `/me`: the 30-second view — signals first, then the watchlist, skills and chats (FR-M6, FR-W1–W3). */
export function DeskView() {
  return <RequireSession persona="student">{db => <Desk db={db} />}</RequireSession>;
}
