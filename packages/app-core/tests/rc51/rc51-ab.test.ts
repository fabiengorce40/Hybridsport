/**
 * RC5.1 — intégration contrôlée Haut A/B et Bas A/B (variante C, objectif hypertrophie seulement).
 *
 * Référence FIGÉE : banc RC5.1 (8 profils RC4.6 + Musculation 4× avec HYROX, avec Cross-training, haltères seuls, objectif
 * force, objectif forme générale ; 6 semaines, chemin réel) produit par le code d'AVANT RC5.1 (`19c1b14`, contenu L1b-4)
 * — `fixtures/pre-rc51-bench.json`. État S4 après 3 semaines réalisées, semaine 4 planifiée par le code d'avant RC5.1 —
 * `fixtures/pre-rc51-s4-w4.json`.
 *
 * 1. Profils hors hypertrophie 4× (Full Body, force, forme générale) : séances, charges et démarrages IDENTIQUES.
 * 2. Hypertrophie 4× : Haut A, Bas A, Haut B, Bas B chaque semaine ; ordre A/B alterné selon la parité calendaire ;
 *    deux mouvements principaux par région ; aucune semaine de plus sous le plancher ; aucune séance au-delà de la durée
 *    disponible ; reproductibilité intacte ; douleur au démarrage traitée à l'identique.
 * 3. Rotation : stable après redémarrage, régénération identique, semaine décalée (début en milieu de semaine), semaine
 *    déjà planifiée conservée (contenu L1b-4 relu), continuité des charges à la première semaine A/B.
 *
 * Déséquilibre poussée / tirage : MESURÉ, non corrigé dans ce lot (étude ultérieure) — rapport RC5.1-INTEGRATION.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  beta0Environment, createBeta0Programme, emptyState, ensureBeta0Week, exportState, MemoryStorage, saveState, selectProgrammeSession, sessionEnvironment, STORAGE_KEY,
} from '../../src/index.js';
import type { AppState, PersistedWeek } from '../../src/index.js';
import { clock } from '../fixtures.js';
import { recordOf } from '../longitudinal/s3-scenario.js';
import { loadText } from '../rc45/probe-starts.js';
import { rc51Measure, rc51Profiles } from './rc51-bench.js';
import type { Rc51Measure } from './rc51-bench.js';

const fixture = (name: string): string => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const BEFORE = JSON.parse(fixture('pre-rc51-bench.json')) as Record<string, Rc51Measure>;
const UNCHANGED = ['P1', 'P2', 'P3', 'P4', 'P5', 'S3', 'S4F', 'S4G'];
const AB = ['P1b', 'S4', 'S4H', 'S4C', 'S4D'];
const AB_ARCHS = ['str_lower_a', 'str_lower_b', 'str_upper_a', 'str_upper_b'];
// technical-constant: TEST_ONLY — semaines calendaires paires (ordre A) et impaires (ordre B) du banc
const ORDER_A = ['str_upper_a', 'str_lower_a', 'str_upper_b', 'str_lower_b'];
const ORDER_B = ['str_upper_b', 'str_lower_b', 'str_upper_a', 'str_lower_a'];
const EVEN_WEEKS = new Set(['2026-10-05', '2026-10-19', '2026-11-02']);

type Req = PersistedWeek['requests'][number];
const strengthReqs = (s: AppState, w: string): Req[] => (s.planner.weeks[w]?.requests ?? []).filter((r) => r.sport === 'strength' && r.status === 'planned').sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
const archs = (s: AppState, w: string) => strengthReqs(s, w).map((r) => r.intent?.archetypeId);
const weekOrder = (s: AppState, w: string) => [...new Set(strengthReqs(s, w).map((r) => r.reasons.find((x) => x.code === 'PLAN.WEEK_COMPOSITION')?.params.weekOrder))];
const S4_INPUT = rc51Profiles().find((p) => p.id === 'S4')?.profile;

describe('RC5.1 — banc avant / après (13 profils, 6 semaines)', () => {
  const after = new Map(rc51Profiles().map((p) => [p.id, rc51Measure(p)]));

  it('référence complète : mêmes profils qu’avant RC5.1', () => {
    expect([...after.keys()].sort()).toEqual(Object.keys(BEFORE).sort());
  });

  for (const id of UNCHANGED) {
    it(`${id} (hors hypertrophie 4×) : séances, charges, durées et démarrages identiques à la référence`, () => {
      const a = after.get(id);
      const b = BEFORE[id];
      // RC5.3 R4 (séances modifiées) : une hausse décidée sur une séance allégée par l'interférence n'a plus lieu (effet de
      // bord RC5.2 §2.3). Composition et séries identiques ; durée à ± 1 min (paliers de montée selon la charge) ; une
      // charge principale n'est jamais AU-DESSUS de la référence (R4 retire des hausses, n'en ajoute aucune).
      const shape = (m: Rc51Measure | undefined) => m?.sessions.map(({ p50: _p, ...x }) => x);
      expect(shape(a)).toEqual(shape(b));
      a?.sessions.forEach((x, i) => expect(Math.abs((x.p50 ?? 0) - (b?.sessions[i]?.p50 ?? 0))).toBeLessThanOrEqual(1));
      expect(Object.keys(a?.mains ?? {}).sort()).toEqual(Object.keys(b?.mains ?? {}).sort());
      for (const [ex, loads] of Object.entries(a?.mains ?? {})) loads.forEach((kg, i) => expect([ex, i, kg === null || (b?.mains[ex]?.[i] ?? null) === null || kg <= (b?.mains[ex]?.[i] ?? 0)]).toEqual([ex, i, true]));
      expect(a?.starts).toEqual(b?.starts);
      expect(a?.summary.volume).toEqual(b?.summary.volume);
    });
  }

  for (const id of AB) {
    it(`${id} (hypertrophie 4×) : Haut A / Bas A / Haut B / Bas B chaque semaine, ordre A/B alterné`, () => {
      const m = after.get(id) as Rc51Measure;
      const weeks = [...new Set(m.sessions.map((s) => s.week))];
      expect(weeks).toHaveLength(6);
      for (const w of weeks) {
        const ws = m.sessions.filter((s) => s.week === w).sort((x, y) => ((x.date ?? '') < (y.date ?? '') ? -1 : 1));
        expect([w, ws.map((s) => s.arch).sort()]).toEqual([w, AB_ARCHS]);
      }
      // Même nombre de séances qu'avant, aucune semaine supplémentaire sous le plancher, aucun dépassement de durée.
      const b = BEFORE[id] as Rc51Measure;
      expect(m.summary.strengthSessions).toBe(b.summary.strengthSessions);
      for (const [g, n] of Object.entries(m.summary.underFloorWeeks)) expect([g, n <= (b.summary.underFloorWeeks[g] ?? 0)]).toEqual([g, true]);
      expect(m.summary.duration.overAvailable).toBe(0);
      expect(m.summary.reproducibility.identical).toBe(m.summary.strengthSessions);
      expect(m.summary.accountingGap).toBe(0);
      // Douleur au démarrage : mêmes décisions qu'avant RC5.1.
      const pain = (x: Rc51Measure) => Object.entries(x.starts).filter(([k]) => k.startsWith('douleur:'));
      expect(pain(m)).toEqual(pain(b));
    });
  }

  it('ordre A/B selon la parité calendaire (S4, P1b : jours non contraints)', () => {
    for (const id of ['S4', 'P1b']) {
      const m = after.get(id) as Rc51Measure;
      for (const w of [...new Set(m.sessions.map((s) => s.week))]) {
        const ws = m.sessions.filter((s) => s.week === w).sort((x, y) => ((x.date ?? '') < (y.date ?? '') ? -1 : 1)).map((s) => s.arch);
        expect([id, w, ws]).toEqual([id, w, EVEN_WEEKS.has(w) ? ORDER_A : ORDER_B]);
      }
    }
  });

  it('S4 : deux mouvements principaux par région, six expositions chacun (avant : un seul, douze expositions)', () => {
    const exposures = (m: Rc51Measure) => Object.fromEntries(Object.entries(m.mains).map(([ex, loads]) => [ex, loads.length]));
    expect(exposures(BEFORE.S4 as Rc51Measure)).toEqual({ bench_press: 12, back_squat: 12 });
    expect(exposures(after.get('S4') as Rc51Measure)).toEqual({ bench_press: 6, barbell_ohp: 6, back_squat: 6, romanian_deadlift: 6 });
    // Haltères seuls : principaux faisables avec le matériel déclaré.
    expect(Object.keys(BEFORE.S4D?.mains ?? {}).sort()).toEqual(['db_bench_press', 'goblet_squat']);
    expect(Object.keys(after.get('S4D')?.mains ?? {}).sort()).toEqual(['db_bench_press', 'db_shoulder_press', 'goblet_squat', 'single_leg_rdl_db']);
  });

  it('poussée / tirage : mesuré, non corrigé dans ce lot ; le ratio ne s’aggrave pas', () => {
    for (const id of AB) expect([id, (after.get(id)?.summary.pushPull.ratio ?? 0) <= (BEFORE[id]?.summary.pushPull.ratio ?? 0)]).toEqual([id, true]);
  });

  it('jours contraints (P1b) : les séances réduites ne touchent plus systématiquement la même variante', () => {
    // Séance réduite : durée estimée ≤ 32 min (jour contraint par la course la veille / le lendemain).
    // technical-constant: TEST_ONLY — seuil de séance réduite du banc RC5.1
    const reduced = (after.get('P1b')?.sessions ?? []).filter((s) => s.p50 !== null && s.p50 <= 32);
    const arch = new Set(reduced.map((s) => s.arch));
    expect(reduced.length).toBeGreaterThan(0);
    expect(arch.has('str_lower_a') && arch.has('str_lower_b')).toBe(true);
  });
});

describe('RC5.1 — rotation des semaines', () => {
  const W = ['2026-10-05', '2026-10-12', '2026-10-19'] as const;
  const s0 = createBeta0Programme(emptyState(), S4_INPUT as never, clock(W[0]), {});

  it('ordre A les semaines calendaires paires, B les impaires ; trace « weekOrder » sur chaque séance', () => {
    let s = s0;
    for (const w of W) {
      s = ensureBeta0Week(s, clock(w));
      expect(archs(s, w)).toEqual(EVEN_WEEKS.has(w) ? ORDER_A : ORDER_B);
      expect(weekOrder(s, w)).toEqual([EVEN_WEEKS.has(w) ? 'A' : 'B']);
    }
  });

  it('stable après redémarrage : sauvegarde, relecture, même texte et même semaine planifiée', () => {
    const s1 = ensureBeta0Week(s0, clock(W[1]));
    const st = new MemoryStorage();
    expect(saveState(st, s1)).toEqual({ ok: true });
    const text = st.getItem(STORAGE_KEY) ?? '';
    const reloaded = loadText(text, `${W[1]}T09:00:00.000Z`);
    expect(reloaded).toEqual(s1);
    expect(exportState(reloaded).length).toBe(exportState(s1).length);
    expect(ensureBeta0Week(reloaded, clock(W[1], '12:00:00')).planner.weeks[W[1]]).toEqual(s1.planner.weeks[W[1]]);
    for (const r of strengthReqs(s1, W[1])) expect(selectProgrammeSession(reloaded, r.requestId)).toEqual(selectProgrammeSession(s1, r.requestId));
  });

  it('régénération identique : deux planifications du même état donnent la même semaine', () => {
    const a = ensureBeta0Week(s0, clock(W[1]));
    const b = ensureBeta0Week(s0, clock(W[1]));
    expect(a.planner.weeks[W[1]]).toEqual(b.planner.weeks[W[1]]);
  });

  it('semaine décalée (début un jeudi) : séances A/B seulement, semaine suivante à l’ordre de sa parité', () => {
    const s = createBeta0Programme(emptyState(), S4_INPUT as never, clock('2026-10-08'), {});
    const first = archs(s, W[0]);
    expect(first.length).toBeGreaterThan(0);
    expect(first.every((a) => AB_ARCHS.includes(a ?? ''))).toBe(true);
    expect(new Set(first).size).toBe(first.length);
    const next = ensureBeta0Week(s, clock(W[1]));
    expect(archs(next, W[1])).toEqual(ORDER_B);
  });
});

describe('RC5.1 — semaine déjà planifiée par le contenu d’avant (L1b-4) et continuité des charges', () => {
  const text = fixture('pre-rc51-s4-w4.json');
  const s = loadText(text, '2026-10-26T07:30:00.000Z');
  const PLANNED = '2026-10-26';
  const NEXT = '2026-11-02';

  it('relue sans réécriture : Haut / Bas conservés, provenance L1b-4, régénérée avec son contenu d’origine', () => {
    const st = new MemoryStorage();
    expect(saveState(st, s)).toEqual({ ok: true });
    expect(st.getItem(STORAGE_KEY)).toBe(text.trimEnd());
    expect(archs(s, PLANNED)).toEqual(['str_upper', 'str_lower', 'str_upper', 'str_lower']);
    const again = ensureBeta0Week(s, clock(PLANNED, '12:00:00'));
    expect(again.planner.weeks[PLANNED]).toEqual(s.planner.weeks[PLANNED]);
    for (const r of strengthReqs(s, PLANNED)) {
      expect(recordOf(r)?.provenance.rulesetVersion).toBe('0.7.0-strength-l1b4');
      expect(sessionEnvironment(s, r.requestId, beta0Environment()).strength?.content.ruleset.version).toBe('0.7.0-strength-l1b4');
    }
  });

  it('semaine suivante : Haut A/B et Bas A/B (contenu courant, RC5.1 et suivants), charges reprises de l’historique', () => {
    const n = ensureBeta0Week(s, clock(NEXT));
    expect(archs(n, NEXT)).toEqual(ORDER_A);
    const main = (arch: string) => {
      const r = strengthReqs(n, NEXT).find((x) => x.intent?.archetypeId === arch);
      // RC5.3 R4 : le contenu courant est la surcouche 0.9.0 de RC5.1 (mêmes archétypes A/B).
      expect(recordOf(r as Req)?.provenance.rulesetVersion).toBe('0.9.0-strength-rc53-r4');
      const it = recordOf(r as Req)?.session.blocks.flatMap((b) => b.items).find((i) => /\.main_/.test(i.refs?.slotId ?? ''));
      const set = it?.prescription.type === 'sets' ? it.prescription.sets.find((x) => x.kind !== 'rampup') : undefined;
      return [it?.exerciseId, it?.refs?.prescriptionSource, set?.intensity?.mode === 'load' ? set.intensity.kg : null];
    };
    const tracked = (ex: string) => s.strength.tracks.find((t) => t.exerciseId === ex && t.tier === 'anchor')?.nextPrescription?.loadKg;
    expect(main('str_upper_a')).toEqual(['ex.bench_press', 'history', tracked('ex.bench_press')]);
    expect(main('str_lower_a')).toEqual(['ex.back_squat', 'history', tracked('ex.back_squat')]);
    // Soulevé roumain : secondaire avant RC5.1, principal du Bas B — repris de l'historique (aucune remise à zéro).
    expect(main('str_lower_b')[1]).toBe('history');
    // Développé militaire barre : nouveau mouvement principal, jamais réalisé ⇒ calibration (aucune charge inventée).
    expect(main('str_upper_b')).toEqual(['ex.barbell_ohp', 'calibration', null]);
  });
});
