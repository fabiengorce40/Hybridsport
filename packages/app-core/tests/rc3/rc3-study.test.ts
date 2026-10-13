/**
 * RC3 (préparation) — ÉTUDE comparative à séances ÉQUIVALENTES (hors production, lancement `RC3_STUDY=1`).
 * Profils A, B, E ; organisations RC1 et représentants RC2 bis ; scénario RC1 historique vs scénario équivalent ;
 * saisie de course historique (durée, « modifiée ») vs complète (distance, « comme prescrite »). Mesures séparées :
 * prescrit / réalisé, direct / indirect, bilan E1 de l'application, charge rapprochée, conflits résiduels, archétypes
 * de course, et observations de la proposition intra-Musculation TEST_ONLY (démonstration et non résolue).
 * Sorties : __reports__/rc3-study.json et rc3-comparaisons.md.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ProfileInput } from '../../src/index.js';
import { plan, PROFILE, simulate } from '../consolidation/sim4.js';
import type { PlanFn, SimResult } from '../consolidation/sim4.js';
import { CONFIGS } from '../rc2/study-env.js';
import { layoutLabel, SCENARIOS, weekEnv } from '../rc2bis/week-env.js';
import type { Layout, Scenario } from '../rc2bis/week-env.js';
import { equivalent, LOWER, measureRc3, planEquivalent, UPPER } from './equivalent.js';
import type { Rc3Metrics } from './equivalent.js';
import { DEMO_PROPOSAL, observeIntraStrength, summarize, UNRESOLVED_PROPOSAL } from './intra-strength.js';
import { sumGroups } from './volume-split.js';

const S6 = SCENARIOS.find((x) => x.key === 'S6') as Scenario;
const L = (...d: string[]): Layout => d.map((x) => (x === '' ? [] : x.split('+').map((y) => (y === 'M' ? 'strength' : y === 'C' ? 'running' : 'crosstraining'))));
/** Représentants RC2 bis (semaine 1, 6 jours) : organisation dominant RC1, bas du corps maximal, espacement maximal. */
const LAYOUTS: Readonly<Record<'A' | 'B', readonly { readonly key: string; readonly layout: Layout }[]>> = {
  A: [
    { key: 'domine RC1', layout: L('C', 'M', 'C', 'X', 'M', 'M', '') },
    { key: 'bas du corps max.', layout: L('M', 'M', 'M', 'X', 'C', 'C', '') },
    { key: 'espacement max.', layout: L('M', 'X', 'C', 'M', 'C', 'M', '') },
  ],
  B: [
    { key: 'domine RC1', layout: L('C', 'M', 'C', 'C', 'X', 'M', '') },
    { key: 'bas du corps max.', layout: L('C', 'C', 'C', 'X', 'M', 'M', '') },
    { key: 'espacement max.', layout: L('M', 'C', 'C', 'X', 'C', 'M', '') },
  ],
};
const n1 = (x: number) => String(Math.round(x * 10) / 10);
const forceSessions = (r: SimResult) => r.sessions.filter((s) => s.execution === 'réalisée' && s.realized && Object.keys(s.realized.direct).length > 0)
  .map((s) => ({ id: `${s.requestId}`, at: `${s.date}T18:00:00Z`, split: s.realized ?? { direct: {}, indirect: {}, e1: {}, minRir: {} }, declared: { fatigue: s.declared } }));
const fmt = (o: Readonly<Record<string, number>>) => Object.entries(o).sort().map(([k, v]) => `${k} ${String(v)}`).join(', ') || '—';

interface Row { readonly profile: string; readonly variant: string; readonly scenario: string; readonly runs: string; readonly m: Rc3Metrics; readonly demo: Readonly<Record<string, number>>; readonly unresolved: Readonly<Record<string, number>>; readonly equivalentToRc1: string }

