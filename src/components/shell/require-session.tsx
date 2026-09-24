'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { useDB, setPersona } from '@/lib/demo/store';
import type { DemoDB, Persona } from '@/lib/api/types';
import { loginHref } from '@/lib/links';
import { Button } from '@/components/ui/button';
import { Container, EmptyState, PageSkeleton } from '@/components/ui/primitives';

/**
 * Client guard for signed-in areas (the production app does this in route-group
 * layouts + RLS). Renders a skeleton until the preview store hydrates.
 */
export function RequireSession({ persona, children }: { persona?: Persona; children: (db: DemoDB) => React.ReactNode }) {
  const t = useTranslations('Guard');
  const tc = useTranslations('Common');
  const db = useDB();
  const pathname = usePathname();
  const params = useSearchParams();
  if (!db) return <Container><PageSkeleton label={tc('loading')} /></Container>;
  const next = `${pathname}${params.toString() ? `?${params}` : ''}`;
  if (!db.session) {
    return (
      <Container className="py-16">
        <EmptyState icon={Lock} title={t('signInTitle')} action={<Button asChild><Link href={loginHref(next)}>{t('signIn')}</Link></Button>}>
          {t('signInBody')}
        </EmptyState>
      </Container>
    );
  }
  if (persona && db.session.active !== persona) {
    const holds = db.session.personas.includes(persona);
    return (
      <Container className="py-16">
        <EmptyState
          icon={Lock}
          title={t('wrongPersonaTitle', { persona: t(`personas.${persona}`) })}
          action={holds || persona !== 'practitioner' ? <Button onClick={() => setPersona(persona)}>{t('switch', { persona: t(`personas.${persona}`) })}</Button> : <Button asChild><Link href="/practitioner/join">{t('join')}</Link></Button>}
        >
          {persona === 'admin' ? t('adminBody') : t('wrongPersonaBody')}
        </EmptyState>
      </Container>
    );
  }
  return <>{children(db)}</>;
}
