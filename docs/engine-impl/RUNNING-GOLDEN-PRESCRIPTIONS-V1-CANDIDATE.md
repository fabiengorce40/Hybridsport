# RUNNING-GOLDEN-PRESCRIPTIONS-V1-CANDIDATE — relance de R1–R12 après arbitrage 5D

> **Corrections 5E** :
> - **R4** : l’allure semi Riegel est **suspendue** (exposant non verrouillé, E-MODEL) ⇒ composant BLOCKED_PARAMETER ; la restauration du long run est inchangée.
> - **R11** : la semaine n’est **plus fixée à 96 min**. Le volume candidat est **96,0–141,6 min** ; la sélection dans cet intervalle relève d’E-TAPER.

> **Phase 5D, théorique.** Base : [`RUNNING-GOLDEN-PRESCRIPTIONS-V0.md`](RUNNING-GOLDEN-PRESCRIPTIONS-V0.md) (5C). Seuls les **changements** sont détaillés, chacun avec le paramètre responsable. Valeurs : [`RUNNING-PARAMETERS-V1-CANDIDATE.md`](RUNNING-PARAMETERS-V1-CANDIDATE.md).
>
> **Statuts de résultat**
> - VALID : tous les paramètres utilisés sont revus et acceptés (aucun cas aujourd’hui) ;
> - VALID_PROVISIONAL : valide, mais repose sur des valeurs EXPERT_PROPOSED ou SOURCE_INFORMED non encore revues ;
> - BLOCKED_PARAMETER ;
> - BLOCKED_G1 ;
> - OUT_OF_SCOPE.
>
> **Il n’est pas requis que les 12 scénarios soient valides.**

## 1. Statuts

| Scénario | 5C | 5D | Paramètre responsable du changement |
|---|---|---|---|
| R1 novice | NO_VALID (V33) | **BLOCKED_G1** | Aucun : V33 reste vide (le précédent GRONORUN n’est **pas** retenu comme valeur) |
| R2 premier 5K | VALID | **VALID_PROVISIONAL** | V21 → RecentLoadContext (même résultat : 110 ≤ 110 démontré) |
| R3 10K | VALID | **VALID_PROVISIONAL** | — (sert de démonstration de HOLD, §2) |
| R4 semi | VALID | **VALID_PROVISIONAL, modifié** | **RecentLoadContext** (restauration du long run à 90) ; **V38** (allure semi désormais disponible, BROAD, non sélectionnée) |
| R5 10K avancé | VALID | VALID_PROVISIONAL | V21 : le libellé « sous la bande » disparaît (aucun plancher) |
| R6 marathon | VALID | VALID_PROVISIONAL | V38 : marathon **explicitement exclu** (sous-estimation documentée) ⇒ allure marathon toujours absente, avec une raison sourcée |
| R7 hybride | VALID | VALID_PROVISIONAL | — |
| R8 reprise LONG | NO_VALID (V34) | **BLOCKED_G1** | Aucun : V34 reste vide |
| R9 conflit | VALID | VALID_PROVISIONAL | **V42 / V43** : écart 11,1 % > 2 × 3 % ⇒ MAJOR (même décision, désormais ordinale) |
| R10 séance manquée | VALID | VALID_PROVISIONAL | **V11** : séparation forte par défaut ; aucune exception demandée par le planificateur ⇒ DROP inchangé |
| R11 taper | VALID | VALID_PROVISIONAL | B7 : calcul explicite (§3) ; résultat inchangé |
| R12 déclaration seule | VALID | VALID_PROVISIONAL | THRESHOLD toujours BLOCKED_PARAMETER (V35) |

**Bilan** :
- 10 VALID_PROVISIONAL ;
- 2 BLOCKED_G1 (R1, R8) ;
- 0 VALID (aucune valeur n’est encore revue) ;
- 0 OUT_OF_SCOPE.

**Composants BLOCKED_PARAMETER** dans des semaines valides : THRESHOLD de R12 (V35), VO2 de R9 (V36), allure marathon de R6 (V38 hors domaine de validité), début du taper de R11 (V28, semi), nouvelle hausse au-delà du démontré (V23, partout).

### R4 modifié

**Données complétées** (`IN:`) : plus longues sorties des 4 dernières semaines 75 / 80 / **90** / 80 min (médiane 80) ; la sortie de 90 min a été réalisée il y a 2 semaines, sans retour négatif. Semaines 200 / 210 / 215 / 225.

**RecentLoadContext** :
- `longRunDuration` : niveau typique 80, démontré **90** ;
- `weeklyDuration` : niveau typique 212,5, démontré **225**.

| Séance | 5C | 5D | Traçabilité |
|---|---|---|---|
| S1 EASY | 45 | 45 | V19 |
| S2 THRESHOLD 2 × 12 / 3 | 42 [52] | 42 [52] | V19, V06, V07 |
| S3 EASY | 40 | 40 | `IN:` |
| S4 LONG_RUN | 80 (HOLD) | **90** (restauration) | RecentLoadContext, maximum démontré (V21) |
| **Total** | 207 | **217** [227] | 217 ≤ 225 démontré ⇒ WITHIN_RECENT_CONTEXT (le pire cas, 227, dépasse ⇒ bornes prudentes fixées) |

