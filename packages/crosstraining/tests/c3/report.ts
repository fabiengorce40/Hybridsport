/**
 * Rapports lisibles des scénarios C3 (tests uniquement) : intention, structure, format, mouvements et raisons, dose,
 * durée prescrite / estimée (moteur) et estimée (CORE), profil de demande, contraintes, blocages, provenance.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { deriveSessionDemand } from '@hybridsport/engine';
import type { CorePipelineOutcome, LoadedCatalog, LoadedRuleset } from '@hybridsport/engine';
import type { ReasonCode, SessionDraft } from '@hybridsport/domain';
import { CT_CODES } from '../../src/index.js';
import type { C3Outcome } from '../../src/index.js';

type Reason = Pick<ReasonCode, 'code' | 'params'>;
const fmt = (v: unknown): string => (Array.isArray(v) ? v.join(', ') : typeof v === 'number' ? String(Math.round(v * 10) / 10) : String(v));

export function reasonsOf(o: CorePipelineOutcome): readonly Reason[] {
  if (o.result.status === 'error') return o.result.error.reasons;
  if (o.result.status === 'rest_recommended') return o.result.reasons;
  return o.trace.entries.flatMap((e) => e.reasons);
}

export function coreDuration(o: CorePipelineOutcome): string {
  if (o.result.status !== 'ok') return '—';
  const sid = o.result.value.id;
  const p = o.trace.entries.filter((t) => t.subject.id === sid).flatMap((t) => t.reasons).filter((r) => r.code === 'DURATION.ESTIMATED').at(-1)?.params;
  return p ? `p50 ${fmt(p.p50 ?? p.p50S)} s · p90 ${fmt(p.p90 ?? p.p90S)} s` : 'non tracée';
}

export function demandOf(o: CorePipelineOutcome, catalog: LoadedCatalog, ruleset: LoadedRuleset): string {
  if (o.result.status !== 'ok') return '—';
  const d = deriveSessionDemand(o.result.value as SessionDraft, catalog, ruleset);
  if (!d.ok) return `non dérivable (${d.reasons.map((r) => fmt(r.params.cause)).join(', ')})`;
  return Object.entries(d.profile.levels).filter(([, l]) => l !== 'none').map(([s, l]) => `${s}=${l}`).join(', ') || 'aucune';
}

export interface ScenarioView { readonly title: string; readonly context: string; readonly outcome: CorePipelineOutcome; readonly compose: C3Outcome | undefined; readonly demand: string }

export function scenarioMarkdown(v: ScenarioView): string {
  const lines: string[] = [`## ${v.title}`, '', v.context, ''];
  const reasons = v.compose?.ok ? v.compose.proposal.reasons : v.compose?.reasons ?? reasonsOf(v.outcome);
  const by = (code: string) => reasons.filter((r) => r.code === code);
  const intent = by(CT_CODES.C3_INTENT)[0]?.params;
  if (intent) lines.push(`- **Intention** : stimulus \`${fmt(intent.stimulus)}\`, niveau ${fmt(intent.level)}, temps disponible ${fmt(intent.availableTimeS)} s, priorité [${fmt(intent.sportPriority)}] (rang ${fmt(intent.rank)}), voisines ${fmt(intent.neighbours)}`);
  const st = by(CT_CODES.C3_STRUCTURE)[0]?.params;
  if (st) lines.push(`- **Structure** : ${fmt(st.blocks)}${by(CT_CODES.C3_BLOCK_NOT_GENERATED).map((r) => ` · ${fmt(r.params.kind)} non généré (${fmt(r.params.cause)})`).join('')}`);
  const nb = by(CT_CODES.C3_NEIGHBOURS)[0]?.params;
  if (nb) lines.push(`- **Voisines / priorité** : connues=${fmt(nb.known)}, [${fmt(nb.neighbours)}], interprétation=${fmt(nb.policy)}, priorité=${fmt(nb.priorityPolicy)}`);
  const hist = by(CT_CODES.C3_HISTORY)[0]?.params;
  if (hist) lines.push(`- **Historique** : ${fmt(hist.sameStimulus)} séance(s) du même stimulus dans la fenêtre, dernier format ${fmt(hist.lastFormat)}, mouvements récents [${fmt(hist.recentMovements)}]`);
  for (const r of by(CT_CODES.C3_HISTORY_NEGATIVE)) lines.push(`- **Historique négatif** : ${fmt(r.params.sessionId)} (${fmt(r.params.causes)}) ⇒ ${fmt(r.params.action)}`);
  for (const r of by(CT_CODES.C3_FORMAT_REJECTED)) lines.push(`- Format écarté \`${fmt(r.params.format)}\` : ${fmt(r.params.causes)}`);
  if (v.compose?.ok) {
    const p = v.compose.plan;
    const chosen = by(CT_CODES.C3_FORMAT_CHOSEN)[0]?.params;
    lines.push(`- **Format** : \`${p.format}\` (${fmt(chosen?.criteria)})${p.rounds === undefined ? '' : ` · ${String(p.rounds)} tours`}`);
    lines.push(`- **Durée** : ${p.durationKind === 'prescribed' ? `PRESCRITE ${String(p.blockS)} s` : `ESTIMÉE typique ${fmt(p.estimated?.typicalS)} s / lente ${fmt(p.estimated?.slowS)} s ⇒ time cap ${String(p.blockS)} s`}${p.roundEstimate ? ` · tour estimé ${fmt(p.roundEstimate.typicalS)} s (rapide ${fmt(p.roundEstimate.fastS)}, lent ${fmt(p.roundEstimate.slowS)})` : ''} · CORE : ${coreDuration(v.outcome)}`);
    lines.push(`- **Densité** : ${p.density.kind} (${p.density.detail})`);
    lines.push('', '| Rôle | Mouvement | Dose | Charge | Raisons |', '|---|---|---|---|---|');
    for (const it of p.items) lines.push(`| ${it.role} | ${it.exerciseId} | ${it.timed ? `${String(it.timed.rounds)} × ${String(it.timed.workS)} s / repos ${String(it.timed.restS)} s` : `${String(it.quantity?.value)} ${it.quantity?.kind ?? ''}`} | ${it.loadKg === undefined ? '—' : `${String(it.loadKg)} kg`} | ${it.criteria.join(', ')} |`);
    lines.push('');
    for (const r of by(CT_CODES.C3_CANDIDATES_REJECTED).filter((x) => x.params.format === p.format)) lines.push(`- Candidats écartés (${fmt(r.params.role)}) : ${fmt(r.params.rejected)}`);
    if (p.identicalToLast.length > 0) lines.push(`- Identique à la dernière séance du même stimulus aux niveaux : ${p.identicalToLast.join(', ')}`);
  } else {
    lines.push(`- **Refus** : ${reasons.filter((r) => /CROSSTRAINING\.(C3_NO_FORMAT|C3_STRUCTURE_UNAVAILABLE|C3_STIMULUS_OUT_OF_SCOPE|C3_HISTORY_NEGATIVE|UNRESOLVED_PARAMETER|CAPABILITY_DISABLED|HYBRID_PLANNER_UNAVAILABLE|SIMULATION_REQUIRED|RETURN_NOT_SUPPORTED|C3_PARAMETER_UNREADABLE)/.test(r.code)).map((r) => `${r.code} ${JSON.stringify(r.params)}`).slice(0, 4).join(' ; ') || reasons.map((r) => r.code).join(', ')}`);
  }
  lines.push(`- **Profil de demande (CORE)** : ${v.demand}`);
  lines.push(`- **Résultat CORE** : ${v.outcome.result.status === 'ok' ? 'séance publiée, identique à la proposition' : `refus ${v.outcome.result.status === 'error' ? v.outcome.result.error.code : v.outcome.result.status}`}`);
  const used = [...new Set(reasons.filter((r) => r.code === CT_CODES.CANDIDATE_VALUE_USED).map((r) => String(r.params.parameterId)))].sort();
  lines.push(`- **Provenance** : ${used.length} paramètre(s) TEST_ONLY (EXPERT_PROPOSED, CANDIDATE) : ${used.join(', ') || '—'}`, '');
  return lines.join('\n');
}

export function writeReport(path: string, title: string, sections: readonly string[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, [`# ${title}`, '', '> Généré par les tests (TEST_ONLY / SIMULATION_ONLY). Aucune valeur n’est approuvée.', '', ...sections].join('\n'));
}
