# KAIRO — Consolidation des PR #2 et #3

Revue d'intégration, validation et proposition de fusion. **Rien n'a été fusionné ni déployé.** Aucune règle sportive
n'a été ajoutée.

## 0. État exact

| PR | Branche → destination | Tête | Contenu |
|---|---|---|---|
| #2 | `claude/c4-crosstraining-full-session` → `claude/crosstraining-c1-c2-spike-vbg8dv` | `fccdd77` | C4 → C4.3 : séance Cross-training complète, bloc de force délégué à Strength (4 commits) |
| #3 | `claude/strength-fixes-precheck` → `claude/c4-crosstraining-full-session` | `e61df0e` | Correctifs Musculation P0/P1, sécurisation du contrôle pré-séance, correctif de consolidation (9 commits) |

- **Dépendances :**
  - #3 est empilée sur #2 : la base de #3 est la tête de #2, et la base de #2 (`f9f7e2e`) est ancêtre de #2.
  - Aucun conflit. La branche intégrée est la tête de #3.
- **CI :** aucune vérification ne s'exécute sur les PR. Le seul workflow est `kairo-pages.yml`.
- ⚠️ **Fusionner #2 = déployer.** `kairo-pages.yml` se déclenche à chaque push sur
  `claude/crosstraining-c1-c2-spike-vbg8dv` :
  - `pnpm check`, build ;
  - publication `gh-pages` sur https://fabiengorce40.github.io/Hybridsport/ ;
  - vérification.
- **Branche de consolidation** `claude/consolidation-pr2-pr3`, empilée sur #3, sans PR. Elle contient la simulation
  4 semaines, ce rapport et la spécification Planner.

## 1. Ce qui est vérifié

| Domaine | Vérification | Preuve |
|---|---|---|
| Pré-séance et douleurs connues | Question douleur explicite ; « Passer » conserve les douleurs connues ; la pause n'est jamais levée par « Passer » ; récurrence sans double comptage ; chemins planifié, « Faire maintenant », non placé, reprise, fin directe | `precheck*.test.ts` (39), DOM (6), E2E |
| Reproductibilité avant adaptation | **Anomalie bloquante corrigée** (§2) | `precheck-reproducibility.test.ts` |
| Persistance et migration | États **réels** produits par le code déployé `f9f7e2e`, chargés par le code intégré. Schéma 2 et version de planification `beta0-m31` inchangés ; champs ajoutés avec valeur par défaut | `fixtures/deployed-f9f7e2e-*.json`, tests DP-1 à DP-5 |
| Reprise des séances (hors tests) | Séance de Musculation en cours (2 séries, repos), Cross-training C3 en cours (chrono), reprise **sans** contrôle, fin enregistrée ; dans l'interface : bandeau matériel sans écrasement, écran CT intégré | `deployed-state-dom.test.tsx` |
| Composition Strength et blocs CT | Le port Strength en mode bloc ne reçoit **pas** la règle de variation TEST_ONLY ; l'état douloureux du jour s'applique au bloc ; la douleur au genou retire le squat du bloc CT | simulation semaine 3, revue `planning.ts` |
| Récupération | Signaux Musculation ↔ Musculation et Musculation ↔ bloc CT présents chaque semaine ; jamais appliqués (`UNRESOLVED`) | simulation, §3 |
| Planning multisport | 4 semaines × 6 séances placées, aucune non placée, aucune exception | `four-weeks.test.ts` |
| TEST_ONLY / approuvé | Nouvelles règles des PR : `app.checkin.readinessMapping`, `planner.strength.withinWeekVariation.test-0`, délégation C4.3 et `planner.intraSessionInterference`. Toutes TEST_ONLY / SIMULATION_ONLY ; aucune règle approuvée modifiée | revue du diff depuis `f9f7e2e` |
| Comportement réel (Beta 0) | La production utilise `beta0Environment` : les règles TEST_ONLY / SIMULATION_ONLY y sont actives, comme pour C3.5, H2.5 et M3 déjà déployés. Une semaine en cours garde ses séances de l'ancienne version (pas de remplacement silencieux) ; la suivante est composée par le nouveau code | revue `ensureBeta0Week`, DP-5 |

## 2. Anomalies bloquantes

**A1 — changements de moteur présentés comme une adaptation à l'état du jour.** Corrigée dans la PR #3 (`60cf2c3`).

- **Origine.** Elle venait de la PR #3 et apparaissait dans tout usage réel. La régénération d'une séance planifiée ne
  redonnait plus la même séance :
  - dès qu'une séance de Musculation avait été réalisée dans la semaine (historique d'exposition) ;
  - ou sur une semaine composée par la version déployée.
- **Exemple.** « Fatigue élevée » affichait « développé couché, tirage, pec deck retirés ; presse, tractions
  ajoutées ». Sur un état réel, une séance Cross-training C3 serait devenue une séance C4.
- **Correctif.** Une adaptation n'a lieu que si la séance est reproductible à état inconnu. Sinon :
  - la séance prévue est gardée (raison tracée) ;
  - si une zone exclue est sollicitée, la séance recomposée est utilisée, en signalant que la recomposition dépasse
    la douleur.
- **Validation.** Elle est faite sur les états réels de la version déployée.

**Aucune autre anomalie bloquante** après correctif.

