# Reprise RC5 — Lot 4.5 : fiabilisation de la progression musculaire et finalisation des politiques candidates

- **Branche locale isolée :** `claude/rekka-lot45-progression-validation`, créée sur `341fa1f` (lot 4.4). Aucun push, aucune fusion, aucun déploiement, aucune intervention sur BÊTA ou production.
- **Correction intégrée (active) :** le **RIR de référence** est celui de la prescription réellement associée à la séance (§ 3). Elle modifie les charges de certains profils ; chaque écart est expliqué au § 15.
- **Traces ajoutées :**
  - `PROGRESSION.EXPOSURE_CLASSIFIED` reçoit `prescribedRir`, `referenceRir` et `referenceSource` (paramètres facultatifs) ;
  - `DOSE.REDISTRIBUTION_SKIPPED` est émise seulement sous l'option candidate.
- **Rien d'autre n'est activé :**
  - B1, R4, la redistribution et les politiques de progression candidates restent des options de simulation ou des contenus candidats **hors registre** ;
  - aucun seuil scientifique n'est modifié, en particulier la plage de validité de l'estimation (1 à 12 répétitions jusqu'à l'échec) ;
  - aucun planning n'est modifié sans confirmation ; aucune interface n'est modifiée.
- **Rapports reproductibles** (`packages/app-core/tests/rc5/__reports__/`) :
  - `lot45-validation.md` et `.json` : 30 variantes ; 20 profils et 14 scénarios d'athlète ; 12 semaines ;
  - `lot45-exposure-audit.md` : audit par exposition, moteur réel ;
  - commandes au § 12.

## 1. État Git initial

| Élément | État constaté avant toute modification |
|---|---|
| Branche `claude/rekka-lot44-safety-validation` | HEAD `341fa1f`, arbre propre, aucun stash |
| Commit `341fa1f` | présent |
| Documents 09, 10, 11 et rapports des lots 4.2 à 4.4 | présents |
| Politiques actives | personnalisation 1.1 (`primary_need`), récupération 36 h, garde de récupération sur la séance prescrite (4.4), catalogue `0.3.1-strength-test-f6-lot44` |
| Politiques candidates (inactives) | B1 (catalogue de simulation), Q4, Q2, `shortWeek`, `redistributeUnplaced`, `isolationReview`, lecture R4 (`progressionReading`, simulation) |
| Rulesets au registre | hautbas-ab + catalogue 4.4, hautbas-ab + F6, L1b-4, L1-V3, F6, Lock, et leurs versions personnalisées |
| Contrat de données | état persisté v5 ; enregistrement de séance (`session_record`) inchangé depuis le lot 4 |
| BÊTA `claude/rekka-beta` | `bc19fb1`, inchangée (vérifiée au début et à la fin) |
| Production `claude/crosstraining-c1-c2-spike-vbg8dv` | `f9f7e2e`, inchangée (vérifiée au début et à la fin) |

## 2. Audit du RIR de référence

### 2.1 Chaîne tracée

| Étape | Où | Ce qui est fixé |
|---|---|---|
| Profil | `planning.ts` | instantané `strengthProfile` figé avec la semaine (profils personnalisés) |
| Composition | planificateur, `compose` | archétype et emplacements |
| Prescription | moteur, `doseCell` → `personalizedDoseCell` → `computeDose` | cellule **personnalisée** : priorités, prudence novice / récupération limitée / **multisport** (`cautiousRir` = 4) |
| Adaptation multisport et du jour | `computeDose` (modificateurs `interference_rir`, `readiness`), contrôle avant séance | RIR prescrit = référence + allègement du jour |
| Calibration | `computeDose` | première exposition sans suivi : RIR de calibration (3), toute la semaine générée avant l'exécution |
| Affichage | `selectProgrammeSession` | la séance enregistrée, ou adaptée au démarrage |
| Réalisation | `recordProgrammeSet`, `recordProgrammeSetEffort` | charge, répétitions, RIR saisi (dernière série) |
| Historique | `strength.exposures` (séries réalisées), audit du programme | — |
| Progression | `applyStrengthExecutionTraced` → `classifyExposure` / `updateTrack` / `createTrack` | classement contre le RIR **prescrit** (première série de travail) ; charge autorégulée calculée avec le RIR **de la track** |

### 2.2 Défaut démontré

- **Cause :** `createTrack` mémorisait le RIR de la cellule **brute** du ruleset (stimulus × rôle × classe), sans la personnalisation que le moteur applique.
- **Conséquences mesurées :**

| Cas | RIR prescrit | RIR mémorisé par la track (avant 4.5) |
|---|---|---|
| Accessoire personnalisé (leg curl, leg extension, Pallof ; hypertrophie) | 2 ou 3 | 1 |
| Principal d'un profil **multisport** (squat, développé ; prudence multisport) | 4 (6 les jours allégés) | 2 |

