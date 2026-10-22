'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Bookmark, MoreHorizontal, Package, SlidersHorizontal, Trash2 } from 'lucide-react';
import type { WatchlistRow } from '@/lib/api/watchlist';
import { removeWatchlistItem, restoreWatchlistItem, updateWatchlistItem } from '@/lib/api/watchlist';
import { useAction } from '@/lib/api/client';
import { computeSparkline } from '@/lib/market/engine';
import { getInstrument } from '@/lib/market/catalog';
import { direction, formatChange, formatPp, formatShare, primaryValue } from '@/lib/market/format';
import type { FilterSpec, Instrument, MetricReading } from '@/lib/market/types';
import { chatHref, instrumentPath } from '@/lib/links';
import { formatDate } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Dialog, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, SheetContent } from '@/components/ui/overlay';

import { useToast } from '@/components/ui/toast';
import { FilterEditor } from '@/components/market/filter-builder';
import { FilterReadback } from '@/components/market/filter-readback';
import { MetricValue } from '@/components/market/metric-value';
import { MetricInfo } from '@/components/market/metric-info';
import { SignalTag } from '@/components/market/signal-tag';
import { Sparkline } from '@/components/market/sparkline';
import { ChangeBadge } from '@/components/market/change-badge';
import { DirectionGlyph, signDirection } from '@/components/market/direction-glyph';
import { cn } from '@/lib/utils';
import { METRICS } from '@/lib/metrics/registry';
import { useErrorText, useModeT } from '../shared';
import { InstrumentMark } from '@/components/market/instrument-mark';

function valueAt(reading: MetricReading, value: number): string {
  return primaryValue({ ...reading, status: 'ok', value }) ?? '—';
}

/** "Since added" with its baseline and date — never a bare percentage (FR-W2, FR-D3). */
export function SinceAdded({ row, className }: { row: WatchlistRow; className?: string }) {
  const t = useTranslations('Desk');
  const { item, current, since_added } = row;
  if (since_added === null || item.baseline_value === null || current.value === null) {
    return <span className={cn('text-[13px] text-muted', className)}>{t('sinceUnavailable')}</span>;
  }
  // For measures that are already a change (e.g. 12-month growth), the honest
  // "since added" is the difference in points, not a change of a change.
  const isChange = METRICS[item.metric].unit === 'change';
  const delta = isChange ? current.value - item.baseline_value : since_added;
  const dir = direction(delta);
  return (
    <span className={cn('inline-flex flex-col gap-0.5', className)}>
      <span className={cn('num inline-flex items-center gap-1 text-sm font-medium', dir === 'up' && 'text-up', dir === 'down' && 'text-down', dir === 'flat' && 'text-muted')}>
        <DirectionGlyph dir={dir} />
        {isChange ? t('sincePp', { pp: formatPp(delta) }) : formatChange(since_added)}
      </span>
      <span className="num whitespace-nowrap text-[12px] text-muted">{t('sinceDetail', { from: valueAt(current, item.baseline_value), to: valueAt(current, current.value), date: formatDate(item.baseline_at, { day: 'numeric', month: 'short' }) })}</span>
    </span>
  );
}

/** Signal figure for the desk: the change that triggered it, with absolute values. */
export function SignalFigure({ row }: { row: WatchlistRow }) {
  const t = useTranslations('Desk');
  const signal = row.signal;
  if (!signal) return null;
  if (signal.kind === 'since_added') return <SinceAdded row={row} />;
  if (signal.kind === 'entry_open') {
    const dir = signDirection(signal.magnitude);
    return (
      <span className="inline-flex flex-col gap-0.5">
        <span className={cn('num inline-flex items-center gap-1 text-sm font-medium', dir === 'up' && 'text-up', dir === 'down' && 'text-down', dir === 'flat' && 'text-muted')}>
          <DirectionGlyph dir={dir} />
          {t('entryPp', { pp: formatPp(signal.magnitude) })}
        </span>
        <span className="num text-[12px] text-muted">{t('entryDetail', { from: formatShare(signal.from), to: formatShare(signal.to) })}</span>
      </span>
    );
  }
  const reading: MetricReading = { ...row.current, metric: 'change_4w', status: 'ok', value: signal.magnitude, from: signal.from, to: signal.to };
  return <ChangeBadge reading={reading} size="sm" />;
}

