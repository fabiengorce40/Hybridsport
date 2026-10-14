/**
 * Repli RC1 TEST compatible RC3 TEST. Les fixtures `rc3-*.json` sont le texte EXACT écrit par le code RC3 TEST
 * (`claude/kairo-rc3-test-candidate`) pendant un essai : séances RC1 reprises et terminées en RC3, lecteur Course
 * (en cours et terminé), TEST et référence, séance de seuil, courses libres commentées / corrigées / supprimées /
 * avec douleur, performance déclarée, dernière course datée, repli A2, fatigue (A1), semaines planifiées par RC3,
 * Cross-training et HYROX, pause douleur.
 *
 * Critère : aucune séance, aucun historique, aucune référence, aucun profil ni aucune douleur perdus. Seuls les
 * quatre champs additifs de RC3 sont retirés, et le texte RC3 d'origine est conservé sur l'appareil.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  activePainPause, decodeState, ensureBeta0Week, finishProgrammeSession, loadState, MemoryStorage, RC3_ORIGINAL_KEY, saveState, selectHistory, STORAGE_KEY, withoutRc3Annexes,
} from '../../src/index.js';
import type { AppState, Clock } from '../../src/index.js';

const DIR = join(import.meta.dirname, 'fixtures');
const FIXTURES = readdirSync(DIR).filter((f) => f.startsWith('rc3-') && f.endsWith('.json')).sort();
const raw = (f: string): string => readFileSync(join(DIR, f), 'utf8');
type Obj = Record<string, unknown>;
/** Attendu : le texte RC3 exact, moins les 4 champs additifs (retirés à la main ici, indépendamment du code testé). */
function expected(text: string): Obj {
  const j = JSON.parse(text) as Obj & { planner: { weeks: Record<string, { requests: Obj[] }> }; programmeLogs: Record<string, Obj>; running: Obj };
  for (const w of Object.values(j.planner.weeks)) for (const r of w.requests) delete r.cause;
  for (const l of Object.values(j.programmeLogs)) delete l.runPlayer;
  delete j.running.notes;
  delete j.running.timeUnknown;
  return j;
}
const load = (text: string) => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, text);
  return { storage, r: loadState(storage, '2026-11-20T08:00:00Z') };
};
const at = (iso: string, s = 0): Clock => {
  const now = new Date(Date.parse(iso) + s * 1000).toISOString().replace('.000Z', 'Z');
  return { today: now.slice(0, 10), now };
};

describe('repli RC1 : données écrites par RC3 relues sans perte', () => {
  it('corpus : 9 états RC3, les 4 champs additifs présents au moins une fois', () => {
    expect(FIXTURES).toHaveLength(9);
    const all = FIXTURES.map(raw).join('\n');
    for (const k of ['"cause"', '"runPlayer"', '"notes"', '"timeUnknown"']) expect(all).toContain(k);
  });

  for (const f of FIXTURES) {
    it(`${f} : relu ; état = texte RC3 moins les seuls champs additifs ; texte d'origine conservé`, () => {
      const text = raw(f);
      const { storage, r } = load(text);
      expect(r.status).toBe('ok');
      if (r.status !== 'ok') return;
      expect(JSON.parse(JSON.stringify(r.state))).toEqual(expected(text));
      const j = JSON.parse(text) as AppState;
      // Critère explicite : séances, historique, références, profil, douleurs, contrôles et réalisations conservés.
      const e = expected(text) as unknown as AppState;
      expect(r.state.programmeLogs).toEqual(e.programmeLogs);
      expect(r.state.programmeState).toEqual(j.programmeState);
      expect(r.state.running.realized).toEqual(j.running.realized);
      expect(r.state.running.references).toEqual(j.running.references);
      expect(r.state.profile).toEqual(j.profile);
      expect(r.state.safety).toEqual(j.safety);
      expect(r.state.checkIns).toEqual(j.checkIns);
      expect(selectHistory(r.state).length).toBe(Object.values(j.programmeLogs).filter((l) => l.finishedAt).length + (j.programmeState?.results ?? []).filter((x) => x.completion === 'missed' && !j.programmeLogs[x.requestId]?.finishedAt).length);
      // Copie RC3 d'origine : seulement si un champ a dû être retiré.
      const annexes = r.rc3AnnexesRemoved !== undefined;
      expect(storage.getItem(RC3_ORIGINAL_KEY)).toBe(annexes ? text : null);
      expect(annexes).toBe(JSON.stringify(expected(text)) !== JSON.stringify(JSON.parse(text)));
      // Réécriture puis relecture : plus aucun champ RC3, état stable.
      expect(saveState(storage, r.state)).toEqual({ ok: true });
      const again = loadState(storage, '2026-11-21T08:00:00Z');
      expect(again.status === 'ok' && again.rc3AnnexesRemoved === undefined).toBe(true);
      expect(again.state).toEqual(r.state);
      // La semaine suivante se prépare avec le code RC1.
      expect(() => ensureBeta0Week(r.state, at('2026-11-23T06:00:00Z'))).not.toThrow();
    });
  }
});

