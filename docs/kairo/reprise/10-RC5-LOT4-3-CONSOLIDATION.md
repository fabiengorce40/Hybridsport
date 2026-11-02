# Reprise RC5 — Lot 4.3 : consolidation scientifique et planification hybride

- **Branche locale isolée :** `claude/rekka-lot43-science-planning`, créée sur `bfedde1` (lot 4.2). Aucun push, aucune fusion, aucun déploiement.
- **Rien n'est activé :**
  - aucune politique scientifique candidate (B1, Q4, Q2) ;
  - aucun R4, aucun seuil modifié ;
  - aucun planning appliqué sans confirmation ;
  - aucune interface ajoutée.
- **Corrections techniques démontrées :** deux, au § 6.4.
- **Rapports reproductibles** (`packages/app-core/tests/rc5/__reports__/`) :
  - `lot43-consolidation.md` et `.json` : 7 variantes, 20 profils, 12 semaines ;
  - `lot43-r4-model.md` : 6 variantes R4, 10 scénarios ;
  - commandes de régénération au § 9.

## 1. État Git initial

| Élément | État constaté avant toute modification |
|---|---|
| Branche `claude/rekka-lot42-20261101` | HEAD `bfedde1`, arbre propre, aucun stash, aucun changement non commité |
| Documents 07, 08, 09 | présents |
| Options candidates du lot 4.2 | `shortWeek: 'alternate_region'`, `volumeFitTieBreak`, `highWindow`, `placementProbe` : absentes de tout contenu publié et de l'environnement Beta 0 (tests du lot 4.2 verts) |
| BÊTA `claude/rekka-beta` | `bc19fb1`, inchangée (vérifiée au début et à la fin) |
| Production `claude/crosstraining-c1-c2-spike-vbg8dv` | `f9f7e2e`, inchangée (vérifiée au début et à la fin) |
| Branche créée | `claude/rekka-lot43-science-planning` sur `bfedde1` |

## 2. Audit scientifique

### 2.1 Catalogue : poussées et tirages polyarticulaires (catalogue F6, non modifié)

| Exercice | Schéma | Principaux (catalogue) | Secondaires (catalogue) | Lecture biomécanique (hypothèse B1) |
|---|---|---|---|---|
| Développé couché, haltères, machine, pompes | poussée H | pectoraux, **triceps** | deltoïde antérieur (abdominaux pour les pompes) | moteur : pectoraux ; **synergistes** : triceps, deltoïde antérieur ; stabilisateurs : coiffe, tronc (non modélisés) |
| Développé militaire, haltères, machine | poussée V | deltoïde antérieur, **triceps** | deltoïde latéral (abdominaux) | moteur : deltoïdes ; synergistes : triceps ; stabilisateurs : tronc |
| Tractions, assistées, tirage vertical | tirage V | grand dorsal, **biceps** | trapèzes / haut du dos, préhension | moteur : grand dorsal ; synergistes : biceps, haut du dos ; stabilisateurs : préhension |
| Rowing poulie, machine, haltère | tirage H | haut du dos, grand dorsal | **biceps**, deltoïde postérieur (rowing poulie) | déjà conforme à B1 |
| Squats, presse, fentes, hack squat | genou | quadriceps, **fessiers** | adducteurs (lombaires) | fessiers moteurs de l'extension de hanche (squat profond) : **conservés principaux** en B1 |
| Soulevé roumain, hip thrust | hanche | ischios, fessiers | lombaires, préhension | conforme |

- **Le catalogue ne distingue pas les stabilisateurs** (lombaires et abdominaux sont des « secondaires »). Le volume qui leur est attribué est une convention, pas une mesure.
- **Incohérences factuelles entre exercices équivalents.** Elles sont proposées, **non corrigées**, car la moindre correction du catalogue change des prescriptions :
  - `incline_push_up` n'a aucun secondaire, alors que `push_up` déclare le deltoïde antérieur ;
  - `machine_row` n'a pas de deltoïde postérieur, alors que `seated_cable_row` en déclare un ;
  - `band_assisted_pull_up` n'a pas de haut du dos, alors que `pull_up` en déclare un.

