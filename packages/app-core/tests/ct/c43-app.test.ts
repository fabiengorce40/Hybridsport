/**
 * C4.3 — bloc de force DÉLÉGUÉ dans la séance Cross-training (Beta 0 EXPÉRIMENTALE, règles TEST_ONLY) : planification
 * (provenance, matériel, durée), saisie des séries sur le journal CT, fin de séance (expositions Strength ajoutées,
 * tracks inchangés, séries inconnues / incomplètes refusées), rechargement, douleur, doublon, multisport.
 */
import { describe, expect, it } from 'vitest';
import { EQUIPMENT_PRESETS, finishProgrammeSession, normalizeInstant, startAssessment, recordProgrammeSet, recordProgrammeSetEffort, selectHistory, selectProgrammeSession, startProgrammeSession, toggleProgrammePainItem } from '../../src/index.js';
import type { AppState, ProfileInput } from '../../src/index.js';
import { strengthCatalogDocument } from '../../../strength/tests/fixtures/catalog.js';
import { at, create, ctSessions, decisions, fullGym, profile, reload, request, startCt, week } from './ct-fixtures.js';

const SC = 'crosstraining.strength_plus_conditioning';
const T = (hm: string) => `2026-10-05T${hm}:00.000Z`;
const code = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? String(e); } };
const sc = (o: { equipment?: readonly string[]; level?: ProfileInput['level']; strength?: boolean; availability?: number[] } = {}) =>
  create(profile({ ct: { intent: SC }, availability: o.availability ?? [60, 0, 60, 0, 60, 0, 0], ...o }));
const strengthBlockOf = (s: AppState, id: string) => selectProgrammeSession(s, id)?.session.blocks.find((b) => b.kind === 'strength');
const firstWithBlock = (s: AppState) => ctSessions(s).find((x) => strengthBlockOf(s, x.requestId) !== undefined)?.requestId ?? '';
type SetsP = { type: 'sets'; sets: { kind: string; optional?: boolean; reps: number | { min: number; max: number } }[] };
const setsOf = (s: AppState, id: string) => (strengthBlockOf(s, id)?.items ?? []).flatMap((it) => (it.prescription.type === 'sets' ? (it.prescription as unknown as SetsP).sets.map((p, i) => ({ itemId: it.id, i, p })) : []));
const repsOf = (p: SetsP['sets'][number]) => (typeof p.reps === 'number' ? p.reps : p.reps.min);
/** Valide toutes les séries du bloc (répétitions prescrites, charge saisie). */
function allSets(s: AppState, id: string, iso: string, kg = 40): AppState {
  let x = s;
  for (const { itemId, i, p } of setsOf(s, id)) x = recordProgrammeSet(x, at(iso), id, { itemId, setIndex: i, done: true, reps: repsOf(p), loadKg: kg });
  return x;
}
const AMRAP = { kind: 'rounds_reps', rounds: 3, reps: 0 };
const resultFor = (s: AppState, id: string): Record<string, unknown> => {
  const b = selectProgrammeSession(s, id)?.session.blocks.find((x) => x.kind === 'conditioning');
  const f = b?.format;
  if (f === 'amrap') return AMRAP;
  if (f === 'emom') return { kind: 'emom', minutesCompleted: 0 };
  if (f === 'for_time') return { kind: 'capped_rounds', roundsCompleted: 0, partialReps: 0 };
  return { kind: 'total', durationS: 60 };
};

