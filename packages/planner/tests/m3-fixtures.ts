/**
 * M3 — fixtures des scénarios d'arbitrage multisport (TEST_ONLY) : ports RÉELS des quatre moteurs (Strength, Running
 * avec ou sans composition, Cross-training C3, HYROX H2), semaine AVANT (V2, sans politique M3) / APRÈS (politique M3
 * TEST_ONLY), rendu Markdown compact des décisions. Aucune valeur ici n'est une recommandation.
 */
import { createCrossTrainingEngine } from '@hybridsport/crosstraining';
import { createHyroxEngine, h2ArchetypeOf } from '@hybridsport/hyrox';
import type { HrRole } from '@hybridsport/hyrox';
import { createRunningEngine } from '@hybridsport/running';
import { crossTrainingPort, hyroxPort, planMultisportWeek, runningPort } from '../src/index.js';
import type { DeclaredIntent, PlannedWeek, PlannerInput, SportIntent, SportPort, SportPorts } from '../src/index.js';
import { CT_INTENT, PROFILE, RUNNING_INTENT, WEEK, clock, days, input, plannerGovernance, runningBase, runningGovernance, strength, want } from './fixtures.js';
import { CT_DOSE_NORMALIZATION } from './ct-beta0.js';
import { hrBeta0 } from './hr-beta0.js';
import { m3Governance } from './m3-governance.js';
import type { M3TestOptions } from './m3-governance.js';
import { withDemand } from './simulation.js';
import { runningContent } from '../../app-core/src/provisional-content.js';
import { C3_REQUESTS, c3Governance } from '../../crosstraining/tests/c3-fixtures.js';
import { ctxInput } from '../../crosstraining/tests/fixtures.js';
import { testCatalog, testRuleset } from '../../engine/tests/fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../../engine/tests/fixtures/ruleset.js';
import { STATE_FRESH } from '../../engine/tests/harness/requests.js';

export { WEEK };
export const C3_INTENT: DeclaredIntent = { ...CT_INTENT, archetypeId: 'crosstraining.mixed_modal_medium' };
export const H2_INTENT = (role: HrRole): DeclaredIntent => ({ archetypeId: h2ArchetypeOf(role), stimulus: `stim.hybrid_race.${role}`, objective: 'objective.hybrid_race.h2', phase: 'phase.hybrid_race.base', toleranceProfile: 'for_time' });

/** Cross-training C3 (gouvernance C3 TEST_ONLY, voisines transportées). */
export function ctC3(): SportPort {
  return crossTrainingPort({
    engine: createCrossTrainingEngine({ governance: c3Governance({ hybrid: true }), simulation: true }), content: withDemand({ ruleset: testRuleset(testRulesetDocumentWithDuplicate()), catalog: testCatalog() }, CT_DOSE_NORMALIZATION),
    profile: PROFILE, state: STATE_FRESH, history: [], clock, baseContext: ctxInput({ capabilityRequests: [...C3_REQUESTS] }), transportNeighbours: true,
  });
}
/** HYROX H2 (paramètres H2 TEST_ONLY, voisines transportées). */
export function hyroxH2(): SportPort {
  return hyroxPort({
    engine: createHyroxEngine({ simulation: true }), content: hrBeta0().content, profile: PROFILE, state: STATE_FRESH, history: [], clock,
    baseContext: { population: { level: 'intermediate', hybrid: false }, mode: 'CANDIDATE', returnState: { state: 'NONE' }, goal: { type: 'RACE_PREPARATION' }, compositionHistory: [] },
    transportNeighbours: true,
  });
}
/** Running avec la composition du MOTEUR (rôles KEY / LONG / EASY…). */
export function runningComposed(): SportPort {
  const g = runningGovernance();
  return runningPort({ engine: createRunningEngine({ governance: g, simulation: true }) as never, content: withDemand(runningContent()), profile: PROFILE, state: STATE_FRESH, history: [], clock, baseContext: runningBase(), composition: { parameters: g.parameters } });
}
export function m3Ports(o: { composedRunning?: boolean } = {}): SportPorts {
  return { strength: strength(), running: o.composedRunning ? runningComposed() : runningPortPlain(), crosstraining: ctC3(), hyrox: hyroxH2() };
}
function runningPortPlain(): SportPort {
  return runningPort({ engine: createRunningEngine({ governance: runningGovernance(), simulation: true }) as never, content: withDemand(runningContent()), profile: PROFILE, state: STATE_FRESH, history: [], clock, baseContext: runningBase() });
}

const { archetypeId: _a, ...RUN_FRAME } = RUNNING_INTENT;
/** Demandes du PROGRAMME (ordre = priorité déclarée). */
export const D = {
  strength: (n: number): SportIntent => want('strength', n),
  running: (n: number): SportIntent => want('running', n),
  runningComposed: (n: number): SportIntent => want('running', n, { intent: { ...RUN_FRAME }, composition: 'engine' }),
  ct: (n: number): SportIntent => want('crosstraining', n, { intent: C3_INTENT }),
  hyrox: (n: number, role: HrRole = 'compromised_running'): SportIntent => ({ ...want('hyrox', n, { intent: H2_INTENT(role) }), station: undefined }),
};