- **Effet sur la progression active :** la charge autorégulée est calculée pour « répétitions + RIR de la track ».
  - En multisport, la charge visait donc RIR 2, alors que la séance prescrivait RIR 4, puis 6 les jours de Course voisine.
  - L'athlète, chargé trop lourd pour l'effort prescrit, finissait à RIR 4 sur une séance prescrite à RIR 6. La règle classe cela « en dessous » (4 ≤ 6 − 2), puis applique une baisse de 10 %.
  - C'est la **cause racine** des baisses en bloc Course constatées aux lots 4.3 et 4.4 (« squat 107,5 → 95 »). La plage de l'estimation n'en était pas la cause (§ 6).
- **Lecture R4 (simulation, 4.4) :** la référence était reconstruite depuis la track ; d'où 54 expositions faussement « allégées » sur un profil sans autre sport.
- **Ce qui était déjà juste :**
  - le **classement** d'une exposition utilise le RIR réellement prescrit, première série de travail ;
  - les montées en charge (`rampup`) sont exclues du classement, des preuves et du volume productif ;
  - série lourde et séries de retour (`top_set`, `backoff`) portent le même effort prescrit, et la série lourde est la première série de travail (golden S5).

### 2.3 Points relevés sans défaut

- **Semaine 1 :** toutes les séances sont générées le lundi, avant la première exécution. Les deux premières expositions d'un principal portent donc la prescription de calibration (RIR 3) ; c'est contre elle qu'elles sont classées, ce qui est conforme.
- **Double progression :** le minimum de répétitions progresse (8 → 9 → 10 → 11), puis la charge. Le saut de charge d'une machine (35 → 40 kg) peut être trop grand pour l'athlète, qui redescend ensuite. C'est la granularité existante (§ 15).

## 3. Correction technique effectuée

1. **`referenceCell` (strength, `progression.ts`)** :
   - cellule de référence d'une prescription, personnalisée **exactement** comme le moteur (`personalizedDoseCell`) ;
   - `createTrack` l'utilise, avec la personnalisation et les autres sports du profil de la prescription ;
   - la track neuve porte donc le RIR réellement prescrit, hors allègement du jour.
2. **Référence immuable liée à la prescription** (app-core, `progression.ts`). Le RIR de référence d'une exposition est calculé à partir :
   - de l'**instantané du profil** figé avec la semaine (`strengthProfile`, persisté au format v5) ;
   - du contenu de la **provenance** de la séance (versions du ruleset et du catalogue, registre versionné) ;
   - des modificateurs **durables** (niveau, phase, selon la politique de conflit du ruleset) ;
   - jamais du profil courant d'un profil personnalisé.
3. **Données insuffisantes :** pour un profil personnalisé sans instantané, ou une provenance hors registre, `referenceSource: unknown` est tracé. Aucune référence n'est inventée, et aucune lecture R4 n'est faite sans référence établie.
4. **Trace :** chaque exposition suivie porte `prescribedRir`, `referenceRir` et `referenceSource` (`prescription_profile`, `profile` pour un profil non personnalisé, ou `unknown`).

**Format v5 suffisant, démonstration :**
- l'instantané du profil, la provenance versionnée et la prescription sont **déjà persistés** avec chaque séance ;
- la référence en est une fonction **déterministe** ;
- aucun champ n'est ajouté à `session_record` ni à l'état : pas de migration.

**Option non retenue (soumise à décision, § 16) :** le champ `refs.referenceRir`, ajouté à l'enregistrement de séance comme dans 5e119d6. Il fige la référence elle-même et protège contre une évolution future du calcul, mais c'est une évolution de schéma du CORE. Elle n'est pas appliquée.

**Tests :**
- `rc5-lot45-reference-rir` (10 tests) :
  - accessoire personnalisé : leg curl, RIR 2 ;
  - principal : RIR 2 ;
  - multisport : 4 et 6 ;
  - calibration ;
  - profil modifié **après** la prescription : la référence reste celle de la prescription ;
  - séance ancienne sans instantané : `unknown`, décisions identiques ;
  - track ancienne jamais réécrite ;
  - export / import ;
- `lot45-reference-rir` (strength, 4 tests) :
  - cellule de référence = cellule du moteur, sans et avec personnalisation ;
  - `createTrack` ;
  - série lourde et séries de retour (golden S5) : même effort, montées sans effort.

## 4. Compatibilité historique

- **Réalisations, expositions et tracks existantes :** jamais réécrites. Une track créée avant 4.5 garde son RIR mémorisé (test), donc la continuité de la progression est préservée.
- **Séances anciennes :**
  - elles sont relues avec leur contenu d'origine (registre inchangé) ;
  - leur référence est calculée si l'instantané et la provenance existent, ce qui est le cas des semaines personnalisées depuis RC5 lot 1 ; sinon `unknown`.
- **Double application des adaptations multisport :** aucune.
  - Le RIR de la prescription est toujours recalculé par `computeDose`, jamais relu depuis la track.
  - La référence n'entre que dans le calcul de charge autorégulée et dans les traces.
- **Export / import et rechargement :** identiques (tests). La migration navigateur depuis les builds historiques est au § 13.
- **Taille de l'état :** +1 % environ (3 Ko après 4 semaines, 42 Ko après 52 semaines), à cause des trois paramètres de trace.

