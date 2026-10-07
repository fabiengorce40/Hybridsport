/**
 * M3 — tests ADVERSARIAUX de l'arbitrage multisport (≥ 50) : fail-closed (politique absente, invalide, production),
 * mécanique (qui cède, actions, protection du sport prioritaire, ordre de composition), historique (réalisé / prévu /
 * manqué / abandonné), distance (fenêtre des voisines), sécurité (jamais de contournement d'un refus), bornes et
 * déterminisme, fonctions pures d'analyse, frontières d'architecture. Politique : TEST_ONLY.
 */
import { describe, expect, it } from 'vitest';
import { GP_CODES, planMultisportWeek } from '../../src/index.js';
import type { PlannedWeek, PlannerInput, PortOutcome, SportPort, SportPorts } from '../../src/index.js';
import { compareConflicts, detectConflicts, unknownDemand, yielderOf } from '../../src/m3-analysis.js';
import type { M3Conflict, M3Node } from '../../src/m3-analysis.js';
import { M3_REQUIRED_PARAMETERS } from '../../src/m3-policy.js';
import { clock, days, input, plannerGovernance, running, strength } from '../fixtures.js';
import { D, m3Ports, planM3 } from '../m3-fixtures.js';
import { m3Governance } from '../m3-governance.js';
import type { M3TestOptions } from '../m3-governance.js';
import { loadCoreSources } from '../../../engine/tests/architecture/source-scanner.js';

const B = [D.hyrox(2), D.running(2)];
const C = [D.hyrox(2), D.strength(2)];
const A = [D.strength(3), D.running(3)];
const REAL = [D.hyrox(2), D.runningComposed(2), D.strength(2), D.ct(1)];
const plan = (demands: Parameters<typeof planM3>[0], m3: M3TestOptions = {}, o: Omit<Parameters<typeof planM3>[1] & object, 'm3'> = {}) => planM3(demands, { ...o, m3 });
const arb = (w: PlannedWeek) => {
  if (!w.arbitration) throw new Error('arbitrage absent');
  return w.arbitration;
};
const planned = (w: PlannedWeek) => w.requests.filter((r) => r.status === 'planned');
const req = (w: PlannedWeek, id: string) => w.requests.find((r) => r.requestId === id);
const dateOf = (w: PlannedWeek, id: string) => { const r = req(w, id); return r?.status === 'planned' ? r.date : undefined; };
const RANK = (w: PlannedWeek, demands: readonly { sport: string }[], id: string) => demands.findIndex((d) => d.sport === req(w, id)?.sport);

/** Port qui REFUSE pour raison de sécurité sur certains jours (ou tous) : le refus n'est jamais contourné. */
function refusing(port: SportPort, onDates: ((d: string) => boolean)): SportPort {
  const refused = (date: string): PortOutcome => ({ status: 'refused', reasons: [{ code: 'SAFETY.TEST.REFUSED', params: { date } } as unknown as PortOutcome['reasons'][number]] });
  return { ...port, generate: (slot) => (onDates(slot.date) ? refused(slot.date) : port.generate(slot)) };
}
/** Port espion : capture chaque créneau demandé (voisines comprises). */
function spy(port: SportPort): { port: SportPort; slots: Parameters<SportPort['generate']>[0][] } {
  const slots: Parameters<SportPort['generate']>[0][] = [];
  return { port: { ...port, generate: (s) => { slots.push(s); return port.generate(s); } }, slots };
}

