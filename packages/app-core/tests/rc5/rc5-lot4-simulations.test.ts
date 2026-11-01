/**
 * Reprise RC5 lot 4 — SIMULATIONS sportives déterministes sur 12 semaines (chemin réel de l'application : planification,
 * contrôle avant séance, séries, efforts, fin de séance, semaine suivante). Cinq profils :
 * 1. hypertrophie 4× (priorités fessiers, cuisses, abdominaux ; 60 min) ; 2. hybride Musculation 4× + HYROX 2× à
 * disponibilités limitées ; 3. matériel limité (haltères) et exercices exclus ; 4. continuité : Full Body 3× pendant 4
 * semaines puis passage à 4× (Haut/Bas A/B) ; 5. planning perturbé (séances manquées, séance commencée non terminée,
 * changement de jours).
 * OBSERVATION ALGORITHMIQUE seulement : aucune conclusion physiologique. Athlète simulé : séries au haut de la fourchette,
 * effort déclaré = effort prescrit + 1 répétition en réserve (option `rirOffset` du banc : athlète qui progresse ; à effort
 * exactement égal à la cible, le moteur maintient la charge, règle gouvernée existante).
 * Rapport : `__reports__/lot4-simulations.md`. Assertions : invariants (contraintes, récupération, données conservées,
 * déterminisme, stabilité après régénération).
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { archetypeRegion, archetypeVariant } from '@hybridsport/strength';
import { ensureBeta0Week, selectBeta0Week, strengthContent } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { mondayOf, simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec, SimOut } from '../rc4-audit/rc4-sim.js';

import { P1, RECOVERY_H, SPECS, WEEKS } from './lot4-profiles.js';


interface Row { readonly week: number; readonly date: string | null; readonly arch: string | null; readonly status: string; readonly executed: string; readonly mains: readonly string[]; readonly exercises: readonly { id: string; sets: number; load: string }[]; readonly notPlanned: string | null; readonly reductions: readonly string[] }
const rowsOf = (r: SimOut): Row[] => r.sessions.filter((x) => x.sport === 'strength').map((x) => ({
  week: x.week, date: x.date, arch: x.archetype, status: x.status, executed: x.executed, notPlanned: x.notPlanned, reductions: x.reductions,
  mains: x.exercises.slice(0, 2).map((e) => e.id), exercises: x.exercises.map((e) => ({ id: e.id, sets: e.sets, load: String(e.load ?? '—') })),
}));
const hash = (v: unknown): string => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);

/** Contrôle de régénération : chaque semaine, juste après sa planification, une nouvelle ouverture le même jour ne change rien. */
function run(spec: ProfileSpec): { r: SimOut; unstable: string[] } {
  const unstable: string[] = [];
  const r = simulate(spec, WEEKS, undefined, (st: AppState, monday: string) => {
    const again = ensureBeta0Week(st, { today: monday, now: `${monday}T12:00:00.000Z` });
    if (JSON.stringify(again.planner.weeks[monday]) !== JSON.stringify(st.planner.weeks[monday])) unstable.push(monday);
  });
  return { r, unstable };
}
const results = new Map(SPECS.map((s) => [s.id, run(s)] as const));
const res = (id: string) => results.get(id) as { r: SimOut; unstable: string[] };

