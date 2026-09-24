'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bookmark, BookmarkCheck, ChevronDown, Package, Trash2 } from 'lucide-react';
import { useDB } from '@/lib/demo/store';
import { useUiMode } from '@/lib/demo/ui-mode';
import { addWatchlistItem, findWatchItem, removeWatchlistItem, updateWatchlistItem } from '@/lib/api/watchlist';
import { useAction } from '@/lib/api/client';
import { getInstrument } from '@/lib/market/catalog';
import type { FilterSpec, MetricKey } from '@/lib/market/types';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

/** Add "instrument + filter" to the watchlist as held or watching (FR-W1, FR-F6). */
export function WatchButton({ slug, filter, metric, size = 'sm', className }: {
  slug: string;
  filter: FilterSpec;
  metric?: MetricKey;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const t = useTranslations(useUiMode() === 'plain' ? 'WatchPlain' : 'Watch');
  const te = useTranslations('Errors');
  const db = useDB();
  const router = useRouter();
  const { toast } = useToast();
  const inst = getInstrument(slug);
  const onError = (code: string) => toast({ tone: 'warn', title: te.has(code) ? te(code) : te('generic') });
  const [add, addState] = useAction(addWatchlistItem);
  const [update, updateState] = useAction(updateWatchlistItem);
  const [remove, removeState] = useAction(removeWatchlistItem);
  const busy = addState.pending || updateState.pending || removeState.pending;

  if (!db || !inst) return <Button variant="subtle" size={size} disabled className={cn('w-[108px]', className)}><Bookmark aria-hidden />{t('watch')}</Button>;

  const signedIn = db.session?.personas.includes('student');
  const item = signedIn ? findWatchItem(db, slug, filter) : undefined;

  if (!signedIn) {
    return (
      <Button
        variant="subtle"
        size={size}
        className={className}
        onClick={() => toast({ title: t('signInToWatch'), body: t('signInBody'), action: { label: t('signIn'), onClick: () => router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`) } })}
      >
        <Bookmark aria-hidden />{t('watch')}
      </Button>
    );
  }

  const doAdd = async (status: 'held' | 'watching') => {
    const r = await add({ instrument_slug: slug, status, filter, metric });
    if (r?.ok) toast({ tone: 'success', title: status === 'held' ? t('heldAdded', { name: inst.name }) : t('added', { name: inst.name }), body: t('filterIncluded') });
    else if (r && !r.ok) onError(r.error.message);
  };

  if (item) {
    const Icon = item.status === 'held' ? Package : BookmarkCheck;
    return (
      <Menu>
        <MenuTrigger asChild>
          <Button variant="primary" size={size} loading={busy} className={className} aria-label={t('manage', { name: inst.name })}>
            {!busy ? <Icon aria-hidden /> : null}
            {item.status === 'held' ? t('held') : t('watching')}
            <ChevronDown className="!size-3.5 opacity-70" aria-hidden />
          </Button>
        </MenuTrigger>
        <MenuContent>
          {inst.type === 'skill' ? (
            <MenuItem onSelect={async () => { const r = await update({ id: item.id, status: item.status === 'held' ? 'watching' : 'held' }); if (r && !r.ok) onError(r.error.message); }}>
              {item.status === 'held' ? <Bookmark aria-hidden /> : <Package aria-hidden />}
              {item.status === 'held' ? t('markWatching') : t('markHeld')}
            </MenuItem>
          ) : null}
          <MenuItem onSelect={async () => { const r = await remove(item.id); if (r?.ok) toast({ title: t('removed', { name: inst.name }) }); }} className="text-down [&_svg]:text-down">
            <Trash2 aria-hidden />{t('remove')}
          </MenuItem>
        </MenuContent>
      </Menu>
    );
  }

  if (inst.type === 'role') {
    return <Button variant="outline" size={size} loading={busy} className={className} onClick={() => doAdd('watching')}>{!busy ? <Bookmark aria-hidden /> : null}{t('watch')}</Button>;
  }

  return (
    <span className={cn('inline-flex', className)}>
      <Button variant="outline" size={size} loading={busy} className="rounded-r-none" onClick={() => doAdd('watching')}>
        {!busy ? <Bookmark aria-hidden /> : null}{t('watch')}
      </Button>
      <Menu>
        <MenuTrigger asChild>
          <Button variant="outline" size={size === 'sm' ? 'icon-sm' : 'icon'} className="-ml-px rounded-l-none" aria-label={t('moreOptions', { name: inst.name })} disabled={busy}>
            <ChevronDown aria-hidden />
          </Button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem onSelect={() => doAdd('watching')}><Bookmark aria-hidden />{t('watchThis')}</MenuItem>
          <MenuItem onSelect={() => doAdd('held')}><Package aria-hidden />{t('iHaveThis')}</MenuItem>
        </MenuContent>
      </Menu>
    </span>
  );
}
