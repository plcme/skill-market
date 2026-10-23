'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useDB } from '@/lib/demo/store';
import { useUiMode } from '@/lib/demo/ui-mode';
import { findWatchItem, watchAllItems } from '@/lib/api/watchlist';
import { useAction } from '@/lib/api/client';
import type { FilterSpec } from '@/lib/market/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

export function WatchAllButton({ slugs, filter }: { slugs: string[]; filter: FilterSpec }) {
  const t = useTranslations(useUiMode() === 'plain' ? 'WatchPlain' : 'Watch');
  const te = useTranslations('Errors');
  const db = useDB();
  const router = useRouter();
  const { toast } = useToast();
  const [add, state] = useAction(watchAllItems);
  const signedIn = db?.session?.personas.includes('student');
  const allWatched = !!signedIn && slugs.every(slug => findWatchItem(db!, slug, filter));
  if (!slugs.length) return null;
  const Icon = allWatched ? BookmarkCheck : Bookmark;
  return (
    <Button variant="outline" size="sm" disabled={!db || allWatched} loading={state.pending} onClick={async () => {
      if (!signedIn) {
        toast({ title: t('signInToWatch'), body: t('signInBody'), action: { label: t('signIn'), onClick: () => router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`) } });
        return;
      }
      const result = await add({ slugs, filter });
      if (result?.ok) toast({ tone: 'success', title: t('allAdded', { count: result.data.added }), body: t('filterIncluded') });
      else if (result && !result.ok) toast({ tone: 'warn', title: te.has(result.error.message) ? te(result.error.message) : te('generic') });
    }}>
      {!state.pending ? <Icon aria-hidden /> : null}{t(allWatched ? 'allWatching' : 'watchAll')}
    </Button>
  );
}