/** Écarts (heures) entre séances FAITES successives de la même région ; Full Body chevauche toutes les régions. */
function sameRegionGaps(rows: readonly Row[]): { min: number | null; under: number } {
  const done = rows.filter((x) => x.executed === 'réalisée' && x.date && x.arch).map((x) => ({ t: Date.parse(`${x.date as string}T00:00:00Z`), reg: archetypeRegion(x.arch as string) })).sort((a, b) => a.t - b.t);
  let min: number | null = null; let under = 0;
  for (let i = 0; i < done.length; i++) for (let j = i + 1; j < done.length; j++) {
    const a = done[i]; const b = done[j];
    if (!a || !b || (a.reg !== b.reg && a.reg !== 'full' && b.reg !== 'full')) continue;
    const h = (b.t - a.t) / 3_600_000;
    if (min === null || h < min) min = h;
    if (h < RECOVERY_H) under += 1;
    break;
  }
  return { min, under };
}
/** Différenciation A/B : part d'exercices communs entre les variantes A et B d'une même région, la même semaine (0 = aucune). */
function abOverlap(rows: readonly Row[]): number | null {
  const vals: number[] = [];
  for (const w of [...new Set(rows.map((x) => x.week))]) for (const reg of ['upper', 'lower'] as const) {
    const of = (v: 'a' | 'b') => rows.find((x) => x.week === w && x.arch && archetypeRegion(x.arch) === reg && archetypeVariant(x.arch) === v);
    const a = of('a'); const b = of('b');
    if (!a || !b) continue;
    const A = new Set(a.exercises.map((e) => e.id)); const B = new Set(b.exercises.map((e) => e.id));
    const inter = [...A].filter((x) => B.has(x)).length;
    vals.push(inter / new Set([...A, ...B]).size);
  }
  return vals.length === 0 ? null : vals.reduce((n, x) => n + x, 0) / vals.length;
}
/** Charges prescrites des exercices principaux : première et dernière (kg), baisses observées. */
function mainLoads(rows: readonly Row[]): { ex: string; first: string; last: string; drops: number; n: number }[] {
  const by = new Map<string, number[]>();
  for (const x of rows.filter((y) => y.executed === 'réalisée')) for (const e of x.exercises.slice(0, 1)) { const kg = Number.parseFloat(e.load); if (Number.isFinite(kg)) by.set(e.id, [...(by.get(e.id) ?? []), kg]); }
  return [...by].map(([ex, v]) => ({ ex, first: String(v[0]), last: String(v.at(-1)), n: v.length, drops: v.filter((x, i) => i > 0 && x < (v[i - 1] ?? x)).length })).sort((a, b) => (a.ex < b.ex ? -1 : 1));
}
function equipmentViolations(rows: readonly Row[], items: readonly string[], excluded: readonly string[]): string[] {
  const cat = strengthContent().catalog;
  const have = new Set(items);
  return rows.flatMap((x) => x.exercises.flatMap((e) => {
    const ex = cat.exercise(`ex.${e.id}`);
    if (excluded.includes(`ex.${e.id}`)) return [`${String(x.date)} ${e.id} exclu`];
    if (!ex) return [];
    const ok = ex.equipment.allOf.every((q) => have.has(q)) && (ex.equipment.anyOf.length === 0 || ex.equipment.anyOf.some((q) => have.has(q)));
    return ok ? [] : [`${String(x.date)} ${e.id} matériel`];
  }));
}
function weeklyVolume(r: SimOut): { group: string; mean: number; target: string; above: number; below: number }[] {
  const groups = new Map<string, { sum: number; n: number; target: string; above: number; below: number }>();
  for (const w of r.weeks) for (const g of w.volume) {
    const cur = groups.get(g.group) ?? { sum: 0, n: 0, target: `${String(g.target ?? '—')}–${String(g.high ?? '—')}`, above: 0, below: 0 };
    cur.sum += g.planned; cur.n += 1;
    if (g.high !== null && g.high !== undefined && g.planned > g.high) cur.above += 1;
    if (g.target !== null && g.target !== undefined && g.planned < g.target) cur.below += 1;
    groups.set(g.group, cur);
  }
  return [...groups].map(([group, v]) => ({ group, mean: Math.round((v.sum / v.n) * 10) / 10, target: v.target, above: v.above, below: v.below }));
}
function durations(r: SimOut, maxMin: number): { mean: number; max: number; over: number } {
  const est: number[] = [];
  for (let w = 0; w < WEEKS; w++) for (const v of selectBeta0Week(r.state, mondayOf(w))?.sessions ?? []) if (v.sport === 'strength' && v.estimatedDurationS) est.push(Math.round(v.estimatedDurationS / 60));
  return { mean: Math.round(est.reduce((n, x) => n + x, 0) / Math.max(1, est.length)), max: Math.max(0, ...est), over: est.filter((x) => x > maxMin).length };
}

