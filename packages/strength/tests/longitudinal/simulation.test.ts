/**
 * Étape 19 : simulations longitudinales 12 / 26 / 52 semaines. Le rapport de chaque profil est
 * ENREGISTRÉ (lecture humaine) ; seuls les détecteurs CRITIQUES font échouer le test. Aucune valeur du
 * moteur n'est ajustée pour « faire passer » la simulation : les faiblesses observées sont documentées.
 */
import { describe, expect, it } from 'vitest';
import { detect, report, simulate } from './simulator.js';
import { PROFILES } from './profiles.js';

const HORIZONS = [12, 26, 52] as const;

describe('simulations longitudinales (12 / 26 / 52 semaines)', () => {
  for (const p of PROFILES) {
    it(p.name, async () => {
      const r = simulate(p, 52);
      const text = report(r, HORIZONS);
      await expect(`${text}\n`).toMatchFileSnapshot(`./__reports__/${p.name.slice(0, 2)}.md`);
      for (const h of HORIZONS) {
        const critical = detect(r, h).filter((d) => d.severity === 'critical');
        expect(critical, `${p.name} @${String(h)} sem.`).toEqual([]);
      }
    }, 120_000);
  }
});
