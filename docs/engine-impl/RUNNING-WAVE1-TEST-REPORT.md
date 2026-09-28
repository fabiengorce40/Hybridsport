# RunningEngine vague 1 — rapport de tests, de mutation et de gates (phase 6B)

## 1. Suites

| Contrôle | Résultat |
|---|---|
| Base (début 6B) | 696 tests verts ; HEAD `fc665bb` ; CORE-EXT-R1 vérifiée sur les artefacts (`CURRENT_SCHEMA.session_record.version = 4`, `run_structure` présent) |
| `pnpm test` | **827 / 827** verts (+131 tests Running) |
| `pnpm typecheck`, `pnpm lint` | verts (le paquet Running est soumis aux mêmes règles de frontière que le CORE : horloge, hasard, réseau) |
| Architecture | verte : CORE (dont F20 : empreinte inchangée), Strength, Running |

### Tests Running

| Fichier | Tests | Contenu |
|---|---|---|
| `unit/governance.test.ts` | 15 | Registre, absence de valeurs, résolution par mode, transitions de maturité, G1, V33 / V34 |
| `unit/capabilities.test.ts` | 9 | Capacités, éligibilité à la production, déterminisme (propriété) |
| `unit/references.test.ts` | 15 | Références, ReferenceConfidence, sélection, conflits, départage (propriété) |
| `unit/references-hardening.test.ts` | 11 | Exigences par type, confiance avant date, prudence, frontières |
| `unit/analysis.test.ts` | 15 | Éligibilité ≠ précision, dégradations, V33 / V34, marathon, premières expositions, trace, déterminisme (propriété) |
| `unit/hardening.test.ts` | 21 | Dépendances exactes, dose G1 signée, fail-closed, trace, dégradations (propriété) |
| `unit/load-variability-model.test.ts` | 22 | RecentLoadContext, variabilité, interface de modèle |
| `integration/engine.test.ts` | 14 | SportEngine par le pipeline réel du CORE, adversarial |
| `architecture/running-architecture.test.ts` | 9 | Frontières, valeurs magiques, contournements |

### Cas adversariaux couverts
- référence manquante, contradictoire, périmée, de faible confiance, datée dans le futur ;
- paramètre manquant ou malformé (V03, V12, V21, V42) ;
- G1 non signée ;
- P_R0 avec V33 non résolu ;
- reprise longue avec V34 non résolu ;
- marathon sans modèle éligible, même avec une gouvernance entièrement approuvée ;
- capacité demandée manuellement malgré une dépendance échouée ;
- transitions de maturité invalides ;
- valeur « 0 » glissée sans maturité (moteur refusé) ;
- dose proposée mais non signée (bloquée en PRODUCTION) ;
- population ou objectif inconnus ;
- contexte malformé ;
- archétype inconnu ;
- CORE-EXT-R1 absente (simulée).

## 2. Mutation testing (lots bornés, leçon de 6A)

**Configuration** (`stryker/running-wave1/*.json`, `vitest.mutation.running.config.ts`) :
- tas Node plafonné à 1 Go, un seul worker vitest, `timeout -k` ;
- 10 s par mutant, concurrence 3, 30 min maximum par lot ;
- tests Running seulement ;
- `reports/` et `docs/` exclus des bacs à sable ;
- **répertoire temporaire de vitest placé dans le bac à sable et supprimé après chaque exécution**.

### 2.1 Incidents d'exécution (traités)

| Incident | Cause | Parade |
|---|---|---|
| Lot 7 (6 fichiers) arrêté à 30 min | Lot trop gros | Découpé en 7a–7d |
| `ENOSPC` sur les lots 6 et 7a–7d | Allocation disque de la session épuisée : **/tmp contient ~30 Go de répertoires temporaires vitest** (`/tmp/-xxxx/ssr`, ~3–5 Mo chacun) laissés par les exécutions tuées des passages de mutation (6A et 6B) ; chaque bac à sable copiait aussi ~48 Mo de rapports | Rapports et ancien bac à sable propres au dépôt supprimés (ignorés par git, chiffres déjà consignés) ; `reports/` et `docs/` exclus ; `TMPDIR` de vitest dans le bac à sable, supprimé après chaque exécution. Espace libre stable ensuite. **Le nettoyage de /tmp relève de l'utilisateur** (non effectué) |

