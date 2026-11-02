# Reprise RC5 — Lot 4.4 : sécurisation du moteur sportif et validation des politiques candidates

- **Branche locale isolée :** `claude/rekka-lot44-safety-validation`, créée sur `7cc8abd` (lot 4.3). Aucun push, aucune fusion, aucun déploiement, aucune intervention sur BÊTA ou production.
- **Corrections appliquées (actives) :**
  - **sécurité de récupération** : la règle existante (36 h, même région, Full Body chevauchant tout) est contrôlée sur la séance **réellement prescrite** (§ 3) ;
  - **catalogue versionné** : deux muscles secondaires manquants ajoutés (§ 4).
- **Rien d'autre n'est activé :**
  - options candidates **inactives** : redistribution du volume non placé (C), réévaluation contrôlée des isolations (D), lecture R4 / R3 de la progression (E) ;
  - aucun seuil scientifique modifié, aucune politique B1 ou R4 activée ;
  - aucune replanification appliquée sans confirmation ; aucune interface modifiée.
- **Rapports reproductibles** (`packages/app-core/tests/rc5/__reports__/`) :
  - `lot44-validation.md` et `.json` : 17 variantes, 20 profils et 12 scénarios d'athlète, 12 semaines ;
  - commandes de régénération au § 10.

## 1. État Git initial

| Élément | État constaté avant toute modification |
|---|---|
| Branche `claude/rekka-lot43-science-planning` | HEAD `7cc8abd`, arbre propre, aucun changement non commité |
| Document 10 et rapports du lot 4.3 | présents (`lot43-consolidation.*`, fragments `lot43-shard-*.json`, `lot43-r4-model.md`) |
| BÊTA `claude/rekka-beta` | `bc19fb1`, inchangée (vérifiée au début et à la fin) |
| Production `claude/crosstraining-c1-c2-spike-vbg8dv` | `f9f7e2e`, inchangée (vérifiée au début et à la fin) |
| Branche créée | `claude/rekka-lot44-safety-validation` sur `7cc8abd` |

## 2. Audit des règles de récupération

### 2.1 Règle existante (non modifiée)

