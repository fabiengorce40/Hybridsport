# Gate Course : rapport

Périmètre : moteur Course (`packages/running`) après R5, et sa connexion à KAIRO. Le planificateur global, le Cross-training et HYROX ne sont **pas** commencés.

## 1. Verdict

| Critère | Résultat |
|---|---|
| Mutation Running : dette Wave 2 (lots 2 et 3) et nouveaux modules | **94,1 %** tués sur 3 023 mutants ; les survivants restants sont classés équivalents ou inatteignables (§3) |
| Défauts réels trouvés pendant le gate | **2**, corrigés avec un test de régression qui échouait avant (§4) |
| Revue adverse (propriétés) | Composition §R, séances manquées §W, cibles d'allure : invariants tenus sur 300 à 400 cas chacun |
| Déterminisme | Composition, pipeline, TEST, application : même entrée ⇒ même sortie, ordre des entrées sans effet |
| CORE et Strength | **0 ligne modifiée** depuis `b3ea988` |
| Vérifications | Typecheck, lint, **1 264 tests**, build PWA, e2e Chromium : verts |

**RUNNING_COURSE_GATE = PASSED (simulation).** Le moteur reste en gouvernance **candidate** : rien n'est approuvé, et la production reste fermée (socle G1 non signé). Le gate porte sur la solidité du code et des règles implémentées, pas sur une validation experte.

## 2. Mutation (Stryker)

Méthode :
- lanceur `command` sur la suite Running, un worker vitest, `--bail=1`, 4 workers Stryker ;
- configurations : `stryker/running-course-gate/*.json`.

Le lanceur `@stryker-mutator/vitest-runner` a été **écarté** : avec vitest 5, il rapportait comme survivants des mutants que la suite tue. Vérification manuelle faite, résultats jetés.

| Lot | Fichiers | Passe 1 | Passe 2 | Final |
|---|---|---|---|---|
| G1 | `wave2/history.ts` | 89,8 % | 96,5 % | **96,5 %** (304 / 315) |
| G2 (dette L2) | `wave2/pipeline.ts` | 65,8 % | 85,5 % | **89,4 %** (857 / 959) + 3 tués vérifiés à la main après le dernier passage |
| G3 (dette L3) | `wave2/proposal.ts`, `engine.ts` | 84,5 % | **94,6 %** (159 / 168) | — |
| G4 | `wave3/*` : gardes, structure, progression, première exposition, allure, TEST | 67,4 % | 96,4 % | **97,2 %** (958 / 986) |
| G5 | `week/compose.ts`, `week/missed.ts` | 65,8 % | 93,7 % | **95,1 %** (547 / 575) |
| G6 | `governance/product-decisions.ts` (fonction) | 90,0 % | 90,0 % | **100 %** (20 / 20) |

Travail entre les passes : tests unitaires directs des modules, testés jusque-là seulement en intégration.
- Branches fail-closed : toute valeur de registre illisible ⇒ refus.
- Frontières exactes.
- Caractérisation **relue** des traces d'audit du pipeline.
- Étapes de rejet.
- Traces des avis.

## 3. Survivants restants : classement

Aucun survivant tuable n'est laissé sans explication. Catégories :

- **Équivalents** :
  - comparateurs de tri sur des clés uniques ou déjà triées (`<` / `<=`, `-1/0`) ;
  - chaînage optionnel sur une valeur toujours définie ;
  - `status === 'resolved'` → `true` (une valeur non résolue est `undefined`, donc même refus) ;
  - vérifications `typeof` redondantes avec zod ou `Number.isFinite` ;
  - champs non lus de la séance d'amorce de première exposition ;
  - valeurs par défaut jamais utilisées ;
  - V31 et V40, toujours non résolus.
- **Inatteignables** :
  - « paramètre utilisé absent du registre » ;
  - « structure non dérivable » (invariants) ;
  - CORE sans CORE-EXT-R1 (le CORE actuel le fournit toujours) ;
  - socle non éligible en PRODUCTION (bloqué dès l'éligibilité) ;
  - catalogue de test à un seul exercice de course.
- **Limite connue** : ordre de tri des survivants dans `missed.ts` quand une séance porte à la fois la même date et le même archétype. Le cas est sans effet observable, car un seul départ est possible par jour.

## 4. Défauts réels trouvés et corrigés

1. **V10 : séance intense comptée deux fois** (composition §R et §W).
   - Défaut : une séance faite cette semaine figure dans l'historique ET comme séance verrouillée ou planifiée. Elle était comptée deux fois, ce qui pouvait refuser à tort une seconde séance légitime (sortie longue du semi).
   - Correctif : même jour ⇒ même séance (`818e950`).
2. **Seconde sortie longue** (semi, sortie longue déjà faite).
   - Défaut : si le seuil était refusé, la boucle KEY pouvait placer une seconde LONG.
   - Correctif : LONG exclue comme KEY quand elle est déjà faite (`ca3e381`).

Revue (hors mutation) : aucune autre anomalie.
- Les allures observées aberrantes ne produisent qu'un refus (temps dépassé), jamais une dose.
- La recomposition coûte quelques dizaines de ms.

## 5. Revue adverse (propriétés)

- `r5-week-properties.test.ts` :
  - une séance par jour, séances verrouillées intactes ;
  - V11 et V10 glissant (réalisé + planifié), au plus une KEY / TEST ;
  - maintien = EASY ;
  - jamais une séance refusée par le moteur ;
  - déterminisme ;
  - §W : EASY abandonnée, déplacement vers un jour libre hors zone gelée, unique, non adjacent à une forte demande, accepté par le moteur.
- `r5-pace-properties.test.ts` (non vide, vérifié) :
  - allure CIBLE seulement pour SEVERE / SHORT_INTERVAL, avec montre, capacité et ancre de 3 à 5 km ;
  - jamais pour le TEST ;
  - jamais hors du bloc de travail.

## 6. Ce que le gate ne couvre pas

- **Validation experte** : aucune valeur n'est approuvée. Décisions produit D1 à D6 candidates ; HILLS (première séance), RACE_PACE, STRIDES, V40 (allure facile), V31, V33 / V34 : non résolus ou bloqués.
- **Multisport** : une course combinée à un autre sport (P-HYBRID) reste refusée, car le planificateur global n'est pas commencé.
- **Application** : aucune saisie de résultat de course officiel (seuls les TEST enregistrés deviennent des références).
- **Backlog UI** de la revue V0 : non traité (hors périmètre).
