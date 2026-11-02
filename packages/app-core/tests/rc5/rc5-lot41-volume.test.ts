/**
 * Reprise RC5 lot 4.1 — qualité de la programmation Musculation, chemin RÉEL de l'application (données fictives) :
 * - politique de personnalisation 1.1 (allocation `primary_need`) pour le contenu courant SEULEMENT ; contenu historique
 *   (L1b-4, nom `0.8.0-strength-personalization-v1`) : politique 1.0 inchangée, contexte inchangé ;
 * - volume : séries de montée en charge jamais comptées, séries indirectes pondérées (jamais une série directe pleine),
 *   aucun groupe au-dessus de sa borne haute, séances dans le budget de durée ;
 * - cible inatteignable SIGNALÉE (`DOSE.VOLUME_LIMITED`, bilan `limitedBy`), jamais compensée en silence ;
 * - placement A/B réaliste (sonde d'archétype par rang) : Haut A, Bas A, Haut B, Bas B planifiés ; force et forme : semaines
 *   complètes ; Full Body inchangé ;
 * - séance commencée jamais réécrite ; export / import identique ; déterminisme.
 */
import { F6_CATALOG_VERSION } from '../../../strength/tests/fixtures/f6.js';
import { describe, expect, it } from 'vitest';
import { readStrengthParams } from '@hybridsport/strength';
import {
  createBeta0Programme, decodeState, emptyState, ensureBeta0Week, exportState, personalizedStrengthContent, recordProgrammeSet, selectBeta0Week, selectProgrammeSession,
  startProgrammeSession, beta0Environment, strengthContent, strengthContentFor, strengthWeekVolume,
} from '../../src/index.js';
import { strengthContextAt } from '../../src/generate.js';
import type { AppState, Clock, ProfileInput } from '../../src/index.js';
import { PERSONALIZATION_V1, PERSONALIZATION_V1_1 } from '../../../strength/content/personalization-v1.js';
import { P1, profileOf } from './lot4-profiles.js';

const W1 = '2026-10-05';
const W2 = '2026-10-12';
const at = (d: string, hm = '07:00'): Clock => ({ today: d, now: `${d}T${hm}:00.000Z` });
const planned = (s: AppState, w: string) => (s.planner.weeks[w]?.requests ?? []).filter((r) => r.sport === 'strength' && r.status === 'planned');
const reasonsOf = (r: unknown): { code: string; params: Record<string, unknown> }[] => {
  const out: { code: string; params: Record<string, unknown> }[] = [];
  const walk = (o: unknown) => { if (!o || typeof o !== 'object') return; const x = o as { code?: unknown; params?: unknown }; if (typeof x.code === 'string' && x.params && typeof x.params === 'object') out.push(x as never); for (const v of Object.values(o)) walk(v); };
  walk(r);
  return out;
};
const s1 = createBeta0Programme(emptyState(), P1.profile, at(W1), {});

describe('versionnement de la politique de personnalisation', () => {
  it('contenu courant : politique 1.1 (`primary_need`) ; contenu L1b-4 historique : politique 1.0 strictement inchangée', () => {
    const cur = personalizedStrengthContent(strengthContent()).ruleset.parameter('strength.personalization');
    expect(cur?.value).toEqual(PERSONALIZATION_V1_1);
    expect(cur?.version).toBe('1.1.0');
    const legacy = strengthContentFor('0.8.0-strength-personalization-v1', F6_CATALOG_VERSION)?.ruleset.parameter('strength.personalization');
    expect(legacy?.value).toEqual(PERSONALIZATION_V1);
    expect(legacy?.version).toBe('1.0.0');
    expect((PERSONALIZATION_V1 as { allocation?: string }).allocation).toBeUndefined();
    // 1.1 = 1.0 + allocation : aucun autre paramètre sportif modifié.
    const { allocation, version: _v, ...rest } = PERSONALIZATION_V1_1;
    const { version: _v0, ...rest0 } = PERSONALIZATION_V1;
    expect(allocation).toBe('primary_need');
    expect(rest).toEqual(rest0);
  });

  it('contexte : séries de la SEMAINE CIVILE transmises sous 1.1 seulement ; jamais sous le contenu historique', () => {
    const p = s1.profile as Parameters<typeof strengthContextAt>[1];
    const cur = strengthContextAt(s1, p, W2, personalizedStrengthContent(strengthContent()));
    expect(cur.hardSets.week).toBeDefined();
    const legacy = strengthContentFor('0.8.0-strength-personalization-v1', F6_CATALOG_VERSION);
    if (!legacy) throw new Error('contenu historique attendu');
    expect(strengthContextAt(s1, p, W2, legacy).hardSets.week).toBeUndefined();
  });
});

