/**
 * Documents du ruleset scientifique V1 GÉNÉRÉS depuis les données (registre, ruleset candidat, goldens) :
 * ils ne peuvent pas diverger du code. Le test échoue si un document n'est plus à jour ou si une
 * différence de séance reste sans attribution (4E §J : « aucun changement sportif inexpliqué »).
 */
import { describe, expect, it } from 'vitest';
import type { ParameterMetadata } from '@hybridsport/domain';
import {
  assessMeasured, assessNeighborStructure, DECLARED_STRENGTH_PARAMETERS, INTERFERENCE_LEVELS, readStrengthParams, SCIENCE_REGISTRY, scientificGate, scientificLock,
} from '../../src/index.js';
import type { MeasuredObservation } from '../../src/index.js';
import { GOLDENS } from '../fixtures/goldens.js';
import { goldenRecord } from '../fixtures/golden-record.js';
import { NOW } from '../fixtures/harness.js';
import { CANDIDATE_RULESET, candidateScenario, LOCK_RULESET, lockScenario } from '../fixtures/science.js';
import { ATTRIBUTIONS, attribute, CAUSES, compareScenario, CORRECTIONS_4F, threeWay } from '../fixtures/science-diff.js';
import type { ScenarioComparison, ThreeWayRow } from '../fixtures/science-diff.js';
import { STRENGTH_TEST_VALUES } from '../fixtures/ruleset.js';

const DOCS = '../../../../docs/engine-impl';
const P = readStrengthParams(LOCK_RULESET).values;
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const value = (v: unknown): string => {
  if (v === undefined) return '*absent (sémantique 0.2.0)*';
  const j = JSON.stringify(v);
  // technical-constant: longueur maximale affichée d'une valeur (lisibilité du document)
  return j.length <= 220 ? `\`${j}\`` : `table (${String(j.length)} caractères), voir \`packages/strength/tests/fixtures/ruleset.ts\``;
};
const STATUS_TEXT: Record<string, string> = {
  SUPPORTED: 'soutenu par des synthèses vérifiées ET valeur non provisoire',
  SUPPORTED_WITH_RANGE: 'valeur dans une plage soutenue par une synthèse confirmée',
  CONTEXT_DEPENDENT: 'soutenu selon le contexte (population, modalité, objectif)',
  PROGRAMMING_HEURISTIC: 'heuristique de programmation (aucune valeur démontrée)',
  PRODUCT_GUARDRAIL: 'garde-fou produit',
  EXPERT_DESIGN_REVIEW: 'choix de conception soumis à revue d’expert',
  SAFETY_SIGNOFF_REQUIRED: 'visa de sécurité requis (G1)',
  INSUFFICIENT_EVIDENCE: 'preuve insuffisante',
  TECHNICAL: 'paramètre technique',
};

