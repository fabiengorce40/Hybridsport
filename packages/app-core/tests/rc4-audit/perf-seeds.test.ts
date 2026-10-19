/**
 * RC4.5 (C2) — états de départ de la mesure de coût de planification (`apps/kairo/scripts/perf-planning.mjs`) : chaque
 * profil RC4 au terme de sa semaine 1 (séances réalisées par le banc). Ouvert le lundi suivant, l'application clôture la
 * semaine 1 et planifie la semaine 2 (placement global G5 compris). Écrit seulement si `PERF_SEED_DIR` est défini.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'vitest';
import { PROFILES, simulate } from './rc4-sim.js';

const dir = process.env.PERF_SEED_DIR;

it.skipIf(dir === undefined)('états de départ : 6 profils RC4 en fin de semaine 1', () => {
  if (dir === undefined) return;
  mkdirSync(dir, { recursive: true });
  for (const spec of PROFILES) writeFileSync(join(dir, `${spec.id}.json`), JSON.stringify(simulate(spec, 1).state));
}, 300_000);