### 2.2 Lien entre Q1 et Q4

Le recul des pectoraux en forme générale sous B1 (6 → 3,3) **n'est pas un effet direct du décompte**. Traces `SELECT.EXERCISE.CHOSEN` :
- en semaine 1, l'isolation du haut (`fb.iso_upper`) se départage à égalité (`seed_tiebreak`) : pec deck avec A, élévation latérale avec B1 ;
- la continuité S4 fige ensuite ce choix pendant 12 semaines.

C'est le même mécanisme que Q4. Q1 et Q4 sont donc **liés** : toute politique qui change l'égalité de départ change durablement l'isolation retenue.

## 3. Résultats Q1-B1 (B1 désactivé par défaut)

Séries prévues par semaine. La première valeur est comptée selon la convention du registre, la seconde selon la convention de la variante ; la cible est entre parenthèses (`lot43-consolidation.md` § Q1).

| Profil | A (actif = bfedde1) | B1 | B1 + Q4 | Compromis |
|---|---|---|---|---|
| L4-1 hypertrophie 4× | pect. 9,9 · dos 8 · bras 13,8 | pect. **10** · dos **10** · bras 16,5 \| 9,5 | = B1 | bras bruts +2,7 séries ; durée +1 min |
| L41-H3 Full Body 3× | pect. **4,8** · dos 8,1 | pect. **9,5** · dos **10** | pect. **5,1** | B1 corrige, B1 + Q4 annule |
| L41-FORME forme 3× | pect. **6** · dos 5,3 | pect. **3,3** (recul) · dos 6 | pect. **6** · dos 6 | B1 dégrade, B1 + Q4 corrige |
| L42-RUN3 3× + Course | pect. 7,5 · dos 7 | pect. 7,5 · dos **8** | pect. **3,2** (recul) | B1 + Q4 dégrade |
| L41-FORCE | pect. 5 · dos 5 (cibles 7) | pect. **7** · dos **7** | = B1 | bras bruts 9,5 → 14,5 ; principaux changés 48 → 25 |
| L41-H4P priorités dos / épaules | dos 10,9 (13) | dos **13** | = B1 ; fessiers 14 | bras bruts **19,3** |
| L4-3 matériel limité | pect. 5 · dos 7 | pect. 6 · dos 7 | = B1 | aucune violation de matériel |
| L43-HYX3 HYROX intensif | pect. 7 · dos 5,5 | pect. **8** · dos **8** | = B1 | — |
| L43-RECOV récupération limitée | pect. 6 · dos 4,5 | pect. **7** · dos **7** | = B1 | — |

**Contrôles, sur 20 profils pour chaque variante :**
- aucune violation de matériel ou d'exclusion ;
- aucune durée dépassée, aucune séance sous 36 h ;
- les principaux restent stables (aucun changement en A/B).

**Effet sur les groupes non ciblés :**
- les bras bruts augmentent partout (+1 à +5 séries) : ils sont désormais comptés à 0,5 dans les polyarticulaires, donc le moteur ajoute de l'isolation ou des séries ;
- les fessiers et les quadriceps ne changent pas.

**Conclusion Q1 :**
- B1 améliore 8 profils sur 9 examinés et en dégrade un (forme générale, par le mécanisme de départage Q4).
- B1 + Q4 corrige la forme générale mais dégrade deux profils Full Body.
- **Aucune variante n'est meilleure partout.** La décision porte sur B1 seul, avec un traitement séparé du départage d'isolation (§ 13, D1).
- Le coefficient 0,5 reste une **hypothèse expérimentale** (convention du dépôt), pas une vérité physiologique.

## 4. Diagnostic Q2 — volume sur 7 jours glissants (non bloquant)

