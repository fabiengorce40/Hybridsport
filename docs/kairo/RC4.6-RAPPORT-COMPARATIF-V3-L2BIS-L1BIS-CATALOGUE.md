# RC4.6 — Rapport comparatif : V3 intégrée, études L2-bis et L1-bis, revue du catalogue

**Branche :** `claude/kairo-rc4-dev`.

**Moteurs sportifs, Running, TEST et production :** inchangés, en dehors de la surcouche de contenu V3, autorisée. Aucune fusion, aucun déploiement.
- Études L2-bis et L1-bis : **copies jetables**, supprimées après mesure.
- Modifications étudiées : archivées en patchs dans `docs/kairo/rc46-audit/etudes/`. **Aucune n'est intégrée.**
- Revue du catalogue : lecture et calcul seulement. **Aucune attribution ni aucun seuil modifié.**

---

## Synthèse

| Lot | Résultat | Recommandation |
|---|---|---|
| **L1-V3** (intégré, `bfa6f80`) | Critères respectés sur les 8 profils : épaules plus jamais au-dessus de la borne haute, aucun nouveau groupe sous le plancher, dos inchangé, durées ±2 min, aucune progression interrompue, anciennes semaines relues à l'identique. Écart mineur : fessiers au-dessus de la borne haute une semaine de plus en P2, P3 et S3. | Intégration faite. Détail : `docs/kairo/RC4.6-L1-V3-INTEGRATION.md`. |
| **L2-bis** | Cause identifiée : dépendance **mutuelle** entre la séance de Musculation et le bloc de force du Cross-training. Aucune solution qui **change la planification** (B1, B2, B3) ne respecte vos quatre conditions. **B4** (persister l'entrée réellement lue) les respecte toutes : 0 divergence, aucun programme modifié, coût < 0,6 % de l'état pour la Musculation. | **B4 réduit** pour la Musculation, après votre accord. B4+ (Cross-training, HYROX) à concevoir d'abord en forme compacte. |
| **L1-bis** | **L1b-4** : tirage complémentaire à **temps résiduel** (après les mollets), **jusqu'au plancher du dos**, retiré sous interférence de préhension. Dos +0,7 à +1,5 série par semaine, semaines sous le plancher divisées par 2 à 4. **Aucune** baisse ailleurs, durées +0 à +1 min, aucune progression interrompue, moins de tirages identiques d'une séance à l'autre. | Candidat à l'intégration en contenu versionné, après votre validation. Gain modeste : le dos reste sous le plancher 1 à 3 semaines sur 6 sur certains profils. |
| **Catalogue** | Le dépassement des bras vient de la convention : triceps et biceps **moteurs principaux** des polyarticulaires. Avec une convention « synergistes = 0,5 », les bras sont à 9–10 séries (plage 6–14) sur tous les profils. | Faire valider par un référent la convention B (§ 4.4) avant toute modification. Une modification changerait aussi la sélection : à étudier en lot séparé. |

---

## 1. L1-V3 — intégration (rappel)

- Contenu versionné `0.6.0-strength-l1v3` : `fb.iso_upper` passe à 1 exercice. Le contenu F6 est conservé au registre.
- Les 8 profils du banc sont vérifiés. Tableaux avant / après, critères et écarts : `docs/kairo/RC4.6-L1-V3-INTEGRATION.md`.
- Relecture des anciennes semaines : trois états écrits avant V3. Les 4 chemins de démarrage donnent un résultat identique au code d'avant.
- Vérifications : `pnpm check` (2960 tests réussis), build, E2E : réussis.

---

## 2. L2-bis — dépendance Musculation / bloc de force du Cross-training

### 2.1 Dépendance identifiée

**La Musculation lit les blocs de force du Cross-training** (`packages/planner/src/ports.ts`, port Strength). Toutes les séances Cross-training de la semaine sont lues, quelle que soit leur date :
- séries prévues de chaque bloc, comptées dans le volume hebdomadaire (`otherStrengthSessions`) ;
- exercices du bloc, comptés comme expositions prévues (alternance des ancres).

**Le bloc de force lit la Musculation.** Pendant la génération Cross-training, le bloc est composé par Strength en mode bloc. Il lit les séances de Musculation de la semaine (`crossSportWeek.strength`) et les autres blocs, pour le volume et l'alternance.

**Ordre de génération dans le planificateur** (`planCore`) :
- première génération en tour de rôle ;
- passe de composition Musculation, dans l'ordre des dates ;
- seconde passe des consommateurs, dans l'ordre des dates ;
- arbitrage M3.

Chaque génération lit la version **courante** de l'autre sport. Une séance de Musculation antérieure au Cross-training est donc régénérée **avant** la version finale du bloc : elle lit une version intermédiaire. Le bloc, régénéré ensuite, lit la Musculation finale. **Le circuit n'a pas de point fixe.**

**Persistance :** la séance de Musculation enregistre son contexte de voisines, mais **pas** les blocs lus. La régénération (`start-check.ts`) relit les blocs **finaux** persistés. La divergence R-A en découle.

**Mesure (semaines retenues, à la planification, 6 semaines) :**

| Profil | Musculation : bloc lu ≠ bloc final | dont séances qui changeraient | Cross-training : Musculation lue ≠ finale | dont séances qui changeraient | Divergences R-A (Musc. / CT / HYROX) |
|---|---|---|---|---|---|
| Consolidation (CT force + conditionnement 1×) | 18 / 18 | 6 | 0 / 6 | 0 | 6 / 0 / — |
| P2F (P2 avec CT force + conditionnement 2×) | 12 / 18 | 2 | 7 / 12 | 2 | 1 / 1 / — |
| **P2** (CT 2×, sans bloc de force) | 0 / 18 | 0 | **12 / 12** | **0** | 0 / 0 / — |
| P3 (HYROX) | — | 2 (décisions M3, voulues) | — | — | 0 / — / **1** |
| P5 (4 sports) | 0 / 18 | 1 (dose, voisine HYROX) | 1 / 6 | 0 | 0 / 0 / 0 |
| P1, P1b, P4, S3, S4 | 0 | 0 | — | — | 0 |

**Contextes Cross-training « périmés » de P2 (demande explicite) :**
- Sur les semaines **retenues**, les 12 séances lisent une version intermédiaire de la Musculation. Ce contexte **n'a aucun effet** : P2 n'a pas de bloc de force délégué, et seule la délégation lit la Musculation.
- Le contexte de voisines (interférence) des séances Cross-training de P2 n'est jamais périmé.
- Le chiffre de 29 sur 48 donné en L2 comptait aussi les planifications **candidates** de G5, non retenues.
- Divergences R-A Cross-training en P2 : 0.

**Constat hors périmètre :** P3 a 1 divergence R-A **HYROX**. Après une décision M3 (déplacement), la séance HYROX régénérée ne lit plus la même liste de séances HYROX de la semaine. B4+ la supprime.

### 2.2 Solutions comparées

| Solution | Principe (copie jetable) |
|---|---|
| **B1 — bloc Cross-training d'abord** | Le bloc ne lit plus la Musculation (seulement les autres blocs). La seconde passe traite le Cross-training avant la Musculation, qui lit donc le bloc final. |
| **B2 — Musculation d'abord** | La Musculation ne lit plus les blocs. La seconde passe traite la Musculation d'abord ; le bloc lit la Musculation finale. |
| **B3 — point fixe borné avant M3** | La seconde passe est répétée (au plus 4 fois) jusqu'à ce qu'aucune entrée ne change. L'arbitrage M3 s'applique **ensuite**, sans modification. |
| **B4 — contexte persisté réduit** | Planification **inchangée**. La séance de Musculation persiste la forme réduite des blocs lus : exercice, nombre de séries de travail, date. La régénération relit cette forme. |
| **B4+ — contexte persisté complet** | Comme B4, pour tous les sports : blocs ou séances croisées lus, et séances de la semaine. |

### 2.3 Résultats (6 semaines)

**CONS — Consolidation (Musculation 3×, CT force + conditionnement 1×)**

| Solution | Divergences R-A (Musc. / CT / HYROX) | Séances Musc. modifiées | Séances CT modifiées | Bilan hebdo (écart à la réf.) | Arbitrages M3 | Durée Musc. moy. / max |
|---|---|---|---|---|---|---|
| Référence | 6 / 0 / — | 0 / 18 | 0 / 6 | aucun | 18 | 52 / 61 |
| B1 bloc CT d’abord | 0 / 0 / — | 13 / 18 | 6 / 6 | quadriceps +4,0, ischio -1,3 | 18 | 54 / 61 |
| B2 Musculation d’abord | 0 / 0 / — | 15 / 18 | 0 / 6 | quadriceps +0,2, ischio +0,2, fessiers +0,2, mollets +0,7, épaules -4,6, bras +0,5, tronc -0,2 ; **sous plancher : épaules** | 18 | 51 / 62 |
| B3 point fixe avant M3 | 0 / 0 / — | 13 / 18 | 0 / 6 | quadriceps -2,5, mollets +0,7, tronc +0,2 | 18 | 51 / 61 |
| B4 contexte persisté réduit (Musculation) | 0 / 0 / — | 0 / 18 | 0 / 6 | aucun | 18 | 52 / 61 |
| B4+ contexte persisté complet | 0 / 0 / — | 0 / 18 | 0 / 6 | aucun | 18 | 52 / 61 |

**P2F — P2 avec CT force + conditionnement 2×**

| Solution | Divergences R-A (Musc. / CT / HYROX) | Séances Musc. modifiées | Séances CT modifiées | Bilan hebdo (écart à la réf.) | Arbitrages M3 | Durée Musc. moy. / max |
|---|---|---|---|---|---|---|
| Référence | 1 / 1 / — | 0 / 18 | 0 / 12 | aucun | 2 | 55 / 62 |
| B1 bloc CT d’abord | 0 / 0 / — | 14 / 18 | 10 / 12 | quadriceps +2,5, ischio -1,0, mollets -0,7, tronc -1,0 ; **sous plancher : mollets** | 4 | 54 / 62 |
| B2 Musculation d’abord | 0 / 1 / — | 10 / 18 | 7 / 12 | quadriceps -0,3, ischio +0,8, fessiers +0,2, mollets -0,7, pectoraux +0,1, épaules +0,1, tronc -0,4 ; **sous plancher : mollets** | 1 | 55 / 63 |
| B3 point fixe avant M3 | 0 / 1 / — | 10 / 18 | 7 / 12 | mollets -0,7, pectoraux -0,4, épaules -0,2, tronc +0,2 ; **sous plancher : mollets, pectoraux** | 1 | 54 / 65 |
| B4 contexte persisté réduit (Musculation) | 0 / 1 / — | 0 / 18 | 0 / 12 | aucun | 2 | 55 / 62 |
| B4+ contexte persisté complet | 0 / 0 / — | 0 / 18 | 0 / 12 | aucun | 2 | 55 / 62 |

**P2 — Musculation 3× (masse) + Cross-training 2×**

| Solution | Divergences R-A (Musc. / CT / HYROX) | Séances Musc. modifiées | Séances CT modifiées | Bilan hebdo (écart à la réf.) | Arbitrages M3 | Durée Musc. moy. / max |
|---|---|---|---|---|---|---|
| Référence | 0 / 0 / — | 0 / 18 | 0 / 12 | aucun | 6 | 56 / 64 |
| B1 bloc CT d’abord | 0 / 0 / — | 0 / 18 | 0 / 12 | aucun | 6 | 56 / 64 |
| B2 Musculation d’abord | 0 / 0 / — | 0 / 18 | 0 / 12 | aucun | 6 | 56 / 64 |
| B3 point fixe avant M3 | 0 / 0 / — | 0 / 18 | 0 / 12 | aucun | 6 | 56 / 64 |
| B4 contexte persisté réduit (Musculation) | 0 / 0 / — | 0 / 18 | 0 / 12 | aucun | 6 | 56 / 64 |
| B4+ contexte persisté complet | 0 / 0 / — | 0 / 18 | 0 / 12 | aucun | 6 | 56 / 64 |

**P3 — Musculation 3× (masse) + HYROX 2×**

| Solution | Divergences R-A (Musc. / CT / HYROX) | Séances Musc. modifiées | Séances CT modifiées | Bilan hebdo (écart à la réf.) | Arbitrages M3 | Durée Musc. moy. / max |
|---|---|---|---|---|---|---|
| Référence | 0 / — / 1 | 0 / 18 | — | aucun | 7 | 51 / 63 |
| B1 bloc CT d’abord | 0 / — / 0 | 0 / 18 | — | aucun | 7 | 51 / 63 |
| B2 Musculation d’abord | 0 / — / 1 | 0 / 18 | — | aucun | 7 | 51 / 63 |
| B3 point fixe avant M3 | 0 / — / 1 | 0 / 18 | — | aucun | 7 | 51 / 63 |
| B4 contexte persisté réduit (Musculation) | 0 / — / 1 | 0 / 18 | — | aucun | 7 | 51 / 63 |
| B4+ contexte persisté complet | 0 / — / 0 | 0 / 18 | — | aucun | 7 | 51 / 63 |

**P5 — Quatre sports : Musculation 3×, Course 2×, Cross-training 1×, HYROX 1×**

| Solution | Divergences R-A (Musc. / CT / HYROX) | Séances Musc. modifiées | Séances CT modifiées | Bilan hebdo (écart à la réf.) | Arbitrages M3 | Durée Musc. moy. / max |
|---|---|---|---|---|---|---|
| Référence | 0 / 0 / 0 | 0 / 18 | 0 / 6 | aucun | 20 | 46 / 70 |
| B1 bloc CT d’abord | 0 / 0 / 0 | 0 / 18 | 0 / 6 | aucun | 20 | 46 / 70 |
| B2 Musculation d’abord | 0 / 0 / 0 | 0 / 18 | 0 / 6 | aucun | 20 | 46 / 70 |
| B3 point fixe avant M3 | 0 / 0 / 0 | 0 / 18 | 0 / 6 | aucun | 20 | 46 / 70 |
| B4 contexte persisté réduit (Musculation) | 0 / 0 / 0 | 0 / 18 | 0 / 6 | aucun | 20 | 46 / 70 |
| B4+ contexte persisté complet | 0 / 0 / 0 | 0 / 18 | 0 / 6 | aucun | 20 | 46 / 70 |

Profils P1, P1b, P4, S3, S4 : **identiques à la référence pour toutes les solutions.**

B3 converge en 2 itérations (3 au plus) ; aucune non-convergence observée.

### 2.4 Lecture au regard de vos quatre conditions

| Condition | B1 | B2 | B3 | B4 / B4+ |
|---|---|---|---|---|
| Ne pas annuler les décisions M3 | Respectée : M3 s'applique après. P2F : 2 → 4 arbitrages. | Respectée. P2F : 2 → 1 arbitrage. | Respectée. P2F : 2 → 1 arbitrage. | **Respectée** (planification identique) |
| Ne pas diminuer les volumes | **Non** : ischio −1,3 (consolidation), −1,0 (P2F), mollets −0,7 et tronc −1,0 (P2F) | **Non** : épaules −4,6, sous le plancher (consolidation) | **Non** : quadriceps −2,5 (consolidation, 9,5 → 7,0, plancher 10) ; mollets −0,7 et pectoraux −0,4, nouveaux sous le plancher (P2F) | **Respectée** (aucun changement) |
| Ne pas dégrader le Cross-training | Blocs modifiés : 6/6 (consolidation), 10/12 (P2F) ; durées +0 à +3 min | Inchangé (consolidation) ; 7/12 modifiés (P2F) | Idem B2 | **Respectée** |
| Pas de nouvelle divergence R-A | Respectée (0 partout, et la divergence HYROX P3 disparaît) | P2F : 1 divergence CT reste | P2F : 1 divergence CT reste | B4 : Musculation 0 ; il reste 1 CT (P2F) et 1 HYROX (P3). **B4+ : 0 partout.** |

**Ce que B4 ne fait pas :**
- B4 rend la planification **fidèle et reproductible**, mais ne la rend pas « cohérente » au sens du point fixe.
- La séance de Musculation reste calculée contre la version du bloc qu'elle a réellement lue.
- **Consolidation :** la 3ᵉ séance garde un squat arrière la semaine où le bloc Cross-training du samedi est aussi un squat arrière. Les quadriceps (9,5) restent sous le plancher de 10, comme aujourd'hui.

**À retenir de B1 :**
- Laisser le bloc choisir **sans** lire la Musculation le fait **tourner** (squat, soulevé de terre roumain, développé militaire), alors que la référence propose un squat arrière 5 semaines sur 6.
- Les quadriceps passent alors **au-dessus du plancher** (consolidation 9,5 → 13,5 ; P2F 11 → 13,5).
- Mais c'est une décision de conception du bloc, avec des baisses ailleurs. Hors des conditions fixées ; à n'ouvrir que comme étude distincte.

### 2.5 Coût de la persistance

| Profil | Taille de l'état (6 semaines) | B4+ complet (séances lues entières) | B4 réduit Musculation | B4+ réduit Cross-training (estimation, non validée) |
|---|---|---|---|---|
| Consolidation | 569 Ko | +334 Ko (**+59 %**) | +1,9 Ko (0,3 %) | +6,5 Ko (1,1 %) |
| P2F | 681 Ko | +612 Ko (**+90 %**) | +3,8 Ko (0,6 %) | +14 Ko (2,1 %) |
| P5 | 655 Ko | +297 Ko (+45 %) | < 0,1 Ko | +6,2 Ko (0,9 %) |

- **B4 réduit est validé :** la forme réduite (exercice, séries de travail, date) reproduit exactement la régénération. Divergences Musculation : consolidation 6 → 0, P2F 1 → 0, sans aucun programme modifié.
- **B4+ complet n'est pas acceptable** en l'état (taille). Sa forme réduite pour le Cross-training et HYROX n'est **pas** validée : la délégation et HYROX lisent aussi les empreintes et les prescriptions de conditionnement. Conception à faire.

### 2.6 Recommandation L2-bis

1. **B4 réduit (Musculation)**, à intégrer après votre accord, comme correctif de reproductibilité :
   - champ persisté facultatif avec migration ;
   - régénération qui le relit ; repli actuel si le champ est absent (anciennes séances) ;
   - aucun changement de programme.
2. **B4+ pour le Cross-training et HYROX :** conception d'une forme compacte, à étudier.
3. **B1, B2, B3 : non retenues**, car elles enfreignent la condition « aucune baisse de volume ».
4. L'observation B1 (rotation du bloc Cross-training, quadriceps au plancher) peut justifier une étude de conception séparée, si vous le souhaitez.

---

## 3. L1-bis — tirage complémentaire

Base : contenu courant avec V3 intégrée.

### 3.1 Solutions comparées

| Solution | Principe (surcouche de contenu, copie jetable) |
|---|---|
| L1b-0 (rappel de L1 : V2b) | Emplacement de tirage horizontal **ordinaire**, servi après les accessoires du bas du corps. |
| **L1b-1** | Emplacement `fb.pull_c` (tirage horizontal) à **temps résiduel**, servi **après** les mollets, **jusqu'à la cible hebdomadaire** du dos (attributs F6 R1 / R2 existants). |
| **L1b-2** | **Répartition des accessoires :** deux isolations de **tirage** ajoutées au catalogue et éligibles à l'isolation du haut du corps. Tirage bras tendus : grand dorsal. Face pull : deltoïdes postérieurs, trapèzes. |
| L1b-3 | L1b-1 + L1b-2. |
| **L1b-4** | L1b-1, avec le tirage complémentaire ajouté aux besoins **retirés** quand une voisine sollicite la **préhension** (règle d'interférence existante, `dropOptionalNeeds`). |

### 3.2 Résultats (séries par semaine ; ↓ / ↑ = semaines sous le plancher / au-dessus de la borne haute)

**P1**

| Solution | Dos | Bras | Épaules | Quadriceps | Fessiers | Mollets | Poussée / tirage | Durée moy. / max | Allègements | Mêmes tirages qu’à la séance précédente | Progressions interrompues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Référence (V3 intégrée) | 9,2 ↓5 | 16,3 ↑6 | 13,6 | 7,5 ↓5 | 11,8 | 1,3 ↓4 | 1,99 | 50 / 63 | 37 | 0 / 17 | 0 |
| L1b-0 tirage ordinaire après le bas (V2b, rappel) | 14,8 | 21,1 ↑6 | 14,3 | 7,5 ↓5 | 11,8 | 1,3 ↓4 | 1,24 | 54 / 72 | 41 | 13 / 17 | 0 |
| L1b-1 tirage résiduel jusqu’au plancher | 10,5 ↓2 | 17 ↑6 | 13,6 | 7,5 ↓5 | 11,8 | 1,3 ↓4 | 1,74 | 51 / 63 | 37 | 0 / 17 | 0 |
| L1b-2 isolations de dos au catalogue | 9,2 ↓5 | 16,3 ↑6 | 13,6 | 7,5 ↓5 | 11,8 | 1,3 ↓4 | 1,99 | 50 / 63 | 37 | 0 / 17 | 0 |
| L1b-3 = L1b-1 + L1b-2 | 10,5 ↓2 | 17 ↑6 | 13,6 | 7,5 ↓5 | 11,8 | 1,3 ↓4 | 1,74 | 51 / 63 | 37 | 0 / 17 | 0 |
| **L1b-4 = L1b-1, retiré sous interférence préhension** | 10,5 ↓2 | 17 ↑6 | 13,6 | 7,5 ↓5 | 11,8 | 1,3 ↓4 | 1,74 | 51 / 63 | 37 | 0 / 17 | 0 |

**P2**

| Solution | Dos | Bras | Épaules | Quadriceps | Fessiers | Mollets | Poussée / tirage | Durée moy. / max | Allègements | Mêmes tirages qu’à la séance précédente | Progressions interrompues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Référence (V3 intégrée) | 9,3 ↓4 | 16,4 ↑6 | 13,7 | 10,7 ↓3 | 15,2 ↑6 | 3,3 ↓1 | 1,97 | 56 / 64 | 0 | 9 / 17 | 0 |
| L1b-0 tirage ordinaire après le bas (V2b, rappel) | 14,2 | 20,8 ↑6 | 11,8 | 10,7 ↓3 | 15,2 ↑6 | 1,3 ↓4 | 1,29 | 57 / 64 | 0 | 10 / 17 | 0 |
| L1b-1 tirage résiduel jusqu’au plancher | 10,5 ↓1 | 17 ↑6 | 14 | 10,7 ↓3 | 15,2 ↑6 | 3,3 ↓1 | 1,74 | 57 / 64 | 0 | 6 / 17 | 0 |
| L1b-2 isolations de dos au catalogue | 9,3 ↓4 | 16,4 ↑6 | 13,7 | 10,7 ↓3 | 15,2 ↑6 | 3,3 ↓1 | 1,97 | 56 / 64 | 0 | 9 / 17 | 0 |
| L1b-3 = L1b-1 + L1b-2 | 10,5 ↓1 | 17 ↑6 | 14 | 10,7 ↓3 | 15,2 ↑6 | 3,3 ↓1 | 1,74 | 57 / 64 | 0 | 6 / 17 | 0 |
| **L1b-4 = L1b-1, retiré sous interférence préhension** | 10,5 ↓1 | 17 ↑6 | 14 | 10,7 ↓3 | 15,2 ↑6 | 3,3 ↓1 | 1,74 | 57 / 64 | 0 | 6 / 17 | 0 |

**P3**

| Solution | Dos | Bras | Épaules | Quadriceps | Fessiers | Mollets | Poussée / tirage | Durée moy. / max | Allègements | Mêmes tirages qu’à la séance précédente | Progressions interrompues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Référence (V3 intégrée) | 9 ↓5 | 16 ↑6 | 13,5 | 9,2 ↓4 | 12,8 ↑1 | 0,7 ↓5 | 1,98 | 51 / 63 | 17 | 7 / 17 | 0 |
| L1b-0 tirage ordinaire après le bas (V2b, rappel) | 13,3 | 19,9 ↑6 | 11,8 | 8,2 ↓5 | 11,7 ↑1 | 0 ↓6 | 1,38 | 51 / 64 | 26 | 10 / 17 | 0 |
| L1b-1 tirage résiduel jusqu’au plancher | 10 ↓1 | 16,5 ↑6 | 14,2 | 8,2 ↓5 | 11,7 ↑1 | 0 ↓6 | 1,83 | 50 / 63 | 26 | 4 / 17 | 0 |
| L1b-2 isolations de dos au catalogue | 9 ↓5 | 16 ↑6 | 13,5 | 9,2 ↓4 | 12,8 ↑1 | 0,7 ↓5 | 1,98 | 51 / 63 | 17 | 7 / 17 | 0 |
| L1b-3 = L1b-1 + L1b-2 | 10 ↓1 | 16,5 ↑6 | 14,2 | 8,2 ↓5 | 11,7 ↑1 | 0 ↓6 | 1,83 | 50 / 63 | 26 | 4 / 17 | 0 |
| **L1b-4 = L1b-1, retiré sous interférence préhension** | 9,8 ↓3 | 16,4 ↑6 | 13,4 | 9,2 ↓4 | 12,8 ↑1 | 0,7 ↓5 | 1,82 | 51 / 64 | 17 | 5 / 17 | 0 |

**P5**

| Solution | Dos | Bras | Épaules | Quadriceps | Fessiers | Mollets | Poussée / tirage | Durée moy. / max | Allègements | Mêmes tirages qu’à la séance précédente | Progressions interrompues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Référence (V3 intégrée) | 9,3 ↓4 | 16 ↑6 | 14,3 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 1,97 | 46 / 70 | 79 | 0 / 17 | 0 |
| L1b-0 tirage ordinaire après le bas (V2b, rappel) | 14,8 | 20,9 ↑6 | 14,7 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 1,24 | 49 / 72 | 80 | 15 / 17 | 0 |
| L1b-1 tirage résiduel jusqu’au plancher | 10,8 | 16,8 ↑6 | 14 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 1,69 | 47 / 70 | 79 | 0 / 17 | 0 |
| L1b-2 isolations de dos au catalogue | 9,3 ↓4 | 16 ↑6 | 14,3 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 1,97 | 46 / 70 | 79 | 0 / 17 | 0 |
| L1b-3 = L1b-1 + L1b-2 | 10,8 | 16,8 ↑6 | 14 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 1,69 | 47 / 70 | 79 | 0 / 17 | 0 |
| **L1b-4 = L1b-1, retiré sous interférence préhension** | 10,8 | 16,8 ↑6 | 14 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 1,69 | 47 / 70 | 79 | 0 / 17 | 0 |

**S3**

| Solution | Dos | Bras | Épaules | Quadriceps | Fessiers | Mollets | Poussée / tirage | Durée moy. / max | Allègements | Mêmes tirages qu’à la séance précédente | Progressions interrompues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Référence (V3 intégrée) | 9,5 ↓3 | 16,2 ↑6 | 14,1 | 10,7 ↓3 | 15,2 ↑6 | 1,3 ↓4 | 1,89 | 53 / 63 | 0 | 11 / 17 | 0 |
| L1b-0 tirage ordinaire après le bas (V2b, rappel) | 13,8 | 18,6 ↑6 | 14,2 | 10,7 ↓3 | 15,2 ↑6 | 0,7 ↓5 | 1,33 | 54 / 64 | 0 | 7 / 17 | 0 |
| L1b-1 tirage résiduel jusqu’au plancher | 10,2 ↓1 | 16,5 ↑6 | 14,1 | 10,7 ↓3 | 15,2 ↑6 | 1,3 ↓4 | 1,76 | 53 / 63 | 0 | 7 / 17 | 0 |
| L1b-2 isolations de dos au catalogue | 9,5 ↓3 | 16,2 ↑6 | 14,1 | 10,7 ↓3 | 15,2 ↑6 | 1,3 ↓4 | 1,89 | 53 / 63 | 0 | 11 / 17 | 0 |
| L1b-3 = L1b-1 + L1b-2 | 10,2 ↓1 | 16,5 ↑6 | 14,1 | 10,7 ↓3 | 15,2 ↑6 | 1,3 ↓4 | 1,76 | 53 / 63 | 0 | 7 / 17 | 0 |
| **L1b-4 = L1b-1, retiré sous interférence préhension** | 10,2 ↓1 | 16,5 ↑6 | 14,1 | 10,7 ↓3 | 15,2 ↑6 | 1,3 ↓4 | 1,76 | 53 / 63 | 0 | 7 / 17 | 0 |

P1b et S4 (Haut / Bas) : identiques à la référence pour toutes les solutions. Aucun dépassement du temps disponible ; aucun retour en calibration ni aucune baisse de charge.

### 3.3 Lecture

**L1b-0 :** dos au plancher, mais les **mêmes tirages** reviennent dans 7 à 15 séances sur 17, les bras montent de 4 à 5 séries et les mollets baissent (P2, P3). C'est déjà écarté par L1.

**L1b-1 :**
- dos +0,7 à +1,5 série ; semaines sous le plancher : P1 5 → 2, P2 4 → 1, P3 5 → 1, P5 4 → 0, S3 3 → 1 ;
- **aucune perte** jambes ou mollets sur P1, P2, P5 et S3 : le temps résiduel est servi après tout le reste ;
- tirages identiques d'une séance à l'autre **en baisse** (P2 9 → 6, S3 11 → 7, P3 7 → 4) : le tirage complémentaire varie l'exercice (machine ou poulie) ;
- **mais P3 (HYROX) régresse** : quadriceps −1,0, fessiers −1,1, mollets −0,7, allègements 17 → 26. Le tirage ajouté augmente la sollicitation de préhension de la séance, ce qui change les interférences et l'arbitrage avec les séances HYROX.

**L1b-2 : aucun effet**, les isolations de dos ne sont jamais choisies.
- Le critère de volume ne départage pas pectoraux et dos, tous deux projetés sous leur plancher.
- La **continuité volontaire** (famille la plus récente) garde alors le pec deck.
- Il faudrait modifier les critères de sélection du moteur, ce qui est hors du périmètre d'une surcouche de contenu.

**L1b-4 (recommandée) :**
- **Toutes les conditions sont respectées :**
  - aucune baisse de volume utile aux jambes (P3 revient exactement à la référence) ;
  - mollets intacts ;
  - durées +0 à +1 min ;
  - allègements inchangés ;
  - aucune progression interrompue ;
  - tirages répétés en baisse.
- **Gain :** dos +0,7 (S3) à +1,5 (P5) série par semaine.
- **Semaines sous le plancher du dos :** P1 5 → 2, P2 4 → 1, P3 5 → 3, P5 4 → 0, S3 3 → 1.
- **Limites :**
  - le plancher n'est pas atteint toutes les semaines (temps résiduel insuffisant certains jours) ;
  - bras +0,3 à +0,8 série (tirage horizontal : biceps secondaire) ;
  - rapport poussée / tirage de 1,9–2,0 à 1,7–1,8.

### 3.4 Alternance des tirages

- **Une alternance stricte vertical / horizontal** du tirage complémentaire n'est pas exprimable en contenu. Le groupe de choix sert un seul membre par séance, et le moteur garde le tirage complémentaire stable (continuité des accessoires).
- L'étude L1 l'a confirmé : le groupe « tirage » choisit alors toujours les tractions.
- **L1b-4 obtient la variété autrement :** le complément n'est ajouté que les jours où le dos est sous sa cible et où il reste du temps. Il porte sur un exercice différent du tirage principal.

### 3.5 Recommandation L1-bis

- **L1b-4**, en contenu versionné (comme F6 et V3), après votre validation.
- À vérifier en intégration : relecture des anciennes semaines, et banc complet avec les critères ci-dessus.
- **L1b-2** n'est pas retenue sans modification des critères de sélection (décision moteur distincte).

---

## 4. Revue du catalogue : attributions musculaires des poussées et tirages

### 4.1 Attributions actuelles (catalogue de test, statut `draft`, non relu)

| Exercice | Schéma | Principaux | Secondaires |
|---|---|---|---|
| Développé couché, couché haltères, presse pectoraux | poussée horizontale | pectoraux, **triceps** | deltoïdes antérieurs |
| Pompes | poussée horizontale | pectoraux, **triceps** | deltoïdes antérieurs, abdominaux |
| Développé épaules (haltères, barre, machine) | poussée verticale | deltoïdes antérieurs, **triceps** | deltoïdes latéraux (abdominaux : barre) |
| Tractions, tractions assistées, tirage vertical | tirage vertical | grand dorsal, **biceps** | préhension, trapèzes |
| Rowing poulie, rowing machine, rowing haltère | tirage horizontal | trapèzes / haut du dos, grand dorsal | **biceps**, deltoïdes postérieurs (poulie seulement) |
| Pec deck, écarté poulie | isolation | pectoraux | deltoïdes antérieurs |
| Élévations latérales | isolation | deltoïdes latéraux | — |
| Curl, extension triceps | isolation | biceps / triceps | préhension / — |

**Incohérence interne :** le biceps est **principal** au tirage vertical mais **secondaire** au rowing. Pourtant, la flexion du coude y joue un rôle comparable.

### 4.2 Analyse biomécanique

- **Développés (horizontal, vertical) :**
  - **moteurs principaux** : grand pectoral (adduction horizontale) ou deltoïde antérieur (flexion de l'épaule) ;
  - le **triceps** produit l'extension du coude : c'est un **synergiste** indispensable, souvent limitant en fin d'amplitude, mais pas le moteur du mouvement ;
  - sa longue portion, biarticulaire, est peu allongée quand l'épaule est en flexion.
- **Tirages verticaux :**
  - **moteur principal** : grand dorsal (adduction et extension de l'épaule) ;
  - **biceps et brachial** : **synergistes** de la flexion du coude. Leur stimulation est réelle mais inférieure à un travail direct.
- **Rowings :**
  - **moteurs principaux** : trapèzes moyens, rhomboïdes et grand dorsal ;
  - **synergistes** : deltoïde postérieur et biceps.
  - Le deltoïde postérieur est absent du rowing machine et du rowing haltère : attribution incomplète.
- **Pec deck :** grand pectoral ; deltoïde antérieur en synergiste. Cohérent.
- **Séries efficaces pour l'hypertrophie, éléments de la littérature (à faire valider par le référent) :**
  - le travail polyarticulaire fait grossir les bras, mais généralement moins que le travail direct ;
  - chez le débutant, ajouter des isolations à un programme polyarticulaire change peu l'hypertrophie des bras (Gentil et coll., 2013) ;
  - des méta-régressions récentes sur la relation dose-réponse trouvent un meilleur ajustement quand les séries « indirectes » comptent environ pour moitié (Pelland et coll., 2024, prépublication).

### 4.3 Conventions possibles et conséquences sur les indicateurs

| Convention | Définition |
|---|---|
| **A — actuelle** | Principal = 1 série, secondaire = 0,5 (`secondaryWeight`), selon le catalogue. |
| **B — synergistes fractionnels** | Triceps des développés et biceps des tirages verticaux comptés comme **synergistes** (0,5), comme le biceps du rowing aujourd'hui. Le reste est inchangé. |
| **C — coefficients par exercice** | B, plus : deltoïde postérieur 0,5 sur tous les rowings, trapèzes 0,5 sur les tirages verticaux, deltoïde antérieur 0,5 sur les développés horizontaux. |
| **D — bras : isolations seules** | Les polyarticulaires ne comptent pas pour les bras (convention très stricte). |

Recalcul sur les séances du banc actuel (V3), séries par semaine (↓ / ↑ = semaines sous le plancher / au-dessus de la borne haute). La convention A recalculée reproduit le banc à 0,1 série près.

| Profil | Convention | chest | back | shoulders | arms |
|---|---|---|---|---|---|
| P1 | A — actuelle (catalogue) | 13,7 | 9,2 ↓5 | 13,6 | 16,2 ↑6 |
| P1 | B — synergistes fractionnels | 13,7 | 9,2 ↓5 | 13,6 | 9,2 |
| P1 | C — coefficients par exercice | 13,7 | 9,2 ↓5 | 13,6 | 9,2 |
| P1 | D — bras : isolations seules | 13,7 | 9,2 ↓5 | 13,6 | 0,0 ↓6 |
| P1b | A — actuelle (catalogue) | 12,3 | 10,2 | 15,2 | 18,2 ↑6 |
| P1b | B — synergistes fractionnels | 12,3 | 10,2 | 15,2 | 10,2 |
| P1b | C — coefficients par exercice | 12,3 | 10,2 | 15,4 ↑1 | 10,2 |
| P1b | D — bras : isolations seules | 12,3 | 10,2 | 15,2 | 0,0 ↓6 |
| P2 | A — actuelle (catalogue) | 13,7 | 9,3 ↓4 | 13,7 | 16,3 ↑6 |
| P2 | B — synergistes fractionnels | 13,7 | 9,3 ↓4 | 13,7 | 9,2 |
| P2 | C — coefficients par exercice | 13,7 | 9,3 ↓4 | 13,7 | 9,2 |
| P2 | D — bras : isolations seules | 13,7 | 9,3 ↓4 | 13,7 | 0,0 ↓6 |
| P3 | A — actuelle (catalogue) | 13,2 ↓1 | 9,0 ↓5 | 13,4 | 16,0 ↑6 |
| P3 | B — synergistes fractionnels | 13,2 ↓1 | 9,0 ↓5 | 13,4 | 9,1 |
| P3 | C — coefficients par exercice | 13,2 ↓1 | 9,0 ↓5 | 13,4 | 9,1 |
| P3 | D — bras : isolations seules | 13,2 ↓1 | 9,0 ↓5 | 13,4 | 0,0 ↓6 |
| P5 | A — actuelle (catalogue) | 13,2 | 9,3 ↓4 | 14,2 | 16,0 ↑6 |
| P5 | B — synergistes fractionnels | 13,2 | 9,3 ↓4 | 14,2 | 9,2 |
| P5 | C — coefficients par exercice | 13,2 | 9,3 ↓4 | 14,2 | 9,2 |
| P5 | D — bras : isolations seules | 13,2 | 9,3 ↓4 | 14,2 | 0,0 ↓6 |
| S3 | A — actuelle (catalogue) | 12,8 | 9,5 ↓3 | 14,1 | 16,2 ↑6 |
| S3 | B — synergistes fractionnels | 12,8 | 9,5 ↓3 | 14,1 | 9,3 |
| S3 | C — coefficients par exercice | 12,8 | 9,5 ↓3 | 14,1 | 9,3 |
| S3 | D — bras : isolations seules | 12,8 | 9,5 ↓3 | 14,1 | 0,0 ↓6 |
| S4 | A — actuelle (catalogue) | 12,3 | 10,2 | 15,2 | 18,2 ↑6 |
| S4 | B — synergistes fractionnels | 12,3 | 10,2 | 15,2 | 10,2 |
| S4 | C — coefficients par exercice | 12,3 | 10,2 | 15,4 ↑1 | 10,2 |
| S4 | D — bras : isolations seules | 12,3 | 10,2 | 15,2 | 0,0 ↓6 |

**Conséquences :**
- **Bras :**
  - **A :** au-dessus de la borne haute 6 semaines sur 6 sur tous les profils ;
  - **B et C :** 9 à 10 séries, **dans la plage** 6–14 ;
  - **D :** 0, toujours sous le plancher : le programme ne contient presque pas d'isolation de bras. D rendrait l'indicateur inutilisable sans en ajouter.
- **Pectoraux et dos :** identiques dans les quatre conventions.
- **Épaules :** C ajoute au plus +0,2 série (rowings). Effet négligeable.
- **Effet sur la sélection du moteur, et pas seulement sur l'indicateur :**
  - la règle « un ajout facultatif dont tous les groupes principaux dépasseraient la borne haute est omis » écarte aujourd'hui l'extension triceps (bras au-dessus de 14) ;
  - avec B ou C, les bras seraient sous la borne haute : des isolations de bras **pourraient être ajoutées**, ce qui changerait les programmes.
  - Une convention différente doit donc être étudiée comme un **lot moteur ou contenu**, avec banc avant / après, et non comme un simple changement d'affichage.

### 4.4 Recommandation

1. **Convention B**, à faire valider par un référent :
   - c'est la plus défendable sur le plan biomécanique, car elle respecte la distinction moteur / synergiste ;
   - elle est cohérente avec la règle déjà appliquée au biceps du rowing et avec le comptage fractionnel de la littérature.
2. **C** corrige en plus les oublis du catalogue (deltoïde postérieur des rowings). Son effet est négligeable sur les indicateurs, mais elle est plus juste.
3. **Correctifs de catalogue à soumettre au référent**, sans les appliquer :
   - biceps : principal ou synergiste de façon **cohérente** entre tirage vertical et rowing ;
   - deltoïde postérieur sur tous les rowings.
4. **Aucune modification** des attributions ni des seuils avant cette validation. Si vous la décidez :
   - contenu de catalogue versionné, comme F6 et V3 ;
   - nouvelle référence du banc ;
   - mesure de l'effet sur la sélection (isolations de bras).

---

## 5. Décisions attendues

| # | Question | Recommandation |
|---|---|---|
| D1 | Intégrer **B4 réduit** (contexte croisé persisté pour la Musculation, sans changement de programme) ? | **Oui** |
| D2 | Étudier une forme compacte **B4+** pour le Cross-training et HYROX ? | Oui, en copie jetable |
| D3 | Ouvrir une étude de conception sur la **rotation du bloc Cross-training** (observation B1) ? | Facultatif |
| D4 | Intégrer **L1b-4** (tirage résiduel jusqu'au plancher du dos, retiré sous interférence de préhension), en contenu versionné ? | **Oui**, avec les mêmes contrôles que V3 |
| D5 | **Comptage des bras :** faire valider la convention B (ou C) et les deux correctifs de catalogue par un référent ? | Oui ; aucune modification avant |

---

## Annexe — reproduction

Patchs (s'appliquent sur `bfa6f80`), tests d'étude et scripts de comparaison : `docs/kairo/rc46-audit/etudes/`.

| Étude | Patch | Test d'étude | Variantes |
|---|---|---|---|
| L2-bis | `l2bis-dependance-musculation-ct.patch` | `l2bis.test.ts.txt`, taille : `l2bis-taille.test.ts.txt` | `L2B_VARIANT=ref|ctfirst|strfirst|fixpoint|persist3|persist2` |
| L1-bis | `l1bis-tirage-complementaire.patch` | `l1bis.test.ts.txt` | `L1B_VARIANT=ref|ord|res|iso|iso+res|res+gd` |

Comparaison : `l2bcmp.py` et `l1bcmp.py`.
