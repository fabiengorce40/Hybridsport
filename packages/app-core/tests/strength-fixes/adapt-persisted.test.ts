/**
 * R2 — adaptation de la séance PERSISTÉE par le CORE (`adaptPersistedSession`), voie FORCÉE : séance réellement non
 * reproductible (séance 3 de la semaine 1 après la séance 1 réalisée : tracks de progression créées après la
 * planification). Substitution admissible, substitution impossible, bloc de force vidé (refusé), douleur connue,
 * reprise. Invariant : aucun exercice sollicitant une zone exclue ne subsiste, jamais de charge transférée.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  adaptPersistedSession, beta0Environment, ensureBeta0Week, evaluateCheckIn, finishProgrammeSession, loadState, MemoryStorage, recordProgrammeSet, regenerateSession, selectProgrammeSession, startProgrammeSession,
  strengthContent, UNKNOWN_CORE_STATE,
} from '../../src/index.js';
import type { AppState, CheckInInput } from '../../src/index.js';
import { at, create, exercisesOf, massProfile, strengthIds } from './sf-fixtures.js';
import { reload } from '../ct/ct-fixtures.js';

const env = beta0Environment();
const catalog = strengthContent().catalog;
const ruleset = strengthContent().ruleset;
const T = (d: string, hm = '18:00') => `${d}T${hm}:00.000Z`;
const areasOf = (ex: string) => catalog.exercise(ex)?.painSensitiveAreas ?? [];
const sessionOf = (s: AppState, id: string) => selectProgrammeSession(s, id)?.session;
const ids = (s: AppState, id: string) => JSON.stringify(sessionOf(s, id)?.blocks.map((b) => b.items.map((i) => i.exerciseId)));
function faithful(s: AppState, id: string): boolean { return faithfulOf(s, id); }
const faithfulOf = (s: AppState, id: string) => { const g = regenerateSession(s, id, UNKNOWN_CORE_STATE, env); return g.status === 'planned' && JSON.stringify(g.record.session.blocks.map((b) => b.items.map((i) => i.exerciseId))) === ids(s, id); };
const codes = (s: AppState) => s.checkIns.at(-1)?.reasons.map((r) => r.code) ?? [];
const P2 = (area: 'knee' | 'shoulder' | 'lower_back' | 'elbow' | 'hip_groin'): CheckInInput => ({ painAnswer: 'yes', pains: [{ area, level: 'P2' }] });
const evalOf = (s: AppState, area: string) => evaluateCheckIn({ id: 'c', at: T('2026-10-09'), pains: [{ area, level: 'P2' }], generalSignal: false, fatigue: 'unknown', recovery: 'unknown', painStatus: 'reported' } as never, s.checkIns, ruleset);

/** Séance 1 réalisée (toutes ses séries) ⇒ séance 3 non reproductible. */
function setup(preset = 'preset.full_gym') {
  let s = create(massProfile({ preset, multisport: false }));
  const [a = '', ...rest] = strengthIds(s);
  const d = selectProgrammeSession(s, a)?.date ?? '2026-10-05';
  s = startProgrammeSession(s, at(T(d)), a, env, { painAnswer: 'no' });
  for (const b of (sessionOf(s, a)?.blocks ?? []).filter((x) => x.kind !== 'warmup' && x.kind !== 'cooldown')) for (const it of b.items) if (it.prescription.type === 'sets') it.prescription.sets.forEach((p, i) => { s = recordProgrammeSet(s, at(T(d, '18:10')), a, { itemId: it.id, setIndex: i, done: true, reps: typeof p.reps === 'number' ? p.reps : p.reps.min, loadKg: 40 }); });
  s = finishProgrammeSession(s, at(T(d, '19:00')), { requestId: a, completion: 'completed_as_prescribed', pain: false });
  // Séance rendue non reproductible par la réalisation de la première (choisie, jamais supposée).
  const c = rest.find((id) => !faithful(s, id)) ?? '';
  return { s, c, date: selectProgrammeSession(s, c)?.date ?? '2026-10-09' };
}
/** Aucune zone exclue dans la séance exécutable (adaptée si présente). */
const clean = (s: AppState, id: string, area: string) => expect(exercisesOf(s, id).filter((e) => areasOf(e).includes(area))).toEqual([]);

