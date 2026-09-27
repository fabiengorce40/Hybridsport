/**
 * Goldens S1–S7 (spec 4B étapes 17 et 23). Chaque séance est ENREGISTRÉE (entrées, séance, prescriptions,
 * raisons, empreinte, durée, validation) et RELUE : les assertions structurelles ci-dessous encodent ce
 * qu'un entraîneur vérifierait, pas seulement la validité technique.
 */
import { describe, expect, it } from 'vitest';
import { canonicalStringify } from '@hybridsport/engine';
import type { SessionDraft, SessionItem, SetPrescription } from '@hybridsport/domain';
import { GOLDENS } from '../fixtures/goldens.js';
import { goldenOutcome, goldenRecord } from '../fixtures/golden-record.js';
import { strengthCatalog } from '../fixtures/harness.js';

const CATALOG = strengthCatalog();
const ex = (id: string) => { const e = CATALOG.exercise(id); if (!e) throw new Error(id); return e; };
const G = (k: string) => { const g = GOLDENS[k]; if (!g) throw new Error(k); return g; };
function sessionOf(k: string): { s: SessionDraft; o: ReturnType<typeof goldenOutcome> } {
  const o = goldenOutcome(G(k).scenario);
  if (o.outcome.result.status !== 'ok') throw new Error(`${k} : ${o.outcome.result.status}`);
  return { s: o.outcome.result.value, o };
}
const strengthItems = (s: SessionDraft): SessionItem[] => s.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
const setsOf = (it: SessionItem): SetPrescription[] => (it.prescription.type === 'sets' ? it.prescription.sets : []);
const work = (it: SessionItem) => setsOf(it).filter((x) => x.kind !== 'rampup');
const rirOf = (x: SetPrescription): number | undefined => x.rir ?? (x.intensity && 'effort' in x.intensity && x.intensity.effort && 'rir' in x.intensity.effort ? x.intensity.effort.rir : undefined);
const repsMin = (x: SetPrescription) => (typeof x.reps === 'number' ? x.reps : x.reps.min);
const slotOf = (it: SessionItem) => it.refs?.slotId ?? '';

describe('goldens S1–S7 : enregistrement complet et déterministe', () => {
  for (const [k, g] of Object.entries(GOLDENS)) {
    it(`${k} — ${g.title}`, async () => {
      const r = goldenRecord(g.title, g.scenario);
      await expect(canonicalStringify(r.json)).toMatchFileSnapshot(`./__goldens__/${k}.json`);
      await expect(r.text).toMatchFileSnapshot(`./__goldens__/${k}.txt`);
      // Déterminisme : même entrée ⇒ même enregistrement, octet pour octet.
      expect(canonicalStringify(goldenRecord(g.title, g.scenario).json)).toBe(canonicalStringify(r.json));
      const o = goldenOutcome(g.scenario);
      expect(o.outcome.result.status).toBe('ok');
      expect(o.validation).toBe('VALID');
      expect(o.outcome.fingerprint?.sessionId).toBe(o.sessionId);
      expect(o.p50S).toBeLessThanOrEqual(g.scenario.intent.availableTimeS);
    });
  }
});

