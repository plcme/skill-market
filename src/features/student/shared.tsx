'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import type { ApiError, StudentSkill } from '@/lib/api/types';
import { describeReason } from '@/lib/demo/education';
import type { LearningEffort, Transferability } from '@/lib/market/types';
import { useUiMode } from '@/lib/demo/ui-mode';
import { ANON_ONBOARDING_EVENT, ANON_ONBOARDING_KEY, EMPTY_ONBOARDING, type AnonymousOnboarding } from '@/lib/api/onboarding';
import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

/** Maps an action error to copy: student-area keys first, then the shared `Errors`. */
export function useErrorText() {
  const ts = useTranslations('StudentErrors');
  const te = useTranslations('Errors');
  return useCallback((error: ApiError | string | null | undefined): string => {
    if (!error) return '';
    const key = typeof error === 'string' ? error : error.message;
    if (ts.has(key)) return ts(key);
    if (te.has(key)) return te(key);
    return te('generic');
  }, [ts, te]);
}

/**
 * Translator that prefers `plain.<key>` when the student picked the plain
 * (no market metaphor) display mode (PRD Q7).
 */
export function useModeT(namespace: 'Desk' | 'SkillsPage' | 'Gap') {
  const t = useTranslations(namespace);
  const plain = useUiMode() === 'plain';
  return useCallback((key: string, values?: Record<string, string | number>) => (plain && t.has(`plain.${key}`) ? t(`plain.${key}`, values) : t(key, values)), [plain, t]);
}

export type ConfidenceBand = 'likely' | 'possible' | 'maybe';

export function confidenceBand(c: number): ConfidenceBand {
  if (c >= 0.7) return 'likely';
  if (c >= 0.5) return 'possible';
  return 'maybe';
}

/** Inferred ≠ known: always "Suggestion" + confidence in words and numbers (FR-O4). */
export function SuggestionMeta({ confidence, reason, className }: { confidence: number | null; reason: string | null; className?: string }) {
  const t = useTranslations('StudentShared');
  return (
    <span className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted', className)}>
      <Badge tone="outline">{t('suggestion')}</Badge>
      {confidence !== null ? <span className="num">{t('confidence', { band: t(`bands.${confidenceBand(confidence)}`), pct: Math.round(confidence * 100) })}</span> : null}
      {reason ? <ReasonText reason={reason} /> : null}
    </span>
  );
}

/** "from COMP2123 (Data Structures and Algorithms)" / "from your Bachelor of …". */
export function ReasonText({ reason, className }: { reason: string; className?: string }) {
  const t = useTranslations('StudentShared');
  const ref = describeReason(reason);
  if (!ref) return null;
  if (ref.kind === 'unit') return <span className={className}>{t('fromUnit', { code: ref.unit.code, title: ref.unit.title })}</span>;
  if (ref.kind === 'degree') return <span className={className}>{t('fromDegree', { degree: ref.degree.name })}</span>;
  return <span className={className}>{t('fromOther', { source: ref.text })}</span>;
}

export function sourceLabelKey(s: Pick<StudentSkill, 'source'>): 'sourceSelf' | 'sourceConfirmed' | 'sourceInferred' {
  return s.source === 'self_reported' ? 'sourceSelf' : s.source === 'confirmed' ? 'sourceConfirmed' : 'sourceInferred';
}

export function EffortText({ effort, className }: { effort: LearningEffort; className?: string }) {
  const t = useTranslations('StudentShared');
  return <span className={className}>{t(`effort.${effort}`)}</span>;
}

export function TransferText({ transfer, className }: { transfer: Transferability; className?: string }) {
  const t = useTranslations('StudentShared');
  return <span className={className}>{t(`transfer.${transfer}`)}</span>;
}

// ---------------------------------------------------------------- anonymous onboarding

function subscribeAnon(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === ANON_ONBOARDING_KEY) cb(); };
  window.addEventListener(ANON_ONBOARDING_EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(ANON_ONBOARDING_EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(ANON_ONBOARDING_KEY);
  } catch {
    return null;
  }
}

/** A visitor's device-local onboarding answers; `undefined` until hydrated. */
export function useAnonymousOnboarding(): AnonymousOnboarding | null | undefined {
  const raw = useSyncExternalStore(subscribeAnon, readRaw, () => undefined);
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AnonymousOnboarding>;
    return { ...EMPTY_ONBOARDING, ...parsed, unit_codes: Array.isArray(parsed.unit_codes) ? parsed.unit_codes : [] };
  } catch {
    return null;
  }
}
