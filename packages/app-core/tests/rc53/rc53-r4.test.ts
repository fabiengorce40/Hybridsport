/**
 * RC5.3 lot R4 — séances modifiées, chemin réel de l'application (contenu 0.9.0, variante souple), athlète à capacité
 * cachée (`rc53-bench.ts`) :
 * - TA-11 : Course / HYROX (séances allégées par l'interférence) : aucune régression ni hausse décidée sur une
 *   exposition modifiée ; lecture souple effectivement exercée ;
 * - TA-12 : athlète fatigué (contrôle « fatigue élevée ») : séances adaptées au démarrage lues comme modifiées, aucune
 *   baisse ni hausse décidée sur elles ;
 * - TA-13 : adaptations au démarrage (douleur, fatigue, course libre, inconnu) : décisions identiques à la référence ;
 * - TA-17 / TA-18 (partiel) : contenu RC5.1 conservé au registre ; séances planifiées avant RC5.3 sans marquage.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrateToCurrent } from '@hybridsport/engine';
import type { SessionDraft, SessionRecord } from '@hybridsport/domain';
import { adaptedItemsOf, strengthContent, strengthContentFor } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { rc51Measure, rc51Profiles } from '../rc51/rc51-bench.js';
import type { Rc51Measure } from '../rc51/rc51-bench.js';
import { athlete, FATIGUE_CHECKIN, FATIGUE_WEEKS } from './rc53-bench.js';

// technical-constant: TEST_ONLY — horizon des parcours ciblés (semaines : deux blocs de fatigue inclus)
const WEEKS = 12;
const spec = (id: string, o: Partial<ProfileSpec> = {}): ProfileSpec => ({ ...(rc51Profiles().find((p) => p.id === id) as ProfileSpec), ...o });
const level = (s: ProfileSpec, l: 'beginner' | 'intermediate' | 'advanced'): ProfileSpec => ({ ...s, profile: { ...s.profile, level: l } });

interface Decision { readonly date: string; readonly exerciseId: string; readonly modified: boolean; readonly exposure: string; readonly decision: string }

/** Séance EXÉCUTÉE d'une demande (séance adaptée au démarrage si elle existe) et séance planifiée. */
function sessionsOf(s: AppState, requestId: string): { planned?: SessionDraft; executed?: SessionDraft } {
  const req = Object.values(s.planner.weeks).flatMap((w) => w.requests).find((r) => r.requestId === requestId);
  const dec = (env: unknown) => { const d = env ? migrateToCurrent<SessionRecord>(env as never) : undefined; return d?.ok ? d.value.session : undefined; };
  const planned = dec(req?.record);
  const adapted = dec(s.programmeLogs[requestId]?.adaptation?.record);
  return { ...(planned ? { planned } : {}), ...((adapted ?? planned) ? { executed: adapted ?? planned } : {}) };
}

/** Décisions de progression par exposition, avec le marquage « modifiée » de l'item exécuté (moteur ou adaptation). */
function decisions(s: AppState): Decision[] {
  const out: Decision[] = [];
  const byDate = new Map<string, string>();
  for (const w of Object.values(s.planner.weeks)) for (const r of w.requests) if (r.sport === 'strength' && r.date && s.programmeLogs[r.requestId]) byDate.set(r.date, r.requestId);
  const audit = s.programmeState?.audit ?? [];
  audit.forEach((a, i) => {
    if (a.reason.code !== 'PROGRESSION.EXPOSURE_CLASSIFIED') return;
    const date = a.at.slice(0, 10);
    const exerciseId = String(a.reason.params.exerciseId);
    const next = audit.slice(i + 1).find((b) => b.reason.params.trackId === a.reason.params.trackId && b.reason.code !== 'PROGRESSION.EXPOSURE_CLASSIFIED');
    const { planned, executed } = sessionsOf(s, byDate.get(date) ?? '');
    const items = executed?.blocks.flatMap((b) => b.items).filter((it) => it.exerciseId === exerciseId) ?? [];
    const adapted = planned && executed && planned !== executed ? adaptedItemsOf(planned, executed) : {};
    const modified = items.some((it) => it.refs?.doseModified === true || adapted[it.id] !== undefined);
    const d = next?.reason.code === 'PROGRESSION.HELD' ? `HELD:${String(next.reason.params.cause)}` : next?.reason.code === 'PROGRESSION.ADVANCED' ? `ADVANCED:${String(next.reason.params.variable)}` : (next?.reason.code ?? 'none');
    out.push({ date, exerciseId, modified, exposure: String(a.reason.params.exposure), decision: d });
  });
  return out;
}
const weekOf = (d: string) => Math.floor((Date.parse(d) - Date.parse('2026-10-05')) / (7 * 86_400_000));
const decided = (d: Decision) => d.decision.startsWith('ADVANCED') || d.decision === 'PROGRESSION.REGRESSED';