**Fonction produit :** `rollingVolumeDiagnostic(state, date)` (`strength-diagnostics.ts`), en lecture seule.
- Fenêtre : [date − 6 j ; date], réalisé et prévu non fait.
- Par groupe : direct (principal), indirect estimé (secondaire, brut), total selon la politique courante, cible, borne haute, dépassement et causes probables.
- Causes possibles :
  - `calendar_week_above` : la semaine civile dépasse déjà ;
  - `week_transition` : chaque semaine respecte la borne, leur somme glissante non ;
  - `moved_session` : séance réalisée un autre jour que prévu ;
  - `synergist_accumulation` : le direct seul ne dépasserait pas ;
  - `planned_not_done` : la fenêtre contient du prévu.

**Ce que la fonction ne fait jamais :**
- supprimer une série ;
- refuser une séance ;
- modifier une prescription ;
- recalculer un historique.

**Ce qu'elle dit toujours :** « Indicatif : un dépassement glissant n'est pas une preuve de surentraînement. »

**Résultats (réalisé sur 12 semaines, A) :**

| Profils | Jours au-dessus de la borne | Causes |
|---|---|---|
| A/B 4× (L4-1, STAG, DIFF) | bras 15 | frontière de semaine 15 |
| Dimanche puis lundi (SUNMON) | bras **20** | frontière de semaine 20 |
| Lundi à jeudi (EARLY) | bras 10 | frontière de semaine |
| Semaines courtes (SHORT) | bras 17 | frontière de semaine |
| Full Body → A/B (L4-4, HIST) | bras 17, fessiers 10 | frontière de semaine 27 ; synergistes 4 |
| Récupération limitée (RECOV) | bras 18 | frontière de semaine ; **synergistes** 18 |
| Hybrides, matériel limité, Force | aucun | — |

**Limites :**
- une fenêtre glissante dépend du jour de mesure ;
- elle compte le prévu comme s'il allait être fait ;
- elle compte les synergistes selon une convention (§ 3) ;
- la borne haute est un repère heuristique (G2).

Le diagnostic n'est **pas branché à l'interface** dans ce lot. Il est prêt pour un affichage informatif, à décider.

## 5. Diagnostic Q5 — poussée / tirage (descriptif)

**Fonction produit :** `pushPullIndicator(state, weekStart, 4 semaines)`, en lecture seule. Elle mesure :
- séries directes par schéma (poussée H, poussée V, tirage H, tirage V) ;
- séries indirectes (schémas secondaires) ;
- fréquence (séances par semaine) ;
- schémas **indisponibles** avec le matériel et les exclusions ;
- substitutions ;
- orientation attendue d'après les priorités.

Les priorités se lisent ainsi :
- dos seul : tirage attendu ;
- pectoraux seuls : poussée attendue ;
- épaules : neutre, car il s'agit surtout d'élévations latérales.

**Statuts :**
- `insufficient_data` : moins de 2 semaines ;
- `explained_by_equipment` ;
- `pattern_missing` : schéma disponible mais jamais travaillé ;
- `explained_by_priority` ;
- `persistent_imbalance` : au moins 3 semaines consécutives hors de la bande descriptive **candidate** 0,67–1,5, sans explication ;
- `balanced`.

Jamais une séance isolée ; aucun ratio imposé ; aucune action automatique. Le message n'est pas alarmiste, par exemple : « à examiner sur la durée, sans changement automatique ».

**Résultats (dernière semaine) :**

| Profil | A | B1 |
|---|---|---|
| 18 profils sur 20 | équilibré | équilibré |
| L4-3 matériel limité | expliqué par le matériel : **aucun tirage vertical possible** | idem |
| L41-H4P priorités dos et épaules | expliqué par la priorité (après correction de la règle des épaules, voir ci-dessous) | équilibré |
| L41-FORME | équilibré | `pattern_missing` (le recul de B1 fait disparaître un schéma) |