function registryDoc(): string {
  const r = SCIENCE_REGISTRY;
  const g = scientificGate(r, DECLARED_STRENGTH_PARAMETERS);
  const citing = (sid: string) => ({
    principles: r.principles.filter((p) => p.sourceIds.includes(sid)).map((p) => p.id),
    params: r.parameters.filter((p) => p.sourceIds.includes(sid)).map((p) => p.parameterId),
  });
  const claims = new Map<string, { statement: string; status: string; sources: readonly string[]; params: string[]; vd: boolean }>();
  for (const p of r.parameters) for (const c of p.claims) {
    const cur = claims.get(c.id) ?? { statement: c.statement, status: c.status, sources: c.sourceIds, params: [], vd: c.valueDetermining };
    cur.params.push(p.parameterId);
    claims.set(c.id, cur);
  }
  const lines = [
    '# STRENGTH-SCIENCE-REGISTRY-V1 — registre scientifique du StrengthEngine',
    '',
    `> Document **généré** depuis \`packages/strength/src/science/\` par \`tests/golden/science-docs.test.ts\` : ne pas éditer à la main.`,
    '',
    `- Version du registre : **${r.version}** · ruleset : **${r.rulesetVersion}**`,
    `- Gate STRENGTH_SCIENTIFIC_V1_GATE calculé : **${g.gate}** ; verrou STRENGTH_SCIENTIFIC_LOCK_V1 : **${scientificLock(r, DECLARED_STRENGTH_PARAMETERS).lock}** (anomalies : ${String(g.issues.length)} ; blocages PRODUCTION : ${String(g.readiness.blockers.length)})`,
    '- Vérification des sources (2026-09-27, complétée le 2026-09-28) : **identité** par recherche web (PMID, titre, auteurs, revue, DOI).',
    '- **Niveaux de vérification du contenu** : `IDENTITY_ONLY` (aucun résultat extrait) < `SEARCH_SUMMARY` (résultats connus par des résumés de moteur de recherche, y compris secondaires) < `ABSTRACT_VERIFIED` (résumé officiel lu) < `FULL_TEXT_VERIFIED`.',
    '  - PubMed, E-utilities, Europe PMC et les sites des éditeurs restent bloqués par la politique réseau de l’environnement d’exécution (vérifié à nouveau en 4F) : **aucun résumé officiel ni texte intégral n’a été lu**, aucune source ne dépasse `SEARCH_SUMMARY`.',
    '  - Aucune précision absente des résumés consultés n’a été ajoutée ; chaque source porte la liste des points à confirmer lors de la revue humaine (§6).',
    `- Répartition : ${['IDENTITY_ONLY', 'SEARCH_SUMMARY', 'ABSTRACT_VERIFIED', 'FULL_TEXT_VERIFIED'].map((l) => `${l} ${String(r.sources.filter((x) => x.verificationLevel === l).length)}`).join(' · ')}`,
    '',
    '## 1. Statuts scientifiques',
    '',
    '| Statut | Sens |',
    '|---|---|',
    ...Object.entries(STATUS_TEXT).map(([k, v]) => `| \`${k}\` | ${v} |`),
    '',
    'Règle de non-fausse précision (contrôlée par `validateScienceRegistry`) : le statut d’un paramètre n’est jamais plus fort que la plus faible des revendications qui déterminent sa **valeur** ; un mécanisme soutenu ne rend pas la valeur soutenue.',
    '',
    '## 2. Sources → principes → paramètres',
    '',
    '| Source | PMID | Type | Identité | Contenu | Principes | Paramètres |',
    '|---|---|---|---|---|---|---|',
    ...r.sources.map((s) => { const c = citing(s.id); return `| \`${s.id}\` | ${s.pmid} | ${s.evidenceType} | ${s.identityVerification} | ${s.verificationLevel} | ${c.principles.join(', ') || '—'} | ${c.params.map((x) => `\`${x}\``).join(', ') || '—'} |`; }),
    '',
    ...r.sources.flatMap((s) => [
      `### ${s.id} (PMID ${s.pmid}, ${s.year})`,
      '',
      `- Référence : ${s.citation}${s.doi ? ` DOI ${s.doi}.` : ''}`,
      `- Population : ${s.population}`,
      `- Critères : ${s.outcomes.join(', ')}`,
      `- Résultats rapportés : ${s.findings.length > 0 ? s.findings.join(' ') : '*aucun (contenu inconnu)*'}`,
      `- Vérification : identité ${s.identityVerification}, contenu ${s.verificationLevel} (${s.verifiedOn})`,
      `- Limites : ${s.limitations}`,
      '',
    ]),
    '## 3. Principes de programmation 1–13',
    '',
    ...r.principles.flatMap((p) => [
      `### ${p.id} — ${p.title} (\`${p.status}\`)`,
      '',
      `- Énoncé : ${p.statement}`,
      `- Sources : ${p.sourceIds.map((x) => `\`${x}\``).join(', ') || 'aucune'}`,
      `- Paramètres : ${p.parameterIds.map((x) => `\`${x}\``).join(', ')}`,
      `- Comportement du moteur : ${p.engineBehaviour}`,
      `- Non revendiqué : ${p.notClaimed}`,
      '',
    ]),
    '## 4. Revendications (claims)',
    '',
    '| Revendication | Énoncé | Statut | Détermine la valeur | Sources | Paramètres |',
    '|---|---|---|---|---|---|',
    ...[...claims].sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, c]) => `| \`${id}\` | ${cell(c.statement)} | ${c.status} | ${c.vd ? 'oui' : 'non'} | ${c.sources.join(', ') || '—'} | ${c.params.map((x) => `\`${x}\``).join(', ')} |`),
    '',
    '## 5. Mécanisme soutenu, ampleur heuristique',
    '',
    '| Paramètre | Statut affiché | Mécanisme | Ampleur | Lecture |',
    '|---|---|---|---|---|',
    ...r.parameters.filter((p) => p.evidenceSplit).map((p) => `| \`${p.parameterId}\` | ${p.status} | ${p.evidenceSplit?.mechanism ?? ''} | ${p.evidenceSplit?.magnitude ?? ''} | ${cell(p.evidenceSplit?.note ?? '')} |`),
    '',
    '## 6. Revue humaine à préparer (par source)',
    '',
    ...r.sources.flatMap((s) => [`- \`${s.id}\` (${s.verificationLevel}) : ${s.pendingHumanReview.join(' ; ')}`]),
    '',
    '## 7. Blocages PRODUCTION',
    '',
    '| Code | Objet | Détail |',
    '|---|---|---|',
    ...g.readiness.blockers.map((b) => `| ${b.code} | \`${b.subject}\` | ${cell(b.detail)} |`),
    '',
  ];
  return lines.join('\n');
}