describe('volume hebdomadaire (profil L4-1 : hypertrophie 4×, 60 min)', () => {
  const vol = strengthWeekVolume(s1, W1);
  const content = personalizedStrengthContent(strengthContent());
  const vp = readStrengthParams(content.ruleset).values['strength.volume'];

  it('séries de montée en charge JAMAIS comptées ; séries indirectes pondérées (secondaryWeight), sans double comptage', () => {
    if (!vol) throw new Error('bilan attendu');
    const recount: Record<string, number> = {};
    for (const r of planned(s1, W1)) {
      const session = (r.record?.data as { session: { blocks: { kind: string; items: { exerciseId: string; prescription: { type: string; sets?: { kind: string; optional?: boolean }[] } }[] }[] } }).session;
      for (const it of session.blocks.flatMap((b) => b.items)) {
        if (it.prescription.type !== 'sets') continue;
        const n = (it.prescription.sets ?? []).filter((x) => x.kind !== 'rampup' && x.optional !== true).length;
        const e = content.catalog.exercise(it.exerciseId) as { muscles: { primary: readonly string[]; secondary: readonly string[] } } | undefined;
        if (!e) continue;
        const groupsOf = (ms: readonly string[]) => new Set(ms.flatMap((m) => Object.entries(vp.muscleGroups).filter(([, xs]) => (xs as readonly string[]).includes(m)).map(([g]) => g)));
        const prim = groupsOf(e.muscles.primary);
        for (const g of prim) recount[g] = (recount[g] ?? 0) + n;
        for (const g of groupsOf(e.muscles.secondary)) if (!prim.has(g)) recount[g] = (recount[g] ?? 0) + n * vp.secondaryWeight;
      }
    }
    for (const g of vol.groups) expect(g.planned, g.group).toBeCloseTo(recount[g.group] ?? 0, 5);
  });

  it('aucun groupe au-delà de sa borne haute ; dos et pectoraux nettement relevés (lot 4 : 2,9 et 6,3 séries)', () => {
    if (!vol) throw new Error('bilan attendu');
    for (const g of vol.groups) if (g.high !== null) expect(g.planned, g.group).toBeLessThanOrEqual(g.high);
    const of = (id: string) => vol.groups.find((g) => g.group === id)?.planned ?? 0;
    expect(of('back')).toBeGreaterThanOrEqual(6);
    expect(of('chest')).toBeGreaterThanOrEqual(8);
    expect(of('quads')).toBeGreaterThanOrEqual(10);
  });

  it('cible inatteignable sans dépasser la borne haute d’un autre groupe : SIGNALÉE (raison persistée, bilan `limitedBy`)', () => {
    if (!vol) throw new Error('bilan attendu');
    const limited = planned(s1, W1).flatMap((r) => reasonsOf(r.reasons).filter((x) => x.code === 'DOSE.VOLUME_LIMITED'));
    expect(limited.length).toBeGreaterThan(0);
    for (const x of limited) {
      expect(x.params.by).not.toBe(x.params.group);
      expect(Number(x.params.allowed)).toBeLessThan(Number(x.params.wanted));
    }
    for (const g of vol.groups) {
      if (g.limitedBy.length > 0) expect(g.status, g.group).toBe('reduced_by_constraint');
      if (g.target !== null && g.planned >= g.target) expect(g.limitedBy, g.group).toEqual([]);
    }
    expect(vol.groups.find((g) => g.group === 'back')?.limitedBy).toContain('arms');
  });

  it('durée : chaque séance dans le budget déclaré (60 min)', () => {
    for (const v of selectBeta0Week(s1, W1)?.sessions ?? []) if (v.sport === 'strength' && v.estimatedDurationS) expect(v.estimatedDurationS).toBeLessThanOrEqual(60 * 60);
  });
});