describe('fail-closed : politique absente, incomplète, invalide, production', () => {
  it('1. aucune politique M3 : POLICY_UNAVAILABLE tracé, aucune décision, placement V2 inchangé', () => {
    const inp = input(B);
    const v2 = planMultisportWeek(inp, m3Ports(), plannerGovernance(), clock);
    expect(arb(v2).status).toBe('POLICY_UNAVAILABLE');
    expect(arb(v2).reasons.map((r) => r.code)).toContain(GP_CODES.M3_ARBITRATION_BLOCKED);
    expect(arb(v2).decisions).toEqual([]);
    expect(v2.days.map((d) => [d.date, d.status === 'planned' ? d.requestId : null])).toEqual(planMultisportWeek(inp, m3Ports(), plannerGovernance(), clock).days.map((d) => [d.date, d.status === 'planned' ? d.requestId : null]));
  });
  it.each(M3_REQUIRED_PARAMETERS.map((id, k) => [k + 2, id]))('%i. paramètre requis absent (%s) ⇒ POLICY_UNAVAILABLE, aucune décision', (_n, id) => {
    const w = plan(B, { omit: [id] });
    expect(arb(w).status).toBe('POLICY_UNAVAILABLE');
    expect(arb(w).decisions).toEqual([]);
    expect(planned(w).some((r) => r.reasons.some((x) => x.code === GP_CODES.M3_DECISION))).toBe(false);
  });
  it('8. importance absente : arbitrage par le rang seul, égalité d\'importance tracée', () => {
    const w = plan(B, { importance: null });
    expect(arb(w).status).toBe('RESOLVED');
    expect(arb(w).decisions[0]?.why).toEqual(expect.arrayContaining(['importance:tie', 'rank:lower_priority_yields']));
  });
  it('9. mode PRODUCTION : politique TEST_ONLY refusée ⇒ POLICY_UNAVAILABLE', () => {
    const w = planMultisportWeek({ ...input(B), mode: 'PRODUCTION' }, m3Ports(), m3Governance(), clock);
    expect(w.arbitration?.status).toBe('POLICY_UNAVAILABLE');
  });
  it.each([
    [10, 'fenêtre négative', { 'planner.m3.pairRules': [{ id: 'x', structures: ['lower_knee'], levels: ['high'], withinHours: -1 }] }],
    [11, 'action DROP inconnue (supprimer n\'est pas une action)', { 'planner.m3.actions': ['MOVE', 'DROP'] }],
    [12, 'niveau inconnu', { 'planner.m3.pairRules': [{ id: 'x', structures: ['lower_knee'], levels: ['extreme'], withinHours: 48 }] }],
    [13, 'borne de passes nulle', { 'planner.m3.maxPasses': 0 }],
    [14, 'politique de cession sans protectPriority', { 'planner.m3.yieldPolicy': { order: ['rank'] } }],
    [15, 'règle de paire sans structure', { 'planner.m3.pairRules': [{ id: 'x', structures: [], levels: ['high'], withinHours: 48 }] }],
    [16, 'statut d\'historique inconnu', { 'planner.m3.historyStatuses': ['executed', 'imagined'] }],
  ])('%i. valeur invalide (%s) ⇒ POLICY_UNAVAILABLE', (_n, _label, values) => {
    expect(arb(plan(B, { values })).status).toBe('POLICY_UNAVAILABLE');
  });
  it('17. profil de demande non dérivable (normalisation absente) ⇒ BLOCKED DEMAND_UNAVAILABLE, rien ne bouge', () => {
    const ports: SportPorts = { ...m3Ports(), running: running({ normalization: null }) };
    const w = planM3(B, { ports });
    expect(arb(w).status).toBe('BLOCKED');
    expect(arb(w).reasons[0]?.params.cause).toBe('DEMAND_UNAVAILABLE');
    expect(arb(w).decisions).toEqual([]);
  });
  it('18. mono-sport : aucun arbitrage (M3 ne concerne que plusieurs sports)', () => {
    expect(planM3([D.strength(3)]).arbitration).toBeUndefined();
  });
});

