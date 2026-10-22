'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useDB } from '@/lib/demo/store';
import { Button } from '@/components/ui/button';

// After a student marks a role as "I've worked in this role", invite them once
// to join as a practitioner. Dismissal is remembered per role in this browser.

const KEY = 'role-nudge-dismissed-v1';
const listeners = new Set<() => void>();
let cache: string | null | undefined;

function read(): string {
  if (cache === undefined) {
    try {
      cache = window.localStorage.getItem(KEY);
    } catch {
      cache = null;
    }
  }
  return cache ?? '[]';
}

export function dismissedRoles(raw: string): string[] {
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function dismiss(slug: string) {
  const next = JSON.stringify([...new Set([...dismissedRoles(read()), slug])]);
  cache = next;
  try {
    window.localStorage.setItem(KEY, next);
  } catch { /* storage blocked: hidden for this page view only */ }
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function RolePractitionerNudge({ slug }: { slug: string }) {
  const t = useTranslations('RoleNudge');
  const db = useDB();
  // Server and first client render: treat as dismissed so nothing flashes.
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const worked = db?.session?.personas.includes('student') && db.watchlist.some(w => w.instrument_slug === slug && w.status === 'held');
  if (!worked || raw === null || dismissedRoles(raw).includes(slug)) return null;
  return (
    <div className="relative rounded-md border border-rule bg-surface p-4 pr-10 text-[14px] animate-fade" role="status">
      <p className="text-ink">{t('body')}</p>
      <Link href={`/practitioner/join?role=${encodeURIComponent(slug)}`} className="link mt-2 inline-block font-medium">{t('cta')}</Link>
      <Button variant="ghost" size="icon-sm" className="absolute right-1.5 top-1.5" onClick={() => dismiss(slug)} aria-label={t('dismiss')}>
        <X aria-hidden />
      </Button>
    </div>
  );
}