describe('placement réaliste des rotations à plusieurs archétypes', () => {
  const variant = (goal: 'strength' | 'general' | 'hypertrophy', n: number, days: number[], outcome?: 'strength' | 'fitness') => {
    const p = profileOf(goal === 'hypertrophy' && n === 4 ? {} : { strength: { enabled: true, goal, sessionsPerWeek: n } } as Partial<ProfileInput>, { days, ...(outcome ? { outcome } : {}) });
    const s = createBeta0Programme(emptyState(), p, at(W1), {});
    const all = (s.planner.weeks[W1]?.requests ?? []).filter((r) => r.sport === 'strength');
    return { all, archs: all.filter((r) => r.status === 'planned').map((r) => r.intent?.archetypeId) };
  };
  it('hypertrophie 4× : Haut A, Bas A, Haut B, Bas B planifiés, aucun refus', () => {
    const r = variant('hypertrophy', 4, [0, 1, 3, 4]);
    expect(r.all.every((x) => x.status === 'planned')).toBe(true);
    expect([...r.archs].sort()).toEqual(['str_lower_a', 'str_lower_b', 'str_upper_a', 'str_upper_b']);
  });
  it('force 4× (Haut / Bas) : semaine complète, aucun refus', () => {
    const r = variant('hypertrophy', 4, [0, 1, 3, 4], 'strength');
    expect(r.all.every((x) => x.status === 'planned')).toBe(true);
    expect(r.all).toHaveLength(4);
  });
  it('forme générale 3× : semaine complète', () => {
    const r = variant('general', 3, [0, 2, 4], 'fitness');
    expect(r.all.every((x) => x.status === 'planned')).toBe(true);
  });
});

describe('données existantes', () => {
  it('séance commencée : jamais réécrite par une régénération ; export / import identique', () => {
    const env = beta0Environment();
    const id = planned(s1, W1)[0]?.requestId ?? '';
    const v = selectProgrammeSession(s1, id);
    const item = v?.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'sets');
    if (!item) throw new Error('séance attendue');
    let s = startProgrammeSession(s1, at(W1, '08:00'), id, env, { painAnswer: 'no', fatigue: 'low', recovery: 'good' });
    s = recordProgrammeSet(s, at(W1, '08:10'), id, { itemId: item.id, setIndex: 0, done: true, reps: 8, loadKg: 40 });
    const record = JSON.stringify(s.planner.weeks[W1]?.requests.find((r) => r.requestId === id)?.record);
    const log = JSON.stringify(s.programmeLogs[id]);
    // Même semaine : régénération sans effet sur la séance commencée (prescription et saisie).
    const same = ensureBeta0Week(s, at(W1, '12:00'));
    expect(JSON.stringify(same.planner.weeks[W1]?.requests.find((r) => r.requestId === id)?.record)).toBe(record);
    expect(JSON.stringify(same.programmeLogs[id])).toBe(log);
    // Semaine suivante : la semaine close conserve la prescription ; la séance inachevée devient un RÉSULTAT (règle
    // existante de clôture, inchangée), ses séries réalisées restent dans les expositions.
    const again = ensureBeta0Week(same, at(W2, '06:00'));
    expect(JSON.stringify(again.planner.weeks[W1]?.requests.find((r) => r.requestId === id)?.record)).toBe(record);
    expect(again.programmeState?.results.some((r) => r.requestId === id)).toBe(true);
    const d = decodeState(exportState(again));
    expect(d.ok && d.state).toEqual(again);
  });

  it('déterminisme : même profil, même date ⇒ même programme', () => {
    expect(JSON.stringify(createBeta0Programme(emptyState(), P1.profile, at(W1), {}).planner)).toBe(JSON.stringify(s1.planner));
  });
});