describe('repli RC1 : séances et sécurité', () => {
  it('TEST en cours avec lecteur RC3 : repris en RC1 (chrono depuis le début) et terminé ⇒ référence', () => {
    const { r } = load(raw('rc3-running-player-inprogress.json'));
    const log = Object.values(r.state.programmeLogs).find((l) => !l.finishedAt);
    if (!log) throw new Error('séance en cours attendue');
    const s = finishProgrammeSession(r.state, at(log.startedAt, 3600), { requestId: log.requestId, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 3500, testTimeS: 2650 } });
    expect(s.running.references).toEqual([expect.objectContaining({ type: 'TIME_TRIAL', values: expect.objectContaining({ durationS: 2650 }) })]);
  });

  it('Musculation en cours (fatigue A1) : séries et repos conservés ; terminée en RC1', () => {
    const { r } = load(raw('rc3-strength-continued-a1-inprogress.json'));
    const log = Object.values(r.state.programmeLogs).find((l) => !l.finishedAt);
    if (!log) throw new Error('séance en cours attendue');
    expect(log.sets.filter((x) => x.done).length).toBeGreaterThan(0);
    const s = finishProgrammeSession(r.state, at(log.startedAt, 1800), { requestId: log.requestId, completion: 'modified', pain: false });
    expect(s.programmeLogs[log.requestId]?.sets).toEqual(log.sets);
  });

  it('douleurs déclarées pendant l’essai RC3 (course libre, HYROX) : pause douleur active, zones conservées', () => {
    for (const f of ['rc3-free-runs-notes-pain-performance.json', 'rc3-hyrox-finished-pain.json', 'rc3-pain-pause-free-run-pain.json']) {
      const { r } = load(raw(f));
      expect(activePainPause(r.state)).not.toBeNull();
      expect(r.state.safety).toEqual((JSON.parse(raw(f)) as AppState).safety);
    }
    const { r } = load(raw('rc3-pain-pause-free-run-pain.json'));
    expect(JSON.stringify(r.state.safety)).toContain('ankle_foot');
  });

  it('courses libres, corrections, suppressions, performance déclarée : réalisations et références identiques ; seuls les commentaires sont mis de côté', () => {
    const text = raw('rc3-free-runs-notes-pain-performance.json');
    const { r } = load(text);
    const j = JSON.parse(text) as AppState;
    expect(r.state.running.realized.map((x) => x.sessionId)).toEqual(j.running.realized.map((x) => x.sessionId));
    expect(r.state.running.references).toHaveLength(2);
    expect(r.status === 'ok' && r.rc3AnnexesRemoved).toEqual({ 'running.notes': 2 });
  });
});

describe('repli RC1 : jamais de réparation au-delà des 4 champs', () => {
  it('un autre champ inconnu reste « illisible » (copie de secours), même accompagné d’un champ RC3', () => {
    const j = JSON.parse(raw('rc3-free-runs-notes-pain-performance.json')) as Obj & { running: Obj };
    j.running.futureField = 1;
    const { storage, r } = load(JSON.stringify(j));
    expect(r.status).toBe('unreadable');
    expect(storage.getItem(RC3_ORIGINAL_KEY)).toBeNull();
    expect(decodeState(JSON.stringify(j)).ok).toBe(false);
  });

  it('un champ RC3 au mauvais endroit n’est pas retiré', () => {
    const j = JSON.parse(raw('rc3-ct-finished.json')) as Obj & { profile: Obj };
    j.profile.notes = {};
    expect(load(JSON.stringify(j)).r.status).toBe('unreadable');
  });

  it('withoutRc3Annexes ne touche rien d’autre et compte ce qu’il retire', () => {
    const text = raw('rc3-hybrid-continued-week6.json');
    const down = withoutRc3Annexes(JSON.parse(text));
    expect(down.data).toEqual(expected(text));
    expect(Object.keys(down.removed)).toEqual(['planner.weeks.*.requests.*.cause']);
    const player = withoutRc3Annexes(JSON.parse(raw('rc3-onboarding-dated-a2.json')));
    expect(player.removed).toEqual({ 'programmeLogs.*.runPlayer': 1, 'running.timeUnknown': 1 });
  });
});