describe('qui cède et actions autorisées', () => {
  it('19. aucune action autorisée ⇒ résidu NO_ACTION_AUTHORIZED, aucune décision', () => {
    const w = plan(B, { actions: [] });
    expect(arb(w).decisions).toEqual([]);
    expect(arb(w).residual.every((r) => r.cause === 'NO_ACTION_AUTHORIZED')).toBe(true);
  });
  it('20. politique de cession vide ⇒ personne ne cède (UNDECIDED), jamais un choix arbitraire', () => {
    const w = plan(B, { yieldOrder: [] });
    expect(arb(w).decisions).toEqual([]);
    expect(arb(w).residual.every((r) => r.cause.startsWith('NO_YIELDER') && r.cause.includes('UNDECIDED'))).toBe(true);
  });
  it('21. importance AVANT rang : la séance clé d\'un sport moins prioritaire est préservée', () => {
    const demands = [D.running(2), D.hyrox(2)];
    const w = plan(demands);
    for (const d of arb(w).decisions) expect(req(w, d.requestId)?.sport).toBe('running');
  });
  it('22. rang AVANT importance : le sport le moins prioritaire cède même si sa séance est clé', () => {
    const demands = [D.running(2), D.hyrox(2)];
    const w = plan(demands, { yieldOrder: ['rank', 'importance'] });
    for (const d of arb(w).decisions) expect(req(w, d.requestId)?.sport).toBe('hyrox');
  });
  it('23. RECOMPOSE seul, Running qui cède : aucun levier moteur (NO_ENGINE_LEVER), résidu visible', () => {
    const w = plan(B, { actions: ['RECOMPOSE'] });
    expect(arb(w).residual.flatMap((r) => r.tried)).toContain('RECOMPOSE:NO_ENGINE_LEVER');
    expect(arb(w).decisions).toEqual([]);
  });
  it('24. RECOMPOSE seul, Strength qui cède : le jour ne change jamais ; le moteur décide (effet ou NO_EFFECT tracé)', () => {
    const w = plan(C, { actions: ['RECOMPOSE'] });
    for (const d of arb(w).decisions) { expect(d.action).toBe('RECOMPOSE'); expect(d.from).toBe(d.to); }
    if (arb(w).decisions.length === 0) expect(arb(w).residual.flatMap((r) => r.tried)).toEqual(expect.arrayContaining([expect.stringMatching(/^RECOMPOSE:/)]));
  });
  it('25. RECOMPOSE : la voisine en conflit est signalée « key » au moteur (levier Strength), sans autre modification', () => {
    const s = spy(strength());
    planM3(C, { ports: { ...m3Ports(), strength: s.port }, m3: { actions: ['RECOMPOSE'] } });
    const flagged = s.slots.filter((x) => x.neighbours?.neighbours.some((n) => n.importance === 'key' && n.sport === 'hyrox'));
    expect(flagged.length).toBeGreaterThan(0);
  });
  it('26. MOVE AVANT RECOMPOSE (ordre gouverné) : B résolu par MOVE', () => {
    expect(arb(plan(B)).decisions.map((d) => d.action)).toEqual(['MOVE']);
  });
  it('27. MOVE ne choisit jamais un jour indisponible', () => {
    for (const minutes of [[60, 60, 60, 60, 60, 0, 60], [60, 60, 0, 60, 0, 60, 60], [60, 60, 60, 0, 0, 0, 60]]) {
      const w = plan(B, {}, { minutes });
      for (const d of arb(w).decisions) expect(w.days.find((x) => x.date === d.to)?.availableMinutes).toBeGreaterThan(0);
    }
  });
  it('28. SWAP protégé : jamais avec une séance clé ni d\'un sport plus prioritaire', () => {
    for (const minutes of [[90, 90, 90, 90, 90, 90, 90], [60, 60, 60, 0, 60, 0, 90], [60, 60, 60, 60, 60, 60, 0]]) {
      const w = plan(REAL, {}, { minutes, composedRunning: true });
      for (const d of arb(w).decisions.filter((x) => x.action === 'SWAP')) {
        expect(req(w, d.partner ?? '')?.composition?.role).not.toBe('KEY');
        expect(RANK(w, REAL, d.partner ?? '')).toBeGreaterThanOrEqual(RANK(w, REAL, d.requestId));
      }
    }
  });
  it('29. protection levée par la politique : A résolu par SWAP (décision gouvernée, jamais implicite)', () => {
    expect(arb(plan(A)).status).toBe('PARTIAL');
    expect(arb(plan(A, { protectPriority: false })).status).toBe('RESOLVED');
  });
  it('30. ordre de COMPOSITION préservé : les rôles Running composés gardent leur ordre chronologique', () => {
    for (const minutes of [[90, 90, 90, 90, 90, 90, 90], [60, 60, 60, 0, 60, 0, 90], [60, 0, 60, 60, 60, 60, 60]]) {
      const inp = input(REAL, { days: days(minutes) });
      const before = planMultisportWeek(inp, m3Ports({ composedRunning: true }), plannerGovernance(), clock);
      const after = planMultisportWeek(inp, m3Ports({ composedRunning: true }), m3Governance(), clock);
      const roles = (w: PlannedWeek, sport: string) => planned(w).filter((r) => r.sport === sport).sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1)).map((r) => r.composition?.role ?? r.intent?.archetypeId);
      expect(roles(after, 'running')).toEqual(roles(before, 'running'));
      expect(roles(after, 'strength')).toEqual(roles(before, 'strength'));
    }
  });
  it('31. un SWAP est tracé sur LES DEUX séances (jamais silencieux pour la partenaire)', () => {
    const w = plan(A, { protectPriority: false });
    const d = arb(w).decisions[0];
    expect(req(w, d?.requestId ?? '')?.reasons.map((x) => x.code)).toContain(GP_CODES.M3_DECISION);
    expect(req(w, d?.partner ?? '')?.reasons.find((x) => x.code === GP_CODES.M3_DECISION)?.params.why).toEqual([`swap_partner_of:${d?.requestId ?? ''}`]);
  });
  it('32. jamais de suppression : mêmes séances planifiées avant / après, dans tous les scénarios denses', () => {
    for (const [demands, minutes] of [[REAL, [90, 90, 90, 90, 90, 90, 90]], [[D.strength(2), D.running(2), D.ct(1), D.hyrox(2)], [60, 60, 60, 60, 60, 90, 60]], [A, [60, 60, 60, 0, 0, 0, 0]]] as const) {
      const inp = input(demands, { days: days(minutes) });
      const ids = (w: PlannedWeek) => planned(w).map((r) => r.requestId).sort();
      expect(ids(planMultisportWeek(inp, m3Ports({ composedRunning: true }), m3Governance(), clock))).toEqual(ids(planMultisportWeek(inp, m3Ports({ composedRunning: true }), plannerGovernance(), clock)));
    }
  });
});

