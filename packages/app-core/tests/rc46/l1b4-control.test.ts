/**
 * RC4.6 (lot 2, L1b-4) — CONTRÔLE INDÉPENDANT des tests ajustés : la marge « bras » de `r1-r2-comparison` et la
 * généralisation G5 de `f6-r3-planner` ne doivent masquer aucune régression sportive.
 *
 * Référence FIGÉE : séances du banc qualité (8 profils, 6 semaines, chemin réel) produites par le code d'AVANT L1b-4
 * (`0334c46`, contenu L1-V3) — `fixtures/pre-l1b4-bench-sessions.json` (exercice, séries de travail, emplacement).
 *
 * 1. Éléments ORDINAIRES (hors `fb.pull_c`) : identiques à la référence, sauf l'effet indirect ÉNUMÉRÉ ci-dessous.
 * 2. Mesure des BRAS calculée ici, depuis les seules attributions musculaires du catalogue (principal = direct,
 *    secondaire = `secondaryWeight`), sans aucune marge : direct inchangé semaine par semaine ; l'écart d'indirect est
 *    EXACTEMENT celui du tirage complémentaire et des séries retirées énumérées. Aucune semaine de plus au-dessus du haut.
 *
 * Effet indirect constaté (et non masqué) : la fenêtre glissante de 7 jours (`hardSets.d7`) compte les séries du tirage
 * complémentaire réalisé en fin de semaine ; au début de la semaine suivante, le besoin restant du dos (`remainingShare`)
 * baisse et le tirage horizontal principal (`fb.pull_h`) passe de 4 à 3 séries (plancher de la cellule de dose).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readStrengthParams } from '@hybridsport/strength';
import { strengthContent } from '../../src/index.js';
import { measureProfile, qualityProfiles } from './quality-bench.js';
import type { ProfileQuality } from './quality-bench.js';

type Item = [string, number, string];
type RefSession = { id: string; week: string; items: Item[] };
const REF = JSON.parse(readFileSync(new URL('./fixtures/pre-l1b4-bench-sessions.json', import.meta.url), 'utf8')) as Record<string, RefSession[]>;
const COMPLEMENT = 'fb.pull_c';
/** Seuls écarts admis hors tirage complémentaire : profil, séance, emplacement, exercice, séries avant → après. */
const KNOWN_EFFECT = [
  ['P2', '2026-11-02.strength.1'], ['P3', '2026-11-02.strength.1'],
  ['P5', '2026-10-12.strength.1'], ['P5', '2026-10-26.strength.1'], ['P5', '2026-11-09.strength.1'],
].map(([profile, id]) => ({ profile, id, slot: 'fb.pull_h', ex: 'seated_cable_row', before: 4, after: 3 }));