- **Progression** : variable dominante `longRunDuration`, direction UP, `magnitudeClass` = RESTORE (restauration d’une dose démontrée, aucune magnitude requise).
- **Allure semi** (V38) : 48:00 × (21,0975 / 10)^1,06 ≈ 105,9 min ⇒ **≈ 301 s/km**. Confiance MEDIUM ⇒ plage ±6 % = **283–319 s/km** (BROAD). RACE_PACE semi devient **éligible** mais n’est pas sélectionné cette semaine (densité 2 atteinte).
- **Codes** : `PROG.RESTORE_TO_DEMONSTRATED`, `LOAD.WITHIN_RECENT_CONTEXT`, `PERF.EXTRAPOLATED_RIEGEL_LE_HM`, `CONF.MEDIUM_EXTRAPOLATION`.

---

## 2. Démonstrations de progression (section Y)

| Démonstration | Scénario | Décision | Valeurs | Paramètre ou donnée qui l’autorise | Valeur inventée ? |
|---|---|---|---|---|---|
| **HOLD valide** | R3 | HOLD : la variable candidate `intervalVolume` dépasserait le démontré (24 min = maximum de THRESHOLD_LIKE) ; V23 est vide | S2 inchangée : 3 × 8 / 2 (43 min) | V23 vide ⇒ `PROG.HOLD_MAGNITUDE_UNDEFINED` | Non |
| **Progression candidate** | R4 | UP : restauration du long run 80 → 90 | S4 = 90 min | RecentLoadContext : 90 démontré il y a 2 semaines sans retour négatif | Non (valeur réalisée par l’athlète) |
| **Baisse** | R3-DOWN (variante de R3 : la dernière THRESHOLD 3 × 8 est déclarée MUCH_HARDER, conformité BELOW ; 3 × 6 réalisé il y a 3 semaines sans retour négatif) | DOWN vers la dernière dose réussie | S2 = 3 × 6 / 2 : 10 + 18 + 4 + 5 = **37 min** [47] ; semaine 45 + 37 + 65 = **147** | Historique (V19 : dernière dose réussie) ; déclencheur : `unexpectedDifficulty = MUCH_HARDER` | Non |

**Limite honnête** : une **nouvelle** hausse, au-delà de tout niveau démontré, reste impossible tant que V23 est vide. Aucune démonstration n’a été forcée.

---

## 3. Taper R11 : calcul explicite (sections B7 et Z)

| Élément | Valeur | Provenance |
|---|---|---|
| `preTaperBaselineVolume` | **240 min** (médiane des semaines 230 / 240 / 240 / 250) | RecentLoadContext, niveau typique (`IN:`) |
| `candidateReductionRange` | **41–60 % de réduction** | V27 (SOURCE_DERIVED, plage de méta-analyses multi-sports ; Wang 2023 vérifiée par le contre-audit) |
| `resultingCandidateVolume` | 240 × (1 − 0,60) = **96,0** ; 240 × (1 − 0,41) = **141,6** ⇒ **96,0–141,6 min** (hors course) | = |
| Semaine proposée | *(5E)* **Intervalle candidat 96,0–141,6 min** ; la répartition S1 / S2 / S3 à l’intérieur de l’intervalle est **DECISION_REQUIRED** (E-TAPER). Exemples de bornes : 35 + 27 + 34 = 96 ; 45 + 41 + 51 = 137 | V27 ; sélection : décision humaine |
| Réduction effective | Selon la sélection humaine : entre 60 % (96 min) et 41 % (141,6 min) | = |
| Travail de seuil | Base 24 min ; plage 24 × (1 − [0,41 ; 0,60]) = 9,6–14,2 ; retenu **10 min** (2 × 5) = réduction de 58,3 % ✓ | V27, V19 |
| Fréquence | Maintenue : 3 séances + la course = 4 (base 4) | `taper.frequencyMaintenance` (SUPPORTED) |
| Intensité | Maintenue : THRESHOLD_LIKE, RPE 5–7 (V02 révisé), plafond 282 s/km (V05) | SUPPORTED (principe) ; V02 EXPERT_PROPOSED |
| Durée du taper | Semi : **vide** (V28) ⇒ seule la dernière semaine est traitée | CONTEXT_DEPENDENT |
| Confiance | Principe MEDIUM ; ampleur pour un semi LOW | — |

**Arithmétique vérifiée** : les chiffres 5C étaient corrects ; ils sont désormais présentés comme réduction → volume résultant.

---

## 4. R1 et R8 (section AA)

| Scénario | Statut | Ce qui manque | Ce qui débloquerait | Repli caché ? |
|---|---|---|---|---|
| R1 | BLOCKED_G1 | V33 (dose d’entrée P-R0) | Une valeur signée G1 (options présentées à l’expert : précédent de protocole GRONORUN, ou dose ancrée sur une durée déclarée tolérée, etc.) | **Aucun** |
| R8 | BLOCKED_G1 | V34 (dose de départ sans séance post-retour) | Une valeur signée G1 ; ou, dès que des séances post-retour existent, la règle « ≤ réalisé » (déjà prévue, G1) | **Aucun** |

**Précision de doctrine (5D)** : les **doses** sous G1 (V33, V34) ne sont pas utilisées même en mode CANDIDATE sans signature. Les **frontières** G1 de classement (V24) le restent, pour classer un scénario, jamais pour doser. Ce resserrement est prudent et n’ajoute aucun concept.
