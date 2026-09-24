import { beforeEach, describe, expect, it } from 'vitest';
import { getDB, resetPreview, setPersona, transact } from '../src/lib/demo/store';
import { buildExport, requestDeletion, requestExport, selectConsents, setUiMode, updateEmailPreferences, updateFieldVisibility, updateProfile } from '../src/lib/api/privacy';
import { completeSignIn, requestMagicLink } from '../src/lib/api/auth';
import { addSkill } from '../src/lib/api/skills';
import { DAY } from '../src/lib/time';

beforeEach(() => resetPreview());

describe('settings and privacy (FR-A3–A5, FR-W4)', () => {
  it('edits the profile; visa status stays optional', async () => {
    setPersona('student');
    const r = await updateProfile({ display_name: 'Jo', university_id: 'usyd', degree_id: 'bach-it', year: '2', visa_status: null });
    expect(r.ok).toBe(true);
    expect(getDB().student).toMatchObject({ display_name: 'Jo', degree_id: 'bach-it', visa_status: null });
    expect(getDB().session?.display_name).toBe('Jo');
    expect(getDB().skills.some(s => s.source === 'inferred')).toBe(true);
    const bad = await updateProfile({ display_name: '', university_id: null, degree_id: null, year: null, visa_status: null });
    expect(!bad.ok && bad.error.fields?.display_name).toBe('required');
  });

  it('updates visibility, email preferences and UI mode', async () => {
    setPersona('student');
    await updateFieldVisibility({ field: 'watchlist', visibility: 'private' });
    await updateEmailPreferences({ digest: 'off' });
    await updateEmailPreferences({ signal_alerts: false });
    await setUiMode('plain');
    const p = getDB().student!;
    expect(p.field_visibility.watchlist).toBe('private');
    expect(p.email_prefs).toEqual({ digest: 'off', signal_alerts: false });
    expect(p.ui_mode).toBe('plain');
  });

  it('exports everything held about the student without sign-in tokens', async () => {
    const sent = await requestMagicLink({ email: 'kim@student.example', age_confirmed: true, privacy_acknowledged: true });
    if (!sent.ok) throw new Error('send failed');
    await completeSignIn(sent.data.token);
    await addSkill({ skill_slug: 'sql' });
    const r = await requestExport();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.account.email).toBe('kim@student.example');
    expect(r.data.skills.map(s => s.skill_slug)).toEqual(['sql']);
    expect(JSON.stringify(r.data)).not.toContain(sent.data.token);
    expect(getDB().outbox.at(-1)?.template).toBe('export_ready');
    expect(selectConsents(getDB()).map(c => c.kind).sort()).toEqual(['age_18', 'privacy_notice']);
    expect(buildExport({ ...getDB(), session: null }, Date.now())).toBeNull();
  });

  it('deletes only with the typed confirmation, clears data, schedules the purge and signs out', async () => {
    setPersona('student');
    await addSkill({ skill_slug: 'sql' });
    transact(d => {
      d.requests.push({ id: 'rq-1', status: 'pending', slot_id: 'none', proposed_slot_id: null } as unknown as (typeof d.requests)[number]);
    });
    const wrong = await requestDeletion({ confirmation: 'delete' as 'DELETE' });
    expect(!wrong.ok && wrong.error.message).toBe('deleteConfirmMismatch');
    expect(getDB().student).not.toBeNull();
    const r = await requestDeletion({ confirmation: 'DELETE' });
    expect(r.ok).toBe(true);
    const d = getDB();
    expect(d.session).toBeNull();
    expect(d.student).toBeNull();
    expect(d.skills).toEqual([]);
    expect(d.watchlist).toEqual([]);
    expect(d.requests[0].status).toBe('cancelled');
    expect(d.events.at(-1)).toMatchObject({ request_id: 'rq-1', kind: 'cancel', actor: 'system' });
    expect(Date.parse(d.deletion!.purge_after) - Date.parse(d.deletion!.requested_at)).toBe(30 * DAY);
    expect(d.outbox.at(-1)?.template).toBe('deletion_scheduled');
    const again = await requestDeletion({ confirmation: 'DELETE' });
    expect(!again.ok && again.error.code).toBe('unauthenticated');
  });
});