export interface Pair { readonly before: PlannedWeek; readonly after: PlannedWeek }
/** AVANT (V2 : aucune politique M3) / APRÈS (politique M3 TEST_ONLY). */
export function beforeAfter(demands: readonly SportIntent[], o: { minutes?: readonly number[]; m3?: M3TestOptions; recent?: PlannerInput['recent']; composedRunning?: boolean } = {}): Pair {
  const inp = input(demands, { days: days(o.minutes), ...(o.recent ? { recent: o.recent } : {}) });
  return {
    before: planMultisportWeek(inp, m3Ports(o), plannerGovernance(), clock),
    after: planMultisportWeek(inp, m3Ports(o), m3Governance(o.m3), clock),
  };
}
export function planM3(demands: readonly SportIntent[], o: { minutes?: readonly number[]; m3?: M3TestOptions; recent?: PlannerInput['recent']; composedRunning?: boolean; weekStart?: string; ports?: SportPorts } = {}): PlannedWeek {
  const ws = o.weekStart ?? WEEK[0];
  const dd = days(o.minutes).map((d, i) => ({ ...d, date: addDaysIso(ws, i) }));
  return planMultisportWeek(input(demands, { weekStart: ws, days: dd, ...(o.recent ? { recent: o.recent } : {}) }), o.ports ?? m3Ports(o), m3Governance(o.m3), clock);
}
export function addDaysIso(d: string, n: number): string {
  // technical-constant: millisecondes par jour (conversion calendaire)
  return new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

// ——— rendu
const DAY = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
export const dayOf = (date: string, w: PlannedWeek): string => DAY[w.days.findIndex((d) => d.date === date)] ?? date;
const LV: Record<string, string> = { none: '·', low: 'L', moderate: 'M', high: 'H' };
const STRUCT = ['lower_knee', 'lower_hip', 'upper_push', 'upper_pull', 'axial', 'locomotor_impact', 'high_intensity_systemic', 'grip'];
export function weekTable(w: PlannedWeek): string {
  const rows = w.days.map((d) => {
    const r = d.status === 'planned' ? w.requests.find((x) => x.requestId === d.requestId) : undefined;
    const prof = r?.status === 'planned' && r.demand.status === 'derived' ? STRUCT.map((s) => LV[r.demand.status === 'derived' ? r.demand.levels[s] ?? 'none' : 'none']).join('') : '';
    const tag = r ? `${r.sport}${r.composition ? ` (${r.composition.role})` : ''}` : d.availableMinutes === 0 ? '— (indisponible)' : '—';
    const dec = r ? r.reasons.filter((x) => x.code.endsWith('M3_DECISION')).map((x) => String(x.params.action)) : [];
    const res = r ? r.reasons.filter((x) => x.code.endsWith('M3_CONFLICT_UNRESOLVED')).length : 0;
    const m3 = [...dec, ...(res > 0 ? [`conflit résiduel ×${String(res)}`] : [])].join(', ');
    return `| ${DAY[w.days.indexOf(d)] ?? ''} | ${d.availableMinutes} | ${tag} | \`${prof}\` | ${m3} |`;
  });
  const missing = w.requests.filter((r) => r.status !== 'planned').map((r) => `${r.requestId} (${r.status} / ${r.category})`);
  return ['| jour | min | séance | profil KH↑↓AIsG | M3 |', '|---|---|---|---|---|', ...rows, ...(missing.length ? ['', `Non planifiées : ${missing.join(', ')}`] : [])].join('\n');
}
export function arbitrationMd(w: PlannedWeek): string {
  const a = w.arbitration;
  if (!a) return '_aucun arbitrage (mono-sport)_';
  const lines = [`- statut : **${a.status}** · passes : ${a.passes} · politique : ${a.policyVersion ?? 'indisponible'}`];
  if (a.initial.length) lines.push(`- conflits initiaux : ${a.initial.map((c) => `\`${c}\``).join(', ')}`);
  for (const d of a.decisions) lines.push(`- décision **${d.action}** \`${d.requestId}\` ${dayOf(d.from, w)} → ${dayOf(d.to, w)}${d.partner ? ` (échange avec \`${d.partner}\`)` : ''} — pourquoi : ${d.why.join(' ; ')}`);
  for (const r of a.residual) lines.push(`- résidu \`${r.conflict}\` — cause ${r.cause}${r.tried.length ? ` — essayé : ${r.tried.join(', ')}` : ''}`);
  return lines.join('\n');
}
export function pairMd(title: string, note: string, p: Pair): string {
  return [`## ${title}`, '', note, '', '### AVANT (V2, aucune politique M3)', '', weekTable(p.before), '', arbitrationMd(p.before), '', '### APRÈS (politique M3 TEST_ONLY)', '', weekTable(p.after), '', arbitrationMd(p.after), ''].join('\n');
}