- Paramètre `recoveryHours` de la politique de personnalisation : **36 h** (gouvernance G2), inchangé ; aucun nouveau délai universel.
- Deux séances Musculation de la **même région** ne peuvent être à moins de 36 h. Haut et Bas sont **compatibles**. Le Full Body **chevauche** toutes les régions.
- Expositions prises en compte : séances de la semaine déjà planifiées et séances **réellement faites** (région déduite de l'emplacement `up.`/`ua.`/`ub.`, `lo.`/`la.`/`lb.`, sinon Full Body), y compris de la semaine précédente.
- Interactions multisport (HYROX, Course) : traitées par l'**évaluation d'interférence** existante (`PLAN.INTERFERENCE_ASSESSED`, allègement de la dose), jamais par la garde de récupération Musculation. Inchangé.

### 2.2 Défaut démontré (avant ce lot)

La garde de `planning.ts` contrôlait :

| Cas | Contrôlé avant 4.4 ? |
|---|---|
| séances A/B (Haut A, Bas A, Haut B, Bas B) | oui, à toute étape |
| Full Body d'un profil personnalisé à **3 séances ou moins** | oui |
| Full Body d'une semaine demandée à **4 séances** (stratégies de semaine courte « Haut / Bas / Full Body » et « Full Body ») | **non** |
| séances Haut / Bas **communes** d'un profil personnalisé (objectif force 4×, par exemple) | **non** |

**Mesure 7cc8abd** (banc du lot 4.3, profil HYROX intensif L43-HYX3) : 12 séances à moins de 36 h avec chacune des stratégies « Haut / Bas / Full Body » et « Full Body ». Exemple : Full Body le jeudi, 24 h après Bas A le mercredi.

**Cause :** la garde ne regardait que l'archétype A/B ou la bande de séances, pas la séance réellement prescrite après la composition de la semaine.

### 2.3 Classification Full Body

- Le Full Body est classé **`full`**, qui chevauche Haut et Bas ; la région vient de `archetypeRegion` (moteur) côté planification et de l'emplacement côté expositions.
- Aucun défaut de classification trouvé dans `disjointRegions` (seuls Haut et Bas sont disjoints). Le défaut était le **périmètre** de la garde (§ 2.2), pas la classification.

## 3. Corrections de sécurité

1. **Garde évaluée sur la séance prescrite** (`packages/app-core/src/planning.ts`) :
   - pour un profil **personnalisé**, toute séance Musculation **finale** est contrôlée (Haut, Bas, Full Body, A/B) ;
   - profils non personnalisés : comportement historique, inchangé.
2. **Séance finale ou sonde** (`SlotRequest.final`, `packages/planner/src/ports.ts`, `planner.ts`) :
   - le planificateur sonde un jour avec un archétype **provisoire** avant de composer la semaine ;
   - contrôler la sonde refusait des séances que la composition aurait réaffectées (18 tests rouges au premier essai, cause identifiée) ;
   - seules les générations **finales** sont donc contrôlées : intention déclarée, régénération de composition, réessais, déplacements M3. Les séances A/B restent contrôlées à toute étape, comme avant.
3. **Refus explicables :**
   - cause `strength_recovery_window` sur la séance refusée (motif existant) ;
   - la séance n'est jamais placée en silence ; la replanification (propositions) n'est jamais recommandée si elle est non sûre.

### Tests (`rc5-lot44-recovery.test.ts`, 14 tests)

| Cas demandé | Résultat |
|---|---|
| Full Body → Full Body (veille) | Full Body du lundi refusé, motif `strength_recovery_window` |
| Full Body après Haut / après Bas (veille) | refusé, motif tracé |
| Haut A/B après Full Body | refusé (contrôle existant) |
| Bas après Full Body | jamais placé le lundi |
| Force 4× (Haut / Bas communs), Haut la veille | aucun Haut ni Full Body à moins de 36 h ; refus signalé |
| Semaine sans séance la veille (force 4×) | 4 séances, identique à 4.3 |
| Profil non personnalisé | comportement historique (aucun nouveau refus) |
| Semaine de 4 séances, stratégie Full Body | le moteur refuse le Full Body du lundi après Haut la veille |
| HYROX puis Bas ; Course puis Bas | interférence évaluée et tracée ; aucun refus de récupération ; 4 séances placées |
| Semaines de 3 et 4 séances, disponibilités réduites (3 jours pour 4 séances) | aucune paire de même région à moins de 36 h ; séances manquantes expliquées |
| Replanification après refus | toute proposition valide respecte 36 h |
| **Cas décisif L43-HYX3, Haut / Bas / Full Body** | Full Body du jeudi (24 h après Bas A) **refusé** ; vérifié rouge en rétablissant temporairement l'ancienne garde |

### Effet mesuré (12 semaines, banc du lot 4.4)

| Variante | Séances sous 36 h, 7cc8abd → 4.4 | Autres effets |
|---|---|---|
| A (moteur actif), 20 profils | 0 → 0 | volumes, charges, séances prévues et refusées **identiques à 7cc8abd** (contrôle automatique du banc) |
| B1, 20 profils | 0 → 0 | identique à 7cc8abd |
| Stratégie Haut / Bas / Full Body, L43-HYX3 | 12 → **0** | séances refusées 12 → 24 : celles qui étaient dangereuses ne sont plus placées |
| Stratégie Full Body, L43-HYX3 | 12 → **0** | séances refusées 12 → 24 (même cause) |

**Régression apparente, cause identifiée :** les deux stratégies statiques couvrent moins bien les cibles sur HYX3 (déficit 21,5 → 27,0 et 12,9 → 28,1 séries). C'est le prix de la sécurité ; elles ne sont **jamais** recommandées sur ce profil. La proposition recommandée reste « région alternée » (§ 5), sûre et meilleure.

## 4. Corrections du catalogue

Comparaison de chaque exercice signalé au lot 4.3 avec ses équivalents de **même famille** et de **même schéma** :

| Exercice | Équivalents comparés | Constat | Décision |
|---|---|---|---|
| Pompes inclinées (`ex.incline_push_up`) | pompes, développé couché, haltères, machine (même schéma) ; pompes (même famille, rang 1 de la progression) | seul développé horizontal **sans deltoïde antérieur** en secondaire | **corrigé** : `front_delts` ajouté. Abdominaux des pompes **non** ajoutés (demande du tronc réduite par l'inclinaison : non démontré) |
| Tractions assistées (`ex.band_assisted_pull_up`) | tractions (même famille, régression de rang 1), tirage vertical | mêmes actions articulaires que les tractions, sans **haut du dos** | **corrigé** : `upper_back_traps` ajouté |
| Rowing machine (`ex.machine_row`) | rowing poulie, rowing haltère | le rowing poulie déclare le deltoïde postérieur, la machine non | **non modifié** : la sollicitation du deltoïde postérieur dépend de la prise et de l'angle du coude ; deux classes d'équivalence distinctes ne sont pas supposées identiques (incohérence non démontrée) |

**Versionnement :**
- Catalogue `0.3.1-strength-test-f6-lot44`, en **surcouche** de F6 (`0.3.0-strength-test-f6`), créé par `strengthLot44CatalogDocument()` dans `packages/strength/tests/fixtures/catalog-lot44.ts`.
- Contenu courant : ruleset `0.8.0-strength-hautbas-ab` avec le catalogue 4.4, d'origine `fixtures:strength-hautbas-ab-0.8.0+catalog-lot44`.
- La paire précédente reste au **registre** (`strengthAbF6Content`, origine `fixtures:strength-hautbas-ab-0.8.0`), ainsi que les paires L1b-4, L1-V3, F6 et Lock.
- Les prescriptions existantes restent donc **lisibles** avec leur version d'origine ; l'historique n'est pas modifié.
- **Substitutions déterministes :** les substitutions directes et les classes d'équivalence sont inchangées (seuls les secondaires changent).

**Tests :**
- `catalog-lot44.test.ts` vérifie que :
  - exactement deux exercices changent, uniquement par des secondaires ajoutés ;
  - tout développé horizontal polyarticulaire actif a le deltoïde antérieur ;
  - la famille des tractions a le haut du dos ;
  - le rowing machine est inchangé.
- Les tests de version (F6, L1-V3, L1b-4) vérifient la nouvelle version courante **et** la relecture de l'ancienne paire.

**Effet sur le banc :**
- A et B1 sont identiques à 7cc8abd sur les 20 profils : aucun profil ne prescrit ces deux exercices dans les conditions du banc.
- La correction agit sur les profils au matériel restreint, à domicile (pompes inclinées, tractions assistées).

**Tests adaptés (justifiés) :**
- les tests qui figeaient la version courante du catalogue ;
- deux tests d'état figé (`lotc-interference-maintain`, `r51-planning-grid-dom`), qui traduisent la version comme ils le faisaient déjà pour les lots précédents ; leurs fixtures sont inchangées ;
- le rapport de taille d'état (+1 Ko sur 52 semaines, dû uniquement à la chaîne de version plus longue).

## 5. Comparatif des stratégies hybrides

### 5.1 Hiérarchie explicite du classement (`hybrid-proposals.ts`)

| Rang | Critère | Mise en œuvre |
|---|---|---|
| 1 | Sécurité | **éliminatoire** : une proposition non sûre (`unsafe_recovery`) n'est jamais recommandée ni appliquée |
| 2 | Disponibilités | par construction : jours choisis seulement, aucun jour inventé |
| 3 | Séances verrouillées | par construction : séances commencées, terminées ou passées protégées ; un autre sport qui perdrait une séance écarte la proposition |
| 4 | Couverture des objectifs musculaires | séries manquantes sous les cibles, somme sur les groupes (moins = mieux) |
| 5 | Continuité des exercices et performances | exercices principaux absents du planning actuel (moins = mieux) |
| 6 | Répartition Haut / Bas | minimum (Haut + Full Body, Bas + Full Body) |
| 7 | Nombre de séances réalisables | séances Musculation planifiées |
| 8 | Stabilité | séances modifiées (moins = mieux) |

- **Défaut du lot 4.3 corrigé :** l'équilibre Haut / Bas passait **avant** le déficit.
  - Sur L42-SHORT, la proposition « Full Body » était acceptée 4 semaines alors qu'elle **dégradait** la couverture (déficit 5,8 → 6,8).
  - Elle n'est plus recommandée : 0 acceptation, déficit 5,8.
- **Critère écarté avec sa cause :** le nombre de groupes sous leur cible. Il a été essayé, puis retiré : il pénalise un petit écart (épaules 5 / 6) autant qu'un grand. Sur HYROX + 4×, il refusait le Full Body dont le déficit total est pourtant meilleur (14 → 13,5 séries ; déficit relatif 2,37 → 2,13).

### 5.2 Comparaison (12 semaines ; déficit = séries manquantes sous les cibles, par semaine)

| Profil | Actuel | Région alternée | Haut / Bas / Full Body | 3 Full Body | Redistribution | Meilleure combinaison | Proposition (classement 4.4) |
|---|---|---|---|---|---|---|---|
| L4-2 (HYROX 2×, 4×) | 14,2 | 15,3 | 21,1 | 14,7 | 9,3 | **8,1** (Full Body + redistribution) | 12,3 (Full Body 5 semaines sur 12) |
| L43-HYX3 (HYROX 3×, 4×) | 17,7 | 12,9 | 27,0 | 28,1 | 14,5 | **10,0** (région alternée + redistribution) | 12,9 (région alternée 6 semaines sur 12) |
| L42-SHORT (semaines courtes) | 5,8 | 5,4 | 7,5 | 6,8 | 3,9 | **2,1** (Haut / Bas / Full Body + redistribution) | 5,8 (aucune acceptée) |
| L41-RUN, L42-RUN3, L4-5 | identiques entre stratégies (aucune semaine courte) | | | | | | autre jour (Course) : 9,4 → 3,5 et 8,5 → 2,7 ; L4-5 inchangé |

Contrôles sur toutes les variantes : aucune séance sous 36 h, aucune durée au-delà de la limite, aucune violation du matériel ou des exclusions, aucune erreur.

### 5.3 Aperçu et confirmation (inchangés, prototype hors interface)

- Chaque proposition expose :
  - l'aperçu « Planning actuel / Planning proposé » ;
  - les séances ajoutées, déplacées, remplacées et non planifiées, avec leur raison ;
  - les effets sur le volume (groupes, déficit) et sur la récupération (écart minimal) ;
  - les compromis (détail de statut).
- « Conserver mon planning » : aucun appel, état intact.
- « Appliquer le nouveau planning » : `applyHybridProposal(…, confirmed: true)` seulement, avec garde de péremption.
- **Aucune mutation avant confirmation** (tests). Rien n'est activé en BÊTA ; le prototype n'est pas branché à l'interface.

## 6. Analyse de la redistribution du volume

### 6.1 Cause de la sous-dose

- Le budget d'une séance est la part de la cible de sa région divisée par les séances **demandées** de cette région.
- Quand une séance n'est pas placée, sa part est perdue. Exemple : HYX3 place 1 séance Bas sur 2 demandées chaque semaine, et la séance Bas placée ne reçoit que la moitié de la cible.

### 6.2 Option candidate `redistributeUnplaced` (inactive)

- **Calcul :** la part se calcule sur les séances de la région **réellement placées**, au plus les séances demandées.
  - Le planificateur transmet `week.placedSessionsByRegion` à la composition finale.
  - Il ne le fait que si la politique déclare l'option ; sinon le contexte est identique.
- **Bornes inchangées :** borne haute hebdomadaire, budget de durée de la séance, bornes de séries de la cellule de dose.

### 6.3 Mesures (12 semaines, montées en charge exclues)

| Profil | Groupes (actuel → redistribution) | Durée max (limite 60 min) | Charges |
|---|---|---|---|
| L43-HYX3 | quadriceps 2,5 → 3,5 ; ischios 2 → 2,5 ; fessiers 3 → 4 ; mollets 0,5 → 1 ; tronc 2,8 → 3,3 | 34 → 44 | identiques |
| L4-2 | quadriceps 3,8 → 5,6 ; ischios 2,8 → 3,8 ; fessiers 3,8 → 5,7 ; mollets 0,9 → 1,8 | 34 → 44 | identiques |
| L42-SHORT | quadriceps 8,3 → 9,8 ; ischios 6,7 → 7,7 ; fessiers 10,3 → 11 ; **mollets 3,3 → 2,7** | 44 → 49 | identiques |
| 17 autres profils (toutes les séances placées) | **strictement identiques** | identiques | identiques |

- **Jamais au-dessus des bornes hautes** (contrôle automatique du banc).
- **Jamais au-delà de la durée maximale.**
- **Aucune séance ajoutée** (séances planifiées identiques), **aucune charge artificielle** (charges identiques).
- **Récupération préservée** (0 séance sous 36 h).
- **Mollets de L42-SHORT (3,3 → 2,7), cause :** les séries supplémentaires des principaux consomment le budget de durée. L'emplacement « mollets », à temps résiduel, en reçoit donc moins. La cible des mollets (3) n'est atteinte ni avant ni après sur les semaines courtes.
  - Le léger recul est la conséquence du plafond de durée, qui est respecté.
  - Il n'est pas accepté d'office : il est signalé ici pour l'arbitrage (§ 14).

### 6.4 Limite de mise en œuvre

- La redistribution n'est **pas** proposée par `proposeHybridWeekAlternatives`.
- Une séance appliquée avec une politique non publiée porterait une version de ruleset absente du registre. Ses prescriptions deviendraient illisibles.
- Son activation exige donc une **version de ruleset publiée** au registre (décision, § 14).

## 7. Résultats B1

### 7.1 Régression « forme générale » reproduite sur le moteur réel

- Pectoraux : A 6 ; B1 **3,3** ; B1 + Q4 6.
- **Cause (lot 4.3, confirmée) :**
  - en semaine 1, l'isolation `fb.iso_upper` se départage à égalité (`seed_tiebreak`) : pec deck avec A, élévation latérale avec B1 ;
  - puis la continuité S4 fige ce choix pendant 12 semaines.

### 7.2 Réévaluation contrôlée des isolations (option `isolationReview: 'volume_fit'`, inactive)

- Une isolation **en place** (rôle `accessory`) n'est remplacée que si deux conditions sont réunies :
  1. ses groupes principaux ont atteint leur cible de la semaine (`volume_fit` : aucun groupe sous le plancher) ;
  2. un autre candidat, au moins aussi adapté (`load_adequacy`, `role_fit`) et sans dépassement supplémentaire, sert un groupe encore sous sa cible.
- Le premier candidat dans l'ordre du classement est retenu : la règle est déterministe.
- Raison tracée : `SELECT.CONTINUITY` avec `cause: isolation_volume_review` et le critère décisif `isolation_review`.
- **Principaux et secondaires ne sont jamais réévalués.**
- L'option **n'est pas combinée** au départage Q4.

### 7.3 Mesures (séries prévues / semaine, décompte du registre ; « bras » selon la convention B1 entre crochets)

| Profil | A | B1 | B1 + Q4 | **B1 + réévaluation** |
|---|---|---|---|---|
| L41-FORME pectoraux | 6 | 3,3 | 6 | **5,8** |
| L41-FORME épaules | 5,3 | 4,8 | 5,4 | 5,4 |
| L41-FORME bras | 8 [8] | 11,1 [6] | 10,6 [5,7] | 10,6 [5,7] |
| L41-H3 pectoraux | 4,8 | 9,5 | **5,1** (recul) | **9,5** |
| L42-RUN3 pectoraux | 7,5 | 7,5 | **3,2** (recul) | **7,5** |
| L4-4 / L41-HIST fessiers | 13,3 | 13,3 | 13,1 | 12,2 |
| L4-4 / L41-HIST, L41-H3 quadriceps | 9,7 / 9 | 9,7 / 9 | 9,7 / 9 | 10 / 10 |

- **Principaux changés :** identiques à B1 sur les 20 profils, donc la continuité des principaux et de leurs charges est préservée.
- **Durées :** au plus +3 min, toujours sous la limite.
- **Matériel / exclusions :** 0 violation.
- Les 15 autres profils sont identiques à B1.
- **B1 reste une candidate.** B1 + réévaluation corrige la forme générale sans les reculs de B1 + Q4 ; elle n'est pas activée (décision, § 14).

## 8. Résultats R4 (moteur de progression réel, rien d'activé)

### 8.1 Mise en œuvre de simulation

- `updateTrack(…, reading?)` : sans `reading`, le comportement est strictement identique (test).
- La lecture n'est passée que par l'environnement de simulation (`ProgrammeEnvironment.progressionReading`), que le produit ne renseigne jamais.
- **Référence :** RIR de base de la track, plus les modificateurs **durables** (niveau, phase) selon la politique de conflit du ruleset (`durableReferenceRir`), comme dans 5e119d6.
- **Séance allégée :** RIR prescrit au-dessus de la référence.
- **Variantes :**
  1. actuelle ;
  2. R4 seul : preuve comptée sur une séance allégée, aucune hausse ni baisse décidée ;
  3. R4 + exception multisport : allègement présent aux 2 dernières expositions lu comme plancher (`floorReferenceRir`) ;
  4. R4 + R3 : `reassessTrack` toutes les 4 expositions, sans baisse, plafond de cycle ;
  5. R4 + exception + R3 ;
  6. variante 6 : la 5, avec en plus −10 % après 3 séances allégées consécutives en dessous. **Hypothèse de simulation.**

### 8.2 Matrice (charges des principaux, départ → fin ; baisses entre parenthèses)

| Scénario | Actuelle | R4 seul | R4 + exception | R4 + R3 | R4 + exc. + R3 | Variante 6 |
|---|---|---|---|---|---|---|
| Progresse (4× A/B) | squat 100 → 105 ; développé 70 → 72,5 | identique | identique | identique | identique | identique |
| Stagne | squat 100 → 100 | identique | identique | identique | identique | identique |
| Difficulté (−1 %/sem.) | squat 100 → 92,5 (1) ; SDL roumain 90 → 82,5 | identique | identique | **100 → 100** (1) ; 90 → 90 | 100 → 100 | 100 → 100 |
| Fatigue temporaire (S5–S6) | squat 100 → 95 (1) | identique | identique | 100 → 102,5 (1) | 102,5 | 102,5 |
| Fatigue persistante (Course, −1 %/sem.) | squat 100 → 85 (2) ; développé 70 → 62,5 (2) | **gelé** à 100 / 70 (0 hausse) | 85 (2) | **107,5** (hausse non justifiée) | 95 (2) | 95 (2) |
| HYROX intensif | squat 100 → 105 ; développé 70 → 75 | **gelé** (0 hausse) | 105 ; 70 (1) | 107,5 ; 75 | 105 ; 70 (1) | 105 ; 70 (1) |
| Bloc Course, progresse | squat 100 → 97,5 (1) ; SDL roumain 90 → 90 (1) | **gelé** (0 hausse sur 144 expositions) | 97,5 (1) | **112,5** ; 102,5 | 97,5 (2) | 97,5 (2) |
| Bloc Course, stagne | squat 100 → 97,5 (1) | gelé | 97,5 (1) | **110** | 95 (2) | 95 (2) |
| Séances manquées | squat 100 → 105 | identique | identique | identique | identique | identique |
| Reprise après 3 semaines | squat 100 → 100 | identique | identique | identique | identique | identique |
| Alternance A/B avec HYROX | squat 100 → 102,5 ; développé 70 → 75 | **gelé** | 102,5 ; 70 (1) | 107,5 ; 75 | 107,5 ; 70 (1) | 107,5 ; 70 (1) |
| Transfert Full Body → A/B | squat 100 → 110 ; développé 77,5 → 85 | identique | identique | 107,5 ; 87,5 | 107,5 ; 87,5 | 107,5 ; 87,5 |

Traces complètes : décisions `PROGRESSION.*` par cause (`lightened_evidence`, `lightened_below`, `reassessed`, `below`, `evidence`, `estimate`…) dans `lot44-validation.md` § E.

### 8.3 Cause exacte des charges figées ou en baisse en bloc Course (trace de `back_squat`, scénario « bloc Course, progresse »)

1. **Prescription :** toutes les séances Bas sont prescrites à **RIR 6** (référence 2 + interférence de la Course voisine), chaque semaine.
2. **Règle actuelle :**
   - à 107,5 kg, l'athlète fait **toutes** ses répétitions à RIR 4 ;
   - la règle classe cela « en dessous », car 4 ≤ 6 − 2 (marge du ruleset) ;
   - deux expositions ainsi classées entraînent une baisse de 10 % : **107,5 → 95 kg**.
3. **Remontée bridée :**
   - à 95 kg, l'athlète déclare RIR 10. L'e1RM n'est **pas** mis à jour : répétitions jusqu'à l'échec = 16, au-delà de la plage valide (12) ;
   - la charge ne remonte donc que d'un pas toutes les deux preuves.
4. **R4 seul :** toutes les expositions sont allégées ; la preuve est comptée mais la hausse attend une séance non allégée, qui n'arrive jamais. Résultat : **0 hausse** (gel).
5. **R3 :**
   - la réévaluation vise le RIR de **référence** (2), alors que chaque séance est prescrite à RIR 6 ;
   - la charge devient trop lourde pour la séance réellement prescrite (107,5 kg, RIR 0, puis 4 répétitions) ;
   - sans règle de sécurité, R4 ne baisse jamais : la hausse est non justifiée, et l'athlète reste bloqué à une charge qu'il échoue.
6. **Exception plancher :** elle neutralise l'allègement récurrent, donc revient à la règle actuelle (même baisse 107,5 → 95).

**Constat supplémentaire, prérequis de R4 :**
- La référence de la track (RIR du profil de base, `createTrack`) ne reproduit pas la cellule **personnalisée** de certains accessoires. Exemple : leg curl, leg extension et Pallof sont prescrits à RIR 2 ou 3 à chaque séance, pour une référence de 1.
- R4 seul les lit donc comme allégés en permanence et les gèle (54 expositions sur le profil qui progresse, sans effet sur les principaux).
- Prérequis : persister le RIR de référence **au moment de la prescription**, comme le faisait 5e119d6.

**Aucune hausse forcée n'est proposée.**

### 8.4 Lecture

- **Aucune variante n'est satisfaisante en l'état :**
  - R4 seul gèle le multisport ;
  - R3 produit des hausses non justifiées en fatigue ;
  - l'exception plancher ramène à la règle actuelle ;
  - la variante 6 est la plus prudente, mais ne fait pas mieux que l'actuelle en bloc Course.
- **Pistes (non activées, à arbitrer, § 14) :**
  1. classer une séance allégée « en dessous » seulement contre la référence (RIR 4 ≥ 2 : réussite), et accepter une hausse **d'un pas** quand l'athlète atteint la cible allégée avec la marge de la référence ;
  2. réévaluation R3 au RIR **prescrit** de la séance, jamais au RIR de référence ;
  3. lecture de l'e1RM au-delà de 12 répétitions jusqu'à l'échec comme **borne inférieure** (déjà prévue pour l'effort inconnu), au lieu de l'ignorer.

## 9. Simulations sur 12 semaines

- Banc `lot44-bench.ts` (sur demande). Il étend les bancs 4.2 et 4.3 : mêmes 20 profils, même athlète à capacité réelle, plus 12 scénarios d'athlète pour R4 (fatigue du jour, fatigue persistante ou temporaire, perte à la reprise).
- **Comparaison avec 7cc8abd :**
  - A et B1 : volumes, charges, séances prévues et refusées **identiques** sur les 20 profils (contrôle automatique) ;
  - B1 + Q4 : identique au rapport 4.3 ;
  - stratégies statiques sur HYX3 : séances sous 36 h 12 → 0 (§ 3).
- **Indicateurs** (rapport complet) :
  - séries prévues par groupe, cibles, bornes hautes, convention de la variante ;
  - répartition Haut / Bas / Full Body et séances non placées ;
  - charges des principaux, de départ à fin, et baisses ; décisions de progression par cause ;
  - écart de récupération et séances sous 36 h ; durée moyenne, maximale et dépassements ;
  - violations du matériel et des exclusions ; principaux changés ; propositions acceptées.
- **Régressions et explications :**
  - stratégies statiques ULF / FB sur HYX3 : sécurité (§ 3) ;
  - mollets de L42-SHORT sous redistribution : plafond de durée (§ 6.3) ;
  - L4-4 / HIST, fessiers 13,3 → 12,2 sous B1 + réévaluation : l'isolation basse passe aux quadriceps, encore sous cible, alors que les fessiers sont au-dessus de leur cible (12,2 pour 5) ;
  - R4 et R3 : § 8.3.
  - Aucune liste d'exceptions : chaque écart a sa cause.

## 10. Tests et E2E

| Contrôle | Résultat |
|---|---|
| `pnpm typecheck` | vert |
| `pnpm lint` | vert. Une importation devenue inutile (`rc5-lot4-integration.test.ts`) a été retirée après le premier `pnpm check` |
| `pnpm test` | **290 fichiers, 3254 tests verts**, 7 ignorés (bancs sur demande) |
| Nouveaux tests | `rc5-lot44-recovery` (14), `rc5-lot44-options` (9), `catalog-lot44` (3), `lot44-r4-reading` (7) |
| Banc du lot 4.4 (sur demande, 5 fragments et fusion) | vert : tous les contrôles transverses ; A et B1 identiques à 7cc8abd ; B1 + Q4 identique au rapport 4.3 |
| Architecture (Cross-training, Strength, app-core) | verte. Liste fermée `STRENGTH_RC5_LOT44_CHANGES` : fixture et tests du lot ; les fichiers `src` relèvent des listes existantes |
| E2E BÊTA (`dist-beta`, port 4174) | rotation A/B, phases, chronomètre, personnalisation, séance mobile, répétitions, jours de Musculation, hors ligne : **tous verts** |
| Parcours complets | base, cross, hyrox, recovery, planning : **verts** |
| E2E standard (`e2e.mjs`, port 4173) | **310 vérifications OK** |
| Horloge globale et stockage (serveur de développement, port 5174) | vert |
| Garde de sécurité des données | vert |
| 360 / 390 px | aucune modification d'interface : non requis. Les E2E mobiles à 390 px existants sont verts |

- Aucun test n'a été modifié pour masquer un changement de comportement non justifié.
- Les adaptations de test sont listées au § 4 : version du catalogue, traduction de version des états figés, rapport de taille d'état.
- `__reports__/lot43-*` : inchangés après toutes les exécutions.

**Régénération des rapports :**

```sh
cd packages/app-core
for s in A 'B1,B1Q4' 'B1ISO,RED' 'SW-ALT,SW-ULF,SW-FB,SW-ALT+RED,SW-ULF+RED,SW-FB+RED,PROP' 'R4,R4F,R4R3,R4FR3,R4V6'; do LOT44_BENCH=1 LOT44_SHARD="$s" npx vitest run tests/rc5/rc5-lot44-bench.test.ts; done
LOT44_MERGE=1 npx vitest run tests/rc5/rc5-lot44-bench.test.ts
```

## 11. Migrations historiques

Chaque build historique est servi tel quel ; ses données sont créées dans le navigateur, puis la page est rouverte avec le build du lot 4.4 :

| Build historique | Schéma | Résultat |
|---|---|---|
| `5695917` (V2.1) | v3 → v5 | **3 / 3 PASS** (`e2e-v22-upgrade.mjs`) |
| `b850b98` | v4 → v5 | **4 / 4 PASS** |
| Garde de stockage (build V2.1) | — | **OK** |

- Séances, historique et suivis sont conservés.
- Les anciennes prescriptions restent lues avec leur contenu d'origine : paires F6, L1b-4, L1-V3 et hautbas-ab + F6 au registre.
- Aucune migration de schéma n'est ajoutée par ce lot (schéma v5 inchangé ; champs facultatifs seulement dans le contexte du moteur).

## 12. Fichiers modifiés

- `apps/kairo/tests/r51-planning-grid-dom.test.tsx`
- `packages/app-core/src/beta0-app.ts`
- `packages/app-core/src/hybrid-proposals.ts`
- `packages/app-core/src/planning.ts`
- `packages/app-core/src/programme.ts`
- `packages/app-core/src/progression.ts`
- `packages/app-core/src/provisional-content.ts`
- `packages/app-core/tests/journey.test.ts`
- `packages/app-core/tests/longitudinal/__reports__/state-size.md`
- `packages/app-core/tests/rc4-audit/rc4-sim.ts`
- `packages/app-core/tests/rc45/f6-versioned-content.test.ts`
- `packages/app-core/tests/rc45/lotc-interference-maintain.test.ts`
- `packages/app-core/tests/rc46/l1b4-versioned-content.test.ts`
- `packages/app-core/tests/rc46/l1v3-versioned-content.test.ts`
- `packages/app-core/tests/rc5/lot42-bench.ts`
- `packages/app-core/tests/rc5/lot43-bench.ts`
- `packages/app-core/tests/rc5/rc5-lot1-migration.test.ts`
- `packages/app-core/tests/rc5/rc5-lot4-integration.test.ts`
- `packages/app-core/tests/rc5/rc5-lot41-volume.test.ts`
- `packages/crosstraining/tests/architecture/crosstraining-architecture.test.ts`
- `packages/planner/src/planner.ts`
- `packages/planner/src/ports.ts`
- `packages/planner/tests/integration/planner.test.ts`
- `packages/strength/src/context.ts`
- `packages/strength/src/engine.ts`
- `packages/strength/src/personalization-contract.ts`
- `packages/strength/src/progression.ts`
- `packages/strength/src/selection.ts`
- `docs/kairo/reprise/11-RC5-LOT4-4-SECURISATION.md`
- `packages/app-core/tests/rc5/__reports__/lot44-shard-A.json`
- `packages/app-core/tests/rc5/__reports__/lot44-shard-B1ISO_RED.json`
- `packages/app-core/tests/rc5/__reports__/lot44-shard-B1_B1Q4.json`
- `packages/app-core/tests/rc5/__reports__/lot44-shard-R4_R4F_R4R3_R4FR3_R4V6.json`
- `packages/app-core/tests/rc5/__reports__/lot44-shard-SW-ALT_SW-ULF_SW-FB_SW-ALT+RED_SW-ULF+RED_SW-FB+RED_PROP.json`
- `packages/app-core/tests/rc5/__reports__/lot44-validation.json`
- `packages/app-core/tests/rc5/__reports__/lot44-validation.md`
- `packages/app-core/tests/rc5/lot44-bench.ts`
- `packages/app-core/tests/rc5/rc5-lot44-bench.test.ts`
- `packages/app-core/tests/rc5/rc5-lot44-options.test.ts`
- `packages/app-core/tests/rc5/rc5-lot44-recovery.test.ts`
- `packages/strength/tests/fixtures/catalog-lot44.ts`
- `packages/strength/tests/unit/catalog-lot44.test.ts`
- `packages/strength/tests/unit/lot44-r4-reading.test.ts`

## 13. Risques résiduels

- **Sécurité :**
  - davantage de séances refusées pour récupération avec les stratégies statiques Haut / Bas / Full Body et Full Body sur les profils HYROX intensifs. Elles ne sont jamais recommandées ;
  - les profils non personnalisés gardent l'ancienne garde (comportement historique, conservé volontairement).
- **Catalogue :** les deux secondaires ajoutés modifient le décompte du volume des profils à domicile qui prescrivent ces exercices. Les anciennes prescriptions restent lues avec F6.
- **Propositions :**
  - le classement hiérarchique ne connaît pas encore les priorités musculaires déclarées (toutes les cibles pèsent pareil) ;
  - la continuité est mesurée sur les principaux seulement ;
  - prototype hors interface.
- **Redistribution :** activation impossible sans version de ruleset publiée ; léger recul des mollets sous plafond de durée.
- **B1 + réévaluation :** une isolation remplacée ouvre une nouvelle track (charge de calibration) ; les principaux sont intacts.
- **R4 :** aucune variante prête. Le prérequis (référence persistée) est absent ; la variante 6 et la règle de sécurité restent des hypothèses de simulation.
- **Athlète simulé :** la fatigue du jour et la capacité sont des conventions (aucune donnée réelle).

## 14. Décisions à arbitrer

| N° | Sujet | Options | Recommandation |
|---|---|---|---|
| E1 | Garde de récupération des profils non personnalisés | conserver l'historique / étendre | conserver (aucun défaut mesuré sur ces profils) |
| E2 | Rowing machine, deltoïde postérieur | ne rien faire / ajouter | ne rien faire tant que la prise n'est pas décrite |
| E3 | Redistribution du volume non placé | ne pas activer / publier une version de ruleset avec `redistributeUnplaced` | publier une version **candidate** et la proposer d'abord via les propositions confirmées ; arbitrer le recul des mollets (L42-SHORT) |
| E4 | Combinaison recommandée pour HYROX intensif | région alternée seule / avec redistribution | région alternée + redistribution (déficit 17,7 → 10,0, sûr) |
| E5 | Priorités musculaires dans le classement des propositions | non / pondérer la couverture des groupes prioritaires | oui, au rang 4, après décision sur la pondération |
| E6 | B1 | ne pas activer / B1 + réévaluation des isolations | B1 + réévaluation, **sans** Q4 (corrige la forme générale, aucun recul sur H3 ni RUN3) |
| E7 | R4 | aucune variante / variante 6 / pistes § 8.4 | aucune activation ; d'abord persister le RIR de référence, puis évaluer les pistes 1 à 3 |
| E8 | Plage de validité de l'e1RM (12 répétitions jusqu'à l'échec) | inchangée / borne inférieure au-delà | à instruire (seuil scientifique : décision explicite requise) |

**Activation de B1, de R4 ou d'une nouvelle stratégie de replanification :** uniquement après validation explicite.

## 15. Hash du commit local

Commit local unique de la branche `claude/rekka-lot44-safety-validation`, parent `7cc8abd`. Son hash est donné dans le compte rendu final : un commit ne peut pas contenir son propre hash. Aucun push.
