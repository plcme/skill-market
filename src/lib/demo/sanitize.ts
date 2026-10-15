import { getInstrument } from '@/lib/market/catalog';
import type { DemoDB } from '@/lib/api/types';

/**
 * Persisted preview state can outlive the catalogue (e.g. `communication`
 * left the skills list when core competencies stopped being instruments).
 * Drop rows whose instrument no longer exists so nothing downstream throws;
 * chat history keeps its slug and falls back to showing it as text.
 * Returns the same object when nothing changed.
 */
export function dropUnknownInstruments(db: DemoDB): DemoDB {
  const known = (slug: string) => Boolean(getInstrument(slug));
  const isSkill = (slug: string) => getInstrument(slug)?.type === 'skill';
  const watchlist = db.watchlist.filter(w => known(w.instrument_slug));
  const skills = db.skills.filter(s => isSkill(s.skill_slug));
  const waitlist = db.waitlist.filter(w => known(w.instrument_slug));
  const alias_overrides = db.alias_overrides.filter(a => known(a.instrument_slug));
  let practitionersChanged = false;
  const practitioners = db.practitioners.map(p => {
    const next = p.skills.filter(isSkill);
    if (next.length === p.skills.length) return p;
    practitionersChanged = true;
    return { ...p, skills: next };
  });
  const changed = practitionersChanged
    || watchlist.length !== db.watchlist.length
    || skills.length !== db.skills.length
    || waitlist.length !== db.waitlist.length
    || alias_overrides.length !== db.alias_overrides.length;
  return changed ? { ...db, watchlist, skills, waitlist, alias_overrides, practitioners } : db;
}
