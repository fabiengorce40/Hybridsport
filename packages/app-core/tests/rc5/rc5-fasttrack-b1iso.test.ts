/**
 * FAST TRACK V1 — analyse B1ISO, profil « forme » (L41-FORME, Full Body 3×, 24 semaines).
 * Le compteur historique « principaux changés » (positions #0 et #1 de la séance) passait de 108 (A) à 140 (B1ISO).
 * Cause démontrée : la POSITION #1 est occupée tantôt par la poussée horizontale, tantôt par le tirage vertical selon
 * l'alternance A/B programmée ; B1ISO fait alterner poussée horizontale (jour genou) et verticale (jour hanche). Aucun
 * exercice principal ne change : ces tests le figent (aucun remplacement indésirable, composition périodique).
 */
import { describe, expect, it } from 'vitest';
import { simulate } from '../rc4-audit/rc4-sim.js';
import { variantEnv } from './lot42-bench.js';
import { lot43Specs } from './lot43-bench.js';
import { B1_VARIANTS } from './lot46-bench.js';

// technical-constant: TEST_ONLY — durée étudiée (semaines), semaine à partir de laquelle la composition est stabilisée, période A/B
const W = 24; const STABLE_FROM = 10; const PERIOD = 2;
type Item = { exerciseId: string; refs?: { slotId?: string } };
type Data = { session?: { blocks: { kind: string; items: Item[] }[] } };

function sessions(id: string) {
  const spec = lot43Specs().find((s) => s.id === 'L41-FORME');
  const v = B1_VARIANTS.find((x) => x.id === id);
  if (!spec || !v) throw new Error('profil ou variante');
  const st = simulate(spec, W, variantEnv(v)).state;
  return Object.values(st.planner.weeks).flatMap((w) => w.requests).filter((r) => r.sport === 'strength' && r.status === 'planned')
    .map((r) => ({ date: r.date ?? '', items: ((r.record?.data as Data | undefined)?.session?.blocks ?? []).filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

describe('B1ISO — profil forme sur 24 semaines', () => {
  const s = sessions('B1ISO');
  it('aucun exercice principal remplacé (emplacements genou / hanche)', () => {
    for (const slot of ['fb.main_knee', 'fb.main_hip']) {
      const seq = s.flatMap((x) => x.items.filter((i) => i.refs?.slotId === slot).map((i) => i.exerciseId));
      expect(seq.length).toBeGreaterThan(0);
      expect(new Set(seq).size).toBe(1);
    }
  });
  it('composition des séances périodique (alternance A/B programmée), aucune dérive', () => {
    const byDay = new Map<number, string[]>();
    for (const x of s) {
      const d = new Date(`${x.date}T00:00:00Z`).getUTCDay();
      byDay.set(d, [...(byDay.get(d) ?? []), x.items.map((i) => i.refs?.slotId).filter((z) => /main_|push_|pull_[hv]$/.test(z ?? '')).join(',')]);
    }
    for (const seq of byDay.values()) {
      const tail = seq.slice(STABLE_FROM);
      tail.forEach((c, i) => { if (i >= PERIOD) expect(c).toBe(tail[i - PERIOD]); });
    }
  });
}, 600_000);