function report(): string {
  const out = ['# Reprise RC5 lot 4 — simulations sur 12 semaines (observation algorithmique)', '',
    'Chemin réel de l’application ; athlète simulé : séries au haut de la fourchette, effort déclaré = effort prescrit + 1 répétition en réserve (athlète qui progresse).',
    '**Aucune conclusion physiologique** n’est tirée de ces chiffres : ils décrivent ce que produisent les moteurs.', ''];
  for (const spec of SPECS) {
    const { r, unstable } = res(spec.id);
    const rows = rowsOf(r);
    const gaps = sameRegionGaps(rows);
    const ov = abOverlap(rows);
    const p = spec.profile;
    const dur = durations(r, p.strength.personalization?.sessionMinutes ?? 60);
    out.push(`## ${spec.id} — ${spec.label}`, '');
    out.push(`- Séances Musculation : ${String(rows.length)} demandées, ${String(rows.filter((x) => x.status === 'planned').length)} planifiées, ${String(rows.filter((x) => x.executed === 'réalisée').length)} faites ; non proposées : ${String(rows.filter((x) => x.notPlanned).length)}${rows.some((x) => x.notPlanned) ? ` (${[...new Set(rows.filter((x) => x.notPlanned).map((x) => x.notPlanned))].join(', ')})` : ''}.`);
    out.push(`- Archétypes : ${[...new Set(rows.map((x) => x.arch).filter(Boolean))].sort().join(', ')}.`);
    out.push(`- Récupération (séances faites, même région) : écart minimal ${gaps.min === null ? '—' : `${String(gaps.min)} h`} ; sous ${String(RECOVERY_H)} h : ${String(gaps.under)}.`);
    out.push(`- Différenciation A/B (part d’exercices communs, même région, même semaine) : ${ov === null ? '—' : `${String(Math.round(ov * 100))} %`}.`);
    out.push(`- Durées estimées : moyenne ${String(dur.mean)} min, maximum ${String(dur.max)} min, au-delà de ${String(p.strength.personalization?.sessionMinutes ?? 60)} min : ${String(dur.over)}.`);
    out.push(`- Contraintes (exclusions, matériel) : ${String(equipmentViolations(rows, p.equipment.items, p.excludedExercises ?? []).length)} écart.`);
    out.push(`- Stabilité : régénération le jour même sans changement (${String(WEEKS - unstable.length)}/${String(WEEKS)} semaines) ; erreurs du banc : ${String(r.errors.length)}.`);
    const transferred = r.state.strength.tracks.filter((t) => t.transferredFrom);
    out.push(`- Suivis : ${String(r.state.strength.tracks.length)} (dont ${String(transferred.length)} avec référence initiale transférée${transferred.length ? ` : ${transferred.map((t) => `${t.exerciseId.replace('ex.', '')} ← ${t.transferredFrom?.archetypeId ?? ''}`).join(', ')}` : ''}) ; expositions réelles : ${String(r.state.strength.exposures.length)}.`, '');
    out.push('| Semaine | Séances (jour : archétype — 2 premiers exercices) |', '|---|---|');
    for (let w = 1; w <= WEEKS; w++) out.push(`| S${String(w)} | ${rows.filter((x) => x.week === w).map((x) => `${x.date?.slice(5) ?? '—'} : ${x.arch ?? 'non proposée'}${x.mains.length ? ` — ${x.mains.join(', ')}` : ''}${x.executed !== 'réalisée' && x.executed !== '—' ? ` (${x.executed})` : ''}`).join(' ; ')} |`);
    out.push('', '| Groupe | Séries prévues / semaine (moyenne) | Cible–haut | Semaines au-dessus du haut | Semaines sous la cible |', '|---|---|---|---|---|');
    for (const g of weeklyVolume(r)) out.push(`| ${g.group} | ${String(g.mean)} | ${g.target} | ${String(g.above)} | ${String(g.below)} |`);
    out.push('', '| Exercice principal (1er de séance) | Expositions | Première charge (kg) | Dernière charge (kg) | Baisses |', '|---|---|---|---|---|');
    for (const m of mainLoads(rows)) out.push(`| ${m.ex} | ${String(m.n)} | ${m.first} | ${m.last} | ${String(m.drops)} |`);
    out.push('');
  }
  return `${out.join('\n')}\n`;
}