describe('C4.3 — bloc de force délégué (application)', () => {
  it('1. planification : séance complète force + conditionnement, bloc AVANT le conditionnement, provenance Strength tracée', () => {
    const s = sc();
    const id = firstWithBlock(s);
    expect(id).not.toBe('');
    const v = selectProgrammeSession(s, id);
    const kinds = v?.session.blocks.map((b) => b.kind) ?? [];
    expect(kinds.indexOf('strength')).toBeLessThan(kinds.indexOf('conditioning'));
    // Échauffement général d'abord ; échauffement spécifique / accélérations APRÈS la force, juste avant le conditionnement.
    const ids = v?.session.blocks.map((b) => b.id) ?? [];
    const spec = ids.findIndex((x) => x.endsWith('.c4.warmup_specific') || x.includes('buildup'));
    if (spec >= 0) { expect(spec).toBeGreaterThan(kinds.indexOf('strength')); expect(spec).toBeLessThan(kinds.indexOf('conditioning')); }
    expect(decisions(s, id, 'STRENGTH_DELEGATED')[0]).toMatchObject({ requester: 'crosstraining', archetypeId: 'str_ct_block' });
    const c4 = v?.composition?.c4;
    expect(c4?.status).toBe('FULL_SESSION');
    expect(c4?.blocks.some((b) => b.block === 'strength')).toBe(true);
    expect(v?.estimatedDurationS ?? Infinity).toBeLessThanOrEqual(3600);
  });

  it.each([45, 60, 75])('1b. %i min : toute séance force + conditionnement PLANIFIÉE contient son bloc de force (jamais de repli « bloc principal seul » qui le supprimerait)', (m) => {
    const s = sc({ availability: [m, 0, m, 0, m, 0, 0] });
    for (const x of ctSessions(s)) {
      if (x.placement === 'planned') { expect(strengthBlockOf(s, x.requestId)).toBeDefined(); expect(x.composition?.c4?.status).toBe('FULL_SESSION'); }
      else expect(decisions(s, x.requestId, 'STRENGTH_DELEGATION_UNRESOLVED').length + decisions(s, x.requestId, 'C4_SESSION_STATUS').length).toBeGreaterThan(0);
    }
  });

  it('2. matériel déclaré respecté : chaque exercice du bloc est faisable avec le matériel DU PROFIL (catalogue ≠ disponibilité)', () => {
    const cat = new Map(strengthCatalogDocument().exercises.map((e) => [e.id, e.equipment]));
    const feasible = (id: string, eq: readonly string[]) => {
      const r = cat.get(id);
      return r !== undefined && r.allOf.every((x) => eq.includes(x)) && (r.anyOf.length === 0 || r.anyOf.some((x) => eq.includes(x)));
    };
    let blocks = 0;
    for (const preset of EQUIPMENT_PRESETS) {
      const s = sc({ equipment: preset.equipment });
      for (const x of ctSessions(s)) {
        const b = strengthBlockOf(s, x.requestId);
        if (!b) continue; // bloc impossible : délégation non résolue (tracée), jamais une prescription inventée
        blocks += 1;
        for (const it of b.items) expect({ preset: preset.id, ex: it.exerciseId, ok: feasible(it.exerciseId, preset.equipment) }).toMatchObject({ ok: true });
      }
    }
    expect(blocks).toBeGreaterThan(0);
    // Sans hack squat déclaré : jamais de hack squat, même s'il est au catalogue.
    const noHack = sc({ equipment: fullGym.filter((e) => e !== 'hack_squat') });
    for (const x of ctSessions(noHack)) expect(strengthBlockOf(noHack, x.requestId)?.items.some((i) => i.exerciseId === 'ex.hack_squat') ?? false).toBe(false);
  });

  it('3. séries saisies sur le journal CT : reps, charge, RIR ; repos démarré ; rechargement conservé', () => {
    let s = sc();
    const id = firstWithBlock(s);
    s = startProgrammeSession(s, at(T('07:00')), id);
    const [first] = setsOf(s, id);
    if (!first) throw new Error('série attendue');
    s = recordProgrammeSet(s, at(T('07:05')), id, { itemId: first.itemId, setIndex: first.i, done: true, reps: repsOf(first.p), loadKg: 30 });
    s = recordProgrammeSetEffort(s, id, first.itemId, first.i, 3);
    s = reload(s, T('07:06'));
    const log = s.programmeLogs[id];
    expect(log?.sets).toEqual([expect.objectContaining({ itemId: first.itemId, setIndex: first.i, done: true, loadKg: 30, rir: 3 })]);
    expect(log?.ct?.runningSince).toBeNull();
    expect(code(() => recordProgrammeSet(s, at(T('07:07')), id, { itemId: 'inconnu', setIndex: 0, done: true, reps: 5 }))).toBe('SET_UNKNOWN');
  });

  it('4. fin « telle que prescrite » : séries de travail manquantes ⇒ refus, aucune fin enregistrée', () => {
    let s = sc();
    const id = firstWithBlock(s);
    s = startCt(s, at(T('07:00')), id);
    const finish = (x: AppState) => finishProgrammeSession(x, at(T('07:50')), { requestId: id, completion: 'completed_as_prescribed', pain: false, ct: { result: resultFor(x, id) } });
    expect(code(() => finish(s))).toBe('EXECUTION_STRENGTH_INCOMPLETE');
    expect(s.programmeLogs[id]?.finishedAt).toBeUndefined();
    // Toutes les séries validées : le contrôle du bloc de force passe (le résultat du WOD reste jugé par Cross-training).
    expect(code(() => finish(allSets(s, id, T('07:20'))))).not.toBe('EXECUTION_STRENGTH_INCOMPLETE');
  });

  it('5. fin complète : expositions Strength AJOUTÉES (une fois), tracks Strength INCHANGÉS, doublon refusé, historique', () => {
    let s = sc();
    const id = firstWithBlock(s);
    const tracks0 = JSON.stringify(s.strength.tracks);
    const exp0 = s.strength.exposures.length;
    s = startCt(s, at(T('07:00')), id);
    s = allSets(s, id, T('07:15'));
    s = finishProgrammeSession(s, at(T('07:55')), { requestId: id, completion: 'modified', pain: false, ct: { result: resultFor(s, id) } });
    expect(s.programmeLogs[id]?.finishedAt).toBeDefined();
    const items = strengthBlockOf(s, id)?.items ?? [];
    const added = s.strength.exposures.slice(exp0);
    expect(added.map((e) => e.exerciseId).sort()).toEqual(items.map((i) => i.exerciseId).sort());
    expect(JSON.stringify(s.strength.tracks)).toBe(tracks0);
    expect(s.crosstraining.realized.filter((r) => r.sessionId === id)).toHaveLength(1);
    // Doublon : une seconde fin est refusée, aucune exposition supplémentaire.
    expect(code(() => finishProgrammeSession(s, at(T('08:00')), { requestId: id, completion: 'modified', pain: false, ct: { result: resultFor(s, id) } }))).toBe('SESSION_FINISHED');
    const h = selectHistory(s).find((x) => x.requestId === id);
    expect(h?.sport).toBe('crosstraining');
    expect(reload(s, T('08:05')).strength.exposures.length).toBe(s.strength.exposures.length);
  });

  it('6. douleur signalée sur un exercice du bloc ⇒ douleur de séance : pause active, nouvelles séances suspendues', () => {
    let s = sc();
    const id = firstWithBlock(s);
    s = startCt(s, at(T('07:00')), id);
    const [first] = setsOf(s, id);
    s = toggleProgrammePainItem(s, id, first?.itemId ?? '');
    s = finishProgrammeSession(s, at(T('07:30')), { requestId: id, completion: 'abandoned', pain: false, ct: {} });
    expect(s.programmeLogs[id]?.outcome?.pain).toBe(true);
    expect(s.safety.activePain).not.toBeNull();
    const other = ctSessions(s).find((x) => x.requestId !== id && s.programmeLogs[x.requestId] === undefined)?.requestId;
    if (other) expect(code(() => startProgrammeSession(s, at(T('08:00')), other))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
  });

  it('7. abandon sans série : aucune exposition Strength ajoutée', () => {
    let s = sc();
    const id = firstWithBlock(s);
    const exp0 = s.strength.exposures.length;
    s = startCt(s, at(T('07:00')), id);
    s = finishProgrammeSession(s, at(T('07:10')), { requestId: id, completion: 'abandoned', pain: false, ct: {} });
    expect(s.strength.exposures.length).toBe(exp0);
  });

  it('8. multisport : les séances Strength de la semaine restent planifiées ; aucune séance fusionnée ; une seule séance par demande', () => {
    const s = sc({ strength: true, availability: [60, 60, 60, 60, 60, 60, 0] });
    const ss = week(s)?.sessions ?? [];
    expect(ss.filter((x) => x.sport === 'strength').length).toBeGreaterThan(0);
    const ids = ss.map((x) => x.requestId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const x of ss.filter((y) => y.sport === 'strength')) expect(selectProgrammeSession(s, x.requestId)?.session.blocks.some((b) => b.kind === 'conditioning')).toBe(false);
    // Bloc délégué : provenance Strength et trace de la règle TEST_ONLY.
    for (const x of ss.filter((y) => y.sport === 'crosstraining' && strengthBlockOf(s, y.requestId))) {
      expect(String(decisions(s, x.requestId, 'STRENGTH_DELEGATED')[0]?.ruleId)).toContain('test');
      expect(request(s, x.requestId)?.reasons.some((r) => r.code.endsWith('STRENGTH_DELEGATION_UNRESOLVED'))).toBe(false);
    }
  });

  it('8b. démarrage manuel : politique P0 INCHANGÉE — séance PLANIFIÉE démarrable (non réévaluée), douleur active ⇒ refus', () => {
    const s = sc({ strength: true, availability: [60, 60, 60, 60, 60, 60, 0] });
    const ss = week(s)?.sessions ?? [];
    const ct = ss.find((y) => y.sport === 'crosstraining' && strengthBlockOf(s, y.requestId))?.requestId ?? '';
    // Limite documentée : démarrer la séance force + conditionnement le jour d'une séance Strength reste admis (règle P0
    // existante : l'interférence n'est évaluée que pour une séance NON placée) ; aucune règle nouvelle inventée ici.
    for (const d of ss.filter((y) => y.sport === 'strength')) expect(startAssessment(s, at(`${d.date}T07:00:00.000Z`), ct)).toMatchObject({ allowed: true });
    const pained: AppState = { ...s, safety: { activePain: { reportedAt: normalizeInstant(T('06:00')), areas: [] } } };
    expect(startAssessment(pained, at(T('07:00')), ct)).toMatchObject({ allowed: false, cause: 'ACTIVE_PAIN' });
    expect(code(() => startProgrammeSession(pained, at(T('07:00')), ct))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
  });

  it('9. niveau avancé : jamais débloqué (aucun bloc, aucune séance complète)', () => {
    const s = sc({ level: 'advanced' });
    for (const x of ctSessions(s)) expect(strengthBlockOf(s, x.requestId)).toBeUndefined();
  });
});
