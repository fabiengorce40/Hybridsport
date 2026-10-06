/**
 * Cross-training C3 — scénarios B (CT + Strength) et C (CT + Running) par le planificateur RÉEL.
 * Transport → trace → interprétation : les voisines (seconde passe) et l'ordre de priorité sont transportés dans le
 * contexte CT ; les voisines ne sont interprétées que via `ct.hybrid.policy` (TEST_ONLY) ; la priorité n'a aucune
 * politique (séance identique quel que soit le rang). Gouvernances : TEST_ONLY. Rapport : __reports__/c3-multisport.md.
 */
import { describe, expect, it } from 'vitest';
import type { SportEngine } from '@hybridsport/engine';
import { createCrossTrainingEngine } from '@hybridsport/crosstraining';
import type { C3Outcome, CrossTrainingEngine } from '@hybridsport/crosstraining';
import { crossTrainingPort, planMultisportWeek } from '../../src/index.js';
import type { PlannedWeek, SportIntent, SportPorts } from '../../src/index.js';
import { CT_INTENT, PROFILE, clock, input, plannerGovernance, running, strength, want } from '../fixtures.js';
import { TEST_DOSE_NORMALIZATION, withDemand } from '../simulation.js';
import { C3_REQUESTS, c3Governance } from '../../../crosstraining/tests/c3-fixtures.js';
import type { C3GovOptions } from '../../../crosstraining/tests/c3-fixtures.js';
import { ctxInput } from '../../../crosstraining/tests/fixtures.js';
import { scenarioMarkdown, writeReport } from '../../../crosstraining/tests/c3/report.js';
import { testCatalog, testRuleset } from '../../../engine/tests/fixtures/load.js';
import { STATE_FRESH } from '../../../engine/tests/harness/requests.js';

// technical-constant: TEST_ONLY — normalisation des mètres / calories Cross-training (profil de demande des voisines)
const CT_NORMALIZATION = { ...TEST_DOSE_NORMALIZATION, crosstraining: { ...TEST_DOSE_NORMALIZATION.crosstraining, meter: { perUnit: 0.01, intensityBand: 'high' }, calorie: { perUnit: 0.2, intensityBand: 'high' } } };
const C3_INTENT = { ...CT_INTENT, archetypeId: 'crosstraining.mixed_modal_medium' };

/** Port CT C3 espion : capture l'entrée réellement reçue par le moteur (contexte transporté compris). */
function ctC3(o: C3GovOptions = {}, transport = true) {
  const engine = createCrossTrainingEngine({ governance: c3Governance(o), simulation: true });
  const seen: Parameters<CrossTrainingEngine['propose']>[0][] = [];
  const spied = { ...engine, propose: (i: Parameters<CrossTrainingEngine['propose']>[0]) => { seen.push(i); return engine.propose(i); } } as CrossTrainingEngine;
  const port = crossTrainingPort({
    engine: spied, content: withDemand({ ruleset: testRuleset(), catalog: testCatalog() }, CT_NORMALIZATION), profile: PROFILE, state: STATE_FRESH, history: [], clock,
    baseContext: ctxInput({ capabilityRequests: [...C3_REQUESTS] }), transportNeighbours: transport,
  });
  return { port, seen, compose: (): C3Outcome | undefined => { const last = seen.at(-1); return last ? engine.compose(last) : undefined; } };
}

const plan = (demands: readonly SportIntent[], ports: SportPorts): PlannedWeek => planMultisportWeek(input(demands), ports, plannerGovernance(), clock);
const ctResult = (w: PlannedWeek) => w.requests.find((r) => r.sport === 'crosstraining');
const sections: string[] = [];
/** Contenu PRESCRIPTIF (format, mouvements, doses), hors identifiants et date. */
const sessionOf = (w: PlannedWeek): unknown => {
  const r = ctResult(w);
  return r?.status === 'planned' ? (r.session as { blocks: { format: string; items: { exerciseId: string; prescription: unknown }[] }[] }).blocks.map((b) => ({ format: b.format, items: b.items.map((i) => [i.exerciseId, i.prescription]) })) : undefined;
};

