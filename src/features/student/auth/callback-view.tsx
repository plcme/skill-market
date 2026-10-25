'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LinkIcon, Loader2 } from 'lucide-react';
import { completeSignIn, safeNext } from '@/lib/api/auth';
import type { ApiError, Result } from '@/lib/api/types';
import { useDB } from '@/lib/demo/store';
import { loginHref } from '@/lib/links';
import { Button } from '@/components/ui/button';
import { Container, EmptyState } from '@/components/ui/primitives';
import { useErrorText } from '../shared';
import { ReviewText } from '@/features/dev/copy-review';

// One verification per token, even under StrictMode's double effects.
const inflight = new Map<string, Promise<Result<{ redirect: string }>>>();

/** `/auth/callback`: verify the link, start the session, redirect (ARCHITECTURE §5.3). */
export function CallbackView() {
  const t = useTranslations('Auth');
  const errorText = useErrorText();
  const params = useSearchParams();
  const router = useRouter();
  const db = useDB();
  const token = params.get('token') ?? '';
  const next = safeNext(params.get('next'));
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = inflight.get(token) ?? completeSignIn(token);
    inflight.set(token, run);
    run.then(r => {
      if (cancelled) return;
      if (r.ok) router.replace(r.data.redirect);
      else setError(r.error);
    });
    return () => { cancelled = true; };
  }, [token, router]);

  if (!error) {
    return (
      <Container className="py-24">
        <div role="status" aria-live="polite" className="flex items-center gap-3 text-ink-2">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <p className="font-serif text-2xl">{t('verifying')}</p>
        </div>
      </Container>
    );
  }

  const signedIn = db?.session?.personas.includes('student');
  return (
    <Container className="py-16">
      <EmptyState
        icon={LinkIcon}
        title={signedIn && error.message === 'linkUsed' ? t('usedButSignedIn') : t('linkProblemTitle')}
        action={signedIn && error.message === 'linkUsed' ? (
          <Button asChild><Link href={next ?? '/me'}>{t('goDesk')}</Link></Button>
        ) : (
          <Button asChild><Link href={loginHref(next ?? '/me')}>{t('requestNew')}</Link></Button>
        )}
      >
        <p aria-live="polite"><ReviewText id="auth.callback.error">{errorText(error)}</ReviewText></p>
      </EmptyState>
    </Container>
  );
}
