'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/api/auth';
import { useDB } from '@/lib/demo/store';
import { formatDate } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Container, EmptyState, PageSkeleton } from '@/components/ui/primitives';
import { ReviewText } from '@/features/dev/copy-review';

/** `/auth/signout`: ends the session and says so calmly, with somewhere to go next. */
export function SignOutView() {
  const t = useTranslations('Auth');
  const tc = useTranslations('Common');
  const db = useDB();
  const params = useSearchParams();
  const deleted = params.get('deleted') === '1';
  const started = useRef(false);

  useEffect(() => {
    if (!db?.session || started.current) return;
    started.current = true;
    void signOut();
  }, [db]);

  if (!db || db.session) return <Container><PageSkeleton label={tc('loading')} /></Container>;

  return (
    <Container className="py-16">
      <EmptyState
        icon={LogOut}
        title={deleted ? t('deletedTitle') : t('signedOutTitle')}
        action={
          <>
            <Button asChild><Link href="/market">{t('toMarket')}</Link></Button>
            {!deleted ? <Button asChild variant="outline"><Link href="/auth/login">{t('signInAgain')}</Link></Button> : null}
            <Button asChild variant="ghost"><Link href="/">{t('toHome')}</Link></Button>
          </>
        }
      >
        <p role="status">
          {deleted && db.deletion ? <ReviewText id="auth.signout.deletedBody">{t('deletedBody', { date: formatDate(db.deletion.purge_after) })}</ReviewText> : <ReviewText id="auth.signout.signedOutBody">{t('signedOutBody')}</ReviewText>}
        </p>
      </EmptyState>
    </Container>
  );
}
