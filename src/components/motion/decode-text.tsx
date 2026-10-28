'use client';

import { useEffect, useRef, useState } from 'react';
import { useUiMode } from '@/lib/demo/ui-mode';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { decodeFrame } from './decode-frame';

const DURATION_MS = 500;
const FRAME_MS = 32;

export interface DecodeTextProps {
  value: string;
  /** Delay in milliseconds, useful for a short stagger across Statistics cells. */
  delay?: number;
  className?: string;
}

/** Real text during SSR/hydration; one viewport entrance, then each value change. */
export function DecodeText({ value, delay = 0, className }: DecodeTextProps) {
  const host = useRef<HTMLSpanElement>(null);
  const [entered, setEntered] = useState(false);
  const [frame, setFrame] = useState<{ value: string; text: string } | null>(null);
  const mode = useUiMode();
  const reduced = useMediaQuery(REDUCED_MOTION_QUERY);
  const disabled = mode === 'plain' || reduced;
  // Drop interrupted frames when inputs change; re-enabling motion must start from real text.
  if (frame && (frame.value !== value || disabled)) setFrame(null);

  useEffect(() => {
    const node = host.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5)) {
        setEntered(true);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Read the live preference as well: the media hook's hydration snapshot is false.
    if (!entered || disabled || window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    let request = 0;
    let start: number | undefined;
    let last = -FRAME_MS;
    const tick = (now: number) => {
      start ??= now;
      const elapsed = now - start;
      if (elapsed >= DURATION_MS) {
        setFrame(null);
        return;
      }
      if (elapsed - last >= FRAME_MS) {
        setFrame({ value, text: decodeFrame(value, elapsed / DURATION_MS) });
        last = elapsed;
      }
      request = window.requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => {
      request = window.requestAnimationFrame(tick);
    }, Number.isFinite(delay) ? Math.max(0, delay) : 0);
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(request);
    };
  }, [value, delay, entered, disabled]);

  const text = !disabled && frame?.value === value ? frame.text : value;
  const displayed = Array.from(text);
  return (
    <span ref={host} className={cn('num inline-block whitespace-pre', className)}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">
        {Array.from(value).map((char, index) => (
          // Each real glyph reserves its own width; random letters cannot move symbols or neighbours.
          <span key={index} className="relative inline-block">
            <span className="invisible">{char}</span>
            <span className="absolute inset-0 overflow-hidden text-center">{displayed[index]}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
