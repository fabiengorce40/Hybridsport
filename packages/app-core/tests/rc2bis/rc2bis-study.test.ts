/**
 * RC2 bis — ÉTUDE de l'optimisation GLOBALE de la semaine (hors production, jamais branchée à l'application).
 *
 * 1. Énumération des organisations hebdomadaires entières (profils RC1 A–D × 4 scénarios de disponibilité), chacune
 *    planifiée par le chemin RÉEL (moteurs, composition, interférence, matériel, durées), M3 en détection seule.
 * 2. Front de Pareto sans pondération ; comparaison avec RC1 (glouton + M3 Beta 0) et les stratégies RC2.
 * 3. Règle de proximité Musculation (« 36 h ») : matrice actuelle vs variantes exploratoires (V1–V3), sur la matrice
 *    elle-même et sur les organisations (profils A et B, S6 et S6Dx).
 * 4. Simulations 4 semaines (contrôles scénarisés RC1) des représentants du front, profils A–E.
 * Lancement EXPLICITE (`RC2BIS_STUDY=1`). Sorties : __reports__/rc2bis-study.json et rc2bis-semaine.md.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DEMAND_LEVELS } from '@hybridsport/domain';
import { assessNeighborStructure } from '@hybridsport/strength';
import { strengthContent } from '../../src/index.js';
import type { ProgrammeEnvironment } from '../../src/index.js';
import { create } from '../strength-fixes/sf-fixtures.js';
import { simulate } from '../consolidation/sim4.js';
import { measure } from '../rc2/metrics.js';
import type { RunMetrics } from '../rc2/metrics.js';
import { PARAMS, studyEnv } from '../rc2/study-env.js';
import { DAYS, enumerate, LETTER, layoutLabel, pinsOf, PROFILES, profileOf, RUN_SHARE_MIN, SCENARIOS, VARIANTS, rc1Env, weekEnv } from './week-env.js';
import type { Layout, Scenario, Variant } from './week-env.js';
import { dominates, LOWER, measureWeek, OBJECTIVES, paretoFront, signature, UPPER } from './week-metrics.js';
import type { WeekMetrics } from './week-metrics.js';

const MON = '2026-10-05';
const NOW = `${MON}T07:30:00.000Z`;
const n1 = (x: number) => String(Math.round(x * 10) / 10);
// technical-constant: ÉTUDE — nombre maximal de lignes du front affichées par cas (lisibilité du rapport)
const MAX_ROWS = 12;

interface Row { readonly label: string; readonly layout?: Layout; readonly m: WeekMetrics }
type Profile = (typeof PROFILES)[number];

function planWeek(c: Profile, sc: Scenario, env: ProgrammeEnvironment, layout?: Layout): WeekMetrics {
  const s = create(profileOf(c, sc), NOW, env);
  const pm = new Map(layout ? pinsOf(layout, MON, sc).filter((p) => p.minutes !== undefined).map((p) => [p.requestId, p.minutes as number]) : []);
  return measureWeek(s, MON, env, pm);
}
const RC2: readonly { readonly key: string; readonly env: () => ProgrammeEnvironment }[] = [
  { key: 'RC2 A·P1', env: () => studyEnv('A', PARAMS[0]) },
  { key: 'RC2 D0', env: () => studyEnv('D0') },
  { key: 'RC2 DB·P1', env: () => studyEnv('DB', PARAMS[0]) },
];
const cells = (m: WeekMetrics) => OBJECTIVES.map((o) => n1(o.of(m)));
const rowOf = (label: string, m: WeekMetrics, extra = '') => `| ${label}${extra} | ${cells(m).join(' | ')} | ${m.belowFloor.length} | ${m.unplaced.join(', ') || '—'} |`;
const HEAD = `| organisation | ${OBJECTIVES.map((o) => `${o.label} (${o.dir === 1 ? '↑' : '↓'})`).join(' | ')} | groupes sous plancher | non placées |`;
const SEP = `|---|${OBJECTIVES.map(() => '---').join('|')}|---|---|`;

/** Étude d'un cas (profil × scénario × variante) : énumération, front, comparaison RC1 / RC2. */
function study(c: Profile, sc: Scenario, v: Variant) {
  const rc1 = planWeek(c, sc, rc1Env(v));
  const rc2 = v.key === 'V0' ? RC2.map((x) => ({ label: x.key, m: planWeek(c, sc, x.env()) })) : [];
  const rows: Row[] = enumerate(profileOf(c, sc), sc).map((layout) => ({ label: layoutLabel(layout), layout, m: planWeek(c, sc, weekEnv({ layout, scenario: sc, variant: v })) }));
  const front = paretoFront(rows);
  const groups = new Map<string, Row[]>();
  for (const r of front) groups.set(signature(r.m), [...(groups.get(signature(r.m)) ?? []), r]);
  const best = OBJECTIVES.map((o) => Math.max(...rows.map((r) => o.dir * o.of(r.m))) * o.dir);
  const utopia = rows.some((r) => OBJECTIVES.every((o, i) => o.of(r.m) === best[i]));
  const dominatingRc1 = rows.filter((r) => dominates(r.m, rc1));
  const rc1Dominated = rows.some((r) => dominates(r.m, rc1));
  const unplacedFreq: Record<string, number> = {};
  for (const r of rows) for (const u of r.m.unplaced) unplacedFreq[u] = (unplacedFreq[u] ?? 0) + 1;
  const refusedPinned = rows.filter((r) => r.layout && r.m.kept < r.layout.flat().length).length;
  for (const r of rows) if (r.layout) expect(r.m.kept).toBeLessThanOrEqual(r.layout.flat().length);
  return { rc1, rc2, rows, front, groups, best, utopia, dominatingRc1, rc1Dominated, unplacedFreq, refusedPinned };
}