### 2.2 Résultats par lot (dernière exécution)

| Lot | Zone | Total | Tués | Survivants | Timeouts | Ignorés | Score | Durée |
|---|---|---|---|---|---|---|---|---|
| L1 | Éligibilité à la production | 85 | 81 | 4 | 0 | 0 | 95,29 % | 223 s |
| L2 | Dépendances des capacités | 226 | 223 | 3 | 0 | 0 | 98,67 % | 608 s |
| L3 | Paramètres non résolus et maturité | 347 | 340 | 7 | 0 | 0 | 97,98 % | 920 s |
| L4 | Verrous G1, population, périmètre | 148 | 144 | 4 | 0 | 0 | 97,30 % | 376 s |
| L5 | Éligibilité ≠ précision | 166 | 161 | 5 | 0 | 0 | 96,99 % | 428 s |
| L6 | Dégradation et trace | 162 | 146 | 16 | 0 | 0 | 90,12 % | 419 s |
| **Zones prioritaires** | | **1 134** | **1 095** | **39** | **0** | **0** | **96,56 %** | ≈ 50 min |

Annexe (hors zones prioritaires) : voir §2.4.

**Évolution** (première exécution → dernière) :

| Lot | Première exécution | Dernière exécution |
|---|---|---|
| L1 | 95,3 % | 95,3 % |
| L2 | 80,1 % | 98,7 % |
| L3 | 88,2 % | 98,0 % |
| L4 | 90,5 % | 97,3 % |
| L5 | 73,6 % | 97,0 % |
| L6 | 59,3 % | 90,1 % |

### 2.3 Survivants pertinents : corrigés

| Lot | Mutant | Comportement révélé | Action |
|---|---|---|---|
| L5 | `precision.ts:81`, `analysis.ts:210` | **Défaut réel** : une séance ciblée à l'effort par nature (lignes droites, test) sans montre produisait une dégradation « précision réduite », alors qu'aucune allure n'y était prévue | Implémentation corrigée + test |
| L2 | Listes de décisions et de paramètres par capacité vidées | Les dépendances de chaque capacité n'étaient pas toutes éprouvées individuellement | Test : chaque décision et chaque paramètre propres bloquent seuls ; listes exactes = graphe 5G |
| L2 | Dépendance technique, dérogation, bloqueurs | Capacité avec dépendance technique satisfaite ; activation sans dérogation ; verrou dans les bloqueurs | Tests |
| L3 | `G1_DOSE` dans le contrôle SAFETY | Une dose G1 légitimement signée (V33) aurait été jugée incohérente | Test du chemin complet proposé → expert → sécurité |
| L3 | Ancres des identifiants, approbations par rôle, défaut `rulesetLocked` | Intégrité du registre ; fail-closed par défaut | Tests |
| L4 | `a === 'RACE_PACE'` → `true` | Sur-blocage : avec l'objectif « course générale », TOUTES les séances seraient refusées | Test : EASY et LONG restent éligibles |
| L5 | Raison de la dégradation de précision | La raison tracée pouvait être `CANDIDATE_VALUE_USED` au lieu de `PRESCRIPTION_PRECISION_REDUCED` | Test |
| L6 | Chemins non testés | Charge récente dans l'analyse, variabilité par objectif, cause du modèle selon la demande, libellés de trace | Tests |
| L7 (1ʳᵉ exécution) | Voir §2.4 | Exigences par type, confiance avant date, prudence puis récence, V21 malformé, fenêtre sur entrée non triée, frontière d'aberration, CV (test tautologique), E-VARIABILITY en PRODUCTION, rapport d'erreurs du contexte, déduplication des raisons | Tests |

### 2.4 Annexe (lot 7 découpé)

Première exécution, avant durcissement :

| Lot | Fichiers | Total | Score |
|---|---|---|---|
| 7a | `references.ts` | 485 | 63,7 % |
| 7b | `recent-load.ts` | 234 | 80,3 % |
| 7c | `variability.ts`, `performance-model.ts` | 189 | 55,0 % |
| 7d | `context.ts`, `engine.ts` | 143 | 78,3 % |

