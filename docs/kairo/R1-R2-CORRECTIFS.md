# KAIRO — Correction des risques R1 (volume musculaire) et R2 (recomposition non fidèle)

Branche **`claude/strength-r1-r2`**, empilée sur `claude/consolidation-pr2-pr3` (elle-même sur la PR #3).

- **Aucune fusion, aucun déploiement.** La PR #2 reste NO-GO au déploiement.
- **Règles sportives :** aucune valeur sportive ajoutée ni modifiée. `readinessMapping` et `withinWeekVariation`
  restent TEST_ONLY.
- **Une seule nouvelle règle, TEST_ONLY, purement technique :** `planner.crosstraining.compositeDemand.test-0`.
- **États utilisateurs préservés :**
  - aucun changement de schéma (2) ni de version de planification (`beta0-m31`) ;
  - aucune donnée persistée en plus ;
  - une séance commencée n'est jamais modifiée.

Preuves :
- `packages/app-core/tests/consolidation/__reports__/r1-r2-avant-apres.md` : simulation identique avant (`88cf5da`) et
  après ;
- `precheck-reproducibility.test.ts` : RP-1 à RP-6, états réels de la version déployée DP-1 à DP-5.

## 1. Séances non reproductibles avec douleur connue : audit exercice par exercice

L'audit couvre chaque séance réalisée avec une zone exclue :
- **zones exclues** recalculées par les règles G1 du CORE, à partir des douleurs déclarées **et** connues reportées ;
- **zones de chaque exercice** lues dans le catalogue de la discipline de la séance, sur **tous** les blocs :
  échauffement, force, accessoires, conditionnement CT, retour au calme, course.

| Séance (semaine 3, genou P2 déclaré lundi puis « Passer ») | Décision | Exercices réalisés | Violation |
|---|---|---|---|
| Lun. Musculation | recomposée, signalée | mobilité bas du corps, RDL, tirage poulie, développé haltères, mollets | aucune |
| Mar. Musculation | régénérée, reproductible | RDL, presse pectoraux, tractions, élévations latérales, mollets | aucune |
| Mer. Cross-training + bloc | régénérée | rameur, développé militaire (bloc), tractions élastique ; squat et air squat retirés | aucune |
| Jeu. / Sam. Course | régénérée | course facile remplacée par rameur (règles Running existantes) | aucune |
| Ven. Musculation | régénérée, inchangée | RDL, tirage, développé haltères | aucune |

Résultat : **0 violation sur 24 séances**, avant comme après. Le test `A-1` l'assure exercice par exercice.

## 2. R2 — reproductibilité des séances

### Causes mesurées

Sonde sur la simulation, état « au moment de la planification » reconstruit pas à pas :

| Écart entre planification et démarrage | Séances concernées | Cause |
|---|---|---|
| Expositions et empreintes ajoutées **après** la planification | séances 2–3 des semaines ≥ 2 | la régénération lisait l'historique courant |
| Tracks de progression créées ou modifiées après la planification | séances 2–3 de la semaine 1 | état mutable, non historisé |
| Entrées propres au planificateur (séances de la semaine précédente vues comme historique, anti-doublon, prescription hebdomadaire) | séance 1 des semaines ≥ 2 | non reconstruites par la régénération |
| Version du moteur différente (semaines composées par la version déployée) | toute semaine héritée | irréductible |

### Options comparées

| Critère | (P) Persister le contexte initial | (A) Adapter la séance persistée |
|---|---|---|
| Fidélité | complète si **toutes** les entrées sont persistées (tracks, historique du planificateur, voisines, prescription) | complète par construction : seuls les changements imposés par l'état déclaré |
| Semaines héritées / nouveau moteur | inapplicable | applicable |
| Taille d'état | augmente (instantané par séance) | inchangée |
| Fragilité | chaque nouvelle entrée du planificateur doit être persistée | faible ; mêmes garde-fous CORE (`validateSession`, `repairSession`) |
| Qualité de l'adaptation | recomposition complète par le moteur | substituts admissibles du catalogue ou retrait ; la dose selon l'état (règle Strength, combinée à d'autres modificateurs) n'est pas rejouable a posteriori |

### Correctif retenu (hybride, aucune règle sportive)

1. **Fidélité sans persistance.** La régénération lit les historiques ajoutés (expositions, empreintes, réalisations
   Course, CT et HYROX) **au plus tard à `plannedAt`** de la semaine, comme le planificateur les a lus (`asOfPlanning`).
2. **Séance reproductible** (régénération à état inconnu = séance planifiée) : régénération avec l'état du jour,
   comme avant.
3. **Séance non reproductible :** adaptation de la séance **persistée** par le CORE (`adaptPersistedSession`).
   - Garde : la séance planifiée doit être valide sans restriction ; sinon, aucun écart n'est attribué à l'état.
   - La dose selon l'état n'est pas appliquée et c'est tracé (`readiness_requires_reproducible_session`).
4. **Si le CORE ne peut pas réparer** (par exemple `REPAIR.REST_RECOMMENDED`, aucun substitut sans genou au squat) :
   - aucune zone exclue sollicitée ⇒ séance gardée ;
   - sinon, recomposition **signalée** ;
   - sinon, report.
5. **Défense en profondeur.** Une séance adaptée qui solliciterait encore une zone exclue est reportée.
6. **Séance commencée :** la reprise sort avant tout contrôle et elle n'est jamais modifiée (RP-6).
7. **Séance non régénérable** (non placée, HYROX) : si une zone exclue est sollicitée, adaptation de la séance
   persistée par le CORE avant tout report (auparavant, report direct).

### Effet (4 semaines)

| Indicateur | Avant | Après |
|---|---|---|
| Séances de Musculation reproductibles au démarrage | 2 / 12 | **8 / 12** |
| Ajustements d'état non appliqués | 3 | **0** |
| Adaptations par régénération | 3 | 5 |
| Recompositions signalées | 1 | 1 (squat sans substitut admissible) |
| Violations de zone | 0 | 0 |

Restent non reproductibles : semaine 1 (tracks créées après la planification) et séance 1 des semaines suivantes
(historique propre au planificateur). Elles sont couvertes par l'étape 3, puis 4.

## 3. R1 — réductions du volume du bas du corps : cause exacte

**Quand :** à la planification de la semaine, pour chaque séance Strength.

**Créneaux retirés :** `fb.iso_lower` (leg curl, leg extension) et `fb.single_leg` (fente bulgare), avec
`SELECT.SLOT_OMITTED {cause: interference}`, sur **les trois** Full Body, y compris le lundi.

**Mécanisme :**
1. La séance CT « force + conditionnement » porte un bloc délégué prescrit en séries de travail.
2. `deriveSessionDemand` normalise toute la séance avec la table de **sa** discipline (`crosstraining`), qui ne
   connaît pas l'unité `working_set`. Résultat : `DATA.DEMAND_PROFILE_UNAVAILABLE {cause: UNIT_NOT_NORMALIZED,
   detail: crosstraining:working_set}`.
3. Le contexte voisin de **toutes** les séances Strength devient `known: false`. Le moteur Strength applique alors sa
   précaution d'interférence face à un voisinage inconnu : retrait des créneaux bas du corps.
4. Le même trou de demande bloque l'arbitrage M3 toute la semaine (`M3_ARBITRATION_BLOCKED {cause:
   DEMAND_UNAVAILABLE}`).

Avec un CT « mixte » sans bloc, la demande se dérive et rien de tout cela n'arrive.

## 4. Solution TEST_ONLY : demande composite (`planner.crosstraining.compositeDemand.test-0`)

- **Principe :** chaque partie de la séance hôte est normalisée par la table gouvernée de **sa** discipline
  d'origine (CT pour l'hôte, Strength pour le bloc délégué). Les items sont additionnés, puis le profil est dérivé
  par `deriveDemandProfile` du CORE, exactement comme pour une séance d'une seule discipline.
  - Aucune valeur sportive, aucune pondération, aucun seuil nouveau.
  - Les garde-fous CORE ne sont pas contournés.
  - En PRODUCTION, une table non approuvée reste refusée.
- **Activation :** `beta0Environment` seulement. Absente ailleurs ⇒ comportement antérieur.

**Effets :**
- **Voisinage :** il redevient connu. Le CT du mercredi a une demande genou « élevée » et hanche « modérée ». Les
  règles d'interférence **existantes** s'appliquent de nouveau.
- **Musculation de lundi et mardi :** les créneaux bas du corps sont conservés. Le vendredi reste allégé par la
  Course clé du samedi et la Course du jeudi (règles existantes, identiques au profil sans bloc CT).
- **Bloc délégué :** il voit à son tour des voisines Strength connues et est allégé par ces mêmes règles. Exemple
  dans le rapport C4.3 : RDL 2×6 RIR 3 devient hip thrust 1×6 RIR 5. Le « même exercice de force à J+1 » disparaît.
- **Arbitrage M3 :** il est actif. Il détecte un conflit genou CT (mer.) ↔ Course (jeu.) qu'il ne peut pas
  résoudre : résidu visible, aucune action.

**Volume planifié** (séries de travail / plancher expérimental), semaines sans douleur :

| Groupe | Avant | Après | Musculation + CT mixte (référence) |
|---|---|---|---|
| Quadriceps | 2–4 / 10 | **7–9 / 10** | 10 / 10 |
| Ischio-jambiers | 2–4 / 8 | **5–6 / 8** | 7 / 8 |
| Mollets | 0 / 4 | **4–6 / 4** | 4 / 4 |
| Fessiers | 6 / 6 | 12 / 6 | 13 / 6 |
| Bras | 16,5–20,5 / 6 (haut 14) | 15,5–17,5 / 6 | 20,5 / 6 |

- **Garde-fou :** aucun groupe ne dépasse le plus haut de (avant, haut gouverné) (test `A-2`).
- **Jamais d'augmentation :** aucune adaptation n'augmente le nombre de séries (test `A-4`). Les planchers ne sont
  jamais visés par le code.
- **Durées hebdomadaires estimées :** 240 → 252, 232 → 249, 227 → 244, 224 → 254 min. La hausse vient des créneaux
  rétablis, dans les minutes disponibles déclarées.

## 5. Récupération Strength ↔ Strength et Strength ↔ Cross-training

### Observé sur 4 semaines (après, séances réalisées, écart ≤ 72 h)

- **Musculation ↔ Musculation à 24 h, chaque semaine (lundi/mardi).** 6 à 7 groupes partagés, avec par exemple
  fessiers 5/5, quadriceps 5/2, épaules 4,5/7,5 séries.
- **Musculation ↔ bloc CT à 24 h** (mardi → mercredi) : fessiers 5/1, quadriceps 2/1, tronc 4,5/0,5. En semaine 3, le
  bloc a basculé sur le haut du corps : épaules 4,5/2, bras 6/2.
- **Musculation ↔ Musculation à 72 h** (vendredi → lundi suivant) : 5 à 6 groupes, chacun à 1,5–6 séries.
- **Aujourd'hui :** le signal `same_discipline_recovery` (J+1 seulement) reste NON RÉSOLU. M3 ne compare que des
  sports différents, sur des structures CORE et non sur des groupes musculaires.

### Paramètres à valider (propositions, aucun seuil définitif)

| Paramètre proposé | Nature | Données observées pour décider |
|---|---|---|
| `forceRecovery.withinHours` | délai minimal entre deux séances chargeant le même groupe | paires à 24 / 48 / 72 h ci-dessus |
| `forceRecovery.minSetsPerGroup` | séries de travail à partir desquelles un groupe est « chargé » | contributions observées de 0,5 (secondaires) à 7,5 séries |
| `forceRecovery.countSecondary` | compter ou non les contributions secondaires fractionnaires | ex. tronc 0,5 dans le bloc CT |
| `forceRecovery.ctBlockWeight` | poids du bloc CT : 1, ou partiel à cause du conditionnement qui suit | bloc de 1 à 3 séries de force |
| `forceRecovery.fullBodyException` | deux Full Body consécutifs tolérés si l'accent diffère | variantes A/B à 24 h partageant 6 groupes |
| Ordre des actions | réutilise `planner.m3.actions` (`MOVE`, `SWAP`, `RECOMPOSE`), résidu visible sinon | lundi / mercredi / vendredi était libre dans cette semaine |

Toutes ces valeurs sont des **décisions sportives** : elles ne sont ni implémentées ni présumées.

## 6. Validation

| Commande | Résultat |
|---|---|
| `pnpm check` (types, lint, tests) | 212 fichiers, **2639 tests réussis**, 1 ignoré, 0 échec |
| `pnpm kairo:build` | OK |
| `pnpm kairo:e2e` | **221 vérifications, 0 échec** |
| Nouveaux tests | `r1-r2-comparison.test.ts` (A-1 à A-5), `precheck-reproducibility.test.ts` (RP-5, RP-6 ; RP-2, RP-3 mis à jour) |

## 7. Risques restants

1. **Lundi/mardi consécutifs, chaque semaine.** Le placement est inchangé : la récupération n'est pas gouvernée (§5).
2. **Semaine 1 et séance 1 des semaines suivantes non reproductibles.** C'est couvert par l'adaptation de la séance
   persistée ; dans ce cas, la dose selon la fatigue n'est pas appliquée (tracé).
3. **Le CORE ne trouve aucun substitut admissible au squat sans genou** (catalogue). La recomposition signalée prend
   le relais.
4. **Volume :** pectoraux 3–7/10 et dos 9–10/10 restent sous le plancher (contraintes de durée et d'interférence
   Course) ; les bras restent au-dessus du haut, ce qui n'est pas signalé (spécification Planner, §4.3).
5. **La demande composite ne vaut que pour l'environnement Beta 0 (TEST_ONLY).** En production, la table de
   normalisation doit être approuvée.
6. **Les semaines déjà planifiées ne sont pas recomposées.** Elles gardent l'ancien voisinage ; la demande composite
   s'applique à partir de la semaine suivante.

## 8. Décision proposée

| Élément | Décision | Condition |
|---|---|---|
| PR #3 → C4.3 (sans R1/R2) | GO technique conditionnel (inchangé) | accord explicite ; R2 reste partiellement ouvert sans cette branche |
| Correctifs R1 + R2 (`claude/strength-r1-r2`) | **GO technique pour revue** | à porter dans la PR #3 (R2) et la PR #2 (R1 touche le port CT de C4.3), ou une PR dédiée, selon ton choix ; aucune fusion sans accord |
| Déploiement de la PR #2 | **NO-GO** (maintenu) | à reconsidérer après revue de R1/R2 et décisions sur la récupération (§5) |
