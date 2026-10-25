'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { removeAlias, selectAliases, upsertAlias } from '@/lib/api/admin';
import { useAction } from '@/lib/api/client';
import { getInstrument, instrumentsOfType } from '@/lib/market/catalog';
import type { DemoDB } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select } from '@/components/ui/form';
import { createAliasSearch } from '@/lib/search/aliases';
import { MAX_SEARCH_LENGTH } from '@/lib/search/matcher';
import { Badge, Card, SectionHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useErrorText } from '@/features/community/shared';
import { WithDB } from './admin-shell';

/** FR-X5: alias → instrument mappings with conflict checks. */
export function AdminTaxonomy() {
  return <WithDB>{db => <Taxonomy db={db} />}</WithDB>;
}

function Taxonomy({ db }: { db: DemoDB }) {
  const t = useTranslations('Admin.taxonomy');
  const { toast } = useToast();
  const errorText = useErrorText();
  const [alias, setAlias] = useState('');
  const [slug, setSlug] = useState('');
  const [filter, setFilter] = useState('');
  const [includeSimilar, setIncludeSimilar] = useState(false);
  const [add, addState] = useAction(upsertAlias, row => {
    toast({ tone: 'success', title: t('added', { alias: row.alias, name: getInstrument(row.instrument_slug)?.name ?? row.instrument_slug }) });
    setAlias('');
  });
  const [remove] = useAction(removeAlias, () => toast({ title: t('removed') }));
  const search = useMemo(() => createAliasSearch(selectAliases(db)), [db]);
  const matches = useMemo(() => search(filter, includeSimilar), [search, filter, includeSimilar]);
  const rows = [...matches.exact, ...matches.similar];
  const similar = new Set(matches.similar);
  const owner = addState.error?.fields?.owner;
  const aliasError = addState.error?.fields?.alias
    ? owner ? t('conflict', { name: getInstrument(owner)?.name ?? owner }) : errorText({ code: 'validation', message: addState.error.fields.alias })
    : undefined;

  return (
    <div className="grid gap-10 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="self-start p-5">
        <p className="kicker mb-4">{t('add')}</p>
        <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); void add({ alias, instrument_slug: slug }); }}>
          <Field label={t('alias')} hint={t('aliasHint')} error={aliasError}>
            {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={alias} maxLength={40} onChange={e => setAlias(e.target.value)} />}
          </Field>
          <Field label={t('instrument')} error={addState.error?.fields?.instrument_slug ? errorText({ code: 'not_found', message: 'instrumentNotFound' }) : undefined}>
            {({ id, invalid }) => (
              <Select id={id} aria-invalid={invalid} value={slug} onChange={e => setSlug(e.target.value)}>
                <option value="">{t('instrumentPick')}</option>
                <optgroup label={t('skills')}>{instrumentsOfType('skill').map(i => <option key={i.slug} value={i.slug}>{i.name}</option>)}</optgroup>
                <optgroup label={t('roles')}>{instrumentsOfType('role').map(i => <option key={i.slug} value={i.slug}>{i.name}</option>)}</optgroup>
              </Select>
            )}
          </Field>
          <Button type="submit" loading={addState.pending} disabled={!alias.trim() || !slug}>{t('save')}</Button>
        </form>
      </Card>
      <section aria-labelledby="alias-h" className="min-w-0">
        <SectionHeader id="alias-h" title={t('title')} kicker={t('count', { n: rows.length })} />
        <Input maxLength={MAX_SEARCH_LENGTH} className="mb-3 max-w-xs" aria-label={t('filter')} placeholder={t('filter')} value={filter} onChange={e => setFilter(e.target.value)} />
        <Checkbox label={t('includeSimilar')} checked={includeSimilar} onCheckedChange={v => setIncludeSimilar(v === true)} />
        {rows.length ? (
          <ul className="divide-y divide-rule border-b border-rule">
            {rows.map(r => (
              <li key={`${r.source}-${r.alias}-${r.instrument_slug}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
                <span className="w-40 font-mono text-[13px]">{r.alias}</span>
                {similar.has(r) ? <Badge tone="outline">{t('similar')}</Badge> : null}
                <span className="min-w-0 flex-1 text-ink-2">{getInstrument(r.instrument_slug)?.name}</span>
                <Badge tone={r.source === 'override' ? 'accent' : 'outline'}>{t(`sources.${r.source}`)}</Badge>
                {r.override_id ? <Button size="sm" variant="ghost" onClick={() => remove(r.override_id!)}>{t('remove')}</Button> : null}
              </li>
            ))}
          </ul>
        ) : <p className="py-3 text-sm text-muted">{t('empty')}</p>}
      </section>
    </div>
  );
}
