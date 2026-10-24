'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bookmark, BookmarkCheck, BriefcaseBusiness, ChevronDown, Package, Trash2 } from 'lucide-react';
import { useDB } from '@/lib/demo/store';
import { useUiMode } from '@/lib/demo/ui-mode';
import { addWatchlistItem, canBeHeld, findWatchItem, removeWatchlistItem, updateWatchlistItem } from '@/lib/api/watchlist';
import { useAction } from '@/lib/api/client';
import { getInstrument } from '@/lib/market/catalog';
import type { FilterSpec, MetricKey } from '@/lib/market/types';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

/**
 * Add "instrument + filter" to the watchlist as held or watching (FR-W1, FR-F6).
 * Held reads "I have this skill" for skills and "I've worked in this role"
 * for roles; industries are only watched.
 */
export function WatchButton({ slug, filter, metric, size = 'sm', prominent = false, compact = false, className, labelClassName }: {
  slug: string;
  filter: FilterSpec;
  metric?: MetricKey;
  size?: 'sm' | 'md';
  /**
   * The page's primary action (instrument header): large, full width, accent
   * fill until watched, then an outline "Watching" so the state reads clearly.
   */
  prominent?: boolean;
  /** Icon-only row action with the same width before and after watching. */
  compact?: boolean;
  className?: string;
  /**
   * Applied to the visible text. Pass e.g. `@max-4xl:sr-only` to render an
   * icon-only button in narrow rows; the text stays as the accessible name.
   */
  labelClassName?: string;
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
  const labelStyle = compact ? 'sr-only' : labelClassName;
  const label = (text: string) => (labelStyle ? <span className={labelStyle}>{text}</span> : text);
  className = cn(compact && 'w-16', className);
  // Icon-only buttons need square-ish padding once the label is hidden.
  const iconPad = compact ? 'px-2' : labelClassName ? '@max-4xl:px-2' : undefined;
  const sz = prominent ? 'lg' : size;
  const wide = prominent ? 'w-full' : undefined;
  const callVariant = prominent ? 'accent' : 'subtle';
  const addVariant = prominent ? 'accent' : 'outline';

  if (!db || !inst) return <Button variant={callVariant} size={sz} disabled className={cn(labelClassName ? iconPad : prominent ? wide : 'w-[108px]', className)}><Bookmark aria-hidden />{label(t('watch'))}</Button>;

  const isRole = inst.type === 'role';
  const HeldIcon = isRole ? BriefcaseBusiness : Package;
  const heldCopy = isRole
    ? { label: t('worked'), add: t('iWorkedHere'), mark: t('markWorked'), added: t('workedAdded', { name: inst.name }) }
    : { label: t('held'), add: t('iHaveThis'), mark: t('markHeld'), added: t('heldAdded', { name: inst.name }) };
  const signedIn = db.session?.personas.includes('student');
  const item = signedIn ? findWatchItem(db, slug, filter) : undefined;

  if (!signedIn) {
    return (
      <Button
        variant={callVariant}
        size={sz}
        className={cn(iconPad, wide, className)}
        onClick={() => toast({ title: t('signInToWatch'), body: t('signInBody'), action: { label: t('signIn'), onClick: () => router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`) } })}
      >
        <Bookmark aria-hidden />{label(t('watch'))}
      </Button>
    );
  }

  const doAdd = async (status: 'held' | 'watching') => {
    const r = await add({ instrument_slug: slug, status, filter, metric });
    if (r?.ok) toast({ tone: 'success', title: status === 'held' ? heldCopy.added : t('added', { name: inst.name }), body: t('filterIncluded'), action: { label: t('viewWatchlist'), onClick: () => router.push('/me#watchlist') } });
    else if (r && !r.ok) onError(r.error.message);
  };

  if (item) {
    const Icon = item.status === 'held' ? HeldIcon : BookmarkCheck;
    return (
      <Menu>
        <MenuTrigger asChild>
          <Button variant={prominent ? 'outline' : 'primary'} size={sz} loading={busy} className={cn(iconPad, wide, className, compact && 'relative grid grid-cols-2 gap-0 px-0 before:pointer-events-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-paper/30 [&>svg]:translate-x-px [&>svg]:justify-self-center')} aria-label={t('manage', { name: inst.name })}>
            {!busy ? <Icon className={compact ? '!size-[18px]' : undefined} aria-hidden /> : null}
            {label(item.status === 'held' ? heldCopy.label : t('watching'))}
            <ChevronDown className={cn(compact ? '!size-4' : '!size-3.5', 'opacity-70')} aria-hidden />
          </Button>
        </MenuTrigger>
        <MenuContent>
          {canBeHeld(inst.type) ? (
            <MenuItem onSelect={async () => { const r = await update({ id: item.id, status: item.status === 'held' ? 'watching' : 'held' }); if (r && !r.ok) onError(r.error.message); }}>
              {item.status === 'held' ? <Bookmark aria-hidden /> : <HeldIcon aria-hidden />}
              {item.status === 'held' ? t('markWatching') : heldCopy.mark}
            </MenuItem>
          ) : null}
          <MenuItem onSelect={async () => { const r = await remove(item.id); if (r?.ok) toast({ title: t('removed', { name: inst.name }) }); }} className="text-danger [&_svg]:text-danger">
            <Trash2 aria-hidden />{t('remove')}
          </MenuItem>
        </MenuContent>
      </Menu>
    );
  }

  // Industries are only watched.
  if (!canBeHeld(inst.type)) {
    return <Button variant={addVariant} size={sz} loading={busy} className={cn(iconPad, wide, className)} onClick={() => doAdd('watching')}>{!busy ? <Bookmark aria-hidden /> : null}{label(t('watch'))}</Button>;
  }

  return (
    <span className={cn('inline-flex', wide, className)}>
      <Button variant={addVariant} size={sz} loading={busy} className={cn('rounded-r-none', (prominent || compact) && 'flex-1', iconPad)} onClick={() => doAdd('watching')}>
        {!busy ? <Bookmark aria-hidden /> : null}{label(t('watch'))}
      </Button>
      <Menu>
        <MenuTrigger asChild>
          <Button variant={addVariant} size={prominent ? 'lg' : size === 'sm' ? 'icon-sm' : 'icon'} className={cn('rounded-l-none', prominent ? 'border-l border-accent-ink/25 px-3.5' : '-ml-px')} aria-label={t('moreOptions', { name: inst.name })} disabled={busy}>
            <ChevronDown aria-hidden />
          </Button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem onSelect={() => doAdd('watching')}><Bookmark aria-hidden />{t('watchThis')}</MenuItem>
          <MenuItem onSelect={() => doAdd('held')}><HeldIcon aria-hidden />{heldCopy.add}</MenuItem>
        </MenuContent>
      </Menu>
    </span>
  );
}