function rulesetDoc(): string {
  const r = SCIENCE_REGISTRY;
  const meta = (id: string): ParameterMetadata | undefined => LOCK_RULESET.parameter(id);
  const meta4e = (id: string): ParameterMetadata | undefined => CANDIDATE_RULESET.parameter(id);
  const byStatus = new Map<string, number>();
  for (const p of r.parameters) byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
  const byChange = new Map<string, number>();
  for (const p of r.parameters) byChange.set(p.change, (byChange.get(p.change) ?? 0) + 1);
  const lines = [
    '# STRENGTH-SCIENTIFIC-RULESET-V1 — ruleset scientifique V1 (verrou provisoire, phase 4F)',
    '',
    '> Document **généré** depuis le registre scientifique et le ruleset 4F : ne pas éditer à la main.',
    '',
    `- Ruleset : **${r.rulesetVersion}** (étend \`0.2.0-strength-test\` sans en modifier aucune valeur ; succède au candidat 4E \`0.3.0-strength-science-candidate\`, qui reste reproductible) · registre **${r.version}**`,
    '- Verrou STRENGTH_SCIENTIFIC_LOCK_V1 : chaque paramètre a UNE catégorie principale (colonne « Statut ») ; aucune valeur numérique n’est `SUPPORTED` parce qu’un mécanisme général l’est.',
    `- ${String(r.parameters.length)} paramètres : ${[...byStatus].sort().map(([k, v]) => `${k} ${String(v)}`).join(' · ')}`,
    `- Changements : ${[...byChange].sort().map(([k, v]) => `${k} ${String(v)}`).join(' · ')} (\`unchanged\` = valeur et statut conservés ; \`reclassified\` = valeur conservée, statut précisé ; \`new_policy\` = paramètre facultatif introduit, absent en 0.2.0)`,
    '- **Aucune valeur existante n’est modifiée.** Les 7 écarts validés en phase 4C sont conservés. Toutes les valeurs restent **provisoires** : aucune validation formelle.',
    '- Absence d’un paramètre facultatif = **sémantique du ruleset 0.2.0** (comportement historique reproduit à l’identique, testé), jamais une valeur par défaut sportive.',
    '',
    '| Paramètre | Gouvernance | Statut | Changement | Sources |',
    '|---|---|---|---|---|',
    ...r.parameters.map((p) => `| \`${p.parameterId}\` | ${p.governance} | ${p.status}${p.alsoClassifiedAs.length > 0 ? ` (+ ${p.alsoClassifiedAs.join(', ')})` : ''} | ${p.change} | ${p.sourceIds.length} |`),
    '',
    ...r.parameters.flatMap((p) => {
      const old = (STRENGTH_TEST_VALUES as Record<string, unknown>)[p.parameterId];
      const m = meta(p.parameterId);
      return [
        `## \`${p.parameterId}\``,
        '',
        `| Champ | Valeur |`,
        '|---|---|',
        `| Ancienne valeur (0.2.0) | ${value(old)} |`,
        `| Valeur 4E (0.3.0) | ${value(meta4e(p.parameterId)?.value)} |`,
        `| Valeur 4F (0.4.0) | ${value(m?.value)} |`,
        ...(p.evidenceSplit ? [`| Mécanisme / ampleur | ${p.evidenceSplit.mechanism} / ${p.evidenceSplit.magnitude} — ${cell(p.evidenceSplit.note)} |`] : []),
        `| Lecture | ${cell(p.valueNote)} |`,
        `| Statut | \`${p.status}\`${p.alsoClassifiedAs.length > 0 ? ` + ${p.alsoClassifiedAs.map((x) => `\`${x}\``).join(', ')}` : ''} — ${STATUS_TEXT[p.status] ?? ''} |`,
        `| Gouvernance | ${p.governance} · visa expert ${p.expertSignoffRequired ? 'requis' : 'non requis'} · visa sécurité ${p.safetySignoffRequired ? 'requis' : 'non requis'} · provisoire ${p.provisional ? 'oui' : 'non'} |`,
        `| Sources | ${p.sourceIds.map((x) => `\`${x}\``).join(', ') || 'aucune'} (type le plus fort : ${p.evidenceType}) |`,
        `| Population | ${cell(p.population)} |`,
        `| Critère | ${cell(p.outcome)} |`,
        `| Confiance | ${p.confidence} |`,
        `| Incertitude | ${cell(p.uncertainty)} |`,
        `| Justification | ${cell(p.rationale)} |`,
        `| Si la preuve reste insuffisante | ${cell(p.insufficientEvidenceBehaviour)} |`,
        `| Revendications | ${p.claims.map((c) => `\`${c.id}\` ${c.status}${c.valueDetermining ? ' (valeur)' : ' (principe)'}`).join(' ; ') || '—'} |`,
        `| Version du paramètre | ${m?.version ?? '—'} · revue ${p.reviewDate} |`,
        '',
      ];
    }),
  ];
  return lines.join('\n');
}

function diffDoc(comparisons: readonly ScenarioComparison[]): string {
  const minutes = (s: number) => String(Math.round(s / 60));
  const lines = [
    '# STRENGTH-4E-BASELINE-DIFF — goldens S1–S7 : ruleset 0.2.0 (BASE) → ruleset scientifique V1 (CANDIDAT)',
    '',
    '> Document **généré** : chaque différence est calculée depuis les séances enregistrées, et chacune est attribuée (test « aucun changement sportif inexpliqué »). Ne pas éditer à la main.',
    '',
    '- BASE : `0.2.0-strength-test`, goldens `packages/strength/tests/golden/__goldens__/` (inchangés).',
    '- CANDIDAT : `0.3.0-strength-science-candidate`, goldens `packages/strength/tests/golden/__goldens_v1__/`.',
    `- Causes admises : ${Object.entries(CAUSES).map(([k, v]) => `\`${k}\` = ${v}`).join(' ; ')}.`,
    '- **Aucune différence n’est attribuée à une preuve directe** : les sources soutiennent des mécanismes, jamais les valeurs exactes. Les changements de séance viennent de politiques prudentes, de reclassements d’heuristiques et de politiques produit, toutes versionnées.',
    '',
    '## Synthèse',
    '',
    '| Séance | p50 avant → après | p90 avant → après | Différences | Par cause |',
    '|---|---|---|---|---|',
    ...comparisons.map((c) => {
      const byCause = new Map<string, number>();
      for (const e of c.entries) { const a = attribute(e); byCause.set(a?.cause ?? 'NON ATTRIBUÉE', (byCause.get(a?.cause ?? 'NON ATTRIBUÉE') ?? 0) + 1); }
      return `| ${c.scenario} | ${minutes(c.before.p50)} → ${minutes(c.after.p50)} min | ${minutes(c.before.p90)} → ${minutes(c.after.p90)} min | ${String(c.entries.length)} | ${[...byCause].sort().map(([k, v]) => `${k} ${String(v)}`).join(' · ')} |`;
    }),
    '',
  ];
  for (const c of comparisons) {
    const g = GOLDENS[c.scenario];
    if (!g) continue;
    lines.push(`## ${c.scenario} — ${g.title}`, '');
    const groups = new Map<number, typeof c.entries[number][]>();
    for (const e of c.entries) { const i = ATTRIBUTIONS.findIndex((a) => a === attribute(e)); groups.set(i, [...(groups.get(i) ?? []), e]); }
    for (const [i, es] of [...groups].sort(([a], [b]) => a - b)) {
      const a = ATTRIBUTIONS[i];
      lines.push(`**${a ? CAUSES[a.cause] : 'NON ATTRIBUÉE'}** — ${a?.why ?? ''}`, '', '| Élément | Objet | Avant | Après |', '|---|---|---|---|');
      for (const e of es) lines.push(`| ${e.kind} | ${cell(e.subject)} | ${cell(e.before)} | ${cell(e.after)} |`);
      lines.push('');
    }
    if (c.confidence.length > 0) lines.push('PrescriptionConfidence (candidat) :', '', ...c.confidence.map((x) => `- ${x}`), '');
    if (c.interference.length > 0) lines.push('InterferenceAssessment (candidat) :', '', ...c.interference.map((x) => `- ${x}`), '');
    lines.push('<details><summary>Séance avant / après (rendu lisible)</summary>', '', '```text', goldenRecord(g.title, g.scenario).text.trimEnd(), '```', '', '```text', goldenRecord(g.title, candidateScenario(g.scenario)).text.trimEnd(), '```', '', '</details>', '');
  }
  return lines.join('\n');
}

function diff4fDoc(all: readonly { k: string; rows: ThreeWayRow[] }[]): string {
  const count = (rows: readonly ThreeWayRow[], c: string) => rows.filter((r) => r.classification === c).length;
  const lines = [
    '# STRENGTH-4F-BASELINE-DIFF — goldens S1–S7 : 0.2.0 → 4E → 4F',
    '',
    '> Document **généré** (tests/golden/science-docs.test.ts) : chaque différence est calculée depuis les séances enregistrées et classée. Ne pas éditer à la main.',
    '',
    '- 0.2.0 : `0.2.0-strength-test` (`__goldens__/`) · 4E : `0.3.0-strength-science-candidate` (`__goldens_v1__/`, PHASE_4E_BASELINE) · 4F : `0.4.0-strength-science-lock` (`__goldens_4f__/`).',
    '- Classes : `UNCHANGED` (identique dans les trois versions, non listé) ; `4E_CHANGE_RETAINED` (changement 4E conservé) ; `4F_CORRECTION` (changement 4F attribué à une correction) ; `UNEXPECTED` (changement 4F sans attribution : bloque le gate).',
    '- Éléments comparés : exercices, ordre, séries, reps, charge, RIR, repos, montée, échauffement, retour au calme, durée, volume par groupe, ancres, confiance, interférence, reason codes.',
    '',
    '## Synthèse',
    '',
    '| Séance | 4E_CHANGE_RETAINED | 4F_CORRECTION | UNEXPECTED |',
    '|---|---|---|---|',
    ...all.map(({ k, rows }) => `| ${k} | ${String(count(rows, '4E_CHANGE_RETAINED'))} | ${String(count(rows, '4F_CORRECTION'))} | ${String(count(rows, 'UNEXPECTED'))} |`),
    `| **Total** | ${String(all.reduce((a, x) => a + count(x.rows, '4E_CHANGE_RETAINED'), 0))} | ${String(all.reduce((a, x) => a + count(x.rows, '4F_CORRECTION'), 0))} | **${String(all.reduce((a, x) => a + count(x.rows, 'UNEXPECTED'), 0))}** |`,
    '',
    '## Corrections 4F attribuées',
    '',
    ...CORRECTIONS_4F.map((c) => `- **${c.correction}** (${c.scenario}) — ${c.why}`),
    '',
  ];
  for (const { k, rows } of all) {
    const g = GOLDENS[k];
    if (!g) continue;
    lines.push(`## ${k} — ${g.title}`, '');
    for (const cls of ['4F_CORRECTION', 'UNEXPECTED', '4E_CHANGE_RETAINED'] as const) {
      const rs = rows.filter((r) => r.classification === cls);
      if (rs.length === 0) continue;
      lines.push(`**${cls}** (${String(rs.length)})`, '', '| Élément | Objet | 0.2.0 | 4E | 4F |', '|---|---|---|---|---|');
      for (const r of rs) lines.push(`| ${r.kind} | ${cell(r.subject)} | ${cell(r.v020)} | ${cell(r.v4e)} | ${cell(r.v4f)} |`);
      lines.push('');
    }
    if (rows.length === 0) lines.push('Aucune différence : UNCHANGED.', '');
    lines.push('<details><summary>Séance 4F (rendu lisible)</summary>', '', '```text', goldenRecord(g.title, lockScenario(g.scenario)).text.trimEnd(), '```', '', '</details>', '');
  }
  return lines.join('\n');
}

function interferenceDoc(): string {
  const a = P['strength.interference.assessment'];
  if (!a) throw new Error('assessment');
  const bands = [...a.proximityBands.map((b) => b.maxHours), a.searchWindowHours];
  const n = (h: number, d: 'low' | 'moderate' | 'high', pr: 'key' | 'standard' | 'optional', imp: boolean) => ({ discipline: 'running' as const, stimulus: 's', priority: pr, hoursFromThisSession: h, demand: { lower_knee: d, ...(imp ? { locomotor_impact: 'high' as const } : {}) } });
  const lines = [
    '# STRENGTH-INTERFERENCE-ASSESSMENT-V1 — matrice et frontières d’autorité',
    '',
    '> Document **généré** depuis `strength.interference.assessment` (ruleset candidat) et `assessNeighborStructure` : ne pas éditer à la main.',
    '',
    '## 1. Entrées',
    '',
    '| Entrée (4E §F) | Source dans le contexte | Rôle |',
    '|---|---|---|',
    '| `temporalProximity` | `week.neighbors[].hoursFromThisSession` (avant ou après, symétrique) | bandes de proximité |',
    '| `structuralOverlap` | structures sollicitées par les exercices proposés (table de dérivation du CORE, seuil `touchThreshold`) ou optionnels retirés | conditionne le signal au planificateur ; les ajustements ne touchent que les exercices qui sollicitent la structure |',
    '| `enduranceModality` | profil de demande transmis par le planificateur (`locomotor_impact` pour la course) | modificateur d’impact |',
    '| `sessionImportance` | `priority` (key / standard / optional) | delta d’importance |',
    '| `expectedFatigue` | niveau de demande par structure (none / low / moderate / high) | niveau de base |',
    '| `locomotorImpact` | demande `locomotor_impact` | +1 si haute ET demande de la structure déjà haute |',
    '| `gripDemand` | structure `grip` | évaluée comme toute structure (exclusion F9 si HIGH) |',
    '',
    '## 2. Calcul (ordinal, sans coefficient)',
    '',
    '`niveau = demande (low 1, moderate 2, high 3) + importance + bande de proximité + modificateurs d’impact`, borné à NONE (0)…VERY_HIGH (4).',
    '',
    `- Fenêtre de recherche : ${String(a.searchWindowHours)} h (au-delà, voisine ignorée). **36 h n’est plus une frontière binaire.**`,
    '- **Les bins temporels sont opérationnels, pas des frontières biologiques** : aucune source ne fixe une fenêtre en heures ; 12, 24, 48 et 72 h découpent la matrice V1 et restent des heuristiques révisables sans changer le niveau de preuve.',
    `- Bins : ${a.proximityBands.map((b) => `≤ ${String(b.maxHours)} h : ${b.delta >= 0 ? '+' : ''}${String(b.delta)}`).join(' · ')} · au-delà : ${String(a.beyondBandsDelta)}`,
    `- Importance : key ${String(a.importanceDelta.key)} · standard ${String(a.importanceDelta.standard)} · optional ${String(a.importanceDelta.optional)}`,
    `- Modificateurs : ${a.impactModifiers.map((m) => `demande \`${m.demand}\` ≥ ${m.atLeast} et structure ∈ {${m.structures.join(', ')}} à demande ≥ ${m.structureAtLeast} : ${m.delta >= 0 ? '+' : ''}${String(m.delta)}`).join(' ; ')}`,
    '- Le niveau retenu par structure est le plus élevé des voisines ; chaque couple (voisine, structure) est tracé (`PLAN.INTERFERENCE_ASSESSED`).',
    '',
    '## 3. Actions graduées',
    '',
    '| Niveau | Action | Effet |',
    '|---|---|---|',
    ...INTERFERENCE_LEVELS.map((l) => `| ${l} | \`${a.actions[l]}\` | ${({ none: 'aucun', trace: 'trace seulement', rir_only: 'RIR + `rirDelta` de la structure sur les exercices qui la sollicitent ; aucune série retirée, aucune exclusion, aucun optionnel retiré', full: 'ajustement complet de la structure (séries, RIR, exclusion F9, optionnels retirés) — règle historique', full_and_signal: 'ajustement complet + `PLAN.INTERFERENCE_SIGNAL` au planificateur si la séance recouvre la structure' } as Record<string, string>)[a.actions[l]] ?? ''} |`),
    '',
    'Les notes du planificateur (`plannerNotes`) et la semaine inconnue gardent leur effet historique (abaissement complet).',
    '',
    '## 4. Matrice (structure `lower_knee`, sans puis avec impact locomoteur haut)',
    '',
    `| Demande | Importance | ${bands.map((b) => `≤ ${String(b)} h`).join(' | ')} |`,
    `|---|---|${bands.map(() => '---').join('|')}|`,
    ...(['high', 'moderate', 'low'] as const).flatMap((d) => (['key', 'standard', 'optional'] as const).map((pr) => `| ${d} | ${pr} | ${bands.map((h) => `${assessNeighborStructure(n(h, d, pr, false), 'lower_knee', a)} / ${assessNeighborStructure(n(h, d, pr, true), 'lower_knee', a)}`).join(' | ')} |`)),
    '',
    '## 5. Frontières d’autorité',
    '',
    '- Le StrengthEngine **consomme** le contexte hebdomadaire ; il ne déplace, ne supprime ni ne reprogramme **jamais** une séance, et ne change jamais le stimulus demandé.',
    '- VERY_HIGH ⇒ **signal structuré** (`PLAN.INTERFERENCE_SIGNAL {structure, level, source, overlap}`) dans la proposition : le planificateur global reste seul décideur.',
    '- Si l’objet de l’archétype devient impossible, le moteur répond `no_valid_proposal` (`PLAN.CONTEXT_INCOMPATIBLE`), comme en 0.2.0.',
    '- Statut : `PROGRAMMING_HEURISTIC` — mécanismes soutenus selon le contexte (Wilson 2012 ; Lundberg 2022), bins et deltas heuristiques.',
    '',
    '## 6. Mécanisme soutenu, ampleur heuristique (phase 4F)',
    '',
    '| Élément | Statut |',
    '|---|---|',
    '| Existence et dépendance au contexte de l’interférence (modalité, fréquence, durée ; course > vélo pour l’hypertrophie des fibres) | `CONTEXT_DEPENDENT` (mécanisme) |',
    '| Bins 12/24/48/72 h, deltas ordinaux, correspondance niveau → action | `PROGRAMMING_HEURISTIC` (ampleur) |',
    '| MODERATE ⇒ RIR + 2 (`rirDelta` de la structure) | `PROGRAMMING_HEURISTIC` (ampleur), jamais présenté comme démontré |',
    '',
    `Trace : avec \`traceEvidenceBasis\` (${a.traceEvidenceBasis === true ? 'activé dans le ruleset 4F' : 'désactivé'}), chaque structure évaluée avec une action reçoit \`PLAN.INTERFERENCE_BASIS {structure, level, action, mechanism, magnitude}\`. Le mécanisme et l’ampleur sont lus dans le registre scientifique (\`evidenceSplit\`), **jamais dans la matrice** : modifier un bin ne peut pas modifier le niveau de preuve affiché (test F7).`,
    '',
  ];
  return lines.join('\n');
}