## 3. Risques restants (non bloquants, à arbitrer)

| # | Risque | Constat | Gravité |
|---|---|---|---|
| R1 | **Volume du bas du corps effondré** avec CT « force + conditionnement » et objectif masse (C4.3 × interférence Strength) | quadriceps 2–4/10, ischio-jambiers 2–4/8, mollets 0/4, contre 10/10, 7/8, 4/4 sans bloc CT | **élevée** (qualité sportive) |
| R2 | L'adaptation selon la fatigue s'applique rarement à la Musculation | 2 séances sur 12 reproductibles au démarrage (voisines de la semaine précédente et historique non reconstruits). La sécurité douleur reste assurée | moyenne |
| R3 | Musculation deux jours de suite, chaque semaine (lundi/mardi, 5 groupes partagés) ; mardi puis bloc CT du mercredi | `same_discipline_recovery` non gouverné | moyenne |
| R4 | Volume au-dessus du haut non signalé | bras 16–20 pour un haut de 14, affichés « atteint » | moyenne |
| R5 | Full Body A/B/A en semaine 2 : la 3ᵉ séance répète la 1ʳᵉ (affiché honnêtement « A ») | variation non garantie à 3 séances | faible |
| R6 | Épaule P1 déclarée deux fois ⇒ P2 ⇒ Full Body reporté (semaine 4) | aucune variante Full Body sans poussée/tirage | faible (sûr) |
| R7 | Salle commerciale : élévations latérales poulie sans substitut au catalogue ⇒ refus | catalogue incomplet | faible |
| R8 | Pas de « Matériel indisponible » dans le bloc de force CT | interface | faible |
| R9 | Fusionner #2 déclenche le déploiement : bandeau de confirmation du matériel pour tous les profils existants ; règles TEST_ONLY exposées aux testeurs Beta | posture Beta existante | à valider |

## 4. Résultats des tests (branche intégrée + consolidation)

| Commande | Résultat |
|---|---|
| `pnpm check` (types, lint, tests) | 211 fichiers, **2632 tests réussis**, 1 ignoré, 0 échec |
| `pnpm kairo:build` | OK |
| `pnpm kairo:e2e` | **221 vérifications, 0 échec** (dont 360 × 640 Musculation et Cross-training) |
| PR #3 seule (`e61df0e`) | `pnpm check` : 2624 réussis, 0 échec |
| Simulation 4 semaines | 6 tests réussis. Rapport : `packages/app-core/tests/consolidation/__reports__/consolidation-4-semaines.md` (séances, durées cible/estimée, reproductibilité, décisions, changements, refus, volumes planifiés et exécutés, conflits de récupération) |

## 5. Décision GO / NO-GO

| Fusion | Décision | Conditions |
|---|---|---|
| **1. PR #3 → `claude/c4-crosstraining-full-session`** | **GO** (technique) | Aucune anomalie bloquante restante. Pas de déploiement déclenché. Accord humain requis pour fusionner. |
| **2. PR #2 → `claude/crosstraining-c1-c2-spike-vbg8dv`** | **GO conditionnel** | Après la fusion 1. **Elle déploie immédiatement.** Il faut ton accord explicite sur le déploiement et sur le risque R1 : soit tu l'acceptes pour la Beta (expérimental, visible dans le bilan), soit l'intention CT « force + conditionnement » reste hors du parcours masse jusqu'au chantier Planner. |

**Ordre proposé (non exécuté) :**

1. Fusionner #3 dans `claude/c4-crosstraining-full-session`. La PR #2 contient alors tout.
2. Vérifier que la PR #2 est toujours sans conflit, puis relancer `pnpm check`, `pnpm kairo:build` et
   `pnpm kairo:e2e` sur sa tête.
3. Avec ton accord sur le déploiement, fusionner #2 dans `claude/crosstraining-c1-c2-spike-vbg8dv`. Le workflow
   publie et vérifie la PWA.
4. Contrôler https://fabiengorce40.github.io/Hybridsport/ (`version.json` = commit fusionné). Ouvrir un profil
   existant : bandeau matériel, reprise d'une séance en cours.

**Méthode.** La PR #1 a été fusionnée par squash. Si #3 est fusionnée par squash, la branche de consolidation devra
être reconstruite ; ses commits sont des tests, des rapports et de la documentation, sans code applicatif.

## 6. Prochain chantier recommandé

**Planner multisport : récupération entre séances de force et arbitrage hebdomadaire.** Spécification en lecture
seule : `docs/kairo/PLANNER-MULTISPORT-SPEC.md`.

Ordre recommandé :

1. **Prérequis technique, sans règle sportive.** Rendre la régénération fidèle : persister les entrées du créneau.
   Cela traite R2 et fiabilise `MOVE` / `SWAP`.
2. **Décisions sportives à prendre.**
   - Délai minimal entre deux séances chargeant le même groupe.
   - Seuil de séries qui « charge » un groupe.
   - Façon dont le bloc CT compte dans le volume.
   - Priorité entre masse et endurance.
   - `DROP` avec consentement.
3. **Puis, en TEST_ONLY.**
   - Règles `forceRecoveryRules` (traite R3).
   - Statut `above_high` (traite R4).
   - Blocs CT intégrés au bilan, et effet sur le bas du corps (traite R1).
   - Semaine `INCOHERENT` avec choix explicites.