describe.skipIf(process.env.RC2BIS_STUDY !== '1')('RC2 bis — optimisation globale de la semaine (étude)', () => {
  it('énumération, Pareto, variantes de proximité, simulations 4 semaines, rapport', () => {
    const L: string[] = [];
    const json: Record<string, unknown> = {};
    const V0 = VARIANTS[0] as Variant;

    // ——— 1. Matrice de proximité (lecture directe de la fonction du moteur, aucune organisation)
    const assessment = strengthContent().ruleset.parameter('strength.interference.assessment')?.value as Record<string, unknown>;
    const high = DEMAND_LEVELS[DEMAND_LEVELS.length - 1] as string;
    const NEIGHBOURS = [
      { key: 'course « clé » (rôle KEY ; seule distinction disponible pour qualité / longue)', priority: 'key', demand: { lower_knee: high, lower_hip: high, locomotor_impact: high } },
      { key: 'course facile (rôle EASY, importance standard)', priority: 'standard', demand: { lower_knee: high, lower_hip: high, locomotor_impact: high } },
      { key: 'course facile sans impact élevé (hypothèse : demande dérivée plus fine, non disponible)', priority: 'standard', demand: { lower_knee: 'moderate', lower_hip: 'moderate', locomotor_impact: 'moderate' } },
      { key: 'Cross-training force + conditionnement (importance inconnue → standard)', priority: 'standard', demand: { lower_knee: high, lower_hip: 'moderate', locomotor_impact: 'none' } },
    ] as const;
    // technical-constant: ÉTUDE — écarts observés (heures) : même jour, matin / soir, J+1, 36 h, J+2, J+3
    const HOURS = [0, 12, 24, 36, 48, 72];
    const matrix: Record<string, Record<string, string[]>> = {};
    L.push('## 1. Règle de proximité Musculation : matrice actuelle et variantes exploratoires', '',
      'Niveau et action retenus sur la structure **genou** (`lower_knee`) d’une séance de Musculation, selon la séance voisine et l’écart. Lecture directe de `assessNeighborStructure` (moteur Strength) ; **aucune variante n’est approuvée**.', '');
    for (const v of VARIANTS) {
      const a = v.patch(assessment) as never;
      L.push(`### ${v.key} — ${v.label}`, '', `| voisine | ${HOURS.map((h) => `${String(h)} h`).join(' | ')} |`, `|---|${HOURS.map(() => '---').join('|')}|`);
      matrix[v.key] = {};
      for (const nb of NEIGHBOURS) {
        const cellsH = HOURS.map((h) => { const lvl = assessNeighborStructure({ discipline: 'running', stimulus: 's', priority: nb.priority, hoursFromThisSession: h, demand: { ...nb.demand } } as never, 'lower_knee', a); return `${lvl} → ${String((a as { actions: Record<string, string> }).actions[lvl])}`; });
        (matrix[v.key] as Record<string, string[]>)[nb.key] = cellsH;
        L.push(`| ${nb.key} | ${cellsH.join(' | ')} |`);
      }
      L.push('');
    }
    json.matrix = matrix;

    // ——— 2. Énumération × Pareto (V0), profils A–D × scénarios
    L.push('## 2. Organisations hebdomadaires entières (matrice actuelle V0)', '',
      `Chaque organisation énumérée est planifiée par le chemin réel (M3 en détection seule). Journée double : course ${String(RUN_SHARE_MIN)} min + l’autre séance sur le reste, ordre supposé course le matin / force le soir (le planificateur ne connaît pas l’heure : écart 0 h). Pré-fatigue = course placée le lendemain d’une séance de force à demande élevée genou ou hanche. ✓ = domine RC1 (au moins aussi bonne sur tous les critères, strictement meilleure sur un).`, '');
    const cases: Record<string, ReturnType<typeof study>> = {};
    for (const c of PROFILES.filter((x) => x.key !== 'E')) {
      for (const sc of SCENARIOS) {
        const r = study(c, sc, V0);
        cases[`${c.key}.${sc.key}`] = r;
        for (const x of r.rows) expect(x.m.kept).toBeLessThanOrEqual(x.m.requested);
        L.push(`### ${c.key}. ${c.name} — ${sc.label}`, '',
          `Organisations énumérées : ${String(r.rows.length)} ; non dominées : ${String(r.front.length)} (${String(r.groups.size)} profils de critères distincts). Point idéal (meilleur sur tous les critères à la fois) atteint : **${r.utopia ? 'oui' : 'non'}**. Organisations qui dominent RC1 : **${String(r.dominatingRc1.length)}**. Organisations dont au moins une séance prévue est refusée (moteur, durée, G4) : ${String(r.refusedPinned)}.`, '',
          HEAD, SEP, rowOf('RC1 (référence)', r.rc1, ` — ${r.rc1.sessions.map((x) => `${DAYS[(new Date(`${x.date}T12:00:00Z`).getUTCDay() + 6) % 7] ?? '?'} ${LETTER[x.sport as keyof typeof LETTER]}`).join(' · ')}`), ...r.rc2.map((x) => rowOf(x.label, x.m)),
          `| **meilleure valeur atteinte** | ${r.best.map(n1).join(' | ')} | | |`);
        const shown = [...r.groups.values()].sort((a, b) => {
          const x = (a[0] as Row).m; const y = (b[0] as Row).m;
          return y.kept - x.kept || y.runKept - x.runKept || (dominates(y, r.rc1) ? 1 : 0) - (dominates(x, r.rc1) ? 1 : 0) || y.lower - x.lower;
        }).slice(0, MAX_ROWS);
        for (const g of shown) { const f = g[0] as Row; L.push(rowOf(`${dominates(f.m, r.rc1) ? '✓ ' : ''}${f.label}${g.length > 1 ? ` (+${String(g.length - 1)} équivalente${g.length > 2 ? 's' : ''})` : ''}`, f.m)); }
        if (r.groups.size > MAX_ROWS) L.push(`| … ${String(r.groups.size - MAX_ROWS)} autres profils non dominés (JSON) | ${OBJECTIVES.map(() => '').join(' | ')} | | |`);
        const freq = Object.entries(r.unplacedFreq).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${String(n)}/${String(r.rows.length)})`);
        L.push('', `Séances non placées sur l’ensemble des organisations : ${freq.join(', ') || 'aucune'}.`, '');
      }
    }
    json.cases = Object.fromEntries(Object.entries(cases).map(([k, r]) => [k, {
      rc1: { ...r.rc1, sessions: r.rc1.sessions.map((x) => `${x.date} ${x.sport} ${String(x.role)} ${String(x.estMin)}/${String(x.allottedMin)}`) },
      rc2: r.rc2.map((x) => ({ label: x.label, ...Object.fromEntries(OBJECTIVES.map((o) => [o.key, o.of(x.m)])), unplaced: x.m.unplaced })),
      enumerated: r.rows.length, refusedPinned: r.refusedPinned, utopia: r.utopia, best: r.best, dominatingRc1: r.dominatingRc1.map((x) => x.label), unplacedFreq: r.unplacedFreq,
      front: r.front.map((x) => ({ label: x.label, ...Object.fromEntries(OBJECTIVES.map((o) => [o.key, o.of(x.m)])), belowFloor: x.m.belowFloor, unplaced: x.m.unplaced, residuals: x.m.residuals, planned: x.m.planned })),
    }]));

    // ——— 3. Variantes de proximité sur les organisations (A et B ; S6 et S6Dx)
    L.push('## 3. Variantes exploratoires de la règle de proximité sur les organisations', '',
      'Pour chaque variante : RC1 recalculé avec la variante, puis meilleures valeurs atteignables parmi les organisations qui CONSERVENT toutes les séances et toutes les courses. Aucune variante n’est approuvée ni activée.', '',
      '| cas | variante | RC1 bas / haut / partagées J+1 / pré-fatigue | meilleur bas du corps (toutes séances conservées) | min. séries partagées J+1 (idem) | non dominées | dominent RC1-V0 |', '|---|---|---|---|---|---|---|');
    const variantOut: Record<string, unknown> = {};
    for (const c of PROFILES.filter((x) => x.key === 'A' || x.key === 'B')) for (const sc of SCENARIOS.filter((x) => x.key === 'S6' || x.key === 'S6Dx')) for (const v of VARIANTS) {
      const r = v.key === 'V0' ? (cases[`${c.key}.${sc.key}`] as ReturnType<typeof study>) : study(c, sc, v);
      const ref0 = (cases[`${c.key}.${sc.key}`] as ReturnType<typeof study>).rc1;
      const maxRun = Math.max(...r.rows.map((y) => y.m.runKept));
      const full = r.rows.filter((x) => x.m.kept === x.m.requested && x.m.runKept === maxRun);
      const bestLower = full.length > 0 ? full.reduce((a, b) => (b.m.lower > a.m.lower ? b : a)) : undefined;
      const minShared = full.length > 0 ? full.reduce((a, b) => (b.m.sharedSets24 < a.m.sharedSets24 || (b.m.sharedSets24 === a.m.sharedSets24 && b.m.lower > a.m.lower) ? b : a)) : undefined;
      const dom0 = r.rows.filter((x) => dominates(x.m, ref0)).length;
      L.push(`| ${c.key} · ${sc.key} | ${v.key} | ${n1(r.rc1.lower)} / ${n1(r.rc1.upper)} / ${n1(r.rc1.sharedSets24)} / ${String(r.rc1.runPreFatigue)} | ${bestLower ? `${n1(bestLower.m.lower)} (haut ${n1(bestLower.m.upper)}, partagées ${n1(bestLower.m.sharedSets24)}, pré-fatigue ${String(bestLower.m.runPreFatigue)}) — ${bestLower.label}` : '—'} | ${minShared ? `${n1(minShared.m.sharedSets24)} (bas ${n1(minShared.m.lower)}, pré-fatigue ${String(minShared.m.runPreFatigue)}) — ${minShared.label}` : '—'} | ${String(r.front.length)} | ${String(dom0)} |`);
      variantOut[`${c.key}.${sc.key}.${v.key}`] = { rc1: Object.fromEntries(OBJECTIVES.map((o) => [o.key, o.of(r.rc1)])), bestLower: bestLower?.label, bestLowerM: bestLower ? Object.fromEntries(OBJECTIVES.map((o) => [o.key, o.of(bestLower.m)])) : null, minShared: minShared?.label, minSharedM: minShared ? Object.fromEntries(OBJECTIVES.map((o) => [o.key, o.of(minShared.m)])) : null, front: r.front.length, dominatingRc1V0: dom0 };
    }
    json.variants = variantOut;
    L.push('');

    // ——— 4. Simulations 4 semaines des représentants du front (profils A–E ; S6 et S6Dx)
    L.push('## 4. Représentants du front sur 4 semaines (contrôles scénarisés RC1, exécution réelle)', '',
      'Représentants choisis SANS score : RC1 ; organisation non dominée qui conserve tout et maximise le bas du corps ; idem minimisant les séries partagées à J+1 ; idem minimisant la pré-fatigue des courses (départage : bas du corps). E = planification de A, récupération dégradée à chaque contrôle.', '',
      '| cas | représentant | séances réalisées | reportées | course réalisée (séances / min) | bas du corps (plan./sem.) | haut du corps | sous plancher | paires J+1 | séries partagées J+1 | résidus M3 | violations |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
    const sims: Record<string, Record<string, RunMetrics>> = {};
    for (const c of PROFILES) for (const sc of SCENARIOS.filter((x) => x.key === 'S6' || x.key === 'S6Dx')) {
      const base = cases[`${c.key === 'E' ? 'A' : c.key}.${sc.key}`] as ReturnType<typeof study>;
      const full = base.front.filter((x) => x.m.kept === x.m.requested && x.m.runKept === Math.max(...base.front.map((y) => y.m.runKept)));
      const pick = (cmp: (a: WeekMetrics, b: WeekMetrics) => number) => (full.length > 0 ? [...full].sort((a, b) => cmp(a.m, b.m))[0] : undefined);
      const reps = [
        { key: 'max bas du corps', r: pick((a, b) => b.lower - a.lower || a.sharedSets24 - b.sharedSets24) },
        { key: 'min séries partagées', r: pick((a, b) => a.sharedSets24 - b.sharedSets24 || b.lower - a.lower) },
        { key: 'min pré-fatigue course', r: pick((a, b) => a.runPreFatigue - b.runPreFatigue || b.lower - a.lower) },
      ];
      const profile = profileOf(c, sc);
      const runs: { key: string; label: string; m: RunMetrics }[] = [{ key: 'RC1', label: 'RC1', m: measure(simulate({ profile, ...(c.plan ? { plan: c.plan } : {}) })) }];
      const seen = new Set<string>();
      for (const rep of reps) {
        if (!rep.r?.layout || seen.has(rep.r.label)) continue;
        seen.add(rep.r.label);
        runs.push({ key: rep.key, label: `${rep.key} — ${rep.r.label}`, m: measure(simulate({ profile, ...(c.plan ? { plan: c.plan } : {}), env: weekEnv({ layout: rep.r.layout, scenario: sc }) })) });
      }
      sims[`${c.key}.${sc.key}`] = Object.fromEntries(runs.map((x) => [x.label, x.m]));
      for (const x of runs) {
        expect(x.m.violations).toBe(0);
        const lo = LOWER.reduce((a, g) => a + (x.m.planned[g] ?? 0), 0); const up = UPPER.reduce((a, g) => a + (x.m.planned[g] ?? 0), 0);
        L.push(`| ${c.key} · ${sc.key} | ${x.label} | ${String(x.m.executedCount)} | ${String(x.m.postponed)} | ${String(x.m.runExecuted)} / ${String(x.m.runMin)} | ${n1(lo)} | ${n1(up)} | ${x.m.belowFloor.join(', ') || '—'} | ${String(x.m.pairs24)} | ${n1(x.m.sharedSets24)} | ${String(x.m.residual)} | ${String(x.m.violations)} |`);
      }
    }
    json.sims = sims;
    L.push('');

    const out = new URL('./__reports__/rc2bis-study.json', import.meta.url).pathname;
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(json, null, 1));
    writeFileSync(new URL('./__reports__/rc2bis-semaine.md', import.meta.url).pathname, ['# RC2 bis — optimisation globale de la semaine : résultats bruts', '',
      '> Étude hors production. `beta0Environment()` inchangé ; organisations imposées par la capacité d’étude `studyPins` (inerte par défaut), M3 en détection seule. Aucune valeur n’est une recommandation ni un seuil approuvé.', '', ...L].join('\n'));
    expect(Object.keys(cases)).toHaveLength(SCENARIOS.length * (PROFILES.length - 1));
  }, 7_200_000);
});