function EditFilter({ item, instrument, open, onOpenChange }: { item: WatchlistRow['item']; instrument: Instrument; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations('Desk');
  const tc = useTranslations('Common');
  const errorText = useErrorText();
  const { toast } = useToast();
  const [draft, setDraft] = useState<FilterSpec>(item.filter);
  const [save, state] = useAction(updateWatchlistItem);
  const valid = draft.rules.every(r => r.work_modes.length && r.location_ids.length);
  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (o) setDraft(item.filter); }}>
      <SheetContent
        title={t('editTitle', { name: instrument.name })}
        description={t('editBody')}
        closeLabel={tc('close')}
        footer={
          <>
            {state.error ? <p role="alert" className="mr-auto text-[13px] text-danger">{errorText(state.error)}</p> : null}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>{tc('cancel')}</Button>
            <Button disabled={!valid} loading={state.pending} onClick={async () => {
              const r = await save({ id: item.id, filter: draft });
              if (r?.ok) {
                onOpenChange(false);
                toast({ tone: 'success', title: t('filterSaved', { name: instrument.name }), body: t('filterSavedBody') });
              }
            }}>{tc('save')}</Button>
          </>
        }
      >
        {open ? <FilterEditor value={draft} onChange={setDraft} /> : null}
      </SheetContent>
    </Dialog>
  );
}

function RowActions({ row, instrument }: { row: WatchlistRow; instrument: Instrument }) {
  const t = useModeT('Desk');
  const errorText = useErrorText();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [update, updateState] = useAction(updateWatchlistItem);
  const [remove, removeState] = useAction(removeWatchlistItem);
  const { item } = row;
  const onRemove = async () => {
    const snapshot = structuredClone(item);
    const r = await remove(item.id);
    if (r?.ok) {
      toast({
        title: t('removed', { name: instrument.name }),
        action: {
          label: t('undo'),
          onClick: async () => {
            const back = await restoreWatchlistItem(snapshot);
            if (!back.ok) toast({ tone: 'warn', title: errorText(back.error) });
          },
        },
      });
    } else if (r) toast({ tone: 'warn', title: errorText(r.error) });
  };
  const onToggle = async () => {
    const next = item.status === 'held' ? 'watching' : 'held';
    const r = await update({ id: item.id, status: next });
    if (r?.ok) toast({ tone: 'success', title: next === 'held' ? t('movedHeld', { name: instrument.name }) : t('movedWatching', { name: instrument.name }) });
    else if (r) toast({ tone: 'warn', title: errorText(r.error) });
  };
  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" loading={updateState.pending || removeState.pending} aria-label={t('actionsFor', { name: instrument.name })}>
            {!(updateState.pending || removeState.pending) ? <MoreHorizontal aria-hidden /> : null}
          </Button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem onSelect={() => setEditing(true)}><SlidersHorizontal aria-hidden />{t('editFilter')}</MenuItem>
          {instrument.type === 'skill' ? (
            <MenuItem onSelect={onToggle}>
              {item.status === 'held' ? <Bookmark aria-hidden /> : <Package aria-hidden />}
              {item.status === 'held' ? t('toWatching') : t('toHeld')}
            </MenuItem>
          ) : null}
          <MenuSeparator />
          <MenuItem onSelect={onRemove} className="text-danger [&_svg]:text-danger"><Trash2 aria-hidden />{t('remove')}</MenuItem>
        </MenuContent>
      </Menu>
      <EditFilter item={item} instrument={instrument} open={editing} onOpenChange={setEditing} />
    </>
  );
}