**Correction en cours de lot :** la première version comptait la zone « épaules » comme une attente de poussée. Elle déclenchait une alerte « déséquilibre persistant » pour un utilisateur qui avait lui-même demandé le dos. C'était l'alerte excessive à éviter : corrigé.

## 6. Stratégies Q3 / Q7 — planification hybride

### 6.1 Moteur de propositions (prototype, non branché à l'interface)

**Fonction :** `proposeHybridWeekAlternatives(state, clock, env)` (`hybrid-proposals.ts`), en lecture seule. Elle essaie, dans l'ordre demandé :

| # | Stratégie | Mécanisme (moteur et planificateur existants) |
|---|---|---|
| 1 | `other_day` | Option `recoveryRetry` (Q7) : refus pour récupération ⇒ autres jours autorisés libres, dans l'ordre ; traces `PLAN.PLANNER.RECOVERY_RETRY` (jour refusé, jours examinés) |
| 2 | `permutation` | Exploration existante des jours de repos de la replanification V2.2 (séances non commencées seulement) |
| 3 | `alternate_region` | Semaine courte : région non placée alternée d'une semaine à l'autre |
| 4 | `upper_lower_full` | Semaine courte : Haut, Bas, puis Full Body |
| 5 | `full_body` | Semaine courte : Full Body |

**Pour chaque stratégie :**
- un aperçu jetable « Planning actuel / Planning proposé » ;
- un résumé : séances placées, autres sports, Haut/Bas/Full Body, écart minimal entre séances de même région, séries sous la cible ;
- la liste des changements (`kept`, `moved`, `replaced`, `added`, `unplanned`, `removed`), chacun motivé.

**Statut :**
- `unsafe_recovery` : même région, ou Full Body, à moins de 36 h, séances réellement faites comprises ;
- `no_improvement`, `unavailable` ou `valid`.

Une proposition **non sûre n'est jamais recommandée ni applicable**.

**Application :**
- `applyHybridProposal(…, confirmed)` exige `confirmed: true` (« Appliquer le nouveau planning ») ; sinon `REPLAN_CONFIRMATION_REQUIRED` et état intact (« Conserver mon planning » = ne rien appeler) ;
- la proposition est **régénérée et comparée** (garde de péremption de `confirmStrengthWeekReplan`).

**Garanties testées :**
- aucune mutation avant confirmation (identité JSON) ;
- séance commencée jamais déplacée ni réécrite ;
- aucun jour inventé ;
- autres sports conservés ;
- déterminisme ;
- export / import.

### 6.2 Constat de sécurité

**Aucune des gardes de récupération du moteur ne contrôle une séance Full Body dans une semaine demandée à 4 séances** :
- la garde Full Body ne s'applique qu'aux profils à 3 séances ou moins ;
- la garde de région ne contrôle que les séances A/B.

Mesure : les stratégies **statiques** Haut/Bas/Full Body et Full Body produisent **12 séances sous 36 h** sur HYROX intensif (L43-HYX3).
- Le moteur de propositions recontrôle la récupération, séances réellement faites comprises, et classe ces cas `unsafe_recovery`.
- C'est pourquoi aucune stratégie de semaine courte ne doit être activée hors de ce contrôle (§ 13, D3).

### 6.3 Comparaison sur 12 semaines (`lot43-consolidation.md` § Q3/Q7)