describe.skipIf(process.env.RC3_STUDY !== '1')('RC3 — comparaisons à séances équivalentes (étude)', () => {
  it('simulations, mesures séparées, observations intra-Musculation, rapport', () => {
    const rows: Row[] = [];
    const profiles: { key: string; name: string; profile: ProfileInput; plan?: PlanFn; layoutsOf: 'A' | 'B' }[] = [
      { key: 'A', name: (CONFIGS[0] as { name: string }).name, profile: PROFILE, layoutsOf: 'A' },
      { key: 'B', name: (CONFIGS[1] as { name: string }).name, profile: (CONFIGS[1] as { profile: ProfileInput }).profile, layoutsOf: 'B' },
      { key: 'E', name: (CONFIGS[4] as { name: string }).name, profile: PROFILE, plan: (CONFIGS[4] as { plan: PlanFn }).plan, layoutsOf: 'A' },
      { key: 'A·10K', name: 'Profil A, objectif course 10 km', profile: { ...PROFILE, running: { ...PROFILE.running, goal: 'TEN_K' } } as ProfileInput, layoutsOf: 'A' },
    ];
    for (const p of profiles) {
      for (const runOutcome of ['modified_duration', 'completed_distance'] as const) {
        const scenarios: { key: string; fn: PlanFn }[] = p.plan ? [{ key: 'récupération dégradée (uniforme)', fn: p.plan }] : [{ key: 'RC1 historique (rang global)', fn: plan }, { key: 'équivalent (sport, rang)', fn: planEquivalent }];
        for (const sc of scenarios) {
          let ref: Rc3Metrics | undefined;
          for (const v of [{ key: 'RC1', layout: undefined as Layout | undefined }, ...LAYOUTS[p.layoutsOf]]) {
            const r = simulate({ profile: p.profile, plan: sc.fn, runOutcome, ...(v.layout ? { env: weekEnv({ layout: v.layout, scenario: S6 }) } : {}) });
            const m = measureRc3(r);
            expect(m.violations).toBe(0);
            ref ??= m;
            const eq = equivalent(ref, m);
            const fs = forceSessions(r);
            rows.push({ profile: p.key, variant: v.layout ? `${v.key} — ${layoutLabel(v.layout)}` : 'RC1', scenario: sc.key, runs: runOutcome, m, demo: summarize(observeIntraStrength(fs, DEMO_PROPOSAL)), unresolved: summarize(observeIntraStrength(fs, UNRESOLVED_PROPOSAL)), equivalentToRc1: eq.ok ? 'oui' : eq.diff.join(' ; ') });
          }
        }
      }
    }
    const out = new URL('./__reports__/rc3-study.json', import.meta.url).pathname;
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(rows, null, 1));

    const T: string[] = ['# RC3 (préparation) — comparaisons à séances équivalentes : résultats bruts', '',
      '> Étude hors production. Volumes = moyennes par semaine sur 4 semaines, Musculation + bloc de force CT, comptes BRUTS de séries de travail (direct = groupe primaire ; indirect = groupe secondaire, non pondéré). « E1 app. » = bilan gouverné de l’application (prévu, secondaire × 0,5), rappelé pour comparaison, jamais un volume utile. Conflits résiduels : M3 complet pour RC1, détection seule pour les organisations imposées (non comparables entre eux). Intra-Musculation : observations de la proposition TEST_ONLY (démonstration : bandes 72 / 48 / 24 h ; non résolue : aucun délai).', ''];
    for (const p of profiles) for (const runOutcome of ['modified_duration', 'completed_distance'] as const) {
      T.push(`## ${p.key}. ${p.name} — course ${runOutcome === 'modified_duration' ? 'saisie historique (durée, « modifiée »)' : 'saisie complète (distance, « comme prescrite »)'}`, '',
        '| scénario | organisation | équivalent à RC1 | réalisées (par sport) | manquées | non démarrées | prescrit direct bas / haut | prescrit indirect bas / haut | réalisé direct bas / haut | réalisé indirect bas / haut | E1 app. bas / haut | paires force J+1 / J+2 | séries directes partagées J+1 | course après force bas / force bas après course | conflits résiduels | courses (archétypes) | intra-Musculation démo (direct : dans / hors / non résolu ; indirect) | idem sans délai validé |',
        '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
      for (const r of rows.filter((x) => x.profile === p.key && x.runs === runOutcome)) {
        const m = r.m;
        T.push(`| ${r.scenario} | ${r.variant} | ${r.equivalentToRc1} | ${fmt(m.executedBySport)} | ${m.missed.join(', ') || '—'} | ${m.notStarted.join(', ') || '—'} | ${n1(sumGroups(m.prescribedDirect, LOWER))} / ${n1(sumGroups(m.prescribedDirect, UPPER))} | ${n1(sumGroups(m.prescribedIndirect, LOWER))} / ${n1(sumGroups(m.prescribedIndirect, UPPER))} | ${n1(sumGroups(m.realizedDirect, LOWER))} / ${n1(sumGroups(m.realizedDirect, UPPER))} | ${n1(sumGroups(m.realizedIndirect, LOWER))} / ${n1(sumGroups(m.realizedIndirect, UPPER))} | ${n1(sumGroups(m.appE1Planned, LOWER))} / ${n1(sumGroups(m.appE1Planned, UPPER))} | ${String(m.forcePairsJ1)} / ${String(m.forcePairsJ2)} | ${n1(m.sharedDirectSetsJ1)} | ${String(m.runsAfterLowerForce)} / ${String(m.lowerForceAfterRun)} | ${String(m.residualConflicts)} | ${fmt(m.runArchetypes)} | ${String(r.demo['direct:WITHIN_WINDOW'] ?? 0)} / ${String(r.demo['direct:OUTSIDE_WINDOW'] ?? 0)} / ${String(r.demo['direct:UNRESOLVED'] ?? 0)} ; ${String((r.demo['indirect:WITHIN_WINDOW'] ?? 0) + (r.demo['indirect:OUTSIDE_WINDOW'] ?? 0) + (r.demo['indirect:UNRESOLVED'] ?? 0))} | ${fmt(r.unresolved)} |`);
      }
      T.push('');
    }
    writeFileSync(new URL('./__reports__/rc3-comparaisons.md', import.meta.url).pathname, T.join('\n'));
    expect(rows.length).toBeGreaterThan(0);
  }, 3_600_000);
});