## 5. Analyse des séances allégées

Audit par exposition (`lot45-exposure-audit.md`). Chaque exposition d'un principal y est reconstituée :
- prescription et référence ;
- allègement ;
- performance et répétitions jusqu'à l'échec, validité de l'estimation ;
- classement, décision, charge suivante.

| Scénario | Lecture (moteur actif 4.5) |
|---|---|
| Bloc Course, athlète qui progresse | toutes les séances Bas sont **allégées** (prescrit 6, référence 4). L'athlète répond à RIR 5–6 : **aucun « en dessous »**, aucune baisse ; squat 100 → 107,5 (4.4 : 107,5 → 95, deux « en dessous » à tort) |
| Fatigue persistante (Course, −1 %/semaine) | RIR 3 sur une séance prescrite à 6 : classée « en dessous » (effort nettement plus dur, répété), baisse −10 % ; puis RIR 8, hors plage. La difficulté est **détectée**, mais la charge oscille (102,5 → 90 → 95 → 85) |
| HYROX intensif | référence 4, séances non allégées ; l'athlète passe de RIR 4 à RIR 6 sur 5 expositions, charge maintenue à 100 kg. Progression **lente** : lissage de l'e1RM, peu d'expositions |
| Accessoire (leg curl), profil qui progresse | double progression normale ; saut de 5 kg trop grand pour l'athlète, puis retour (granularité) |

**Distinctions demandées, réalisées par la trace :**
- **séance volontairement allégée :** RIR prescrit supérieur à la référence ;
- **sous-performance réelle :** « en dessous » sur une séance non allégée ;
- **effort plus dur que la cible allégée :** « en dessous » sur une séance allégée. Ce n'est **pas** un échec démontré : un RIR réalisé plus faible que prescrit signifie un effort plus dur que prévu, pas à lui seul une perte de capacité ;
- **performance non interprétable pour l'estimation :** répétitions jusqu'à l'échec hors plage ;
- **données insuffisantes :** effort non saisi, ou référence `unknown`.

**Fatigue temporaire et fatigue persistante :** elles ne se distinguent qu'à l'échelle de plusieurs expositions (scénarios dédiés, § 7).

## 6. Étude de sensibilité de l'estimation de capacité

**Plage active inchangée :** 1 à 12 répétitions jusqu'à l'échec. Plages candidates mesurées en simulation, sur 14 scénarios et la politique actuelle :

| Plage | Hausses | Baisses | En dessous juste après une hausse | Au-dessus juste après une baisse | Effet notable |
|---|---|---|---|---|---|
| 12 (actuelle) | 1621 | 114 | 117 | 97 | — |
| 10 | 1610 | 114 | 119 | 97 | moins de progression : Course, squat 107,5 → 102,5 ; profil qui progresse 105 → 100 |
| 15 | 1622 | 114 | 118 | 97 | quasi identique |
| 20 | 1622 | 114 | 118 | 97 | quasi identique |

- **Conclusion :** depuis la correction de la référence, la plage n'est **plus le facteur limitant**. En bloc Course, l'effort reste dans la plage (11–12). L'hypothèse du lot 4.4 (« l'e1RM cesse d'être mis à jour au-delà de 12 ») ne décrivait qu'un effet secondaire du défaut de référence.
- Élargir la plage n'apporte rien de mesurable ; la réduire freine la progression. **Recommandation : ne pas modifier la plage.**

## 7. Comparaison des politiques de progression

**Banc :** moteur de progression réel, 14 scénarios.
- Athlète qui progresse, stagne ou est en difficulté.
- Fatigue temporaire ou persistante.
- Bloc Course (progresse, stagne) et HYROX intensif.
- Séances manquées, reprise après interruption, alternance A/B avec HYROX.
- Transfert Full Body → A/B, RIR imprécis (±1), changement de programme.

**Indicateurs de décision non justifiée :**
- exposition « en dessous » juste après une hausse (hausse prématurée) ;
- exposition « au-dessus » juste après une baisse (baisse injustifiée).

**Synthèse sur les 14 scénarios :**

| Politique (simulation) | Hausses | Baisses | En dessous après hausse | Au-dessus après baisse | Suspendues | Lecture |
|---|---|---|---|---|---|---|
| Actuelle (référence corrigée) | 1621 | 114 | 117 | 97 | 0 | référence |
| Exclusion des séances allégées (R4 seul) | 1515 | 98 | 105 | 86 | 0 | **gel** du multisport : Course, squat 100 → 100 ; A/B + HYROX gelé |
| Évaluation spécifique (allégée jugée contre la référence, deux sens) | 1627 | 104 | **135** | 89 | 0 | plus de hausses suivies d'un échec |
| Fatigue persistante (variante 6) | 1616 | 115 | 121 | 94 | 0 | maintient la charge d'un athlète **en difficulté** (100 au lieu de 92,5) et accentue la baisse en Course qui stagne (90) : rejetée |
| **Estimation conservatrice hors plage** | 1520 | **77** | **77** | **67** | 0 | **−34 % de décisions non justifiées**, charges finales des principaux identiques à l'actuelle dans 13 scénarios sur 14, difficultés toujours détectées (difficulté 92,5 ; fatigue persistante 85) |
| Suspension faute d'estimation fiable | 1617 | 113 | 116 | 95 | 13 | effet marginal ; Course qui stagne 92,5 (pire) |
| Évaluation spécifique + estimation conservatrice | 1450 | 92 | 74 | 80 | 0 | moins de progression (Course : 58 hausses au lieu de 88) |

