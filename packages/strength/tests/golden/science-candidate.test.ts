/**
 * Goldens S1–S7 du RULESET SCIENTIFIQUE V1 CANDIDAT (phase 4E). Les goldens de BASE (ruleset 0.2.0) restent
 * dans `__goldens__/` et ne sont pas modifiés ; les séances candidates sont enregistrées dans
 * `__goldens_v1__/`. Le diff lisible est dans docs/engine-impl/STRENGTH-4E-BASELINE-DIFF.md.
 */
import { describe, expect, it } from 'vitest';
import { canonicalStringify } from '@hybridsport/engine';
import { GOLDENS } from '../fixtures/goldens.js';
import { goldenOutcome, goldenRecord } from '../fixtures/golden-record.js';
import { candidateScenario } from '../fixtures/science.js';

describe('goldens S1–S7 : ruleset scientifique V1 candidat', () => {
  for (const [k, g] of Object.entries(GOLDENS)) {
    it(`${k} — ${g.title}`, async () => {
      const s = candidateScenario(g.scenario);
      const r = goldenRecord(g.title, s);
      await expect(canonicalStringify(r.json)).toMatchFileSnapshot(`./__goldens_v1__/${k}.json`);
      await expect(r.text).toMatchFileSnapshot(`./__goldens_v1__/${k}.txt`);
      expect(canonicalStringify(goldenRecord(g.title, s).json)).toBe(canonicalStringify(r.json));
      const o = goldenOutcome(s);
      expect(o.outcome.result.status).toBe('ok');
      expect(o.validation).toBe('VALID');
      expect(o.p50S).toBeLessThanOrEqual(g.scenario.intent.availableTimeS);
    });
  }
});