function confidenceDoc(): string {
  const rules = P['strength.prescriptionConfidence'];
  if (!rules) throw new Error('rules');
  const w = P['strength.load'].referenceWindowsDays;
  const at = (d: number) => new Date(Date.parse(NOW) - d * 86400000).toISOString().replace('.000', '');
  const o = (v: number, d: number, r = true): MeasuredObservation => ({ value: v, at: at(d), withRir: r });
  const cases: [string, MeasuredObservation[], 'intermediate' | 'beginner', boolean][] = [
    ['2 séances, 4 séries avec RIR, fraîches, cohérentes', [o(100, 2), o(101, 2), o(100, 5), o(102, 5)], 'intermediate', false],
    ['1 séance, 4 séries', [o(100, 2), o(101, 2), o(100, 2), o(100, 2)], 'intermediate', false],
    ['2 séances, 2 séries', [o(100, 2), o(100, 5)], 'intermediate', false],
    ['2 séances, 4 séries, un RIR absent', [o(100, 2), o(101, 2), o(100, 5), o(100, 5, false)], 'intermediate', false],
    ['2 séances, 4 séries, niveau débutant', [o(100, 2), o(101, 2), o(100, 5), o(102, 5)], 'beginner', false],
    ['2 séances, 4 séries, estimations dispersées (> tolérance)', [o(100, 2), o(100, 2), o(125, 5), o(126, 5)], 'intermediate', false],
    ['2 séances, 4 séries, conflit avec une capacité déclarée', [o(100, 2), o(101, 2), o(100, 5), o(102, 5)], 'intermediate', true],
    [`dernière séance à 60 jours`, [o(100, 60), o(101, 60), o(100, 63), o(102, 63)], 'intermediate', false],
    [`dernière séance à 200 jours`, [o(100, 200), o(101, 200), o(100, 203), o(102, 203)], 'intermediate', false],
  ];
  const lines = [
    '# STRENGTH-PRESCRIPTION-CONFIDENCE-V1 — algorithme ordinal',
    '',
    '> Document **généré** depuis `strength.prescriptionConfidence` (ruleset candidat) et `assessMeasured` : ne pas éditer à la main.',
    '',
    `Règles \`${rules.rulesVersion}\` (G2, \`PROGRAMMING_HEURISTIC\`) : **aucun coefficient, aucune somme pondérée** — des facteurs qualitatifs tracés (\`DOSE.LOAD.CONFIDENCE\`) combinés par des règles ordonnées.`,
    '',
    '## 1. Facteurs',
    '',
    '| Facteur (4E §E) | Définition | Paramètre |',
    '|---|---|---|',
    `| récence | fraîche ≤ ${String(w.high)} j · vieillissante ≤ ${String(w.medium)} j · ancienne ≤ ${String(w.low)} j · expirée au-delà | \`strength.load.referenceWindowsDays\` (existant) |`,
    '| spécificité | données de CET exercice (mesurées) > capacité déclarée > transfert d’un équivalent | hiérarchie de référence |',
    `| observations utilisables | séries valides pour l’estimation, dans la fenêtre vieillissante | \`high.minObservations\` = ${String(rules.high.minObservations)} |`,
    `| séances distinctes | nombre de dates d’exposition | \`high.minSessions\` = ${String(rules.high.minSessions)} |`,
    `| cohérence | dispersion (max − min) / médiane des estimations ≤ tolérance | \`strength.load.conflictTolerance\` (existant) = ${String(P['strength.load'].conflictTolerance)} |`,
    `| incertitude du RIR | RIR absent sur une série, ou niveau ∈ {${rules.rirUncertainLevels.join(', ')}} | \`rirUncertainLevels\` |`,
    '| cohérence charge / reps | estimation hors plage valide ⇒ borne inférieure seule (LOW) | `strength.load.validRepRange` (existant) |',
    `| pénalité de transfert | ${String(P['strength.load'].equivalenceTransferPenalty)} cran(s), jamais HIGH | \`strength.load.equivalenceTransferPenalty\` (existant) |`,
    '| conflit | écart avec une capacité déclarée au-delà de la tolérance ⇒ un cran de moins | `strength.load.conflictTolerance` |',
    `| capacité déclarée | jamais au-dessus de ${rules.declaredCap.toUpperCase()} | \`declaredCap\` |`,
    '',
    '## 2. Règles (dans l’ordre)',
    '',
    '1. Récence expirée ⇒ `none` (calibration prudente).',
    `2. **HIGH** seulement si **toutes** les conditions : ≥ ${String(rules.high.minSessions)} séances ET ≥ ${String(rules.high.minObservations)} observations, données fraîches, cohérentes, RIR fiable, aucune donnée transférée.`,
    '3. Sinon **MEDIUM** si les données sont fraîches ou vieillissantes ; sinon **LOW**.',
    '4. Conflit avec une capacité déclarée ⇒ un cran de moins.',
    '5. Capacité déclarée : niveau de sa source, dégradé par l’âge, plafonné, puis conflit.',
    '6. Transfert : pénalité de transfert, plafonné à MEDIUM.',
    '',
    'Effet : HIGH ⇒ charge prescrite (ou % d’e1RM) ; MEDIUM ⇒ charge **suggérée** + effort, montée spécifique en relatif ; LOW ⇒ effort + fourchette indicative ; none ⇒ calibration à l’effort.',
    '',
    '## 3. Hiérarchie de référence de charge',
    '',
    '1. Données spécifiques récentes fiables : série à ± `repsTolerance` répétition(s) et ± `rirTolerance` RIR de la cible, RIR connu, fenêtre fraîche (`strength.load.specificObservation`) ;',
    '2. historique de l’exercice (dernière charge réalisée, e1RM lissé de la track quand le modèle autorégulé la porte) ;',
    '3. modèle personnel (`PersonalLoadModel` : **contrat seulement**, non implémenté, aucune ML) ;',
    '4. e1RM générique (formule d’Epley, table `pctByRepsToFailure`) : **repli d’amorçage**, jamais au-dessus d’une donnée spécifique fiable ;',
    '5. calibration prudente (`strength.calibration`).',
    '',
    '## 4. Exemples calculés',
    '',
    '| Cas | Niveau | Facteurs |',
    '|---|---|---|',
    ...cases.map(([label, obs, level, conflict]) => { const r = assessMeasured(obs, { now: NOW, level, conflict }, P, rules); const f = r.factors; return `| ${label} | **${r.level.toUpperCase()}** | récence ${f.recency} · ${String(f.observations)} obs · ${String(f.sessions)} séance(s) · ${f.consistency} · RIR ${f.rir}${f.conflict ? ' · conflit' : ''} |`; }),
    '',
    '## 5. Limites',
    '',
    '- Les seuils de séances et d’observations sont des heuristiques ; la dégradation par l’éloignement de l’échec (RIR élevé) n’est **pas** modélisée faute de source lue.',
    '- `strength.calibration.mediumAfterExposures` / `highAfterExposures` ne sont lus par aucun code (dette du ruleset 0.2.0) ; la V1 les remplace sans les modifier.',
    '',
  ];
  return lines.join('\n');
}