- **Comportement déterministe :** chaque fragment rejoue un profil témoin à l'identique.
- **Recommandation :**
  - R4 (toutes variantes) et la règle de sécurité de la variante 6 **ne sont pas recommandés** ;
  - la politique candidate à instruire est l'**estimation conservatrice hors plage** : un effort déclaré au-delà de la plage est lu au plafond de la plage, sans modifier la plage. Son activation reste une décision (§ 16).

## 8. Résultats B1

**Vérifications :**
- **Muscles principaux et synergistes :** convention B1. Les bras sont des synergistes des poussées et tirages polyarticulaires ; les fessiers restent principaux des exercices à dominante genou.
- **Catalogue candidat versionné :** `catalog-b1-candidate.ts`. Les familles, classes d'équivalence, substitutions, matériel et coûts sont inchangés (test).
- **Volume direct et volume indirect** restent distincts. Le décompte du registre et celui de la convention de la variante sont tous deux rapportés.

**Réévaluation contrôlée des isolations, corrigée au lot 4.5 (anti-oscillation) :**
- Le lot 4.4 la mesurait sur une seule séance par semaine. Sur 12 semaines et en Full Body 3×, elle provoquait une **rotation quasi permanente** (L41-H3 : 12 changements, dont 10 retours à un exercice déjà quitté).
- **Cause :** les trois séances Full Body d'une semaine partagent le même emplacement d'isolation et voient le volume prévu des précédentes. Le pec deck couvre les pectoraux, donc la séance suivante bascule sur l'élévation latérale, et inversement.
- **Règle candidate :** jamais de retour à un exercice récemment **quitté** sur cet emplacement (expositions réalisées récentes). La continuité redevient prioritaire.
- **Résultat :** L41-H3 passe à 3 changements et 1 oscillation, en conservant le gain (pectoraux 9,5).

**Comparaison (20 profils, 12 semaines ; déficit = séries manquantes sous les cibles, somme sur les profils ; décompte du registre) :**

| Variante | Déficit cumulé | Isolations : changements / oscillations | Principaux changés | Durée max | Violations |
|---|---|---|---|---|---|
| Moteur actuel | 112,0 | 9 / 3 | 298 | 52 | 0 |
| B1 seul | 61,2 | 4 / 0 | 277 | 52 | 0 |
| B1 + Q4 (contre-exemple) | 67,0 | 12 / 4 | 277 | 53 | 0 |
| **B1 + réévaluation (anti-oscillation)** | **58,0** | 13 / 4 | 277 | 52 | 0 |
| B1 + réévaluation, poids indirect 0,25 | 91,9 | 21 / 5 | 277 | 53 | 0 |
| B1 + réévaluation, poids indirect 0,75 | 77,6 | 9 / 4 | 300 | 52 | 0 |

**Profils décisifs (pectoraux / épaules / bras ; bras selon la convention B1 entre crochets) :**

| Profil | Actuel | B1 | B1 + Q4 | B1 + réévaluation |
|---|---|---|---|---|
| L41-FORME (forme générale 3×) | 6 / 5,3 / 8 [8] | **3,3** / 4,8 / 11,1 [6] | 6 / 5,4 / 10,6 [5,7] | **5,8** / 5,4 / 10,6 [5,7] |
| L41-H3 (Full Body 3×) | 4,8 / 7,8 / 14 | 9,5 / 8,7 / 15,3 [8,5] | **5,1** / 7,9 / 15,7 | **9,5** / 8,7 / 15,3 [8,5] |
| L42-RUN3 (3× + Course) | 7,5 / 6,2 / 9,7 | 7,5 / 6,6 / 11,1 [6,5] | **3,2** / 6 / 11,3 | **7,5** / 6,6 / 11,1 [6,5] |

**Lecture :**
- B1 + réévaluation corrige la régression de la forme générale **sans** les reculs de B1 + Q4.
- Les principaux sont identiques à B1 sur les 20 profils : la continuité des charges des principaux est préservée.
- Les priorités musculaires sont respectées (L4-1 et L41-H4P sans déficit).
- Les bornes hautes, durées, matériel et exclusions sont respectés (contrôles transverses).

**Exercice remplacé par la réévaluation :**
- l'isolation remplacée ouvre une **nouvelle** track (calibration) ;
- **aucun transfert** de suivi n'est fait : deux isolations de groupes différents ne sont pas équivalentes, et un transfert serait ambigu.