describe('revue structurelle des goldens (ce qu’un entraîneur vérifierait)', () => {
  it('invariants communs : échauffement, un principal, séries de travail ≥ 1, repos réalistes, RIR jamais négatif', () => {
    for (const k of Object.keys(GOLDENS)) {
      const { s } = sessionOf(k);
      expect(s.blocks[0]?.kind, k).toBe('warmup');
      expect(s.blocks.filter((b) => b.role === 'primary').flatMap((b) => b.items).length, k).toBeGreaterThanOrEqual(1);
      for (const it of strengthItems(s)) {
        if (it.prescription.type !== 'sets') continue;
        expect(work(it).length, `${k} ${it.exerciseId}`).toBeGreaterThanOrEqual(1);
        for (const x of work(it)) {
          expect(x.restAfterS, `${k} ${it.exerciseId}`).toBeGreaterThanOrEqual(30);
          expect(rirOf(x) ?? 0, `${k} ${it.exerciseId}`).toBeGreaterThanOrEqual(0);
        }
      }
      // Jamais deux fois le même exercice dans une séance.
      const ids = strengthItems(s).map((it) => it.exerciseId);
      expect(new Set(ids).size, k).toBe(ids.length);
    }
  });

  it('S1 débutant haltères : matériel respecté, aucune charge inventée (calibration à l’effort), aucune série lourde, RIR prudent', () => {
    const { s } = sessionOf('S1');
    for (const it of strengthItems(s)) {
      expect(ex(it.exerciseId).equipment.allOf.every((q) => G('S1').scenario.profile.availableEquipment.includes(q)), it.exerciseId).toBe(true);
      for (const x of work(it)) {
        expect(x.kind).toBe('working');
        expect(x.intensity?.mode === 'load' || x.intensity?.mode === 'percent_of_reference').toBe(false);
        expect(rirOf(x) ?? 0).toBeGreaterThanOrEqual(3);
      }
    }
    expect(strengthItems(s).filter((it) => it.refs?.prescriptionSource === 'calibration').length).toBeGreaterThanOrEqual(3);
  });

  it('S2 hypertrophie haut du corps : poussée horizontale ET tirage vertical, plages de répétitions ≥ 6, charges reprises de l’historique', () => {
    const { s } = sessionOf('S2');
    const patterns = strengthItems(s).map((it) => ex(it.exerciseId).patterns.primary);
    expect(patterns).toContain('push_horizontal');
    expect(patterns).toContain('pull_vertical');
    for (const it of strengthItems(s)) for (const x of work(it)) expect(repsMin(x)).toBeGreaterThanOrEqual(6);
    const bench = strengthItems(s).find((it) => it.exerciseId === 'ex.bench_press');
    expect(bench && work(bench)[0]?.intensity).toMatchObject({ mode: 'load', kg: 70 });
  });

  it('S3 soutien course, intervalles clés 20 h après : pas d’unilatéral ni d’isolation jambes, principal charnière, RIR relevé', () => {
    const { s, o } = sessionOf('S3');
    const slots = strengthItems(s).map(slotOf);
    expect(slots).not.toContain('sp.single_leg');
    expect(slots).not.toContain('sp.iso_lower');
    expect(slots).toContain('sp.main_hip');
    const primary = strengthItems(s).find((it) => slotOf(it) === 'sp.main_hip');
    for (const x of primary ? work(primary) : []) expect(rirOf(x) ?? 0).toBeGreaterThanOrEqual(3);
    expect(o.reasons.some((r) => r.code === 'SELECT.SLOT_OMITTED' && r.params.cause === 'interference')).toBe(true);
    expect(o.reasons.some((r) => r.code === 'PLAN.STRUCTURE_LOWERED' && r.params.structure === 'lower_knee')).toBe(true);
    // Aucun exercice à dominante genou n'est ajouté la veille d'une séance clé d'intervalles.
    for (const it of strengthItems(s)) expect(ex(it.exerciseId).patterns.primary, it.exerciseId).not.toBe('squat');
  });

  it('S4 soutien HYROX, séance grip élevée 18 h après : aucun porté, aucun exercice à forte sollicitation du grip', () => {
    const { s } = sessionOf('S4');
    expect(strengthItems(s).map(slotOf)).not.toContain('sp.carry');
    for (const it of strengthItems(s)) expect(ex(it.exerciseId).patterns.primary).not.toBe('carry');
  });

  it('S5 avancé force : ancres DÉCLARÉES utilisées (squat principal, RDL secondaire), série lourde + allégées, montée en charge en kg', () => {
    const { s } = sessionOf('S5');
    const squat = strengthItems(s).find((it) => it.exerciseId === 'ex.back_squat');
    const rdl = strengthItems(s).find((it) => it.exerciseId === 'ex.romanian_deadlift');
    expect(squat?.refs).toMatchObject({ anchor: 'declared', progressionTrackId: 'track.squat', slotId: 'lo.main_knee' });
    expect(rdl?.refs).toMatchObject({ anchor: 'declared', progressionTrackId: 'track.rdl', slotId: 'lo.sec_hip' });
    const sq = squat ? setsOf(squat) : [];
    expect(sq.filter((x) => x.kind === 'top_set')).toHaveLength(1);
    expect(sq.filter((x) => x.kind === 'backoff').length).toBeGreaterThanOrEqual(1);
    expect(sq.filter((x) => x.kind === 'rampup').every((x) => x.intensity?.mode === 'load')).toBe(true);
    // La charge de la série lourde vient de l'e1RM LISSÉ de la track (165 kg), jamais au-delà.
    const top = sq.find((x) => x.kind === 'top_set')?.intensity;
    expect(top?.mode === 'percent_of_reference' && top.kgRounded <= 165).toBe(true);
    // Aucun exercice plafonné au poids du corps pour un avancé quand une option chargeable existe.
    for (const it of strengthItems(s)) if (it.prescription.type === 'sets') expect(ex(it.exerciseId).loadCeiling, it.exerciseId).toBeGreaterThanOrEqual(1);
  });

  it('S6 30 minutes : les emplacements requis sont tous là, la séance tient dans 30 min, pas d’accessoire superflu', () => {
    const { s, o } = sessionOf('S6');
    expect(o.p50S ?? Infinity).toBeLessThanOrEqual(1800);
    const slots = strengthItems(s).map(slotOf);
    expect(slots.filter((x) => x.startsWith('fb.main_'))).toHaveLength(1);
    expect(slots.filter((x) => ['fb.push_h', 'fb.push_v'].includes(x))).toHaveLength(1);
    expect(slots.filter((x) => ['fb.pull_h', 'fb.pull_v'].includes(x))).toHaveLength(1);
    expect(o.reasons.some((r) => r.code === 'SELECT.SLOT_OMITTED' && r.params.cause === 'duration')).toBe(true);
  });

  it('S7 : la séance haut du corps garde un équilibre poussée / tirage (≥ 1 poussée horizontale et ≥ 1 tirage de chaque plan)', () => {
    const { s } = sessionOf('S7');
    const patterns = strengthItems(s).map((it) => ex(it.exerciseId).patterns.primary);
    expect(patterns).toContain('push_horizontal');
    expect(patterns).toContain('pull_horizontal');
    expect(patterns).toContain('pull_vertical');
  });
});