/** One watchlist line: instrument + filter, value, since added, trend, actions. */
export function WatchRow({ row }: { row: WatchlistRow }) {
  const tt = useTranslations('Ticker');
  const instrument = getInstrument(row.item.instrument_slug);
  if (!instrument) return null;
  const spark = computeSparkline(instrument.slug, row.item.filter);
  return (
    <li className={cn('grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 px-3 py-3.5 sm:grid-cols-[auto_minmax(0,1.4fr)_minmax(120px,1fr)_minmax(140px,1fr)_96px_auto] sm:items-center sm:gap-x-5 sm:px-4', row.signal && 'bg-signal-soft/40')}>
      <InstrumentMark tone={row.signal ? 'signal' : 'plain'} slug={instrument.slug} symbol={instrument.symbol} />
      <div className="min-w-0">
        <Link href={instrumentPath(instrument.type, instrument.slug, row.item.filter)} className="block truncate font-medium hover:underline">{instrument.name}</Link>
        <FilterReadback filter={row.item.filter} className="block text-[12.5px] leading-snug text-muted" />
      </div>
      <div className="col-start-3 row-start-1 flex justify-end sm:col-start-6">
        <RowActions row={row} instrument={instrument} />
      </div>
      <div className="col-span-2 col-start-2 flex min-w-0 items-start gap-1 sm:col-span-1 sm:col-start-auto [&_.whitespace-nowrap]:whitespace-normal">
        <MetricValue reading={row.current} size="sm" />
        <MetricInfo metric={row.item.metric} type={instrument.type} reading={row.current} filter={row.item.filter} subject={instrument.name} className="mt-px" />
      </div>
      <SinceAdded row={row} className="col-span-2 col-start-2 sm:col-span-1 sm:col-start-auto" />
      <div className="hidden sm:block">
        <Sparkline values={spark} dir={direction(row.since_added)} label={tt('trend')} description={tt('trendDesc', { name: instrument.name, first: spark[0] ?? 0, last: spark[spark.length - 1] ?? 0 })} />
      </div>
    </li>
  );
}

/** Column heads for a watchlist group (hidden on mobile where rows stack). */
export function WatchHead() {
  const t = useTranslations('Desk');
  return (
    <div aria-hidden className="hidden grid-cols-[36px_minmax(0,1.4fr)_minmax(120px,1fr)_minmax(140px,1fr)_96px_32px] gap-x-5 border-b border-rule px-4 pb-2 sm:grid">
      <span />
      <span className="kicker">{t('colInstrument')}</span>
      <span className="kicker">{t('colNow')}</span>
      <span className="kicker">{t('colSince')}</span>
      <span className="kicker">{t('colTrend')}</span>
      <span />
    </div>
  );
}

/** A signal on the watchlist, with the "talk to someone" entry point (FR-W3, FR-C1). */
export function SignalCard({ row }: { row: WatchlistRow }) {
  const t = useModeT('Desk');
  const instrument = getInstrument(row.item.instrument_slug);
  if (!instrument || !row.signal) return null;
  return (
    <li className="flex flex-col gap-4 rounded-md border border-ink/20 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <InstrumentMark tone="signal" slug={instrument.slug} symbol={instrument.symbol} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={instrumentPath(instrument.type, instrument.slug, row.item.filter)} className="font-serif text-[20px] leading-tight hover:underline">{instrument.name}</Link>
            <SignalTag signal={row.signal} />
          </div>
          <FilterReadback filter={row.item.filter} className="mt-0.5 block text-[12.5px] text-muted" />
          <div className="mt-2"><SignalFigure row={row} /></div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button asChild variant="signal" size="sm"><Link href={chatHref(instrument.slug, row.item.filter, row.signal.kind)}>{t('talk')}</Link></Button>
        <Button asChild variant="ghost" size="sm"><Link href={instrumentPath(instrument.type, instrument.slug, row.item.filter)}>{t('open')}</Link></Button>
      </div>
    </li>
  );
}