**Poids indirect (0,5) :**
- les résultats y sont **très sensibles** : 0,25 dégrade nettement, 0,75 dégrade aussi ;
- c'est une hypothèse de convention, pas une vérité physiologique (décision F9).

**Contenu candidat complet `CAND-B1ISO` :**
- il est mesuré tel qu'il serait publié ;
- volumes identiques à la variante de simulation B1ISO (même catalogue B1, même politique).

## 9. Résultats de redistribution

**Cause de la sous-dose :** quand une séance n'est pas placée, la part de cible de sa région est perdue (lot 4.4).

**Variantes candidates (options de la politique, toutes inactives) :**
- `redistributeUnplaced` : la part se calcule sur les séances réellement placées ;
- `redistributeScope: 'deficit'` : seule la cible des groupes sous leur plancher bénéficie de la redistribution ; la part de borne haute reste calculée sur les séances demandées ;
- `redistributeScope: 'priority'` : seuls les groupes des priorités déclarées en bénéficient ;
- `redistributeGuard: 'keep_residual'` : une séance qui perdrait un emplacement à temps résiduel (mollets) est d'abord régénérée avec la redistribution limitée aux emplacements ordinaires de la séance sans redistribution ; à défaut, sans redistribution. Raison tracée : `DOSE.REDISTRIBUTION_SKIPPED`.

**Mesures** (séries prévues / semaine ; déficit = séries manquantes sous les cibles, par semaine) :

| Profil | Actuel | Redistribution | Groupes sous cible | Priorités | Avec garde | Sous cible + garde | Région alternée + redistribution | Région alternée + garde |
|---|---|---|---|---|---|---|---|---|
| L43-HYX3 (HYROX intensif), déficit | 17,7 | 14,5 | 15,5 | 17,7 | 14,5 | 15,5 | **10,0** | **10,0** |
| L4-2 (HYROX 2×), déficit | 14,2 | **9,3** | 10,4 | 14,2 | **9,3** | 10,4 | 12,0 | 12,0 |
| L42-SHORT (semaines courtes), déficit | 5,8 | 3,9 | 4,4 | 5,8 | 5,8 | 5,4 | 4,3 | 4,6 |
| L42-SHORT, mollets | 3,3 | **2,7** | 2,9 | 3,3 | 3,3 | **3,4** | 3,3 | **3,5** |
| L42-SHORT, durée max (min) | 44 | 49 | 51 | 44 | 44 | 51 | 51 | 51 |

- Les 17 autres profils (toutes séances placées) sont **strictement identiques** au moteur actuel, pour toutes les variantes.
- **Invariants vérifiés sur toutes les variantes :**
  - aucune borne haute dépassée là où le moteur actuel ne la dépassait pas ;
  - aucune durée dépassée ;
  - séances planifiées identiques (redistribution seule) ;
  - 0 séance sous 36 h, 0 violation du matériel ou des exclusions ;
  - charges inchangées : aucune hausse artificielle.

