'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { clockNow, useDB } from '@/lib/demo/store';
import { selectSupply } from '@/lib/api/matching';
import { selectWatchlist } from '@/lib/api/watchlist';
import { getInstrument } from '@/lib/market/catalog';
import { chatHref, loginHref } from '@/lib/links';
import type { Signal } from '@/lib/market/types';
import { Button } from '@/components/ui/button';
import { Card, EmptyState, Skeleton, Stat } from '@/components/ui/primitives';
import { FilterReadback } from '@/components/market/filter-readback';
import { SignalTag } from '@/components/market/signal-tag';
import { SignalFigures } from './chat-parts';
import { InstrumentMark } from '@/components/market/instrument-mark';
import { ReviewText } from '@/features/dev/copy-review';

export interface MarketSignal {
  slug: string;
  name: string;
  symbol: string;
  signal: Signal;
}

function SignalRow({ slug, name, symbol, signal }: MarketSignal) {
  const t = useTranslations('People');
  return (
    <li className="relative flex flex-wrap items-center gap-x-4 gap-y-2 py-4 hover:bg-surface">
      <InstrumentMark tone="ink" size="sm" slug={slug} symbol={symbol} />
      <div className="min-w-0 flex-1">
        <Link href={chatHref(slug, signal.filter, signal.kind)} className="font-medium after:absolute after:inset-0">{name}</Link>
        <FilterReadback filter={signal.filter} className="block truncate text-[12.5px] text-muted" />
      </div>
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <SignalTag signal={signal} />
        <SignalFigures signal={signal} />
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">{t('talk')}<ArrowRight className="size-4" aria-hidden /></span>
    </li>
  );
}

/** Signed-in students start from their own watchlist; everyone else from market signals. */
export function StartFromSignal({ market }: { market: MarketSignal[] }) {
  const t = useTranslations('People');
  const db = useDB();
  if (!db) return <div className="flex flex-col gap-3 py-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>;
  const student = db.session?.active === 'student';
  if (student && db.watchlist.length) {
    const rows = selectWatchlist(db);
    const moving = rows.filter(r => r.signal).map(r => {
      const inst = getInstrument(r.item.instrument_slug);
      return inst && r.signal ? { slug: inst.slug, name: inst.name, symbol: inst.symbol, signal: r.signal } : null;
    }).filter((x): x is MarketSignal => x !== null);
    return (
      <div>
        <p className="kicker mb-1">{t('startMine')}</p>
        {moving.length ? (
          <ul className="divide-y divide-rule border-b border-rule">{moving.map(m => <SignalRow key={m.slug} {...m} />)}</ul>
        ) : (
          <EmptyState title={t('startEmptyTitle')} action={<Button asChild variant="subtle"><Link href="/market">{t('browseMarket')}</Link></Button>}>
            <p>{t('startEmptyBody')}</p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {rows.slice(0, 5).map(r => <li key={r.item.id}><Link className="link" href={chatHref(r.item.instrument_slug, r.item.filter)}>{t('startAnyway', { name: getInstrument(r.item.instrument_slug)?.name ?? r.item.instrument_slug })}</Link></li>)}
            </ul>
          </EmptyState>
        )}
      </div>
    );
  }
  return (
    <div>
      <p className="kicker mb-1">{t('startMarket')}</p>
      <ul className="divide-y divide-rule border-b border-rule">{market.map(m => <SignalRow key={m.slug} {...m} />)}</ul>
      {!db.session ? <p className="mt-3 text-[13px] text-muted"><Link href={loginHref('/people')} className="link">{t('signInHint')}</Link></p> : null}
    </div>
  );
}

/** Supply counts only — never a directory (§10.6). */
export function SupplyStats() {
  const t = useTranslations('People');
  const db = useDB();
  if (!db) return <Card className="p-5"><Skeleton className="h-24" /></Card>;
  const s = selectSupply(db, clockNow(db));
  return (
    <Card className="flex flex-col gap-5 p-5">
      <Stat label={t('supplyKicker')} value={t('supplyAvailable', { n: s.available })} />
      <div className="grid grid-cols-2 gap-5 border-t border-rule pt-4">
        <div>
          <p className="kicker mb-2">{t('supplyByRole')}</p>
          <ul className="flex flex-col gap-1 text-[13px]">{s.byRole.map(r => <li key={r.role_slug} className="flex justify-between gap-2"><span className="truncate text-ink-2">{r.name}</span><span className="num">{r.count}</span></li>)}</ul>
        </div>
        <div>
          <p className="kicker mb-2">{t('supplyByState')}</p>
          <ul className="flex flex-col gap-1 text-[13px]">{s.byState.map(r => <li key={r.state_id} className="flex justify-between gap-2"><span className="text-ink-2">{r.name}</span><span className="num">{r.count}</span></li>)}</ul>
        </div>
      </div>
      <p className="border-t border-rule pt-3 text-[12.5px] text-muted"><ReviewText id="people.supplyDefinition" proposal="info">{t('supplyDefinition')} {t('supplyNote')}</ReviewText></p>
    </Card>
  );
}

/** CTA that changes when the viewer already is a practitioner. */
export function PractitionerCta() {
  const t = useTranslations('People');
  const db = useDB();
  const isPractitioner = Boolean(db?.my_practitioner_id || db?.session?.personas.includes('practitioner'));
  return <Button asChild variant="outline" size="lg"><Link href={isPractitioner ? '/practitioner' : '/practitioner/join'}>{isPractitioner ? t('deskCta') : t('joinCta')}<ArrowRight aria-hidden /></Link></Button>;
}