describe('historique : réalisé ≠ prévu', () => {
  // Séance Running réelle de la veille (dimanche 4 octobre) : profil `lower_knee` haut.
  const prevRun = () => {
    const r = planned(planM3(B)).find((x) => x.sport === 'running');
    if (!r || r.status !== 'planned') throw new Error('course de référence absente');
    return r.session;
  };
  const withHistory = (status: 'executed' | 'abandoned' | 'missed' | 'planned' | undefined, m3: M3TestOptions = {}) => {
    const recent: PlannerInput['recent'] = [{ date: '2026-10-04', sport: 'running', session: prevRun(), ...(status ? { status } : {}) }];
    return plan([D.strength(1), D.hyrox(1)], m3, { recent });
  };
  const historyConflicts = (w: PlannedWeek) => arb(w).initial.filter((c) => c.includes('history.0'));
  it('33. course RÉALISÉE la veille : conflit détecté avec l\'historique, seule la séance planifiée cède', () => {
    const w = withHistory('executed');
    expect(historyConflicts(w).length).toBeGreaterThan(0);
    expect(arb(w).decisions.every((d) => !d.requestId.startsWith('history'))).toBe(true);
    expect(arb(w).decisions[0]?.why[0]).toMatch(/ONLY_PLANNED_MEMBER/);
  });
  it('34. course seulement PRÉVUE : jamais une exposition réelle (politique TEST_ONLY) ⇒ ignorée', () => {
    expect(historyConflicts(withHistory('planned'))).toEqual([]);
  });
  it('35. course MANQUÉE : ignorée', () => {
    expect(historyConflicts(withHistory('missed'))).toEqual([]);
  });
  it('36. course ABANDONNÉE : comptée (exposition partielle réelle, politique TEST_ONLY)', () => {
    expect(historyConflicts(withHistory('abandoned')).length).toBeGreaterThan(0);
  });
  it('37. statut absent (semaine antérieure à M3) : traité comme « prévu », jamais comme réalisé', () => {
    expect(historyConflicts(withHistory(undefined))).toEqual([]);
  });
  it('38. politique qui compte aussi le prévu : conflit détecté (la politique décide, pas le code)', () => {
    expect(historyConflicts(withHistory('planned', { historyStatuses: ['executed', 'abandoned', 'planned'] })).length).toBeGreaterThan(0);
  });
  it('39. l\'historique n\'est jamais déplacé ni recomposé', () => {
    const w = withHistory('executed');
    expect([...arb(w).decisions.map((d) => d.requestId), ...arb(w).decisions.map((d) => d.partner ?? '')].some((id) => id.startsWith('history'))).toBe(false);
  });
});

