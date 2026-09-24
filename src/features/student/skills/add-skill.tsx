'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search } from 'lucide-react';
import { addSkill } from '@/lib/api/skills';
import { useAction } from '@/lib/api/client';
import type { StudentSkill } from '@/lib/api/types';
import { instrumentsOfType, searchInstruments } from '@/lib/market/catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useErrorText } from '../shared';

/** Searchable combobox over the skill catalogue; adds as self-reported (FR-O4, US7). */
export function AddSkill({ owned }: { owned: StudentSkill[] }) {
  const t = useTranslations('SkillsPage');
  const errorText = useErrorText();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [add, state] = useAction(addSkill);
  const suggested = new Set(owned.filter(s => s.source === 'inferred').map(s => s.skill_slug));
  const options = useMemo(() => {
    const held = new Set(owned.filter(s => s.source !== 'inferred').map(s => s.skill_slug));
    const list = q.trim() ? searchInstruments(q, 20).map(h => h.instrument).filter(i => i.type === 'skill') : instrumentsOfType('skill').sort((a, b) => a.name.localeCompare(b.name));
    return list.filter(i => !held.has(i.slug));
  }, [q, owned]);

  const choose = async (slug: string, name: string) => {
    const r = await add({ skill_slug: slug });
    if (r?.ok) {
      toast({ tone: 'success', title: t('added', { name }) });
      setOpen(false);
      setQ('');
    } else if (r) toast({ tone: 'warn', title: errorText(r.error) });
  };

  const listId = 'add-skill-list';
  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) { setQ(''); setActive(0); } }}>
      <PopoverTrigger asChild>
        <Button variant="outline"><Plus aria-hidden />{t('add')}</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(360px,calc(100vw-24px))] p-0">
        <div className="relative border-b border-rule p-2">
          <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <Input
            autoFocus
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={options[active] ? `opt-${options[active].slug}` : undefined}
            aria-label={t('addSearch')}
            placeholder={t('addPlaceholder')}
            value={q}
            onChange={e => { setQ(e.target.value); setActive(0); }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, options.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
              if (e.key === 'Enter' && options[active]) { e.preventDefault(); void choose(options[active].slug, options[active].name); }
            }}
            className="h-9 pl-9"
          />
        </div>
        <ul id={listId} role="listbox" aria-label={t('addSearch')} className="max-h-72 overflow-y-auto py-1">
          {options.length === 0 ? <li className="px-3 py-3 text-sm text-muted">{t('addNone', { q })}</li> : null}
          {options.map((i, idx) => (
            <li key={i.slug} id={`opt-${i.slug}`} role="option" aria-selected={idx === active}>
              <button
                type="button"
                disabled={state.pending}
                onMouseEnter={() => setActive(idx)}
                onClick={() => choose(i.slug, i.name)}
                className={cn('flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm', idx === active && 'bg-sunken')}
              >
                <span className="min-w-0">
                  <span className="font-medium">{i.name}</span>
                  <span className="ml-2 text-[12px] text-muted">{i.category}</span>
                </span>
                {suggested.has(i.slug) ? <span className="kicker shrink-0">{t('addConfirms')}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
