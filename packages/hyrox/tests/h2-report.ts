/**
 * Rapports H2 (tests seulement) : séance générée lisible (rôle, structure, composantes, doses, charges, contexte de
 * course, time cap, estimation, transitions, profil de demande CORE) et décisions tracées.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ReasonCode } from '@hybridsport/domain';
import { HR_CODES, h2PresentationOf } from '../src/index.js';
import { demandOf, reasonOf, reasonsOf } from './h2-fixtures.js';
import type { H2Run } from './h2-fixtures.js';

const fmt = (r: ReasonCode | undefined) => (r ? Object.entries(r.params).map(([k, v]) => `${k}=${Array.isArray(v) ? `[${v.join(', ')}]` : String(v)}`).join(' ; ') : '—');

export function sessionMarkdown(title: string, context: string, run: H2Run): string {
  const lines = [`## ${title}`, '', context, ''];
  if (!run.session) {
    const decisive = run.refusal.filter((r) => !r.code.startsWith('DATA.HYROX.CANDIDATE'));
    lines.push('**Résultat : REFUS explicite**', '', ...decisive.slice(-6).map((r) => `- \`${r.code}\` — ${fmt(r)}`), '');
    return lines.join('\n');
  }
  const archetypeId = String(run.proposal?.archetypeId ?? '');
  const p = h2PresentationOf(run.session, archetypeId);
  if (!p) return [...lines, '**Séance hors contrat H2**', ''].join('\n');
  const est = reasonOf(run, HR_CODES.H2_DURATION);
  lines.push(
    `**Rôle** : \`${p.role}\` (${p.specificity}) — **structure** : \`${p.structure}\` — **for time** ${String(p.rounds)} tour(s), time cap ${String(p.timeCapS)} s (prescrit, plafond)`,
    `**Estimation** (débits gouvernés TEST_ONLY, transitions exclues) : typique ${String(est?.params.estimatedTypicalS)} s, lente ${String(est?.params.estimatedSlowS)} s ; transitions : ${String(p.transitions.count)}, durée inconnue`,
    '', '| # | Composante | Mouvement | Dose (unité native) | Charge | Course |', '|---|---|---|---|---|---|',
    ...p.components.map((c, i) => `| ${String(i + 1)} | ${c.kind} | ${c.exerciseId} | ${String(c.dose.value)} ${c.dose.kind} | ${c.loadKg === undefined ? '—' : `${String(c.loadKg)} kg`} | ${c.runContext ? `${c.runContext}, allure ${c.pace ?? ''}` : '—'} |`),
    '',
  );
  const d = demandOf(run);
  lines.push(`**Profil de demande CORE** : ${d?.ok ? Object.entries(d.profile.levels).map(([s, l]) => `${s}=${l}`).join(', ') : 'non dérivé'}`, '');
  lines.push('**Décisions**', '');
  for (const code of [HR_CODES.H2_STRUCTURE_CHOSEN, HR_CODES.H2_STRUCTURE_REJECTED, HR_CODES.H2_STATION_SELECTED, HR_CODES.H2_CANDIDATES_REJECTED, HR_CODES.H2_RUN_COMPONENT, HR_CODES.H2_ACCUMULATION, HR_CODES.H2_HISTORY, HR_CODES.H2_HISTORY_NEGATIVE, HR_CODES.H2_NEIGHBOURS, HR_CODES.H2_GOAL_TRANSPORTED]) {
    for (const r of reasonsOf(run, code)) lines.push(`- \`${code.split('.').pop() ?? code}\` — ${fmt(r)}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function writeReport(path: string, title: string, sections: readonly string[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, [`# ${title}`, '', '> Gouvernance TEST_ONLY (draft, provisoire) : aucune valeur n’est une décision, une norme de compétition ni l’ordre officiel de l’épreuve.', '', ...sections].join('\n'));
}
