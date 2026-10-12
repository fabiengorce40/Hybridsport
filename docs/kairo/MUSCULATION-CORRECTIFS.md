# KAIRO — Correctifs Musculation après audit

Branche `claude/strength-fixes-precheck`, issue de la tête C4.3 (`fccdd77`, PR #2) : les travaux C4.3 sont conservés
tels quels. Rien n'est fusionné ni déployé.

Les règles sportives nouvelles introduites ici sont **toutes `TEST_ONLY`**, tracées et listées au §6 ; aucune règle
approuvée n'a été modifiée.

## 1. P0 — Contrôle pré-séance

| Avant (reproduit sur la base) | Après |
|---|---|
| L'état du jour était figé à `readiness: 'normal'`, `activePain: []` à la génération et au démarrage. | L'état par défaut est **inconnu** (`UNKNOWN_CORE_STATE` : `readiness: 'unknown'`, aucune douleur déclarée). |
| « Commencer la séance » et « Faire maintenant » démarraient sans aucune question (`checkIns` absent de l'état). | Tout **nouveau** démarrage ouvre « Avant de commencer » : douleur actuelle (zone + intensité P1–P3, signal général P4), fatigue et récupération. « Passer » est toujours possible et enregistre un état **inconnu**. |
| Aucune adaptation possible selon l'état du jour. | La séance est **régénérée** sur son propre créneau (graine, minutes, contexte voisin, semaine multisport persistés) avec l'état déclaré. Les règles existantes décident : séance inchangée, **adaptée** (changements et raisons affichés), **reportée** (aucun exercice compatible, raisons lisibles) ou **pause douleur** (règles G1 : P4, ou P3 sur une zone centrale / plusieurs zones). |
| — | Une séance **déjà commencée** reprend sans contrôle et sans perte (séries, charges, RIR, repos). |
| — | Récidive : un P1 déclaré deux fois en 14 jours devient P2 (règle G1 existante `detectRecurrence`). |

Aucun diagnostic médical : les messages renvoient vers un professionnel de santé lorsque la pause est déclenchée.

Fichiers : `app-core/src/checkin.ts`, `start-check.ts`, `beta0-app.ts` (`startProgrammeSession`), `kairo/src/precheck/PreSessionCheck.tsx`.

## 2. P1 — Programmation Strength

- **Full Body A/B/C** est conservé pour 1 à 3 séances (règle de composition inchangée, aucun Upper/Lower imposé à 3).
- **Lisibilité** : titre « Full body A / B / C » quand l'archétype se répète dans la semaine. Deux séances aux mêmes
  exercices principaux portent la même lettre : rien n'est présenté à tort comme une variation. Le panneau de séance
  affiche les mouvements dominants, les séries de travail par groupe musculaire et les raisons d'allègement tracées par
  Strength. La carte Programme affiche le volume hebdomadaire par groupe, à titre d'information seulement.
- **Récupération** : les séances de force à un jour d'écart sur les mêmes groupes ou les mêmes exercices sont
  **signalées**, y compris le bloc de force Cross-training C4.3. Aucune règle de récupération intra-discipline n'est
  gouvernée (`same_discipline_recovery`) : le signal n'est **jamais appliqué**.
- **4 séances** : si une séance Upper ou Lower est strictement identique à la précédente du même archétype, elle est
  régénérée avec la note de rotation existante `planned_variation` (règle `planner.strength.withinWeekVariation.test-0`,
  `TEST_ONLY`). La variante n'est retenue que si elle diffère **et** garde exactement les mêmes séries de travail par
  groupe ; sinon l'original est conservé et le résultat est tracé (`no_governed_variation`).
- **5–6 séances** : ces options sont désactivées dans le formulaire (« pas encore pris en charge »). Une alerte et la
  carte Programme proposent les fréquences composables (1 à 4, lues dans les bandes de la règle).
- **Volume** : il n'est jamais augmenté pour atteindre les planchers expérimentaux. Le garde-fou du volume par groupe
  a corrigé une régression détectée en test : les mollets passaient sous le plancher quand la variation remplaçait
  « Mollets machine ».

## 3. P1 — Matériel

| Avant | Après |
|---|---|
| Nouveau profil présélectionné sur « Salle complète ». | Aucune présélection : un choix explicite est requis avant « Créer » (bouton désactivé, message). |
| Profils existants : matériel présumé. | Bandeau « Votre matériel est-il toujours… ? » avec « C’est bien mon matériel » (pose `confirmedAt`, ne modifie rien) et « Modifier mon matériel ». |
| Aucune issue si une machine est indisponible. | « Matériel indisponible » sur chaque exercice non commencé. Le remplacement se fait par un substitut **direct** du contrat Strength, faisable sans le matériel manquant, non exclu et hors zone restreinte du jour. La charge en kg n'est pas transférée et devient l'effort prescrit. Sans substitut validé, le **refus est explicite et tracé** (`no_declared_substitute`, `no_compatible_substitute`, `load_not_transferable`). Le remplacement est refusé après une série validée. |

Tous les préréglages ont été vérifiés : chaque séance générée est faisable avec le matériel déclaré, et aucune
machine n'est supposée présente.

## 4. P1 — Interface mobile

- **Bouton de validation de série** : la bordure était presque invisible (rgb(36,36,40) sur fond sombre) ; elle est
  désormais contrastée (blanc 62 %) avec un fond léger, en zone tactile de 44 px ou plus. L'état désactivé est en
  pointillés.
- **Répétitions obligatoires** : 19 boutons sur 26 étaient désactivés sans explication. Le champ affiche maintenant
  la fourchette prescrite et un message explique qu'il faut saisir les répétitions réalisées pour valider la série.
- **Chrono flottant** : il masquait 6 contrôles en bas de page. La page a désormais une marge basse et la série
  suivante défile automatiquement au-dessus du chrono.
- **Persistance** : séries, charges, RIR, chrono, adaptation, remplacements et historique sont vérifiés après
  rechargement (E2E).

## 5. Validation

- **Tests unitaires** : `packages/app-core/tests/strength-fixes/` (25 tests) couvre :
  - masse 3 séances/semaine avec Running et CT, masse 4/semaine ;
  - douleur épaule et membre inférieur, signal général ;
  - matériel incomplet ;
  - séance déjà commencée, séance manuelle et non placée ;
  - persistance et historique.
- **Tests DOM** : `precheck-dom` et `equipment-dom` sont nouveaux ; les parcours existants passent désormais le
  contrôle pré-séance.
- **E2E** : bloc « CORRECTIFS MUSCULATION (360 × 640) », captures `mu-01` à `mu-10`.
- **Commandes** : `pnpm check`, `pnpm kairo:build` et `pnpm kairo:e2e` passent.

## 6. Règles TEST_ONLY introduites (à approuver)

| Règle | Contenu |
|---|---|
| `app.checkin.readinessMapping` 0.1.0-test | Fatigue élevée **ou** récupération mauvaise ⇒ `caution` (dose Strength existante : RIR +1). Toute réponse ⇒ `normal`. Aucune réponse ⇒ `unknown`. |
| `planner.strength.withinWeekVariation.test-0` | À 4 séances, une séance identique à sa jumelle de la semaine est régénérée avec `planned_variation`, à volume par groupe strictement identique, sinon elle est conservée. |

## 7. Non résolu / décisions attendues

1. **`same_discipline_recovery`** : la récupération entre séances de force proches (Strength et bloc CT) est
   signalée, pas gouvernée. Faut-il une règle (écart minimal, groupes, exercices) ?
2. **Substitutions du catalogue** : pec deck, élévations latérales machine et hack squat n'ont aucune substitution
   déclarée, donc le refus est explicite. Le catalogue doit être complété.
3. **Full Body + épaule P2** : les créneaux poussée et tirage obligatoires sont bloqués, donc la séance est
   **reportée** plutôt qu'adaptée. Faut-il une variante Full Body sans haut du corps ?
4. **Séances non régénérables** (HYROX, séance non placée) : le contrôle est enregistré et la pause s'applique, mais
   la séance n'est pas adaptée à la fatigue ou à une douleur localisée ; elle démarre telle quelle (raison
   `KAIRO.CHECKIN_ADAPTATION_NOT_APPLIED`), ou est reportée si une zone exclue est sollicitée ou si la haute intensité
   est suspendue.
5. **5–6 séances/semaine** : à composer (Push/Pull/Legs ou autre) ou à garder désactivées.
6. **Validation des deux règles `TEST_ONLY`** du §6.

## 8. Captures mobiles (360 × 640)

- **Avant** (`musculation-correctifs/avant/`) : matériel présélectionné, fréquences 1–6, trois « Full body » sans
  distinction, démarrage sans contrôle, bouton de série peu visible, chrono masquant le bas de page.
- **Après** (`musculation-correctifs/apres/`, générées par `pnpm kairo:e2e`) :
  - `mu-01` matériel à choisir, `mu-02` matériel choisi ;
  - `mu-03` planning avec les variantes ;
  - `mu-04` contrôle pré-séance, `mu-05` douleur au genou, `mu-06` séance adaptée et panneau de lecture ;
  - `mu-07` matériel indisponible, `mu-08` série suivante visible au-dessus du chrono ;
  - `mu-09` épaule P2 : séance reportée ;
  - `mu-10` volume hebdomadaire et signal de récupération.