describe('RC5.3 R4 — contenu courant et registre', () => {
  it('contenu courant (RC5.3, politique souple) ; R4 0.9.0 et RC5.1 0.8.0 conservés au registre', () => {
    expect(strengthContent().ruleset.version).toMatch(/-strength-rc53-/);
    expect(strengthContentFor('0.9.0-strength-rc53-r4', strengthContent().catalog.version)?.ruleset.version).toBe('0.9.0-strength-rc53-r4');
    const rc51 = strengthContentFor('0.8.0-strength-rc51', strengthContent().catalog.version);
    expect(rc51?.ruleset.version).toBe('0.8.0-strength-rc51');
  });
});

describe('TA-11 — séances allégées par l’interférence (Course, HYROX)', () => {
  for (const id of ['P1b', 'S4H']) {
    it(`${id} : aucune hausse ni régression décidée sur une exposition modifiée ; lecture souple exercée`, () => {
      const ath = athlete('progressant', 'intermediate');
      const s = simulate(level(spec(id, { athlete: ath }), 'intermediate'), WEEKS).state;
      const all = decisions(s);
      const mod = all.filter((d) => d.modified);
      expect(mod.length).toBeGreaterThan(0);
      expect(mod.filter(decided)).toEqual([]);
      expect(mod.every((d) => d.decision === 'HELD:modified_prescription' || d.decision === 'HELD:below_modified' || !['above', 'on_target', 'below', 'partial'].includes(d.exposure))).toBe(true);
      // Les régressions restantes viennent d'expositions NON modifiées (hausses de la double progression plus rapides que
      // la capacité réelle : lot R2, essais de charge) — jamais de la modification.
      expect(all.filter((d) => d.decision === 'PROGRESSION.REGRESSED' && d.modified)).toEqual([]);
      // La progression continue sur les expositions NON modifiées (charges ou répétitions).
      expect(all.filter((d) => !d.modified && d.decision.startsWith('ADVANCED')).length).toBeGreaterThan(0);
    }, 600_000);
  }
});

describe('TA-12 — athlète fatigué (contrôle « fatigue élevée »)', () => {
  it('S4 intermédiaire : séances des semaines de fatigue adaptées et lues comme modifiées, aucune baisse ni hausse décidée sur elles', () => {
    const ath = athlete('fatigue', 'intermediate');
    const s = simulate(level(spec('S4', { athlete: ath, checkIn: FATIGUE_CHECKIN }), 'intermediate'), WEEKS).state;
    const tired = decisions(s).filter((d) => FATIGUE_WEEKS.has(weekOf(d.date)));
    expect(tired.length).toBeGreaterThan(0);
    expect(tired.filter((d) => d.modified).length).toBeGreaterThan(0);
    expect(tired.filter((d) => d.modified && decided(d))).toEqual([]);
    expect(tired.filter((d) => d.decision === 'PROGRESSION.REGRESSED')).toEqual([]);
  }, 600_000);
});

describe('TA-13 — adaptations au démarrage inchangées (douleur, fatigue, course libre, inconnu)', () => {
  const BEFORE = JSON.parse(readFileSync(new URL('../rc51/fixtures/pre-rc51-bench.json', import.meta.url), 'utf8')) as Record<string, Rc51Measure>;
  // S4H : décision fatigue modifiée par RC5.1 (documentée, RC5.2 §2.4) ; comparée à la référence d'avant R4 par le banc.
  for (const id of ['S4', 'P1b', 'S3', 'P5']) {
    it(`${id} : décisions de démarrage identiques à la référence`, () => {
      expect(rc51Measure(spec(id)).starts).toEqual(BEFORE[id]?.starts);
    }, 600_000);
  }
});
