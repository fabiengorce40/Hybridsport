/**
 * RC4.6 (L0) — banc qualité Musculation : RÉFÉRENCE FIGÉE avant tout correctif (8 profils, 6 semaines, chemin réel).
 * Toute évolution du rapport doit être expliquée ; aucune règle sportive n'est testée ici, seulement mesurée.
 */
import { describe, expect, it, vi } from 'vitest';
import { measureProfile, qualityProfiles, renderQualityReport, summarize } from './quality-bench.js';

vi.setConfig({ testTimeout: 900_000 });

describe('RC4.6 L0 — banc qualité Musculation', () => {
  const all = qualityProfiles().map((p) => summarize(measureProfile(p)));

  it('comptabilisation : direct + indirect recalculés = volume du bilan Strength, pour chaque séance', () => {
    for (const s of all) expect(s.accountingGap, s.id).toBe(0);
  });

  it('8 profils mesurés (P4 sans musculation)', () => {
    expect(all.map((s) => s.id)).toEqual(['P1', 'P1b', 'P2', 'P3', 'P4', 'P5', 'S3', 'S4']);
    expect(all.find((s) => s.id === 'P4')?.strengthSessions).toBe(0);
    for (const s of all.filter((x) => x.id !== 'P4')) expect(s.strengthSessions).toBeGreaterThan(0);
  });

  it('référence figée : rapport lisible et mesures complètes', async () => {
    await expect(renderQualityReport(all)).toMatchFileSnapshot('./__reports__/quality-bench.md');
    await expect(`${JSON.stringify(all, null, 1)}\n`).toMatchFileSnapshot('./__reports__/quality-bench.json');
  });
});
