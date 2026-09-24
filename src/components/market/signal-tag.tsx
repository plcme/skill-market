import { useTranslations } from 'next-intl';
import { Zap } from 'lucide-react';
import type { Signal } from '@/lib/market/types';
import { cn } from '@/lib/utils';

/** Highlighter-style tag for a detected signal (FR-W3). Neutral wording for falls. */
export function SignalTag({ signal, className }: { signal: Signal; className?: string }) {
  const t = useTranslations('Signal');
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-[3px] bg-signal px-1.5 py-0.5 text-[11.5px] font-medium leading-none text-signal-ink', className)}>
      <Zap className="size-3" aria-hidden strokeWidth={2.5} />
      {t(signal.kind)}
    </span>
  );
}
