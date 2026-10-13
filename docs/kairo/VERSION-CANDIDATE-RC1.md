# KAIRO — Version candidate RC1 (revue finale R1/R2)

**Branche candidate : `claude/kairo-rc1`.**

- **Ce qu'elle contient :** une pile **linéaire, sans fusion**, dans cet ordre :
  1. `f9f7e2e`, la version déployée ;
  2. la PR #2 (C4 → C4.3) ;
  3. la PR #3 (correctifs Musculation) ;
  4. la consolidation (`claude/consolidation-pr2-pr3`) ;
  5. R1/R2 et cette revue (`claude/strength-r1-r2`).
- **Ce qui est préservé :** l'historique complet et tous les rapports de consolidation.
- **Ce qui n'a pas été fait :** aucune PR fusionnée, rien poussé vers `claude/crosstraining-c1-c2-spike-vbg8dv` (seule
  branche déclenchant `kairo-pages.yml`), aucun déploiement.
- **Règles approuvées :** aucune n'est modifiée. Les règles ajoutées sont toutes TEST_ONLY :
  - `app.checkin.readinessMapping` ;
  - `planner.strength.withinWeekVariation.test-0` ;
  - `planner.crosstraining.compositeDemand.test-0`.

> **Des tests verts ne prouvent pas la qualité sportive.** Les simulations ci-dessous sont des **observations** à
> relire par un humain compétent. Les planchers et hauts de volume sont expérimentaux (non approuvés).

## 1. Audit de la demande composite Cross-training + Strength

Tests : `packages/app-core/tests/consolidation/composite-demand.test.ts` (CD-0 à CD-6, 7 tests).