| Profil | Actuel (A) | Meilleure stratégie mesurée | Propositions acceptées chaque semaine (PROP) |
|---|---|---|---|
| L41-RUN, 4× + Course | quadriceps 5,3, ischios 4,5, fessiers 7,2 ; soulevé roumain 90 → 90 (1 baisse) | — | `other_day` ou `permutation` 12 semaines sur 12 : quadriceps **8**, ischios **6**, fessiers 8 (cibles atteintes) ; soulevé roumain 90 → 97,5 sans baisse ; durée maximale 42 → 35 min |
| L42-RUN3, 3× + Course | quadriceps 3,9, fessiers 6 | — | 12 semaines sur 12 : quadriceps **6,8**, ischios 6, fessiers 10 |
| L43-HYX3, HYROX intensif | quadriceps 2,5, ischios 2, fessiers 3 ; pectoraux 7, dos 5,5 | région alternée | 6 semaines « région alternée » : quadriceps **5,5**, ischios 4, fessiers 6 ; pectoraux 5,5, dos 4 |
| L4-2, HYROX 5 jours | Haut / Bas 24 / 12 ; quadriceps 3,8 ; pectoraux 7,2 ; squat 100 → 105 | région alternée : 18 / 18, fessiers 5, squat 107,5, mais dos 3,8 | Full Body 12 semaines sur 12 : **moins bon** (pectoraux 5,8, squat 100 → 100 avec 2 baisses) |
| L42-SHORT, semaines courtes | quadriceps 8,3, pectoraux 9,9 | région alternée : quadriceps 9,2 | Full Body 4 semaines : quadriceps 8,8, pectoraux 8,2, squat 105 au lieu de 107,5 |
| L4-5, planning perturbé | — | identique | aucune proposition (rien de mieux) |

**Lecture :**
- **La réorganisation (stratégies 1 et 2) est très favorable au multisport avec Course** : elle place la Musculation loin des séances de Course.
- Pour HYROX, la proposition retenue (Full Body) est **moins bonne sur 12 semaines** que le planning actuel. Deux causes :
  1. le classement privilégie l'équilibre Haut / Bas avant l'écart aux cibles, sans regarder la continuité des principaux ;
  2. la **part de volume de la séance non placée n'est jamais réattribuée** : le budget de chaque séance suppose les 4 séances demandées, et le Full Body de semaine courte est sous-dosé. Cela vaut pour toutes les stratégies de semaine courte.
- Le lot 4.2 avait approché « 3 Full Body » par un profil demandant 3 séances : cette approximation **surestimait** l'option.

### 6.4 Corrections techniques démontrées

1. **Aperçu de replanification V2.2 (`strength-replan.ts`) :** l'adaptateur de ports ignorait le **rang** de la demande dans la sonde de placement. Il réintroduisait le défaut V3 corrigé au lot 4.1 dans le planificateur.
   - Constat : sur le profil HYROX, l'aperçu « sans changement » ne plaçait que 2 séances au lieu de 3.
   - Correction : rang transmis ; l'aperçu reproduit désormais le planning courant.
   - Ce chemin sert aussi à la modification de la personnalisation existante (E2E personnalisation vert).
2. **Option Q3 (lot 4.2), artefact de sonde :** `shortWeek` s'appliquait aussi à l'appel de la sonde de placement (aucun jour). La stratégie changeait donc la sonde. Correction : uniquement si au moins 1 jour libre (option inactive par défaut ; test ajouté).

## 7. Analyse R4 (Q8) — modèle réduit, moteur actif non modifié