describe('R2 — adaptPersistedSession (voie forcée)', () => {
  const base = setup();

  it('AP-0. pré-condition : séance 3 non reproductible après la séance 1 réalisée', () => {
    expect(faithful(base.s, base.c)).toBe(false);
  });

  it('AP-1. genou P2 au démarrage : séance PERSISTÉE adaptée (CORE), seuls les exercices genou changent, le reste est identique à la prescription', () => {
    const s = startProgrammeSession(base.s, at(T(base.date)), base.c, env, P2('knee'));
    expect(s.checkIns.at(-1)?.decision).toBe('adapted');
    expect(codes(s)).toContain('KAIRO.CHECKIN_PERSISTED_ADAPTED');
    expect(codes(s)).not.toContain('KAIRO.CHECKIN_SESSION_RECOMPOSED');
    clean(s, base.c, 'knee');
    const before = sessionOf(base.s, base.c)?.blocks.flatMap((b) => b.items) ?? [];
    const after = sessionOf(s, base.c)?.blocks.flatMap((b) => b.items) ?? [];
    for (const it of before.filter((x) => !areasOf(x.exerciseId).includes('knee'))) expect(after.find((y) => y.id === it.id)).toEqual(it);
    for (const c of s.programmeLogs[base.c]?.adaptation?.changes ?? []) if (c.startsWith('removed:')) expect(areasOf(c.slice('removed:'.length))).toContain('knee');
  });

  it('AP-2. substitution admissible (coude P2) : remplacement par un substitut du catalogue, même item, aucune charge transférée', () => {
    const a = adaptPersistedSession(base.s, base.c, evalOf(base.s, 'elbow'), env);
    expect(a.status).toBe('adapted');
    if (a.status !== 'adapted') return;
    const added = a.changes.filter((c) => c.startsWith('added:')).map((c) => c.slice('added:'.length));
    expect(added.length).toBeGreaterThan(0);
    for (const ex of added) {
      expect(areasOf(ex)).not.toContain('elbow');
      const it = a.record.session.blocks.flatMap((b) => b.items).find((i) => i.exerciseId === ex);
      const orig = sessionOf(base.s, base.c)?.blocks.flatMap((b) => b.items).find((i) => i.id === it?.id);
      expect(orig).toBeDefined();
      expect(JSON.stringify(it?.prescription)).toBe(JSON.stringify(orig?.prescription));
      expect(JSON.stringify(it?.prescription)).not.toMatch(/"kg"|indicativeKg|"load"/);
    }
    for (const it of a.record.session.blocks.flatMap((b) => b.items)) expect(areasOf(it.exerciseId)).not.toContain('elbow');
  });

  it('AP-3. substitution impossible (bas du dos P2 : aucun substitut admissible au RDL) ⇒ refus du CORE ; au démarrage : jamais d’exercice bas du dos', () => {
    const a = adaptPersistedSession(base.s, base.c, evalOf(base.s, 'lower_back'), env);
    expect(a).toMatchObject({ status: 'impossible', cause: 'repair_refused' });
    if (a.status === 'impossible') expect(a.reasons.map((r) => r.code)).toContain('REPAIR.REST_RECOMMENDED');
    const s = startProgrammeSession(base.s, at(T(base.date)), base.c, env, P2('lower_back'));
    const d = s.checkIns.at(-1)?.decision;
    expect(['adapted', 'postponed']).toContain(d);
    if (d === 'adapted') { clean(s, base.c, 'lower_back'); expect(codes(s)).toContain('KAIRO.CHECKIN_SESSION_RECOMPOSED'); }
    else expect(s.programmeLogs[base.c]).toBeUndefined();
  });

  it('AP-4. bloc de force vidé (épaule P2 : poussée ET tirage retirés) ⇒ refusé, décision rendue au moteur (report, comme une séance reproductible)', () => {
    const a = adaptPersistedSession(base.s, base.c, evalOf(base.s, 'shoulder'), env);
    expect(a).toMatchObject({ status: 'impossible', cause: 'strength_block_emptied' });
    const s = startProgrammeSession(base.s, at(T(base.date)), base.c, env, P2('shoulder'));
    expect(s.checkIns.at(-1)?.decision).toBe('postponed');
    expect(s.programmeLogs[base.c]).toBeUndefined();
  });

  it('AP-5. douleur CONNUE (genou déclaré sur une autre séance) puis « Passer » : même voie persistée, aucune zone exclue', () => {
    const b = strengthIds(base.s).find((id) => id !== base.c && !base.s.programmeLogs[id]) ?? '';
    const s1 = startProgrammeSession(base.s, at(T(selectProgrammeSession(base.s, b)?.date ?? '2026-10-07')), b, env, P2('knee'));
    const s2 = startProgrammeSession(s1, at(T(base.date)), base.c, env);
    expect(s2.checkIns.at(-1)).toMatchObject({ painStatus: 'unknown', knownPains: [expect.objectContaining({ area: 'knee', level: 'P2' })] });
    expect(['adapted', 'postponed']).toContain(s2.checkIns.at(-1)?.decision);
    if (s2.programmeLogs[base.c]) clean(s2, base.c, 'knee');
  });

  it('AP-6. reprise : la séance adaptée commencée n’est jamais ré-adaptée (autre douleur déclarée, rechargement), séries conservées', () => {
    let s = startProgrammeSession(base.s, at(T(base.date)), base.c, env, P2('knee'));
    const it0 = sessionOf(s, base.c)?.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'sets');
    s = recordProgrammeSet(s, at(T(base.date, '18:10')), base.c, { itemId: it0?.id ?? '', setIndex: 0, done: true, reps: 6, loadKg: 30 });
    const log = JSON.stringify(s.programmeLogs[base.c]);
    const r = startProgrammeSession(reload(s, T(base.date, '18:20')), at(T(base.date, '18:20')), base.c, env, P2('elbow'));
    expect(JSON.stringify(r.programmeLogs[base.c])).toBe(log);
    expect(r.checkIns).toHaveLength(s.checkIns.length);
  });

  it('AP-7. invariant de sécurité (2 préréglages × 6 zones) : adaptée ⇒ aucune zone exclue restante ; sinon refus explicite', () => {
    for (const preset of ['preset.full_gym', 'preset.commercial_gym']) {
      const x = setup(preset);
      for (const area of ['knee', 'shoulder', 'lower_back', 'elbow', 'hip_groin', 'wrist_hand']) {
        const a = adaptPersistedSession(x.s, x.c, evalOf(x.s, area), env);
        if (a.status === 'adapted') for (const it of a.record.session.blocks.flatMap((b) => b.items)) expect(areasOf(it.exerciseId)).not.toContain(area);
        else expect(['repair_refused', 'strength_block_emptied']).toContain(a.cause);
      }
    }
  });

  it('AP-8. état réel de la version déployée (f9f7e2e, moteur différent) : voie persistée, aucune zone exclue', () => {
    const st = new MemoryStorage();
    for (const [k, v] of Object.entries(JSON.parse(readFileSync(new URL('./fixtures/deployed-f9f7e2e-L1-inprogress.json', import.meta.url), 'utf8')) as Record<string, string>)) st.setItem(k, v);
    const r = loadState(st, '2026-10-06T18:30:00.000Z');
    if (r.status !== 'ok') throw new Error(r.status);
    const s = ensureBeta0Week(r.state, at('2026-10-06T18:30:00.000Z'));
    const C = '2026-10-05.strength.3';
    expect(faithful(s, C)).toBe(false);
    const x = startProgrammeSession(s, at(T('2026-10-09')), C, env, P2('elbow'));
    expect(['adapted', 'unchanged', 'postponed']).toContain(x.checkIns.at(-1)?.decision);
    if (x.programmeLogs[C]) clean(x, C, 'elbow');
    if (x.checkIns.at(-1)?.decision === 'adapted') expect(codes(x)).toContain('KAIRO.CHECKIN_PERSISTED_ADAPTED');
  });
});
