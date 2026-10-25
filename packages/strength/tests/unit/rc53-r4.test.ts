/**
 * RC5.3 lot R4 — séances modifiées (variante SOUPLE, contenu 0.9.0) :
 * - dose de RÉFÉRENCE (RIR de base + modificateurs durables) et dose « transitoire » (état du jour, interférence)
 *   seulement quand un modificateur du jour change RÉELLEMENT la dose ; réduction liée au temps : structurelle, non marquée ;
 * - marquage des items modifiés (refs `doseModified`, `referenceRir`) sous la politique du contenu, jamais sans elle ;
 * - lecture souple par la progression : jamais de régression du seul fait de la modification, aucune hausse décidée sur
 *   une exposition modifiée, signal de capacité seulement avec un effort observé ;
 * - R4.4 (recalcul de la charge quand le RIR est relevé) : désactivé par le contenu ; vérifié séparément.
 */
import { describe, expect, it } from 'vitest';
import type { Exercise, SetPrescription } from '@hybridsport/domain';
import { computeDose, readStrengthParams, updateTrack } from '../../src/index.js';
import type { ExecutedItem, StrengthTrack } from '../../src/index.js';
import { envFor, NOW, run, scenario, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';
import { RC53_R4_RULESET_VERSION, strengthRc53R4RulesetDocument } from '../fixtures/rc53.js';
import { strengthRc51RulesetDocument } from '../fixtures/rc51.js';

const RC53 = strengthRuleset(strengthRc53R4RulesetDocument());
const RC53_R44 = strengthRuleset(strengthRc53R4RulesetDocument({ recalculateLoad: true }));
const RC51 = strengthRuleset(strengthRc51RulesetDocument());
const P = readStrengthParams(RC53).values;
const P51 = readStrengthParams(RC51).values;
const CATALOG = strengthCatalog();
const ex = (id: string): Exercise => { const e = CATALOG.exercise(id); if (!e) throw new Error(id); return e; };
const CAUTION = { readiness: 'caution' as const, activePain: [], painHistory: 'available' as const, dayAvailable: true };
const opts = { role: 'primary' as const, timePressure: false, doubleProgression: false, calibration: false };

const work = (n: number, reps: number, kg: number, rir: number): SetPrescription[] => Array.from({ length: n }, () => ({ kind: 'working', reps, restAfterS: 120, intensity: { mode: 'load', kg, certainty: 'prescribed', effort: { rir } } }));
const sets = (n: number, reps: number, kg: number, rir?: number) => Array.from({ length: n }, () => ({ reps, loadKg: kg, ...(rir !== undefined ? { rir } : {}) }));
const item = (performed: ExecutedItem['performed']): ExecutedItem => ({ exerciseId: 'ex.bench_press', prescribed: work(3, 8, 80, 2), performed, sessionCompleted: true });
const track = (o: Partial<StrengthTrack> = {}): StrengthTrack => ({
  trackId: 'track.t', tier: 'anchor', exerciseId: 'ex.bench_press', archetypeId: 'str_upper', slotId: 'up.main_push_h', model: 'autoregulated', status: 'active', openedAt: NOW,
  consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0, e1rmKg: 100, nextPrescription: { sets: 3, reps: 8, loadKg: 80, rir: 2 }, ...o,
});
const held = (u: ReturnType<typeof updateTrack>) => u.reasons.filter((r) => r.code === 'PROGRESSION.HELD').map((r) => String(r.params.cause));
const modified = { modified: true } as const;

describe('contenu RC5.3 R4', () => {
  it('version 0.9.0, politique souple, recalcul R4.4 désactivé ; RC5.1 sans politique', () => {
    expect(RC53.version).toBe(RC53_R4_RULESET_VERSION);
    expect(P['strength.progression.policy']).toEqual({ modifiedExposure: { mode: 'soft', recalculateLoad: false } });
    expect(P51['strength.progression.policy']).toBeUndefined();
  });
});

describe('dose de référence et dose transitoire', () => {
  it('aucun modificateur du jour : dose non transitoire, RIR de référence = RIR prescrit', () => {
    const d = computeDose(ex('ex.back_squat'), envFor(scenario({ ruleset: RC53 })), opts);
    expect(d.transient).toBe(false);
    expect(d.referenceRir).toBe(d.rir);
  });

  it('état du jour « prudence » : RIR relevé, dose transitoire, référence = RIR de base', () => {
    const base = computeDose(ex('ex.back_squat'), envFor(scenario({ ruleset: RC53 })), opts);
    const d = computeDose(ex('ex.back_squat'), envFor(scenario({ ruleset: RC53, state: CAUTION })), opts);
    expect(d.rir).toBeGreaterThan(base.rir);
    expect(d.transient).toBe(true);
    expect(d.referenceRir).toBe(base.rir);
  });

  it('modificateur du jour COUVERT par un modificateur durable (niveau novice +1 RIR, politique max) : rien n’est marqué', () => {
    const d = computeDose(ex('ex.goblet_squat'), envFor(scenario({ ruleset: RC53, level: 'novice', state: CAUTION })), opts);
    expect(d.transient).toBe(false);
    expect(d.referenceRir).toBe(d.rir);
  });

  it('pression temporelle (non-principal ramené au plancher) : réduction STRUCTURELLE, non transitoire, RIR inchangé', () => {
    const env = envFor(scenario({ ruleset: RC53 }));
    const free = computeDose(ex('ex.bench_press'), env, { ...opts, role: 'secondary', allocatedSets: 4 });
    const tp = computeDose(ex('ex.bench_press'), env, { ...opts, role: 'secondary', allocatedSets: 4, timePressure: true });
    expect(tp.sets).toBeLessThan(free.sets);
    expect(tp.reasons.some((r) => r.code === 'DOSE.MODIFIED' && r.params.modifier === 'time')).toBe(true);
    expect(tp.transient).toBe(false);
    expect(tp.referenceRir).toBe(tp.rir);
  });
});

describe('marquage des items modifiés (moteur)', () => {
  const items = (r: ReturnType<typeof run>) => (r.result.status === 'ok' ? r.result.value.blocks.flatMap((b) => b.items) : []);
  it('contenu RC5.3 + prudence : items de travail marqués, RIR de référence < RIR prescrit', () => {
    const r = run(scenario({ ruleset: RC53, state: CAUTION }));
    expect(r.result.status).toBe('ok');
    const marked = items(r).filter((i) => i.refs?.doseModified === true);
    expect(marked.length).toBeGreaterThan(0);
    for (const i of marked) {
      const w = i.prescription.type === 'sets' ? i.prescription.sets.find((x) => x.kind !== 'rampup') : undefined;
      const rir = w?.intensity && 'effort' in w.intensity ? (w.intensity.effort as { rir?: number } | undefined)?.rir : w?.rir;
      expect([i.exerciseId, (i.refs?.referenceRir ?? 99) < (rir ?? 0)]).toEqual([i.exerciseId, true]);
    }
  });

  it('contenu RC5.1 (sans politique) : aucun marquage — séances antérieures reproduites à l’identique', () => {
    expect(items(run(scenario({ ruleset: RC51, state: CAUTION }))).some((i) => i.refs?.doseModified !== undefined || i.refs?.referenceRir !== undefined)).toBe(false);
  });

  it('séance non modifiée : aucun marquage, séance identique avec ou sans la politique', () => {
    const a = run(scenario({ ruleset: RC53 }));
    expect(items(a).some((i) => i.refs?.doseModified)).toBe(false);
    const b = run(scenario({ ruleset: RC51 }));
    expect(JSON.stringify(items(a))).toBe(JSON.stringify(items(b)));
  });
});

describe('lecture souple d’une exposition modifiée (progression)', () => {
  const e = ex('ex.bench_press');

  it('« en dessous » modifié : maintien `below_modified`, AUCUN compteur, aucune régression (même au seuil)', () => {
    const t = track({ consecutiveBelow: P['strength.progression'].regressAfterBelow - 1, consecutiveHolds: 1, consecutiveSuccess: 1 });
    const u = updateTrack(t, item(sets(3, 8, 80, 0)), 'below', e, P, 'accumulation', undefined, modified);
    expect(held(u)).toEqual(['below_modified']);
    expect(u.track.nextPrescription).toEqual(t.nextPrescription);
    expect([u.track.consecutiveBelow, u.track.consecutiveHolds, u.track.consecutiveSuccess]).toEqual([t.consecutiveBelow, t.consecutiveHolds, t.consecutiveSuccess]);
    expect(u.track.evidence).toEqual(t.evidence);
    // Référence : sans marquage, la même exposition fait régresser la charge.
    const legacy = updateTrack(t, item(sets(3, 8, 80, 0)), 'below', e, P, 'accumulation');
    expect(legacy.reasons.map((r) => r.code)).toContain('PROGRESSION.REGRESSED');
  });

  it('« partielle » modifiée : maintien `below_modified`, aucun compteur de stagnation', () => {
    const t = track({ consecutiveHolds: 2 });
    const u = updateTrack(t, item(sets(3, 7, 80, 1)), 'partial', e, P, 'accumulation', undefined, modified);
    expect(held(u)).toEqual(['below_modified']);
    expect(u.track.consecutiveHolds).toBe(2);
    expect(u.rotate).toBe(false);
  });

  it('réussite modifiée avec effort OBSERVÉ : une réussite comptée, e1RM mis à jour, charge et répétitions inchangées', () => {
    const t = track({ consecutiveSuccess: 0 });
    for (const cls of ['on_target', 'above'] as const) {
      const u = updateTrack(t, item(sets(3, 8, 80, 4)), cls, e, P, 'accumulation', undefined, modified);
      expect(held(u)).toEqual(['modified_prescription']);
      expect(u.track.consecutiveSuccess).toBe(1);
      expect(u.track.nextPrescription).toEqual(t.nextPrescription);
      expect(u.track.e1rmKg).not.toBe(t.e1rmKg);
      expect(u.track.evidence?.e1rmBasis).toBe('observed');
    }
  });

  it('effort hors du domaine de validité de l’estimation (RIR très élevé) : signal inexploitable, aucun compteur', () => {
    const t = track();
    const u = updateTrack(t, item(sets(3, 8, 80, 6)), 'above', e, P, 'accumulation', undefined, modified);
    expect(held(u)).toEqual(['modified_prescription']);
    expect(u.track.consecutiveSuccess).toBe(0);
  });

  it('réussite modifiée SANS effort saisi : signal inexploitable, aucun compteur, aucune estimation', () => {
    const t = track();
    const u = updateTrack(t, item(sets(3, 8, 80)), 'on_target', e, P, 'accumulation', undefined, modified);
    expect(held(u)).toEqual(['modified_prescription']);
    expect(u.track).toEqual(t);
  });

  it('aucune hausse sur des expositions modifiées seules, quel que soit leur nombre ; la hausse vient d’une exposition NON modifiée', () => {
    for (const model of ['linear_load', 'autoregulated', 'double_progression'] as const) {
      let t = track({ model, ...(model === 'double_progression' ? { repRange: { min: 8, max: 8 } } : {}) });
      for (let k = 0; k < 6; k++) t = updateTrack(t, item(sets(3, 8, 80, 4)), 'above', e, P, 'accumulation', undefined, modified).track;
      expect([model, t.nextPrescription]).toEqual([model, track().nextPrescription]);
      const next = updateTrack(t, item(sets(3, 8, 80, 4)), 'above', e, P, 'accumulation');
      expect([model, next.reasons.map((r) => r.code).includes('PROGRESSION.ADVANCED')]).toEqual([model, true]);
    }
  });

  it('règles communes inchangées sur exposition modifiée : douleur (suspension), substitution, données absentes, décharge', () => {
    const t = track({ consecutiveBelow: 1 });
    expect(updateTrack(t, item([]), 'pain', e, P, 'accumulation', undefined, modified)).toEqual(updateTrack(t, item([]), 'pain', e, P, 'accumulation'));
    for (const cls of ['substituted', 'no_data', 'interrupted', 'load_deviation'] as const) {
      expect([cls, updateTrack(t, item(sets(3, 8, 80, 2)), cls, e, P, 'accumulation', undefined, modified)]).toEqual([cls, updateTrack(t, item(sets(3, 8, 80, 2)), cls, e, P, 'accumulation')]);
    }
    expect(updateTrack(t, item(sets(3, 8, 80, 2)), 'on_target', e, P, 'deload', undefined, modified)).toEqual(updateTrack(t, item(sets(3, 8, 80, 2)), 'on_target', e, P, 'deload'));
  });

  it('contenu RC5.1 (sans politique) : l’option `modified` est sans effet (sémantique antérieure)', () => {
    const t = track({ consecutiveBelow: 1 });
    expect(updateTrack(t, item(sets(3, 8, 80, 0)), 'below', e, P51, 'accumulation', undefined, modified)).toEqual(updateTrack(t, item(sets(3, 8, 80, 0)), 'below', e, P51, 'accumulation'));
  });
});

describe('R4.4 — recalcul de la charge quand le RIR est relevé (option, NON activée)', () => {
  // Ancre déclarée (développé couché, principal) : charge de la track 90 kg × 5 à RIR 2, e1RM cohérent 108 kg (90 / 0,83).
  const anchor = { archetype: 'str_upper', stimulus: 'strength_heavy', state: CAUTION, intent: { repetitionIntents: [{ kind: 'progression_anchor' as const, trackId: 't' }] },
    context: { goal: { primary: { goal: 'strength' as const } }, tracks: [track({ trackId: 't', slotId: 'up.main_push_h', e1rmKg: 108, nextPrescription: { sets: 3, reps: 5, loadKg: 90, rir: 2 } })] } };
  const bench = (r: ReturnType<typeof run>) => (r.result.status === 'ok' ? r.result.value.blocks.flatMap((b) => b.items).find((i) => i.refs?.slotId === 'up.main_push_h') : undefined);
  const kgOf = (i: ReturnType<typeof bench>) => { const w = i?.prescription.type === 'sets' ? i.prescription.sets.find((x) => x.kind !== 'rampup') : undefined; return w?.intensity?.mode === 'load' ? w.intensity.kg : undefined; };
  const recalculated = (r: ReturnType<typeof run>) => (r.trace?.entries ?? []).flatMap((x) => x.reasons).filter((x) => x.code === 'DOSE.LOAD.RECALCULATED');

  it('contenu courant (désactivé) : la charge de la track est conservée telle quelle (constat C4), item marqué', () => {
    const off = run(scenario({ ...anchor, ruleset: RC53 }));
    expect(bench(off)?.refs?.doseModified).toBe(true);
    expect(kgOf(bench(off))).toBe(90);
    expect(recalculated(off)).toEqual([]);
  });

  it('option activée (étude) : charge recalculée depuis l’e1RM pour le RIR relevé, plus basse, jamais au-dessus, tracée', () => {
    const on = run(scenario({ ...anchor, ruleset: RC53_R44 }));
    const kg = kgOf(bench(on));
    expect(kg).toBeDefined();
    expect(kg ?? 99).toBeLessThan(90);
    // 85 kg × 5 avec un e1RM de 108 kg ⇒ RIR ≈ 30 × (108 / 85 − 1) − 5 ≈ 3,1 : cohérent avec le RIR relevé (3).
    expect(new Set(recalculated(on).map((r) => `${String(r.params.fromKg)}>${String(r.params.toKg)}`))).toEqual(new Set([`90>${String(kg)}`]));
    // Sans état du jour (dose non transitoire) : jamais de recalcul.
    const normal = run(scenario({ ...anchor, state: { ...CAUTION, readiness: 'normal' as const }, ruleset: RC53_R44 }));
    expect(kgOf(bench(normal))).toBe(90);
    expect(recalculated(normal)).toEqual([]);
  });
});

describe('séries retirées par manque de temps (comportement conservé, distinctions vérifiées)', () => {
  const e = ex('ex.bench_press');
  const env = () => envFor(scenario({ ruleset: RC53 }));
  const secondary = { ...opts, role: 'secondary' as const, allocatedSets: 4 };
  it('prescription charge / répétitions / RIR INTACTE, volume réduit : non marquée ; une réussite sur toutes les séries prescrites est une preuve ordinaire', () => {
    const free = computeDose(e, env(), secondary);
    const tp = computeDose(e, env(), { ...secondary, timePressure: true });
    expect([tp.transient, tp.rir, tp.reps]).toEqual([false, free.rir, free.reps]);
    expect(tp.sets).toBeLessThan(free.sets);
    // Deux séries prescrites, deux réalisées à la cible : réussite comptée (modèle de la track inchangé).
    const x: ExecutedItem = { exerciseId: e.id, prescribed: work(2, 8, 80, 2), performed: sets(2, 8, 80, 2), sessionCompleted: true };
    const u = updateTrack(track({ consecutiveSuccess: 0 }), x, 'on_target', e, P, 'accumulation');
    expect(u.track.consecutiveSuccess).toBe(1);
  });
  it('exposition INSUFFISANTE pour conclure (séance interrompue, séries non saisies) : aucune décision, aucun compteur', () => {
    const t = track({ consecutiveSuccess: 1 });
    const interrupted: ExecutedItem = { exerciseId: e.id, prescribed: work(3, 8, 80, 2), performed: sets(1, 8, 80, 2), sessionCompleted: false };
    for (const cls of ['interrupted', 'no_data'] as const) {
      const u = updateTrack(t, interrupted, cls, e, P, 'accumulation');
      expect([cls, u.track.nextPrescription, u.track.consecutiveSuccess, u.track.consecutiveBelow]).toEqual([cls, t.nextPrescription, t.consecutiveSuccess, t.consecutiveBelow]);
    }
  });
  it('fatigue ou interférence ayant RÉELLEMENT modifié l’effort : marquée (RIR relevé) et lue contre le RIR de référence', () => {
    const d = computeDose(ex('ex.back_squat'), envFor(scenario({ ruleset: RC53, state: CAUTION })), opts);
    expect(d.transient).toBe(true);
    expect(d.rir).toBeGreaterThan(d.referenceRir);
  });
});
