import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Monochrome mark: an ink tile with a paper trend line (no brand hue). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-6 shrink-0', className)}>
      <rect width="24" height="24" rx="4" className="fill-ink" />
      <path d="M5 16.5 9.5 12l3 3L19 8" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="stroke-paper" />
      <circle cx="19" cy="8" r="1.8" className="fill-paper" />
    </svg>
  );
}

export function Wordmark({ name, className }: { name: string; className?: string }) {
  return (
    <Link href="/market" className={cn('group inline-flex items-center gap-2.5 rounded-[4px]', className)}>
      <LogoMark />
      <span className="font-serif text-[21px] italic leading-none tracking-[-0.02em] text-ink">{name}</span>
    </Link>
  );
}