describe('documents du ruleset scientifique V1 (générés)', () => {
  const comparisons = Object.entries(GOLDENS).map(([k, g]) => compareScenario(k, g.scenario, candidateScenario(g.scenario)));

  it('aucun changement sportif inexpliqué : chaque différence S1–S7 a une attribution, chaque attribution sert', () => {
    const entries = comparisons.flatMap((c) => c.entries);
    expect(entries.filter((e) => !attribute(e)).map((e) => `${e.scenario}|${e.kind}|${e.subject}`)).toEqual([]);
    const used = new Set(entries.map((e) => attribute(e)));
    expect(ATTRIBUTIONS.filter((a) => !used.has(a)).map((a) => `${a.scenario}|${a.kind}|${String(a.subject)}`)).toEqual([]);
    // Aucune différence de séance n'est attribuée à une « preuve » directe (les preuves soutiennent des mécanismes).
    expect(entries.filter((e) => attribute(e)?.cause === 'evidence')).toEqual([]);
  });

  const threeWays = Object.entries(GOLDENS).map(([k, g]) => ({ k, rows: threeWay(k, g.scenario, candidateScenario(g.scenario), lockScenario(g.scenario)).rows }));

  it('4F : aucune différence 4E → 4F inattendue (UNEXPECTED = 0), chaque correction attribuée sert', () => {
    const rows = threeWays.flatMap((x) => x.rows);
    expect(rows.filter((r) => r.classification === 'UNEXPECTED').map((r) => `${r.scenario}|${r.kind}|${r.subject}`)).toEqual([]);
    for (const c of CORRECTIONS_4F) expect(rows.some((r) => r.classification === '4F_CORRECTION' && r.why.startsWith(c.correction)), c.correction).toBe(true);
  });

  it('documents à jour', async () => {
    await expect(diff4fDoc(threeWays)).toMatchFileSnapshot(`${DOCS}/STRENGTH-4F-BASELINE-DIFF.md`);
    await expect(registryDoc()).toMatchFileSnapshot(`${DOCS}/STRENGTH-SCIENCE-REGISTRY-V1.md`);
    await expect(rulesetDoc()).toMatchFileSnapshot(`${DOCS}/STRENGTH-SCIENTIFIC-RULESET-V1.md`);
    await expect(diffDoc(comparisons)).toMatchFileSnapshot(`${DOCS}/STRENGTH-4E-BASELINE-DIFF.md`);
    await expect(interferenceDoc()).toMatchFileSnapshot(`${DOCS}/STRENGTH-INTERFERENCE-ASSESSMENT-V1.md`);
    await expect(confidenceDoc()).toMatchFileSnapshot(`${DOCS}/STRENGTH-PRESCRIPTION-CONFIDENCE-V1.md`);
  });
});