Résultats après durcissement : §2.6.

### 2.5 Survivants restants des zones prioritaires (39) : justifiés

| Catégorie | Mutants | Justification |
|---|---|---|
| Équivalents | L1 `capability === 'foundation'` (le socle déjà inclus est dédupliqué) ; L2 `'CANDIDATE'` → `''` (tout mode autre que PRODUCTION se comporte en CANDIDATE) ; L3 `opts.value === undefined` (la validation JSON refuse déjà `undefined`), `next === undefined`, défaut `{ rulesetLocked: false }` → `{}` (`undefined` est déjà faux) ; L5 repli `?? emit(...)` (reproduit une raison identique) ; L6 conditions toujours vraies en vague 1 (aucun modèle implémenté : branche `available` inatteignable), `goalDistance`, `priorKey`, `returnStartedAt` (décompositions équivalentes) ; comparateur de `sortDegradations` rendant 0 au lieu de 1 (V8 trie par insertion binaire sous 32 éléments et ne teste que `< 0` : ordre identique ; la propriété d'indépendance à l'ordre d'entrée est testée) | Aucune différence observable |
| Défensifs | Gardes `!found`, rôle `AUTHOR` de l'état UNRESOLVED (jamais une cible de transition) | Inatteignables pour une entrée validée |
| Diagnostic | Chaînes des paramètres de codes de raison (cause, séparateurs, libellés) non décisionnelles | Le code et la décision sont vérifiés |

**Survivants pertinents non expliqués : 0.**

### 2.6 Annexe après durcissement (dernière exécution)

| Lot | Fichiers | Total | Tués | Survivants | Timeouts | Score | Durée |
|---|---|---|---|---|---|---|---|
| 7a | `references.ts` | 485 | 427 | 58 | 0 | 88,04 % | 1 437 s |
| 7b | `recent-load.ts` | 234 | 227 | 7 | 0 | 97,01 % | 672 s |
| 7c | `variability.ts`, `performance-model.ts` | 189 | 155 | 34 | 0 | 82,01 % | 602 s |
| 7d | `context.ts`, `engine.ts` | 143 | 133 | 10 | 0 | 93,01 % | 413 s |
| **Annexe** | | **1 051** | **942** | **109** | **0** | **89,63 %** | ≈ 52 min |
| **Total vague 1** | | **2 185** | **2 037** | **148** | **0** | **93,23 %** | |

**Survivants restants de l'annexe (109) : justifiés.**

| Catégorie | Mutants | Justification |
|---|---|---|
| Inatteignables en vague 1 | Sélection d'un modèle implémenté (`performance-model.ts:65–69`, 18 mutants) ; garde CORE-EXT-R1 absente (`engine.ts:31, 55`) | Aucun modèle n'est implémenté ; le CORE porte v4. Ce code sert les vagues suivantes |
| Équivalence algébrique | `variability.ts:26`, `x − m → x + m` : Σ(x + m)(x − m) = Σx² − n·m² = Σ(x − m)² | Résultat identique |
| Équivalents | Tri préalable des références (ordre des candidats déterministe dans tous les cas) ; `g.length > 1` (une discordance exige deux allures) ; distance visée absente (la distance diffère alors toujours) ; plafond ordinal par objet (seul VO2max en a un, et il n'est utilisable pour aucune décision) ; gardes `typeof` redondantes avec `Number.isInteger` ; médiane (gardes d'ensemble vide) ; filtres de chemins du contexte (aucun autre chemin ne porte `level` ou `type` en 2ᵉ position) | Aucune différence observable |
| Défensifs | Branches de repli « aucune référence » dupliquées ; `ruleRefs` (toujours vides) | Inatteignables pour une entrée validée |
| Diagnostic | Messages et libellés de schéma, raison `DECISION_PENDING` supplémentaire quand la décision est déjà approuvée | Aucune décision affectée |

## 3. Gates

### RUNNING_WAVE1_IMPLEMENTATION_GATE = **PASS**

| Critère | Statut |
|---|---|
| Paquet implémenté (conventions SportEngine, aucune duplication du CORE) | ✅ |
| Tests, typecheck, lint, architecture verts | ✅ 827 / 827 |
| Registre des paramètres fonctionnel (champs, maturité, transitions, résolution par mode) | ✅ |
| Aucune valeur non résolue codée en dur | ✅ (audit §4) |
| Capacités déterministes, dérivées de la gouvernance | ✅ |
| Éligibilité à la production fail-closed | ✅ |
| G1 toujours non signées | ✅ (4 UNSIGNED) |
| V33 / V34 non résolus | ✅ (sans valeur) |
| Éligibilité distincte de la précision | ✅ |
| Dégradations explicites | ✅ |
| Observabilité (trace) | ✅ |
| Contrat SportEngine respecté (pipeline réel du CORE) | ✅ |
| Strength inchangé | ✅ |
| CORE inchangé | ✅ (aucune source ; empreinte F20 intacte) |

### RUNNING_WAVE1_HARDENING_GATE = **PASS**

| Critère | Statut |
|---|---|
| Mutation ciblée en lots bornés (mémoire, worker unique, délais, concurrence, tests ciblés) | ✅ 10 lots, aucun passage global |
| Zones prioritaires (éligibilité, dépendances, paramètres, G1, éligibilité ≠ précision, dégradation, maturité) | ✅ 96,56 % |
| Survivants pertinents corrigés (test ou implémentation) | ✅ (1 défaut d'implémentation corrigé) |
| Survivants restants analysés sémantiquement et justifiés | ✅ (39 prioritaires + 109 annexe) |
| Adversariaux verts | ✅ |

**RUNNING_WAVE1_STATUS = IMPLEMENTED_HARDENED**

## 4. Audit des valeurs magiques

| Contrôle | Résultat |
|---|---|
| Littéraux numériques dans les fichiers d'algorithme (hors 0 et 1) | **0 non justifié** (9 annotés `technical-constant:` : conversions d'unités, distances officielles des épreuves, médiane, version de format) |
| Valeurs de programmation | **Uniquement** dans `governance/registry-v1-candidate.ts` (données), toutes `EXPERT_PROPOSED` ou non résolues, provisoires, jamais lues en PRODUCTION |
| V23, V28 (hors marathon), V31–V37, V39–V41, exposant et incertitude de V38, nombre minimal de V42 | **Sans valeur** (aucun zéro, aucun défaut) ; test d'architecture : aucune constante `…variability / exponent / magnitude / noviceDose / returnDose = nombre`, aucun `1.06` |
| Correspondances RPE / FC / allure ↔ domaine | Aucune codée ; V02 non appliquée (statut exposé seulement) |
| Repli universel de variabilité (2 / 3 / 4 %) | Absent |

## 5. Régressions

| Élément | Résultat |
|---|---|
| **Strength** | Aucune source modifiée ; suites Strength (goldens F1 / F2, science-lock, intégration, propriétés) vertes ; Strength n'importe pas Running (test d'architecture) |
| **CORE** | Aucune source modifiée (empreinte F20 inchangée) ; suites CORE vertes ; CORE n'importe pas Running ; aucun terme Running (P_R*, G1-*, `running.*`, E-*) dans le CORE |
| Seules modifications hors paquet | `eslint.config.mjs` (paquet Running sous les règles de frontière), `pnpm-lock.yaml` (lien d'espace de travail) |

## 6. Dette technique

| Élément | Nature |
|---|---|
| Plafonds ordinaux de confiance par type (`typeConfidenceCaps`) et plafond par bande de récence (V12) | Interprétations ordinales de 5B, EXPERT_PROPOSED : à revoir avec E-RECENCY |
| Correspondance population ↔ historique observable | Non implémentée : la population est FOURNIE (frontières PROGRAMMING_HEURISTIC sans valeur en 5A) |
| État de reprise | FOURNI (frontières V24 non signées), jamais calculé |
| Levier de production « ruleset verrouillé » | Représenté par un booléen de gouvernance ; la procédure de verrouillage (gate du ruleset) reste à outiller |
| Modèle de performance | Interface seulement ; aucune formule |
| Planificateur global (P_HYBRID) | Dépendance technique non satisfaite |
| `/tmp` de la session | ~30 Go de répertoires temporaires vitest laissés par des exécutions tuées des passages de mutation (6A et 6B) : nettoyage à décider par l'utilisateur |

