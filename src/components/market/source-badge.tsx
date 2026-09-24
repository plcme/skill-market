import { useTranslations } from 'next-intl';
import type { SourceKind } from '@/lib/market/types';
import { cn } from '@/lib/utils';

/** Fixed shape per source type (FR-D5): official ■, job ads ●, practitioners ◆. */
export function SourceMark({ kind, className }: { kind: SourceKind; className?: string }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden className={cn('size-2.5 shrink-0', className)}>
      {kind === 'official' ? <rect x="1" y="1" width="8" height="8" className="fill-src-official" /> : null}
      {kind === 'ads' ? <circle cx="5" cy="5" r="4" className="fill-src-ads" /> : null}
      {kind === 'practitioner' ? <path d="M5 0.5 9.5 5 5 9.5 0.5 5Z" className="fill-src-practitioner" /> : null}
    </svg>
  );
}

export function SourceBadge({ kind, short = false, className }: { kind: SourceKind; short?: boolean; className?: string }) {
  const t = useTranslations('Sources');
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted', className)}>
      <SourceMark kind={kind} />
      {short ? t(`kindsShort.${kind}`) : t(`kinds.${kind}`)}
    </span>
  );
}