**Cas des mollets :**
1. **Cause exacte :** en semaine courte, la séance Bas reçoit plus de séries sur les isolations (leg extension, leg curl, jusqu'à 4 séries), et parfois des emplacements facultatifs ordinaires (fentes, tronc). Elle passe de 39–41 à 47–49 min, et l'emplacement des mollets, à temps résiduel, ne tient plus.
2. **Garde seule :** sur L42-SHORT, elle renonce à la redistribution (déficit 5,8, comme l'actuel). La limite aux emplacements ordinaires ne suffit pas : ce sont les séries supplémentaires des isolations qui consomment le temps.
3. **Allocation qui conserve le volume :** « groupes sous la cible + garde » donne mollets 3,4 (≥ 3,3) et déficit 5,4 ; « région alternée + garde » donne mollets 3,5 et déficit 4,6.
4. Le compromis existe donc **sans** dégrader les objectifs prioritaires.
5. **Coût :** un gain moindre sur les profils HYROX (14,5 → 15,5 ; 9,3 → 10,4) pour la variante « groupes sous la cible + garde ».

**Redistribution par priorités :**
- sans effet ici, car aucun des profils concernés ne déclare de priorité sur le bas du corps ;
- elle ne remplace pas une redistribution générale.

**Contenu candidat complet `CAND-RED-GUARD` (redistribution + garde) :**
- mesuré tel qu'il serait publié, avec des volumes identiques à la variante de simulation ;
- il garde le gain complet sur les profils HYROX et n'abîme jamais les mollets.

**Explication utilisateur prévue :** quand la garde renonce à la redistribution, la raison `DOSE.REDISTRIBUTION_SKIPPED` (`residual_slot_lost`) est disponible pour un message du type « Volume de la séance manquante non reporté : il aurait supprimé le travail des mollets dans le temps disponible ».

## 10. Stratégie de versionnement des rulesets

- **Contenus candidats** (`strengthCandidateContent`, app-core) :
  - construits sur le contenu personnalisé **courant** ;
  - seule la politique de personnalisation diffère par les options déclarées (test) ;
  - le paramètre de politique porte une version suffixée `-candidate-<id>`.
- **Versions déterministes :**
  - B1 : ruleset `….personalization-v1-1.candidate-b1iso`, catalogue `0.3.2-strength-test-f6-lot44-b1-candidate` (fixture `catalog-b1-candidate.ts`, convention B1 versionnée) ;
  - redistribution : `….personalization-v1-1.candidate-red-guard`.
- **Hors registre des utilisateurs** (`strengthContentRegistry`), et hors environnement Beta 0 : aucune semaine réelle ne peut être générée avec eux (test).
- **Interprétabilité, démontrée par test et par le banc :**
  - une séance générée avec un candidat porte sa provenance et passe l'export / import à l'identique ;
  - mais `strengthEnvironmentFor` ne la relit pas tant que la version n'est **pas publiée au registre** ;
  - la référence RIR de ses expositions est donc `unknown` (banc : toutes les variantes de contenu).
- **Ordre d'activation, à valider :**
  1. publier la version au registre (relecture, régénération, référence RIR) ;
  2. l'utiliser pour les nouvelles semaines des profils concernés ;
  3. les semaines existantes gardent leur contenu.
- **Compatibilité historique :** inchangée. Les versions existantes restent au registre et aucune séance n'est réécrite.

## 11. Simulations sur douze semaines

**Campagne :**
- 20 profils (lots 4.1 à 4.4) et 14 scénarios d'athlète, 12 semaines ;
- 30 variantes : moteur actif, 9 variantes de progression, 5 variantes B1, 9 de redistribution, 2 contenus candidats ;
- contraintes de matériel et de disponibilité variées, priorités musculaires ;
- semaines incomplètes, séances manquées ou commencées, séances allégées ;
- historiques de progression et changement de programme.

**Indicateurs du rapport :**
- séances prévues, placées et faites ;
- volume prévu (décompte du registre et convention de la variante), écart aux cibles, groupes sous la cible et à la borne haute ;
- durée ; récupération ;
- continuité (principaux changés ; isolations : changements et oscillations) ;
- charges des principaux, de départ à fin, et baisses ; décisions par cause ; décisions suspendues ;
- référence RIR établie ou inconnue ; violations du matériel et des exclusions.

**Contrôles transverses, toutes variantes :**
- 0 erreur, 0 séance sous 36 h, 0 durée dépassée, 0 violation ;
- redistribution jamais au-delà d'une borne haute et séances planifiées identiques à A ;
- déterminisme vérifié.

**Moteur actif face au lot 4.4 :**
- **volumes, séances prévues et refusées :** identiques sur les 20 profils ;
- **charges :** seuls écarts, dus à la correction de la référence (§ 15).

## 12. Tests unitaires et E2E

| Contrôle | Résultat |
|---|---|
| `pnpm typecheck`, `pnpm lint` | verts |
| `pnpm test` | **294 fichiers, 3277 tests verts**, 9 ignorés (bancs sur demande) ; premier passage : 1 échec (`r51-planning-grid-dom`, trace ajoutée), cause traitée au § 12 |
| Tests ajoutés | `rc5-lot45-reference-rir` (10), `rc5-lot45-candidates` (7), `rc5-lot45-exposure-audit` (2, rapport), `lot45-reference-rir` (strength, 4) |
| Strength : unitaires, goldens, architecture | verts (388 tests ; goldens inchangés : options inactives) |
| Planification, personnalisation, sauvegarde, restauration, export / import, hors ligne | verts (suites existantes) |
| Banc du lot 4.5 (7 fragments, fusion) | vert : contrôles transverses et déterminisme |
| Architecture | verte. Liste fermée `STRENGTH_RC5_LOT45_CHANGES` : fixture B1 candidate et test ; fichiers `src` couverts par les listes existantes |
| E2E BÊTA (`dist-beta`, port 4174) | rotation A/B, phases, chronomètre, personnalisation (390 px), séance et répétitions mobiles (390 px), jours de Musculation, hors ligne : **tous verts** |
| Parcours complets | base, cross, hyrox, recovery, planning : **verts** |
| E2E standard (`e2e.mjs`) | **310 vérifications OK** |
| Horloge globale et stockage (serveur de développement) | vert |
| Garde de sécurité des données | vert |
| 360 / 390 px | aucune interface modifiée ; E2E mobiles à 390 px existants verts |

**Tests adaptés, chacun justifié par la correction de la référence (§ 15) ; aucun résultat masqué :**
- rapports figés `lot4-simulations`, `lot41-simulations` et `strength-scenario-*` (taille d'état seulement) ;
- `state-size` : +1 % ;
- `rc5-lot43-planning` : l'identité avec bfedde1 est restreinte à la planification ; l'écart de charges L4-2 est nommé et vérifié ;
- `r51-planning-grid-dom` : la traduction de comparaison des fixtures ignore les trois paramètres de trace ajoutés ; les fixtures sont inchangées.

**Séries de travail :**
- `rampup` : exclues du classement, des preuves et du volume (tests existants et nouveaux) ;
- `working`, `top_set` et `backoff` : classement sur la première série de travail, même effort prescrit pour la série lourde et ses séries de retour (golden S5).

**Régénération :**

```sh
cd packages/app-core
for s in A 'B-R4,B-REF,B-V6' 'B-CLAMP,B-SUSP,B-REFCL' 'B-RNG10,B-RNG15,B-RNG20' 'B1,B1Q4,B1ISO,B1ISO-25,B1ISO-75' 'RED,RED-DEF,RED-PRIO,RED-GUARD,RED-DEF-GUARD' 'SW-ALT+RED-GUARD,SW-FB+RED-GUARD,SW-ALT+RED,SW-FB+RED,CAND-B1ISO,CAND-RED-GUARD'; do LOT45_BENCH=1 LOT45_SHARD="$s" npx vitest run tests/rc5/rc5-lot45-bench.test.ts; done
LOT45_MERGE=1 npx vitest run tests/rc5/rc5-lot45-bench.test.ts
```

## 13. Migrations navigateur

**Méthode :** les builds historiques sont servis tels quels ; leurs données sont créées dans le navigateur, puis la page est rouverte avec le build du lot 4.5.

| Build historique | Schéma | Résultat |
|---|---|---|
| `5695917` (V2.1) | v3 → v5 | **3 / 3 PASS** |
| `b850b98` | v4 → v5 | **4 / 4 PASS** |
| Garde de stockage (build V2.1) | — | **OK** |

**Vérifié :**
- anciennes semaines et anciennes prescriptions : relues avec leur contenu d'origine ;
- séances commencées ou terminées et charges enregistrées : conservées, jamais réécrites ;
- aucune migration de schéma ajoutée : format v5 inchangé.

**Aucune activation involontaire :**
- l'environnement Beta 0 ne contient ni lecture R4 ni option candidate ;
- les contenus candidats sont hors registre (tests).

## 14. Liste des fichiers modifiés

- `apps/kairo/tests/r51-planning-grid-dom.test.tsx`
- `packages/app-core/src/progression.ts`
- `packages/app-core/src/provisional-content.ts`
- `packages/app-core/tests/longitudinal/__reports__/state-size.md`
- `packages/app-core/tests/longitudinal/__reports__/strength-scenario-a-sans-rir.md`
- `packages/app-core/tests/longitudinal/__reports__/strength-scenario-a.md`
- `packages/app-core/tests/longitudinal/__reports__/strength-scenario-b.md`
- `packages/app-core/tests/rc5/__reports__/lot4-simulations.md`
- `packages/app-core/tests/rc5/__reports__/lot41-simulations.md`
- `packages/app-core/tests/rc5/lot42-bench.ts`
- `packages/app-core/tests/rc5/lot44-bench.ts`
- `packages/app-core/tests/rc5/rc5-lot43-planning.test.ts`
- `packages/crosstraining/tests/architecture/crosstraining-architecture.test.ts`
- `packages/planner/src/ports.ts`
- `packages/strength/src/codes.ts`
- `packages/strength/src/engine.ts`
- `packages/strength/src/personalization-contract.ts`
- `packages/strength/src/progression.ts`
- `packages/strength/src/selection.ts`
- `docs/kairo/reprise/12-RC5-LOT4-5-PROGRESSION-VALIDATION.md`
- `packages/app-core/tests/rc5/__reports__/lot45-exposure-audit.md`
- `packages/app-core/tests/rc5/__reports__/lot45-shard-A.json`
- `packages/app-core/tests/rc5/__reports__/lot45-shard-B-CLAMP_B-SUSP_B-REFCL.json`
- `packages/app-core/tests/rc5/__reports__/lot45-shard-B-R4_B-REF_B-V6.json`
- `packages/app-core/tests/rc5/__reports__/lot45-shard-B-RNG10_B-RNG15_B-RNG20.json`
- `packages/app-core/tests/rc5/__reports__/lot45-shard-B1_B1Q4_B1ISO_B1ISO-25_B1ISO-75.json`
- `packages/app-core/tests/rc5/__reports__/lot45-shard-RED_RED-DEF_RED-PRIO_RED-GUARD_RED-DEF-GUARD.json`
- `packages/app-core/tests/rc5/__reports__/lot45-shard-SW-ALT+RED-GUARD_SW-FB+RED-GUARD_SW-ALT+RED_SW-FB+RED_CAND-B1ISO_CAND-RED-GUARD.json`
- `packages/app-core/tests/rc5/__reports__/lot45-validation.json`
- `packages/app-core/tests/rc5/__reports__/lot45-validation.md`
- `packages/app-core/tests/rc5/lot45-bench.ts`
- `packages/app-core/tests/rc5/lot45-report.ts`
- `packages/app-core/tests/rc5/rc5-lot45-bench.test.ts`
- `packages/app-core/tests/rc5/rc5-lot45-candidates.test.ts`
- `packages/app-core/tests/rc5/rc5-lot45-exposure-audit.test.ts`
- `packages/app-core/tests/rc5/rc5-lot45-reference-rir.test.ts`
- `packages/strength/tests/fixtures/catalog-b1-candidate.ts`
- `packages/strength/tests/unit/lot45-reference-rir.test.ts`

## 15. Régressions éventuelles

| Écart (moteur actif, 4.4 → 4.5) | Cause | Jugement |
|---|---|---|
| Course (L41-RUN) : squat 100 → 97,5 avec une baisse **devient** 100 → 107,5 sans baisse ; soulevé de terre roumain 90 → 90 avec une baisse devient 90 → 95 | référence corrigée : la charge est calculée pour l'effort prescrit | **correction** du défaut des lots 4.3 et 4.4 |
| HYROX (L4-2) : développé 70 → 75 devient 70 → 70 ; militaire 45 → 47,5 avec une baisse devient 45 → 45 sans baisse | référence multisport 4 au lieu de 2 : avec un pas de 5 kg, 75 kg demanderait un e1RM ≥ 100 ; l'athlète simulé atteint environ 99 en S12 | progression plus lente du haut du corps en multisport, mais sans hausse au-delà de l'effort prescrit ni baisse consécutive. **Pas de hausse artificielle.** À arbitrer, § 16 (lissage, granularité) |
| Lot 4, profil HYROX à 40 kg déclarant « RIR prescrit + 1 » : développé et militaire 40 → 45 deviennent 40 → 40 | idem : estimation ≈ 41 kg pour RIR 4, pas de 5 kg | idem |
| HYROX intensif (scénario E-HYX) : squat 100 → 105 (4.4) devient 100 → 100 | idem, et seulement 5 expositions | idem |
| Taille de l'état : +1 % | trois paramètres de trace par exposition suivie | accepté (traçabilité demandée) |

**Régressions non acceptées, corrigées dans les candidats :**
- B1 + réévaluation en Full Body : **rotation quasi permanente** (12 changements, dont 10 oscillations). Corrigée par l'anti-oscillation (§ 8).
- Redistribution en semaine courte : **mollets 3,3 → 2,7**. Une allocation qui conserve ce volume existe ; elle est comparée au § 9.

## 16. Décisions scientifiques restant ouvertes

| N° | Sujet | Options | Recommandation |
|---|---|---|---|
| F1 | Référence RIR figée dans l'enregistrement de séance | v5 (calcul déterministe depuis l'instantané et la provenance, en place) / champ `refs.referenceRir` (évolution de schéma) | garder v5 ; ajouter le champ seulement si le calcul de la cellule doit évoluer |
| F2 | Tracks créées avant 4.5 (référence brute) | inchangées / réalignées à la prochaine frontière de cycle | inchangées (continuité) ; réalignement à décider, profil par profil |
| F3 | Estimation conservatrice hors plage | ne pas activer / activer | instruire puis activer : −34 % de décisions non justifiées, sans effet sur les charges finales |
| F4 | R4 (toutes variantes) et règle de sécurité de la variante 6 | — | **ne pas activer** |
| F5 | Plage de validité de l'estimation (12) | inchangée / 15 / 20 | **inchangée** (aucun gain mesurable) |
| F6 | Progression lente en multisport (lissage médian, pas de 5 kg) | inchangée / pas plus fin pour les barres / lissage pondéré | à instruire (seuils scientifiques) |
| F7 | B1 + réévaluation des isolations | voir § 8 et § 17 | |
| F8 | Redistribution | voir § 9 et § 17 | |
| F9 | Poids des contributions secondaires (0,5) | inchangé | hypothèse, résultats sensibles (§ 8) : décision scientifique |

## 17. Recommandations d'activation

| Politique | État au lot 4.5 | Recommandation |
|---|---|---|
| Référence RIR de la prescription | **intégrée** (correction technique) | conserver |
| Estimation conservatrice hors plage | candidate (simulation) | **activer après validation** (F3) : moins de décisions non justifiées, mêmes charges finales |
| R4 (toutes variantes), variante 6 | candidates (simulation) | **ne pas activer** (gel du multisport, maintien de charge en difficulté) |
| Plage de validité de l'estimation | inchangée | **ne pas modifier** |
| B1 + réévaluation des isolations (anti-oscillation) | contenu candidat `CAND-B1ISO`, hors registre | **activable après validation** ; ne pas combiner avec Q4. Ordre : 1) publier la version au registre, 2) nouvelles semaines seulement |
| Redistribution | contenu candidat `CAND-RED-GUARD`, hors registre | **activable après validation**, avec garde. Arbitrer « garde seule » (gain HYROX complet) face à « groupes sous la cible + garde » (mollets conservés en semaine courte avec un gain réduit) ; puis la proposer d'abord via les propositions confirmées |
| Région alternée + redistribution (HYROX intensif) | stratégie de proposition + contenu candidat | meilleure combinaison mesurée (déficit 17,7 → 10,0) ; à proposer après publication du contenu |

**Rien n'est activé.** Toute activation scientifique ou publication attend une validation explicite.

## 18. Hash du commit local

Commit local unique de la branche `claude/rekka-lot45-progression-validation`, parent `341fa1f` ; hash donné dans le compte rendu final (un commit ne peut pas contenir son propre hash). Aucun push.
