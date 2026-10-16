'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'info' | 'success' | 'warn';
interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: Tone;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  toast: (t: Omit<Toast, 'id' | 'tone'> & { tone?: Tone }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const ICON = { info: Info, success: CheckCircle2, warn: TriangleAlert };

export function ToastProvider({ children, dismissLabel }: { children: React.ReactNode; dismissLabel: string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setToasts(ts => ts.filter(t => t.id !== id)), []);
  const toast = useCallback<ToastApi['toast']>(t => {
    const id = next.current++;
    setToasts(ts => [...ts.slice(-2), { tone: 'info', ...t, id }]);
    window.setTimeout(() => dismiss(id), t.action ? 8000 : 4500);
  }, [dismiss]);
  const api = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-20 md:items-end md:px-6"
      >
        {toasts.map(t => {
          const Icon = ICON[t.tone];
          return (
            <div key={t.id} role="status" className="on-ink pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md bg-ink px-4 py-3 text-paper shadow-float animate-rise">
              <Icon className={cn('mt-0.5 size-4 shrink-0', t.tone === 'success' && 'text-success', t.tone === 'warn' && 'text-warn')} aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">{t.title}</p>
                {t.body ? <p className="mt-0.5 text-paper/75">{t.body}</p> : null}
                {t.action ? (
                  <button type="button" className="mt-1.5 text-[13px] font-medium text-paper underline underline-offset-2" onClick={() => { t.action?.onClick(); dismiss(t.id); }}>
                    {t.action.label}
                  </button>
                ) : null}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label={dismissLabel} className="-mr-1 grid size-6 shrink-0 place-items-center rounded-[3px] text-paper/60 hover:text-paper">
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
