# RunningEngine vague 1 — rapport de tests, de mutation et de gates (phase 6B)

## 1. Suites

| Contrôle | Résultat |
|---|---|
| Base (début 6B) | 696 tests verts ; HEAD `fc665bb` ; CORE-EXT-R1 vérifiée sur les artefacts (`CURRENT_SCHEMA.session_record.version = 4`, `run_structure` présent) |
| `pnpm test` | **826 / 826** verts (+130 tests Running) |
| `pnpm typecheck`, `pnpm lint` | verts (le paquet Running est soumis aux mêmes règles de frontière que le CORE : horloge, hasard, réseau) |
| Architecture | verte : CORE (dont F20 : empreinte inchangée), Strength, Running |

### Tests Running

| Fichier | Tests | Contenu |
|---|---|---|
| `unit/governance.test.ts` | 15 | Registre, absence de valeurs, résolution par mode, transitions de maturité, G1, V33 / V34 |
| `unit/capabilities.test.ts` | 9 | Capacités, éligibilité à la production, déterminisme (propriété) |
| `unit/references.test.ts` | 15 | Références, ReferenceConfidence, sélection, conflits, départage (propriété) |
| `unit/references-hardening.test.ts` | 10 | Exigences par type, confiance avant date, prudence, frontières |
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

### 2.6 Annexe après durcissement

_(à compléter à la fin des lots 7a–7d)_

## 3. Audit des valeurs magiques

| Contrôle | Résultat |
|---|---|
| Littéraux numériques dans les fichiers d'algorithme (hors 0 et 1) | **0 non justifié** (9 annotés `technical-constant:` : conversions d'unités, distances officielles des épreuves, médiane, version de format) |
| Valeurs de programmation | **Uniquement** dans `governance/registry-v1-candidate.ts` (données), toutes `EXPERT_PROPOSED` ou non résolues, provisoires, jamais lues en PRODUCTION |
| V23, V28 (hors marathon), V31–V37, V39–V41, exposant et incertitude de V38, nombre minimal de V42 | **Sans valeur** (aucun zéro, aucun défaut) ; test d'architecture : aucune constante `…variability / exponent / magnitude / noviceDose / returnDose = nombre`, aucun `1.06` |
| Correspondances RPE / FC / allure ↔ domaine | Aucune codée ; V02 non appliquée (statut exposé seulement) |
| Repli universel de variabilité (2 / 3 / 4 %) | Absent |

## 4. Régressions

| Élément | Résultat |
|---|---|
| **Strength** | Aucune source modifiée ; suites Strength (goldens F1 / F2, science-lock, intégration, propriétés) vertes ; Strength n'importe pas Running (test d'architecture) |
| **CORE** | Aucune source modifiée (empreinte F20 inchangée) ; suites CORE vertes ; CORE n'importe pas Running ; aucun terme Running (P_R*, G1-*, `running.*`, E-*) dans le CORE |
| Seules modifications hors paquet | `eslint.config.mjs` (paquet Running sous les règles de frontière), `pnpm-lock.yaml` (lien d'espace de travail) |