const content = strengthContent();
const params = readStrengthParams(content.ruleset).values;
const ARMS = new Set(params['strength.volume'].muscleGroups.arms ?? []);
const W2 = params['strength.volume'].secondaryWeight;
/** Contribution aux bras d'un exercice (catalogue seul) : [direct, indirect]. */
const arms = (ex: string, sets: number): [number, number] => {
  const e = content.catalog.exercise(`ex.${ex}`);
  if (!e) return [0, 0];
  if (e.muscles.primary.some((m) => ARMS.has(m))) return [sets, 0];
  return e.muscles.secondary.some((m) => ARMS.has(m)) ? [0, sets * W2] : [0, 0];
};
const armsByWeek = (sessions: readonly { week: string; items: readonly Item[] }[]) => {
  const out = new Map<string, [number, number]>();
  for (const s of sessions) for (const [ex, n] of s.items) {
    const [d, i] = arms(ex, n);
    const w = out.get(s.week) ?? [0, 0];
    out.set(s.week, [w[0] + d, w[1] + i]);
  }
  return out;
};
const itemsOf = (q: ProfileQuality) => q.sessions.map((s) => ({ id: s.id, week: s.week, items: s.items.map((i): Item => [i.ex, i.sets, i.slot]) }));
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe('RC4.6 L1b-4 — contrôle indépendant (régression sportive, volume des bras)', () => {
  const measured = new Map(qualityProfiles().map((p) => [p.id, measureProfile(p)]));

  it('référence complète : mêmes profils, mêmes séances (identifiants) qu\'avant L1b-4', () => {
    expect([...measured.keys()].sort()).toEqual(Object.keys(REF).sort());
    for (const [id, q] of measured) expect(q.sessions.map((s) => s.id), id).toEqual((REF[id] ?? []).map((s) => s.id));
  });

  it('éléments ordinaires (hors tirage complémentaire) identiques, sauf l\'effet indirect énuméré (tirage principal 4 → 3)', () => {
    const seen: string[] = [];
    for (const [pid, q] of measured) {
      const ref = new Map((REF[pid] ?? []).map((s) => [s.id, s.items]));
      for (const s of itemsOf(q)) {
        const now = s.items.filter((i) => i[2] !== COMPLEMENT);
        const known = KNOWN_EFFECT.find((k) => k.profile === pid && k.id === s.id);
        const expected = (ref.get(s.id) ?? []).map((i): Item => (known && i[2] === known.slot && i[0] === known.ex && i[1] === known.before ? [i[0], known.after, i[2]] : i));
        if (known) seen.push(`${pid}:${s.id}`);
        expect(now, `${pid} ${s.id}`).toEqual(expected);
      }
    }
    expect(seen).toEqual(KNOWN_EFFECT.map((k) => `${k.profile}:${k.id}`));
  });

  it('effet borné : le tirage complémentaire apporte toujours plus de séries de dos qu\'il n\'en retire au tirage principal', () => {
    for (const [pid, q] of measured) {
      const added = q.sessions.flatMap((s) => s.items).filter((i) => i.slot === COMPLEMENT).reduce((a, i) => a + i.sets, 0);
      const removed = KNOWN_EFFECT.filter((k) => k.profile === pid).reduce((a, k) => a + k.before - k.after, 0);
      expect(added >= removed * 2, `${pid} : +${String(added)} / −${String(removed)}`).toBe(true);
    }
  });

  it('bras (mesure indépendante, sans marge) : direct inchangé chaque semaine ; indirect = tirage complémentaire − séries retirées', () => {
    for (const [pid, q] of measured) {
      const before = armsByWeek(REF[pid] ?? []);
      const after = armsByWeek(itemsOf(q));
      expect([...after.keys()].sort(), pid).toEqual([...before.keys()].sort());
      for (const [week, [d0, i0]] of before) {
        const [d1, i1] = after.get(week) ?? [0, 0];
        const sessions = itemsOf(q).filter((s) => s.week === week);
        const fromComplement = sessions.flatMap((s) => s.items).filter((i) => i[2] === COMPLEMENT).reduce((a, [ex, n]) => a + arms(ex, n)[1] + arms(ex, n)[0], 0);
        const fromRemoved = KNOWN_EFFECT.filter((k) => k.profile === pid && sessions.some((s) => s.id === k.id)).reduce((a, k) => a + arms(k.ex, k.before)[1] - arms(k.ex, k.after)[1], 0);
        expect(d1, `${pid} ${week} direct`).toBe(d0);
        expect(near(i1 - i0, fromComplement - fromRemoved), `${pid} ${week} indirect ${String(i0)} → ${String(i1)}`).toBe(true);
      }
    }
  });

  it('bras (mesure indépendante) : aucune semaine supplémentaire au-dessus de la borne haute du ruleset', () => {
    for (const [pid, q] of measured) {
      const high = q.weeks[0]?.vol.arms?.[2] ?? null;
      if (high === null) continue;
      const over = (m: Map<string, [number, number]>) => [...m.values()].filter(([d, i]) => d + i > high).length;
      expect(over(armsByWeek(itemsOf(q))), pid).toBeLessThanOrEqual(over(armsByWeek(REF[pid] ?? [])));
    }
  });
});
