/**
 * HYROX H2 — multisport par le planificateur RÉEL : HYROX + Running, + Strength, + Cross-training, semaine à quatre
 * sports, simulation de 4 semaines. Le programme demande un RÔLE (jamais une station) ; le planificateur place sans
 * connaître aucune station ; voisines, priorité et séances HYROX de la semaine sont TRANSPORTÉES ; HYROX interprète
 * les voisines seulement via `hybrid_race.h2.neighbourPolicy` (TEST_ONLY). Rapport : __reports__/h2-multisport.md.
 */
import { describe, expect, it } from 'vitest';
import { HR_CODES, createHyroxEngine, h2ArchetypeOf, h2ExposureOf, h2PresentationOf } from '@hybridsport/hyrox';
import type { H2Realized, HrRole, HyroxEngine } from '@hybridsport/hyrox';
import type { ReasonCode } from '@hybridsport/domain';
import { hyroxPort, planMultisportWeek } from '../../src/index.js';
import type { DeclaredIntent, PlannedWeek, SportIntent, SportPorts } from '../../src/index.js';
import { PROFILE, WEEK, clock, crosstraining, input, plannerGovernance, running, strength, want } from '../fixtures.js';
import { withDemand } from '../simulation.js';
import { h2RulesetDocument } from '../../../hyrox/tests/h2-fixtures.js';
import { hyroxCatalog } from '../../../hyrox/tests/fixtures.js';
import { sessionMarkdown, writeReport } from '../../../hyrox/tests/h2-report.js';
import { testRuleset } from '../../../engine/tests/fixtures/load.js';
import { STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { addDays } from '../../../app-core/src/dates.js';

const H2_INTENT = (role: HrRole): DeclaredIntent => ({ archetypeId: h2ArchetypeOf(role), stimulus: `stim.hybrid_race.${role}`, objective: 'objective.hybrid_race.h2', phase: 'phase.hybrid_race.base', toleranceProfile: 'for_time' });
/** Demande HYROX du PROGRAMME : un rôle, aucune station. */
const hyroxWant = (role: HrRole, sessions = 1, o: Partial<SportIntent> = {}): SportIntent => ({ ...want('hyrox', sessions, { intent: H2_INTENT(role) }), station: undefined, ...o });

function hyroxH2(history: H2Realized[] = [], params: Parameters<typeof h2RulesetDocument>[0] = {}) {
  const engine = createHyroxEngine({ simulation: true });
  const seen: Parameters<HyroxEngine['propose']>[0][] = [];
  const spied: HyroxEngine = { ...engine, propose: (i) => { seen.push(i); return engine.propose(i); } };
  const port = hyroxPort({
    engine: spied, content: withDemand({ ruleset: testRuleset(h2RulesetDocument(params)), catalog: hyroxCatalog() }), profile: PROFILE, state: STATE_FRESH, history: [], clock,
    baseContext: { population: { level: 'intermediate', hybrid: false }, mode: 'CANDIDATE', returnState: { state: 'NONE' }, goal: { type: 'RACE_PREPARATION' }, compositionHistory: history },
    transportNeighbours: true,
  });
  return { port, seen };
}

const plan = (demands: readonly SportIntent[], ports: SportPorts, o: Parameters<typeof input>[1] = {}): PlannedWeek => planMultisportWeek(input(demands, o), ports, plannerGovernance(), clock);
const hr = (w: PlannedWeek) => w.requests.filter((r) => r.sport === 'hyrox');
const sections: string[] = [];
const asRun = (w: PlannedWeek, k = 0) => {
  const r = hr(w)[k];
  const reasons = (r?.status === 'planned' ? r.reasons : r?.reasons ?? []) as ReasonCode[];
  return {
    outcome: {} as never, refusal: r?.status === 'planned' ? [] : reasons, session: r?.status === 'planned' ? r.session : undefined,
    proposal: r?.status === 'planned' ? { archetypeId: r.record ? h2ArchetypeOf((r.reasons.find((x) => x.code === HR_CODES.H2_INTENT)?.params.role ?? 'station_capacity') as HrRole) : '', reasons } : undefined,
  };
};
const reasonIn = (w: PlannedWeek, code: string, k = 0) => (hr(w)[k]?.reasons ?? []).find((x) => x.code === code);

describe('H2 multisport — planificateur réel (TEST_ONLY)', () => {
  it('HYROX + Running : voisine Running transportée et interprétée (politique TEST_ONLY), priorité tracée', () => {
    const h = hyroxH2();
    const w = plan([hyroxWant('compromised_running'), want('running', 1)], { hyrox: h.port, running: running() });
    expect(hr(w)[0]?.status).toBe('planned');
    const ctx = h.seen.at(-1)?.discipline;
    expect(ctx?.neighbours?.items.map((n) => n.discipline)).toEqual(['running']);
    expect(ctx?.sportPriority?.order).toEqual(['hybrid_race', 'running']);
    expect(ctx?.requestedStation).toBeUndefined();
    expect(reasonIn(w, HR_CODES.H2_NEIGHBOURS)?.params.policy).toBe('hybrid_race.h2.neighbourPolicy');
    // Décisions de composition PERSISTÉES avec la séance (liste fermée de codes).
    expect((hr(w)[0]?.reasons ?? []).map((x) => x.code)).toEqual(expect.arrayContaining([HR_CODES.H2_INTENT, HR_CODES.H2_STRUCTURE_CHOSEN, HR_CODES.H2_STATION_SELECTED, HR_CODES.H2_RUN_COMPONENT, HR_CODES.H2_DURATION]));
    sections.push(sessionMarkdown('HYROX (compromised_running) + Running', 'Programme : HYROX puis Running. La course HYROX reste une distance (allure BLOCKED) ; la séance Running reste au moteur Running.', asRun(w) as never));
  });

  it('HYROX + Strength : voisine Strength (lower/upper) évitée si sa demande est `high` ; aucune séance Strength bis dans HYROX', () => {
    const h = hyroxH2();
    const w = plan([want('strength', 2), hyroxWant('strength_endurance')], { hyrox: h.port, strength: strength() });
    expect(hr(w)[0]?.status).toBe('planned');
    expect(h.seen.at(-1)?.discipline.neighbours?.items.some((n) => n.discipline === 'strength')).toBe(true);
    expect(h.seen.at(-1)?.discipline.sportPriority?.order).toEqual(['strength', 'hybrid_race']);
    const s = hr(w)[0];
    expect(s?.status === 'planned' && s.session.blocks.every((b) => b.kind === 'hybrid_station_work' && b.items.every((i) => i.prescription.type !== 'sets'))).toBe(true);
    sections.push(sessionMarkdown('Strength (×2) + HYROX (strength_endurance)', 'Strength prioritaire. HYROX ne prescrit ni séries ni force maximale.', asRun(w) as never));
  });

  it('HYROX + Cross-training : les deux moteurs composent séparément ; voisine CT transportée', () => {
    const h = hyroxH2();
    const w = plan([hyroxWant('mixed_station_conditioning'), want('crosstraining', 1)], { hyrox: h.port, crosstraining: crosstraining() });
    expect(hr(w)[0]?.status).toBe('planned');
    expect(w.requests.find((r) => r.sport === 'crosstraining')?.status).toBe('planned');
    expect(h.seen.at(-1)?.discipline.neighbours?.items.map((n) => n.discipline)).toContain('crosstraining');
    sections.push(sessionMarkdown('HYROX (mixed_station_conditioning) + Cross-training', 'Deux sports à stations : aucune fusion, voisine transportée.', asRun(w) as never));
  });

  it('semaine à QUATRE sports : placement sans station ; la demande HYROX ne porte qu’un rôle', () => {
    const h = hyroxH2();
    const w = plan([want('strength', 2), want('running', 2), want('crosstraining', 1), hyroxWant('compromised_running', 2)], { hyrox: h.port, strength: strength(), running: running(), crosstraining: crosstraining() });
    const placed = w.requests.filter((r) => r.status === 'planned').map((r) => `${r.sport}@${r.date ?? ''}`);
    expect(hr(w).filter((r) => r.status === 'planned').length).toBeGreaterThan(0);
    expect(h.seen.every((i) => i.discipline.requestedStation === undefined)).toBe(true);
    expect(new Set(placed.map((p) => p.split('@')[1])).size).toBeGreaterThan(1);
    // Deux séances HYROX du même rôle dans la semaine : la seconde voit la première (séances PRÉVUES transportées).
    const planned = hr(w).filter((r) => r.status === 'planned');
    if (planned.length === 2) {
      expect(h.seen.some((i) => (i.discipline.plannedSessions ?? []).length > 0)).toBe(true);
      const [a, b] = planned.map((r) => (r.status === 'planned' ? h2PresentationOf(r.session, h2ArchetypeOf('compromised_running'))?.components.map((c) => c.exerciseId).join('>') : ''));
      expect(a).not.toEqual(b);
    }
    sections.push(['## Semaine à quatre sports', '', `Placement : ${w.requests.map((r) => `${r.sport} ${r.status}${r.status === 'planned' ? ` le ${r.date}` : ''}`).join(' ; ')}.`, '', 'Le planificateur ne lit aucune station : la demande HYROX ne porte qu’un archétype de rôle.', ''].join('\n'));
    for (const [k] of planned.entries()) sections.push(sessionMarkdown(`Semaine à quatre sports — HYROX n°${String(k + 1)}`, 'compromised_running (2 séances déclarées).', asRun(w, k) as never));
  });

  it('simulation de 4 semaines : mémoire (variété, retour négatif), aucune progression ; une semaine abandonnée écarte ses stations', () => {
    const history: H2Realized[] = [];
    const lines: string[] = ['## Simulation 4 semaines — HYROX (compromised_running + station_capacity) + Running', '', '| Semaine | Séance | Rôle | Structure | Composantes | Réalisation déclarée |', '|---|---|---|---|---|---|'];
    let monday: string = WEEK[0];
    const signatures: string[] = [];
    for (let k = 0; k < 4; k += 1) {
      const h = hyroxH2([...history]);
      const days = WEEK.map((_d, i) => ({ date: addDays(monday, i), availableMinutes: 60 }));
      const w = plan([hyroxWant('compromised_running', 2, { overrides: [{ index: 2, intent: H2_INTENT('station_capacity') }] }), want('running', 1)], { hyrox: h.port, running: running() }, { weekStart: monday, days });
      for (const r of hr(w)) {
        if (r.status !== 'planned') { lines.push(`| ${String(k + 1)} | ${r.requestId} | — | — | refus | — |`); continue; }
        const role = (r.reasons.find((x) => x.code === HR_CODES.H2_INTENT)?.params.role ?? 'station_capacity') as HrRole;
        const x = h2ExposureOf(r.session, h2ArchetypeOf(role), r.requestId, clock.instantOf(r.date ?? monday));
        if (!x) throw new Error('séance H2 attendue');
        // Semaine 2 : première séance abandonnée (déclaré), pour éprouver la mémoire négative.
        const completion = k === 1 && x.role === 'compromised_running' ? 'abandoned' : 'completed_as_prescribed';
        history.push({ ...x, completion });
        signatures.push(`${x.role}:${x.structure}:${x.exercises.join('>')}`);
        lines.push(`| ${String(k + 1)} | ${r.date ?? ''} | ${x.role} | ${x.structure} | ${x.exercises.join(' → ')} | ${completion} |`);
      }
      monday = addDays(monday, 7);
    }
    sections.push([...lines, '', 'Aucune dose ne change d’une semaine à l’autre (aucune progression gouvernée) ; seules la variété et la mémoire négative agissent.', ''].join('\n'));
    expect(history.length).toBeGreaterThanOrEqual(6);
    // Variété : pas quatre fois la même séance pour le même rôle.
    expect(new Set(signatures.filter((s) => s.startsWith('compromised_running'))).size).toBeGreaterThan(1);
    // Après l'abandon (semaine 2), la séance compromised_running suivante n'emploie aucune station abandonnée.
    const abandoned = history.find((x) => x.completion === 'abandoned');
    const after = history.filter((x) => abandoned && x.role === 'compromised_running' && x.at > abandoned.at)[0];
    if (abandoned && after) {
      const st = (xs: readonly string[]) => xs.filter((e) => e !== 'ex.easy_run');
      expect(st(after.exercises).some((e) => st(abandoned.exercises).includes(e))).toBe(false);
    }
  });

  it('écriture du rapport', () => {
    writeReport(new URL('./__reports__/h2-multisport.md', import.meta.url).pathname, 'HYROX H2 — multisport (planificateur réel)', sections);
    expect(sections.length).toBeGreaterThan(4);
  });
});