function report(title: string, context: string, w: PlannedWeek, compose: C3Outcome | undefined) {
  const r = ctResult(w);
  const demand = r?.status === 'planned' && r.demand.status === 'derived' ? Object.entries(r.demand.levels).filter(([, l]) => l !== 'none').map(([s, l]) => `${s}=${l}`).join(', ') : 'non dérivé';
  const others = w.requests.filter((x) => x.sport !== 'crosstraining').map((x) => `${x.sport} ${x.status}${x.status === 'planned' ? ` le ${x.date}` : ''}`).join(' ; ');
  const fake = { trace: { entries: [] }, result: r?.status === 'planned' ? { status: 'ok', value: r.session } : { status: 'error', error: { code: r?.status ?? 'absent', reasons: [] } } } as never;
  sections.push(scenarioMarkdown({ title, context: `${context}\n\nAutres séances : ${others}. CT : ${r?.status ?? 'absent'}${r?.status === 'planned' ? ` le ${r.date}` : ''}.`, outcome: fake, compose, demand }));
}

describe('C3 multisport — transport, trace, interprétation gouvernée (TEST_ONLY)', () => {
  it('B — CT + Strength : voisine Strength transportée, priorité tracée (rang 1 puis 2), séance IDENTIQUE quel que soit le rang', () => {
    const a = ctC3();
    const w1 = plan([want('crosstraining', 1, { intent: C3_INTENT }), want('strength', 1)], { crosstraining: a.port, strength: strength() });
    const first = a.compose();
    report('Scénario B — Cross-training (priorité 1) + Strength', 'Programme : CT puis Strength (ordre déclaré). Voisines interprétées via `ct.hybrid.policy` (TEST_ONLY : éviter les structures `high` des voisines).', w1, first);
    expect(ctResult(w1)?.status).toBe('planned');
    const ctx = a.seen.at(-1)?.discipline;
    expect(ctx?.sportPriority?.order).toEqual(['crosstraining', 'strength']);
    expect(ctx?.neighbours?.items.map((n) => n.discipline)).toEqual(['strength']);
    const b = ctC3();
    const w2 = plan([want('strength', 1), want('crosstraining', 1, { intent: C3_INTENT })], { crosstraining: b.port, strength: strength() });
    report('Scénario B bis — Strength (priorité 1) + Cross-training (priorité 2)', 'Même semaine, ordre de priorité inversé : aucune politique de priorité gouvernée.', w2, b.compose());
    expect(b.seen.at(-1)?.discipline.sportPriority?.order).toEqual(['strength', 'crosstraining']);
    // Invariance à la priorité : MÊME entrée, seul l'ordre déclaré change ⇒ même composition (aucune politique).
    // (Entre w1 et w2, la voisine Strength elle-même diffère — autre jour, autre séance — d'où un contenu CT différent.)
    const last = b.seen.at(-1);
    if (!last) throw new Error('entrée CT attendue');
    const swapped = { ...last, discipline: { ...last.discipline, sportPriority: { order: ['crosstraining', 'strength'] as ('crosstraining' | 'strength')[] } } };
    const engine = createCrossTrainingEngine({ governance: c3Governance(), simulation: true });
    const x = engine.compose(last);
    const y = engine.compose(swapped);
    expect(x?.ok && y?.ok).toBe(true);
    if (x?.ok && y?.ok) expect(y.plan).toEqual(x.plan);
    expect(sessionOf(w1)).toBeDefined();
  });

  it('C — CT + Running : voisine Running transportée ; interprétation seulement si gouvernée ; sinon tracée « blocked »', () => {
    const governed = ctC3({ override: { 'ct.hybrid.policy': { avoidNeighbourLevels: ['low', 'moderate', 'high'] } } });
    const w = plan([want('crosstraining', 1, { intent: C3_INTENT }), want('running', 1)], { crosstraining: governed.port, running: running() });
    const c = governed.compose();
    report('Scénario C — Cross-training + Running', 'Politique TEST_ONLY : éviter toute structure sollicitée par une voisine (low, moderate, high).', w, c);
    expect(ctResult(w)?.status).toBe('planned');
    expect(governed.seen.at(-1)?.discipline.neighbours?.items.map((n) => n.discipline)).toEqual(['running']);
    expect(c?.ok && c.plan.avoidedStructures.length > 0).toBe(true);
    // Sans voisines transportées (port C2 historique) : aucune interprétation, séance de la passe unique.
    const plain = ctC3({}, false);
    const w0 = plan([want('crosstraining', 1, { intent: C3_INTENT }), want('running', 1)], { crosstraining: plain.port, running: running() });
    expect(plain.seen.every((i) => i.discipline.neighbours === undefined)).toBe(true);
    expect(ctResult(w0)?.status).toBe('planned');
  });

  it('écriture du rapport', () => {
    writeReport(new URL('./__reports__/c3-multisport.md', import.meta.url).pathname, 'Cross-training C3 — scénarios multisport B et C', sections);
    expect(sections.length).toBeGreaterThan(0);
  });
});

export type { SportEngine };