describe('Reprise RC5 lot 4 — simulations 12 semaines', () => {
  it('rapport des cinq profils (référence figée)', async () => {
    await expect(report()).toMatchFileSnapshot('__reports__/lot4-simulations.md');
  });

  it('invariants : contraintes respectées, aucune erreur, stabilité après régénération', () => {
    for (const spec of SPECS) {
      const { r, unstable } = res(spec.id);
      expect([spec.id, r.errors]).toEqual([spec.id, []]);
      expect([spec.id, unstable]).toEqual([spec.id, []]);
      expect([spec.id, equipmentViolations(rowsOf(r), spec.profile.equipment.items, spec.profile.excludedExercises ?? [])]).toEqual([spec.id, []]);
    }
  });

  it('rotation A/B à 4 séances (hypertrophie) : Haut A, Bas A, Haut B, Bas B chaque semaine complète ; ordre alterné', () => {
    const rows = rowsOf(res('L4-1').r);
    for (let w = 1; w <= WEEKS; w++) {
      const archs = rows.filter((x) => x.week === w && x.status === 'planned').map((x) => x.arch);
      expect([w, [...archs].sort()]).toEqual([w, ['str_lower_a', 'str_lower_b', 'str_upper_a', 'str_upper_b']]);
    }
    const first = (w: number) => rows.filter((x) => x.week === w && x.date).sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1))[0]?.arch;
    expect(new Set([1, 2, 3, 4].map(first)).size).toBe(2);
  });

  it('variantes réellement différenciées : principaux distincts, moins de la moitié d’exercices communs', () => {
    const rows = rowsOf(res('L4-1').r);
    const ov = abOverlap(rows);
    expect(ov).not.toBeNull();
    expect(ov ?? 1).toBeLessThan(0.5);
    for (let w = 1; w <= WEEKS; w++) for (const reg of ['upper', 'lower'] as const) {
      const main = (v: 'a' | 'b') => rows.find((x) => x.week === w && x.arch && archetypeRegion(x.arch) === reg && archetypeVariant(x.arch) === v)?.mains[0];
      expect(main('a')).not.toBe(main('b'));
    }
  });

  it('récupération : aucune séance faite de la même région à moins de 36 h (profils A/B)', () => {
    for (const id of ['L4-1', 'L4-2', 'L4-3', 'L4-5']) expect([id, sameRegionGaps(rowsOf(res(id).r)).under]).toEqual([id, 0]);
  });

  it('durée maximale de séance respectée (60 min, personnalisation)', () => {
    for (const spec of SPECS) expect([spec.id, durations(res(spec.id).r, 60).over]).toEqual([spec.id, 0]);
  });

  it('continuité (profil 4) : Full Body puis A/B ; historique Full Body intact ; charges reprises de l’historique réel, jamais en baisse', () => {
    const { r } = res('L4-4');
    const rows = rowsOf(r);
    expect([...new Set(rows.filter((x) => x.week <= 4).map((x) => x.arch))]).toEqual(['str_full_body']);
    expect([...new Set(rows.filter((x) => x.week >= 5 && x.arch).map((x) => x.arch))].sort()).toEqual(['str_lower_a', 'str_lower_b', 'str_upper_a', 'str_upper_b']);
    // Suivis Full Body conservés, actifs, inchangés après la bascule ; expositions réelles jamais réécrites.
    expect(r.state.strength.tracks.filter((t) => t.archetypeId === 'str_full_body').length).toBeGreaterThan(0);
    for (const t of r.state.strength.tracks.filter((x) => x.transferredFrom)) {
      expect(r.state.strength.tracks.some((o) => o.trackId === t.transferredFrom?.trackId)).toBe(true);
      expect(archetypeVariant(t.archetypeId)).not.toBeNull();
    }
    for (const m of mainLoads(rows)) expect([m.ex, m.drops]).toEqual([m.ex, 0]);
  });

  it('planning perturbé (profil 5) : séances manquées et commencées jamais réécrites ; semaines suivantes planifiées', () => {
    const { r } = res('L4-5');
    const rows = rowsOf(r);
    expect(rows.filter((x) => x.executed === 'manquée')).toHaveLength(2);
    expect(rows.filter((x) => x.executed === 'commencée, non terminée')).toHaveLength(1);
    for (let w = 6; w <= WEEKS; w++) expect([w, rows.filter((x) => x.week === w && x.status === 'planned').length]).toEqual([w, 4]);
    // Jours changés à partir de S7 : séances sur lundi, mercredi, jeudi, vendredi.
    const weekday = (d: string) => (new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7;
    for (const x of rows.filter((y) => y.week >= 7 && y.date)) expect([0, 2, 3, 4]).toContain(weekday(x.date as string));
  });

  it('déterminisme : même profil, même résultat (deux exécutions complètes)', () => {
    const again = simulate(P1, WEEKS);
    expect(hash(again.sessions)).toBe(hash(res('L4-1').r.sessions));
    expect(hash(again.state)).toBe(hash(res('L4-1').r.state));
  });
});