describe('distance : fenêtre d\'interférence des voisines (≠ fenêtre d\'historique)', () => {
  it('40. fenêtre gouvernée : aucune voisine transmise au-delà (problème des 144 h corrigé)', () => {
    const w = plan(B);
    for (const r of planned(w)) for (const n of r.neighbourContext?.neighbours ?? []) expect(Math.abs(n.hoursFromThisSession)).toBeLessThanOrEqual(72);
  });
  it('41. sans fenêtre gouvernée : comportement V2 (voisines non bornées, 144 h visibles)', () => {
    const w = plan(B, { neighbourWindowH: null });
    expect(planned(w).flatMap((r) => r.neighbourContext?.neighbours ?? []).some((n) => Math.abs(n.hoursFromThisSession) > 72)).toBe(true);
  });
  it('42. importance transportée aux moteurs seulement si la politique est gouvernée', () => {
    const inp = input(B);
    const v2 = planMultisportWeek(inp, m3Ports(), plannerGovernance(), clock);
    expect(planned(v2).flatMap((r) => r.neighbourContext?.neighbours ?? []).some((n) => 'importance' in n)).toBe(false);
    // Objectif réel : la course KEY composée par Running est transmise « key » aux moteurs consommateurs (HYROX, CT, Strength).
    expect(planned(plan(REAL, {}, { composedRunning: true })).flatMap((r) => r.neighbourContext?.neighbours ?? []).some((n) => n.importance === 'key')).toBe(true);
  });
  it('43. distance stricte : un écart ÉGAL à la fenêtre n\'est pas un conflit (fenêtre proche 24 h, jours consécutifs)', () => {
    expect(arb(plan(B, { window: 'near' })).initial).toEqual([]);
  });
});