**Modèle (`r4-model.ts`) :** il reproduit les règles autorégulées du moteur.
- Classement : `below` si répétitions manquées ou RIR ≤ visé − 2 ; `above` si ≥ visé + 1.
- 2 preuves.
- Charge = min(actuelle + 2,5 kg, e1RM lissé × % des répétitions à l'échec), e1RM médian.
- −10 % après 2 « en dessous » ; plafond de cycle 15 %.

**Calibration :** séances normales 100 → 105 kg (moteur réel, banc : 100 → 105) ; Course actuelle 100 → 95 avec une baisse (banc : 100 → 97,5 avec une baisse).

| Variante | Normal (progresse / stagne / difficulté) | HYROX, progresse (1 séance sur 2 allégée) | Course, progresse (toutes allégées) | Course, stagne | Course, difficulté (capacité 89,5) | Invariants |
|---|---|---|---|---|---|---|
| 1. Actuelle | 105 / 100 / 85 | 100 (bloqué) | **95** (hausses puis baisse sur séances allégées) | **90** (baisse artificielle) | 85 | ✗ décisions sur séances allégées |
| 2. R4 seul | identique | 100 (bloqué : plancher multisport traité comme allègement) | 100 | 100 | **100 : fatigue ignorée** | ✗ fatigue ignorée |
| 3. R4 + exception multisport | identique | **105** | 100 | 100 | **100 : fatigue ignorée** | ✗ |
| 4. R4 + R3 | identique (difficulté : 90) | 102,5 | 100 | 100 | 100 | ✗ |
| 5. R4 + exception + R3 | identique | 105 | 100 | 100 | 100 | ✗ |
| **6. Proposition : 5 + sécurité** (3 séances allégées consécutives en dessous ⇒ −10 %) | identique | 105 | 100 | 95 | **90** | ✓ fatigue prise en compte ; aucune hausse sur séance allégée |

**Traces :** chaque exposition est expliquée (`why`), par exemple « séance allégée : preuve comptée, aucune hausse décidée (R4) » ou « 3 séances allégées consécutives en dessous : baisse (fatigue persistante) ».

**Conclusions :**
- **R4 seul est à exclure.** Il bloque toute progression du multisport et ignore la fatigue persistante.
- **L'exception du plancher multisport est nécessaire.** Le plancher (RIR 4) est une dose de référence durable, comme le niveau ; c'est cohérent avec la définition « modificateur durable » de R4.
- **Une règle de sécurité est indispensable.** Sans elle, aucune variante R4 ne réduit la charge d'un athlète dont toutes les séances sont allégées et qui décline.
- **Limite restante :** la Course où **toutes** les séances sont allégées par interférence reste bloquée à 100 kg (capacité 105,6). Même R3 n'y remédie pas dans le modèle, car l'e1RM observé est sous-estimé les jours de fatigue. Piste à arbitrer : un RIR d'interférence « relevé » plus faible, ou la lecture de l'e1RM avec l'interférence connue.
- **Ce modèle compare des règles.** Il ne démontre aucun bénéfice physiologique.

**Proposition d'implémentation (non intégrée) :**
1. Reprendre R4 (`5e119d6`) : dose de référence / transitoire, `doseModified` et `referenceRir` (domaine, champs facultatifs).
2. Classer le plancher multisport comme modificateur **durable**.
3. Ajouter `safetyBelowLightened: 3` à `strength.progression.policy` (paramètre G2, à gouverner).
4. Ajouter R3 : réévaluation de fin de cycle depuis l'e1RM observé, plafonnée à 15 %.
5. Banc : modèle et rejeu complet des 20 profils.

## 8. Simulations comparatives

**Couverture :**
- 20 profils : les 18 du lot 4.2, plus **HYROX intensif** (4× + HYROX 3×, 6 jours) et **récupération limitée** ;
- 12 semaines ;
- 7 variantes : A, B1, B1 + Q4, trois stratégies statiques de semaine courte, PROP sur les 6 profils concernés ;
- diagnostics Q2 et Q5 ;
- 6 variantes R4 dans le modèle.

**Scénarios demandés :**

| Scénario | Profil |
|---|---|
| Matériel limité | L4-3 |
| Priorités | L4-1, H4P |
| Disponibilités restreintes | SHORT, L4-2 |
| HYROX intensif | HYX3 |
| Course | RUN, RUN3 |
| Séances manquées | MISS, L4-5 |
| Récupération insuffisante | RECOV |
| Historique de charges | HIST |
| Semaine déjà commencée | L4-5 ; test de proposition avec séance commencée |

**Comparaison avec `bfedde1` :** la variante A est **identique** au rapport du lot 4.2 (colonne « = bfedde1 » : « oui » pour les 18 profils communs, volume, charges, séances). Les 2 nouveaux profils sont marqués « nouveau ». Le moteur actif est donc inchangé.

**Contrôles transverses :**

| Variante | Erreurs | Sous 36 h | Durée au-delà | Violations matériel / exclusions |
|---|---|---|---|---|
| A, B1, B1 + Q4, région alternée, PROP | 0 | 0 | 0 | 0 |
| Haut / Bas / Full Body, Full Body (statiques) | 0 | **12** (HYROX intensif) | 0 | 0 |

## 9. Résultats des tests

| Vérification | Résultat |
|---|---|
| `pnpm check` (typage, lint, tests) | **OK** : 286 fichiers, 3 221 tests réussis, 5 ignorés (bancs sur demande) |
| `rc5-lot43-planning.test.ts` (12) | propositions : lecture seule, ordre, explications, recommandation sûre, déterminisme ; « Conserver » sans mutation, « Appliquer » confirmé ; séance commencée intacte ; Q7 (refus actif sans réessai, proposition avec jours autorisés, trace des jours examinés, aucun jour inventé) ; Full Body non sûr jamais recommandé ; options inactives par défaut ; identité avec `bfedde1` (L4-1, L4-2) ; diagnostics Q2 / Q5 (lecture seule, matériel, équilibre, données insuffisantes) |
| `rc5-lot43-r4.test.ts` (7) | rapport du modèle ; variantes identiques hors multisport ; constats de la règle actuelle ; aucune hausse sur séance allégée en R4 ; limite « fatigue ignorée » documentée et règle de sécurité ; exception multisport sans hausse injustifiée ; traces ; déterminisme |
| `lot42-options.test.ts` (8) | options Q3 (région alternée, Haut / Bas / Full Body, Full Body) : inactives par défaut, identiques en semaine complète **et pour la sonde** |
| `rc5-lot43-bench.test.ts` | banc sur demande : `LOT43_BENCH=1 [LOT43_SHARD=A,B1]`, fusion `LOT43_MERGE=1` |
| Migration navigateur, vraies builds historiques (code final) | V2.1 `5695917` (v3) → v5 : **3 / 3 PASS** ; `b850b98` (v4) → v5 : **4 / 4 PASS** ; sécurité des données : **OK** |
| E2E (code final, build BÊTA locale) | Rotation A/B 360 et 390 px, lots 2 et 3, **personnalisation** (aperçu de replanification corrigé), séance mobile, répétitions, jours Musculation, hors ligne, stockage auxiliaire du chronomètre : **OK**. Parcours `base`, `cross`, `hyrox`, `recovery`, `planning` : **5 / 5 OK**. Parcours complet `e2e.mjs` (build standard) : **310 OK**, identique aux lots précédents. Aucune interface ajoutée : pas de nouvelle vérification 360 / 390 px. |
| Banc complet | 7 variantes × 20 profils (PROP : 6 profils) : variante A identique à `bfedde1` (18 / 18), contrôles transverses § 8 |

## 10. Compatibilité historique

- **Données et prescriptions :** format v5 inchangé ; aucune donnée réécrite ; semaines existantes jamais replanifiées sans confirmation.
- **Moteur actif :** identique à `bfedde1` (preuve § 8).
- **Seul chemin actif modifié :** l'aperçu V2.2 (§ 6.4, 1), qui ne s'applique qu'après confirmation de l'utilisateur ; son résultat confirmé est revérifié.
- **Raisons ajoutées :** `PLAN.PLANNER.RECOVERY_RETRY` (propositions seulement) et le paramètre facultatif `shortWeek` de `PLAN.WEEK_COMPOSITION`. Les deux sont additifs.

## 11. Fichiers modifiés

**Produit**
- `packages/app-core/src/hybrid-proposals.ts` (nouveau, prototype) ;
- `packages/app-core/src/strength-diagnostics.ts` (nouveau) ;
- `packages/app-core/src/index.ts` ;
- `packages/app-core/src/planning.ts` (`recoveryRetry`, propositions seulement) ;
- `packages/app-core/src/strength-replan.ts` (correction du rang, option `recoveryRetry`) ;
- `packages/planner/src/model.ts`, `planner.ts`, `codes.ts` (réessai Q7 optionnel) ;
- `packages/strength/src/composition.ts` (options Haut / Bas / Full Body et Full Body ; correction de la sonde).

**Tests et banc**
- Nouveaux : `rc5-lot43-planning.test.ts`, `rc5-lot43-r4.test.ts`, `rc5-lot43-bench.test.ts`, `lot43-bench.ts`, `r4-model.ts`.
- Modifiés : `lot42-bench.ts` (types de semaine courte, accès à l'état final), `rc4-sim.ts` (`afterPlanned`), `lot42-options.test.ts`.

**Rapports**
- `lot43-consolidation.md` et `.json` ;
- `lot43-shard-*.json` ;
- `lot43-r4-model.md`.

**Documentation**
- ce document.

## 12. Risques résiduels

1. **Full Body en semaine de 4** non contrôlé par les gardes du moteur (§ 6.2). Sans risque aujourd'hui (aucune composition active ne le produit), mais **bloquant** pour toute activation d'une stratégie Full Body hors du moteur de propositions.
2. **Volume de la séance non placée jamais réattribué** : les semaines courtes sont sous-dosées, quelle que soit la stratégie.
3. **Classement des propositions :** l'équilibre Haut / Bas passe avant l'écart aux cibles et la continuité des principaux, d'où le Full Body moins bon sur HYROX.
4. **Q1 :** aucune variante n'est meilleure partout ; le départage d'isolation (Q4) amplifie les effets.
5. **Modèle R4 réduit :** fatigue, athlète et interférence sont simplifiés ; les valeurs (0,5 % par semaine, −3 % ou −5 % les jours de fatigue) sont des hypothèses.
6. **Diagnostics Q2 / Q5 non affichés :** utilité non démontrée auprès des utilisateurs.
7. **Bande poussée / tirage et seuil de 3 semaines :** candidats non validés.

## 13. Décisions restant à valider

| # | Décision | Options | Recommandation |
|---|---|---|---|
| D1 | Q1 synergistes | A / **B1** / B1 + Q4 | B1, **après** une règle d'isolation qui ne dépend plus d'une égalité de semaine 1 figée par la continuité (par exemple : réévaluer l'isolation quand son groupe dépasse sa cible alors qu'un autre reste en dessous). Pas B1 + Q4 en l'état. |
| D2 | Afficher le diagnostic glissant (Q2) | non / **information discrète** | Mention informative ; aucun garde-fou |
| D3 | Propositions hybrides (Q3 / Q7) | non / **aperçu sur demande** / proactif | Aperçu sur demande, après : (a) un contrôle de récupération Full Body dans le moteur ; (b) un classement qui fait passer l'écart aux cibles et la continuité avant l'équilibre ; (c) la stratégie Full Body réservée aux semaines où elle ne casse pas la continuité |
| D4 | Réattribution du volume de la séance non placée | non / **oui, dans les bornes hautes** | Oui, plafonnée par les bornes et la durée ; à simuler avant activation |
| D5 | Indicateur poussée / tirage (Q5) | non / **diagnostic** | Diagnostic, bande et seuil à valider |
| D6 | R4 | 1 à 5 / **6** | Variante 6 : R4 + exception du plancher multisport + R3 + règle de sécurité ; puis traiter la Course entièrement allégée |
| D7 | Catalogue | statu quo / corrections factuelles (§ 2.1) | Corriger les 3 incohérences, avec rejeu du banc |

## 14. Commit

- **Commit local unique** sur `claude/rekka-lot43-science-planning`. Son empreinte est donnée dans le rapport final (`git log -1`).
- Aucun push, aucune fusion, aucun déploiement. BÊTA `bc19fb1` et production `f9f7e2e` intactes.