| Point audité | Constat | Preuve |
|---|---|---|
| Normalisation par discipline | Hôte : table `crosstraining`. Bloc délégué : table `strength`. Dose = séries de travail × `perUnit` gouverné, bande d'intensité de la table. Profil = `deriveDemandProfile` du CORE. | CD-1 |
| Sans double comptage | Chaque item d'entraînement est compté une fois ; les scores composites sont la somme hôte + bloc, structure par structure. | CD-2 |
| Table absente | Refus explicite : `DISCIPLINE_NOT_NORMALIZED` (pas d'entrée `strength`) ou `PARAMETER_MISSING`. Jamais de valeur inventée. | CD-3 |
| Sécurité CORE | La demande ne sert qu'au voisinage et à l'arbitrage ; la validation et la réparation des séances sont inchangées. Douleur : 0 violation (§4). | CD-6, §4 |
| TEST_ONLY hors Beta | **Garde ajoutée pendant la revue** : en mode PRODUCTION, la règle n'est jamais appliquée (demande non composite ; table non approuvée refusée). Seul `beta0Environment` (CANDIDATE) porte la règle ; l'environnement applicatif par défaut n'a pas de Cross-training. Sans la règle, le port garde l'ancien comportement. | CD-4, CD-6 |
| Identification du bloc délégué | Bloc `strength` entièrement prescrit en séries. Le moteur CT n'émet aucun bloc `strength` natif (seule la délégation C4.3 en produit). Un bloc `strength` qui ne serait pas entièrement en séries reste à l'hôte. | CD-5 |

## 2. `adaptPersistedSession` — voie forcée

Tests : `packages/app-core/tests/strength-fixes/adapt-persisted.test.ts` (AP-0 à AP-8, 9 tests). La voie est
**réellement forcée** : la séance choisie est vérifiée non reproductible (AP-0), après une séance réalisée.

| Cas | Résultat |
|---|---|
| Genou P2 (AP-1) | Séance persistée adaptée par le CORE. Seuls les items sollicitant le genou changent ; les autres items sont **identiques** (prescription comprise). |
| Substitution admissible, coude P2 (AP-2) | Développé haltères remplacé par pompes : même item, même prescription, **aucune charge transférée** (`REPAIR.LOAD_TRANSFER_REFUSED` côté CORE pour toute prescription chargée). |
| Substitution impossible, bas du dos P2 (AP-3) | `REPAIR.REST_RECOMMENDED`, adaptation refusée. Au démarrage : recomposition signalée ou report, jamais d'exercice bas du dos. |
| **Bloc de force vidé, épaule P2 (AP-4)** | **Défaut trouvé pendant la revue et corrigé.** Le CORE ne protège que le bloc **principal** : il retirait poussée ET tirage, laissant un Full Body sans haut du corps, que Strength refuse de composer (`BLOCKING_NEED`). Désormais une adaptation qui vide un bloc de force est refusée (`KAIRO.CHECKIN_STRENGTH_BLOCK_EMPTIED`) et la décision revient au moteur : ici le report, comme pour une séance reproductible. |
| Douleur connue + « Passer » (AP-5) | Même voie, aucune zone exclue. |
| Reprise (AP-6) | La séance commencée n'est jamais ré-adaptée (autre douleur déclarée, rechargement) ; séries conservées. |
| Invariant (AP-7) | 2 préréglages × 6 zones : adaptée ⇒ aucune zone exclue restante ; sinon refus explicite. |
| État réel déployé (AP-8) | Semaine composée par `f9f7e2e` (moteur différent), coude P2 : voie persistée, aucune zone exclue. |

**Autre correctif de revue.** Une adaptation persistée **sans aucun changement** n'est plus présentée comme
« adaptée ». Seul l'état non appliqué est tracé ; ce cas a été vu en configuration E.

## 3. Migration depuis `f9f7e2e`

États **réels** produits par le code déployé (`fixtures/deployed-f9f7e2e-*.json`). Tests DP-1 à DP-7, AP-8, et
`apps/kairo/tests/deployed-state-dom.test.tsx`.

| Cas | Vérifié |
|---|---|
| Séance commencée | Musculation en cours (2 séries, repos) et Cross-training C3 en cours (chrono) conservés. Reprise **sans contrôle**, fin enregistrée, écran intégré sans erreur (DP-1, DP-2, DOM). |
| Pause douleur | Tout nouveau démarrage refusé (toutes disciplines), aucun contrôle enregistré. La séance commencée est reprise et terminée. Levée ⇒ démarrage possible, aucune douleur connue inventée (DP-4, DP-7). |
| Semaine déjà planifiée | **Jamais recomposée au chargement** : requêtes, raisons et arbitrage identiques octet pour octet ; journaux et matériel inchangés (DP-6). Semaine suivante composée par le nouveau code (DP-5). Démarrer une séance de cette semaine avec une douleur ⇒ adaptation de la séance persistée, jamais un changement de moteur présenté comme adaptation (DP-3, AP-8). |
| Matériel | Préréglage hérité conservé ; confirmation demandée sans écrasement (DP-1, DOM). |
| Schéma / planification | Schéma 2 et `beta0-m31` inchangés. Champs ajoutés avec valeurs par défaut. |

## 4. Simulation 4 semaines — 5 configurations

Rapport : `packages/app-core/tests/consolidation/__reports__/multi-config-4-semaines.md`. Tests :
`multi-config.test.ts`.

| Config. | Placées | Réalisées | Reportées | Violations | Musculation reproductible | Paires de force à J+1 |
|---|---|---|---|---|---|---|
| A. Masse prioritaire (salle commerciale) | 24 | 23 | 1 | **0** | 8/12 | 8 |
| B. Hybride (Course 3×, Musculation 2×, CT 1×) | 24 | 22 | 1 | **0** | 7/8 | 4 |
| C. Salle complète | 24 | 23 | 1 | **0** | 9/12 | 8 |
| D. Haltères seulement | 20 (CT refusé) | 16 | 3 | **0** | 11/12 | 4 |
| E. Récupération dégradée à chaque séance | 24 | 24 | 0 | **0** | 8/12 | 8 |

**Volumes planifiés**, moyenne sur 4 semaines (séries / plancher expérimental) :

| Groupe | A | C | D |
|---|---|---|---|
| Quadriceps | 7,5 / 10 | 8,5 / 10 | 5 / 10 |
| Ischio-jambiers | 5,3 / 8 | 9,5 / 8 | 2,8 / 8 |
| Pectoraux | 5,5 / 10 | 14,8 / 10 | 4,8 / 10 |
| Mollets | 5,5 / 4 | 0 / 4 | 1,8 / 4 |
| Bras (haut 14) | 16,5, au-dessus du haut | 16,5, au-dessus du haut | 15, au-dessus du haut |

**Observations qualitatives**, à relire par un expert ; ce ne sont pas des verdicts :

- **A :**
  - Full Body **A / B / A** en semaine 2 : le vendredi répète les mouvements principaux du lundi.
  - Musculation lundi et mardi consécutifs chaque semaine.
- **D :**
  - Le Full Body A n'a pas de squat bilatéral (RDL unilatéral, rowing, développé).
  - Le CT « force + conditionnement » est **refusé** sans rameur ni barre de traction (raison visible).
  - Avec un genou connu, les courses sont **reportées** : aucun ergomètre de remplacement.
  - Musculation mercredi et jeudi consécutifs.
- **E :**
  - L'effort est allégé (RIR +1) sur les séances reproductibles.
  - Il est **non appliqué**, et tracé, sur 5 séances sur 12 (première semaine, séance 1 des semaines suivantes).
  - Le Cross-training et la Course ne sont jamais allégés par la fatigue déclarée : seul Strength a une règle d'état.
  - Aucune séance n'est reportée, malgré une fatigue élevée et une mauvaise récupération déclarées 4 semaines de
    suite.
- **B :** volume de masse bas, attendu avec 2 séances de Musculation sur un profil où la Course est prioritaire.

## 5. Matrice GO / NO-GO

| Domaine | Décision | Justification |
|---|---|---|
| **Sécurité douleur** | **GO** | Sur 5 configurations × 4 semaines, plus 9 tests en voie forcée, une matrice de 12 cas et des états réels : 0 exercice en zone exclue. Pause jamais levée par « Passer ». Douleurs connues conservées. Récurrence G1 sans double comptage. Bloc de force jamais vidé. Limite : les substituts du catalogue sont pauvres (bas du dos, squat sans genou), d'où des reports. |
| **Persistance / migration** | **GO** | Schéma et version de planification inchangés. États réels `f9f7e2e` : séance commencée, pause, semaine planifiée, tous intacts. Séance commencée jamais modifiée. |
| **Composition CT** | **GO conditionnel** | La demande composite est correcte (normalisation, pas de double comptage, refus explicites, TEST_ONLY borné). Mais le bloc délégué devient léger (ex. hip thrust 1×6 RIR 5), le CT est refusé avec des haltères seulement, et la fatigue est ignorée. **Revue sportive requise** avant exposition. |
| **Récupération** | **NO-GO** | Non gouvernée : 4 à 8 paires de séances de force à J+1 par configuration sur 4 semaines. Le signal `same_discipline_recovery` reste UNRESOLVED. Décisions sportives requises (spécification Planner). |
| **Volumes** | **NO-GO pour un objectif de masse validé** | Nette amélioration (quadriceps 2–4 → 7,5, mollets 0 → 5,5 en A). Mais quadriceps, ischio-jambiers, pectoraux et dos restent sous les planchers en A ; les bras dépassent le haut sans signalement. Planchers expérimentaux, non approuvés. |
| **Qualité des séances** | **CONDITIONNEL** | Séances cohérentes et sûres, mais variantes répétées (A/B/A), état du jour peu exploité hors Strength, matériel limité appauvri. Relecture humaine nécessaire, avec le rapport multi-configurations. |
| **Publication** | **NO-GO** | Fusionner la PR #2 déploie automatiquement. Prérequis : revue sportive (CT, volumes), décisions de récupération, validation des 3 règles TEST_ONLY, accord explicite. |

## 6. Preuves et validation (tête de `claude/kairo-rc1`)

| Commande | Sortie |
|---|---|
| `pnpm check` | `Test Files  215 passed \| 1 skipped (216)` · `Tests  2664 passed \| 1 skipped (2665)` · code de sortie 0 |
| `pnpm kairo:build` | build Vite réussi (`✓ built`), code de sortie 0 |
| `pnpm kairo:e2e` | `E2E OK`, 221 vérifications `ok`, 0 `ÉCHEC` |

| Fichier de tests ajouté ou étendu dans cette revue | Tests |
|---|---|
| `packages/app-core/tests/consolidation/composite-demand.test.ts` | 7 |
| `packages/app-core/tests/strength-fixes/adapt-persisted.test.ts` | 9 |
| `packages/app-core/tests/strength-fixes/precheck-reproducibility.test.ts` (DP-6, DP-7 ajoutés) | 13 |
| `packages/app-core/tests/consolidation/multi-config.test.ts` | 7 |