describe('sécurité et douleur : jamais de contournement', () => {
  it('44. séance refusée pour SÉCURITÉ sur tous les jours : refusée, jamais placée ni arbitrée par M3', () => {
    const ports = { ...m3Ports(), running: refusing(running(), () => true) };
    const w = planM3(B, { ports });
    expect(w.requests.filter((r) => r.sport === 'running').every((r) => r.status === 'refused' && r.category === 'safety_blocked')).toBe(true);
    expect(JSON.stringify(arb(w))).not.toContain('running');
  });
  it('45. refus de SÉCURITÉ sur le jour cible : MOVE n\'y place jamais la séance (tracé), essaie ailleurs ou laisse le conflit', () => {
    const ports = { ...m3Ports(), running: refusing(running(), (d) => d === '2026-10-10') };
    const w = planM3(B, { ports });
    expect(dateOf(w, '2026-10-05.running.2')).not.toBe('2026-10-10');
    expect([...arb(w).decisions.map((d) => d.to), ...arb(w).residual.flatMap((r) => r.tried)].join(' ')).toMatch(/2026-10-10:ENGINE_REFUSED|2026-10-0[0-9]|2026-10-11/);
  });
  it('46. M3 ne modifie jamais le statut d\'une demande refusée ou non planifiée', () => {
    const inp = input([D.hyrox(2), D.running(2), D.strength(2)], { days: days([60, 60, 60, 0, 0, 0, 0]) });
    const st = (w: PlannedWeek) => w.requests.filter((r) => r.status !== 'planned').map((r) => [r.requestId, r.status, r.category]);
    expect(st(planMultisportWeek(inp, m3Ports(), m3Governance(), clock))).toEqual(st(planMultisportWeek(inp, m3Ports(), plannerGovernance(), clock)));
  });
});

describe('bornes, boucles, déterminisme, explicabilité', () => {
  it('47. borne de passes respectée (1) : au plus une décision, le reste tracé', () => {
    const w = plan(REAL, { maxPasses: 1, protectPriority: false }, { minutes: [90, 90, 90, 90, 90, 90, 90], composedRunning: true });
    expect(arb(w).passes).toBeLessThanOrEqual(1);
    expect(arb(w).decisions.length).toBeLessThanOrEqual(1);
  });
  it('48. déterminisme : trois exécutions identiques octet pour octet', () => {
    const runs = [0, 1, 2].map(() => JSON.stringify(plan(REAL, {}, { composedRunning: true })));
    expect(new Set(runs).size).toBe(1);
  });
  it('49. stabilité : une minute de plus sur un jour LIBRE ne change pas l\'arbitrage', () => {
    const a = arb(plan(B, {}, { minutes: [60, 60, 60, 60, 60, 90, 60] }));
    const b = arb(plan(B, {}, { minutes: [60, 60, 61, 60, 60, 90, 60] }));
    expect(b.decisions).toEqual(a.decisions);
  });
  it('50. explicabilité : chaque décision dit quelle règle, quelle structure, quel écart, quel critère, quelle action', () => {
    for (const w of [plan(B), plan(C), plan(A, { protectPriority: false })]) {
      for (const d of arb(w).decisions) {
        expect(d.why.some((x) => x.startsWith('rule:'))).toBe(true);
        expect(d.why.some((x) => x.startsWith('structure:'))).toBe(true);
        expect(d.why.some((x) => x.startsWith('delta:'))).toBe(true);
        expect(d.why.some((x) => /^(importance|rank):|ONLY_PLANNED/.test(x))).toBe(true);
        const reason = req(w, d.requestId)?.reasons.find((x) => x.code === GP_CODES.M3_DECISION);
        expect(reason?.params).toMatchObject({ action: d.action, from: d.from, to: d.to });
      }
    }
  });
  it('51. explicabilité des refus : chaque conflit restant dit sa cause et les alternatives essayées', () => {
    const w = plan(A);
    for (const r of arb(w).residual) { expect(r.cause).not.toBe(''); expect(r.tried.length).toBeGreaterThan(0); }
  });
  it('52. pas de score global de charge : aucune somme ni score dans le code M3', () => {
    const src = loadCoreSources(['packages/planner/src']).filter((f) => /m3-|planner\.ts$/.test(f.path)).map((f) => f.text).join('\n');
    expect(src).not.toMatch(/loadScore|globalScore|totalLoad|fatigueScore|\bscore\b/i);
  });
  it('53. M3 ne choisit ni exercice, ni allure, ni mouvement, ni station, ni charge, ni répétition', () => {
    const src = loadCoreSources(['packages/planner/src']).filter((f) => /m3-/.test(f.path)).map((f) => f.text).join('\n');
    expect(src).not.toMatch(/exerciseId|pace|movementId|station|load(Kg)?\b|reps\b|sets\b/);
  });
});

describe('analyse pure (m3-analysis)', () => {
  const node = (o: Partial<M3Node> & { requestId: string; hours: number }): M3Node => ({ sport: 'running', date: '2026-10-05', rank: 0, importance: 'standard', origin: 'planned', demand: { lower_knee: 'high' }, ...o });
  const PAIR = [{ id: 'p', structures: ['lower_knee'], levels: ['high' as const], withinHours: 48 }];
  it('54. paire : écart égal à la fenêtre ⇒ pas de conflit ; écart inférieur ⇒ conflit', () => {
    expect(detectConflicts([node({ requestId: 'a', hours: 0 }), node({ requestId: 'b', hours: 48, sport: 'strength' })], PAIR, [])).toEqual([]);
    expect(detectConflicts([node({ requestId: 'a', hours: 0 }), node({ requestId: 'b', hours: 47, sport: 'strength' })], PAIR, [])).toHaveLength(1);
  });
  it('55. paire : même sport jamais en conflit de paire ; deux séances d\'historique jamais en conflit', () => {
    expect(detectConflicts([node({ requestId: 'a', hours: 0 }), node({ requestId: 'b', hours: 1 })], PAIR, [])).toEqual([]);
    expect(detectConflicts([node({ requestId: 'a', hours: 0, origin: 'executed' }), node({ requestId: 'b', hours: 1, sport: 'strength', origin: 'executed' })], PAIR, [])).toEqual([]);
  });
  it('56. accumulation : la succession compte TOUS les sports (même sport inclus), au-delà du seuil seulement', () => {
    const acc = [{ id: 'acc', structure: 'lower_knee', levels: ['high' as const], withinHours: 72, maxSessions: 2 }];
    const three = [node({ requestId: 'a', hours: 0 }), node({ requestId: 'b', hours: 24 }), node({ requestId: 'c', hours: 48 })];
    expect(detectConflicts(three, [], acc)).toHaveLength(1);
    expect(detectConflicts(three.slice(0, 2), [], acc)).toEqual([]);
  });
  it('57. qui cède : l\'historique jamais ; standard face à clé ; égalité ⇒ personne', () => {
    const c: M3Conflict = { kind: 'pair', rule: 'p', structure: 'lower_knee', members: ['h', 'x'], deltaHours: 1 };
    const m = (xs: M3Node[]) => new Map(xs.map((n) => [n.requestId, n]));
    expect(yielderOf(c, m([node({ requestId: 'h', hours: 0, origin: 'executed' }), node({ requestId: 'x', hours: 1 })]), ['importance', 'rank']).node?.requestId).toBe('x');
    expect(yielderOf(c, m([node({ requestId: 'h', hours: 0, importance: 'key' }), node({ requestId: 'x', hours: 1, rank: 0 })]), ['importance']).node?.requestId).toBe('x');
    expect(yielderOf(c, m([node({ requestId: 'h', hours: 0 }), node({ requestId: 'x', hours: 1 })]), ['importance', 'rank']).node).toBeNull();
  });
  it('58. ordre des conflits : le plus proche d\'abord, puis identifiant (déterministe)', () => {
    const c = (rule: string, d: number): M3Conflict => ({ kind: 'pair', rule, structure: 's', members: ['a', 'b'], deltaHours: d });
    expect([c('b', 24), c('a', 24), c('z', 12)].sort(compareConflicts).map((x) => x.rule)).toEqual(['z', 'a', 'b']);
  });
  it('59. profil inconnu : seules les séances PLANIFIÉES bloquent (l\'historique inconnu est ignoré)', () => {
    expect(unknownDemand([node({ requestId: 'a', hours: 0, demand: null }), node({ requestId: 'h', hours: 0, demand: null, origin: 'executed' })])).toEqual(['a']);
  });
});
