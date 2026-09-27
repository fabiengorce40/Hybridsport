# 04 — Dosage, prescription de charge, montée en charge

## 9. Dosage

**Erreur empêchée** : une table universelle (« force = 5×5 », « hypertrophie = 4×10 ») qui ignore le rôle de l'exercice, le niveau, la phase, la semaine et le temps disponible.

### 9.1 Principe : profil de base puis modificateurs tracés

```
dose = modificateurs( profilDeBase[stimulus][rôle][classeExercice], contexte )
```

| Élément | Contenu | Classe |
|---------|---------|--------|
| **Profil de base** `strength.dose.base[stimulus][role][exerciseClass]` | Plage de reps, RIR cible (ou RPE équivalent), plage de séries par exercice, plage de repos | G2 |
| Stimulus | `strength_heavy`, `strength_volume`, `strength_general`, `strength_support` | (intention) |
| Rôle | `primary`, `secondary`, `accessory` | (archétype) |
| Classe d'exercice | `compound_high_load` (`loadCeiling ≥ 2` et composé), `compound_other`, `isolation`, `bodyweight_capped` (`loadCeiling ≤ 1`) | Dérivée du catalogue (G4) |

Pourquoi la classe d'exercice : 5 reps à RIR 1 ont du sens au squat, pas sur une élévation latérale ; un exercice au poids du corps plafonné ne peut pas suivre une prescription « charge lourde ».

### 9.2 Modificateurs (6)

Chacun est borné par des paramètres G2 et tracé :

| # | Modificateur | Effet (sens) | Reason code |
|---|--------------|--------------|-------------|
| M1 | **Niveau** (novice, débutant, intermédiaire, avancé) | Novice : séries vers le bas de la plage, RIR plus élevé, pas de `top_set`. Avancé : RIR plus bas autorisé sur les exercices stables | `DOSE.LEVEL_ADJUSTED` |
| M2 | **Phase** (accumulation, intensification, décharge, maintien) | Accumulation : séries vers le haut. Intensification : reps vers le bas et RIR plus bas sur le principal. Décharge : séries −x % et/ou RIR +y, **mêmes exercices** (doc 06 §1.5). Maintien : bas de plage | `DOSE.PHASE_ADJUSTED` |
| M3 | **Volume hebdomadaire** (E1 et L5, §13) | Séries par emplacement ajustées au volume restant de la semaine, par groupe | `DOSE.VOLUME_ALLOCATED` |
| M4 | **Lecture de l'état** (`caution`, `reduce`) | `caution` : RIR +1 sur le principal. `reduce` : séries −1 ou changement de stimulus proposé. `unknown` : selon `readiness.unknownPolicy` (CORE) | `DOSE.READINESS_ADJUSTED` |
| M5 | **Contexte multisport** (voisins, notes du planificateur, §14) | Bas du corps allégé avant une séance clé : RIR +1 à +2, séries −, pas d'excentrique appuyé | `DOSE.INTERFERENCE_ADJUSTED` |
| M6 | **Budget de temps** (§15) | Séries des emplacements non principaux vers le bas de la plage ; jamais sous le plancher | `DOSE.TIME_ADJUSTED` |

**Priorité quand les modificateurs se contredisent** : la direction **prudente** l'emporte (moins de volume, plus de RIR), dans cet ordre : M4 et M5 (protection), puis M2, M1, M3 et M6. Aucun modificateur n'augmente le dosage au-delà du profil de base, à une exception près : M3 peut remonter vers le **haut** de la plage de base, jamais au-delà.

### 9.3 Par rôle (valeurs : paramètres G2)

| Rôle | Ce que le moteur décide | Ce qui reste figé dans la séance |
|------|------------------------|---------------------------------|
| Principal | Plage de reps basse à moyenne selon le stimulus ; RIR contrôlé ; repos long ; montées en charge ; progression de track | Minimum de repos protégé (DurationEngine : jamais compressé sous `floorS`) |
| Composé secondaire | Plage moyenne ; RIR modéré ; repos moyen | — |
| Accessoire | Plage moyenne à haute ; RIR plus bas sur les exercices stables ; repos court ; supersets autorisés | — |
| Isolation | Plage haute ; RIR bas autorisé ; repos court | — |
| Complément sportif (soutien) | Faible volume ; RIR élevé (2–3) ; unilatéral et tronc ; qualité avant fatigue | Aucun échec musculaire (règle G2) |

### 9.4 Tempo et amplitude

- **Tempo** : il n'est prescrit que (1) lorsque la charge est plafonnée (`bodyweight_capped`, matériel au maximum, §12 progression de difficulté) ou (2) pour une consigne d'apprentissage d'un novice sur un emplacement principal (paramètre G2). Sinon, aucun tempo, donc aucun champ inutile.
- **Amplitude** : complète par défaut. L'amplitude réduite pour douleur relève de G1 (CORE) et n'est **pas prescrite** en V1. L'amplitude partielle comme technique d'hypertrophie est hors V1.

**INPUT** : exercice, rôle, stimulus, classe, contexte. **DECISION** : profil, puis M1–M6. **OUTPUT** : séries, reps (plage + cible), RIR ou RPE, repos. **VALIDATION** : reps > 0, repos ≥ 0, séries ≥ 1 (propriétés) ; L4 (STR-V2) ; cohérence reps / effort (STR-V3). **FAILURE** : aucune combinaison dans les bornes (ex. temps < plancher) ⇒ budget (§15), ou `DURATION.TARGET_BELOW_ARCHETYPE_MIN`.

## 10. Prescription de charge

**Erreur empêchée** : fabriquer un faux 1RM précis, ou prescrire une charge absolue à quelqu'un dont on ne sait rien.

### 10.1 Hiérarchie de confiance des références (doc 04 §7, spécialisée)

| Rang | Source | Confiance de départ | Remarque |
|------|--------|---------------------|----------|
| R1 | Séries de travail enregistrées dans l'app avec reps et RIR, récentes (≤ fenêtre G2) | `high` | e1RM **lissé** sur plusieurs séries, jamais un maximum ponctuel |
| R2 | Séries enregistrées sans RIR, récentes | `medium` | RIR inconnu ⇒ hypothèse prudente (paramètre `strength.load.assumedRirWhenUnknown`) |
| R3 | 1RM déclaré, testé récemment | `medium` | Déclaratif |
| R4 | Charges récentes déclarées (« je fais 60 kg × 8 ») | `low` | — |
| R5 | 1RM ancien (> fenêtre d'ancienneté) | `low`, voire `none` | Paliers d'ancienneté (doc 04 §7) |
| R6 | Aucune référence | `none` | Calibration |

Règles :
- **Cohérence** : plusieurs sources concordantes ⇒ +1 cran ; contradictoires ⇒ −1 cran et `STATE.REFERENCE_CONFLICT` ; les données mesurées (R1, R2) l'emportent sur les déclarations.
- **Transfert** : une capacité s'applique à l'exercice, à sa **classe d'équivalence** (−1 cran) et jamais au-delà (famille ou pattern : aucun transfert).
- **Machines et poulies** : les charges ne se comparent pas entre modèles de machines. La référence est donc **propre à l'exercice** (et à la salle si elle est déclarée). Aucun e1RM d'une machine n'est converti vers la barre.
- **Formule e1RM** : paramètre G2 (`strength.load.e1rmFormula`), valable seulement dans une plage de reps (`validRepRange`). Au-delà (ex. plus de 10–12 reps), aucune estimation d'e1RM : la charge sert telle quelle en double progression.

### 10.2 Mode de prescription selon la confiance

| Confiance | Principal (composé, charge élevée) | Accessoire / isolation / machine |
|-----------|-----------------------------------|----------------------------------|
| `high` | Charge absolue = e1RM × table `pct(reps, RIR)` (G2), arrondie au réalisable, avec RIR de contrôle | Charge de la dernière exposition ± pas de progression (double progression) + RIR |
| `medium` | Charge **suggérée** + RIR prioritaire (l'utilisateur ajuste) | Idem, suggérée |
| `low` | **RIR / RPE prioritaire**, charge indicative sous forme de fourchette | RIR / RPE + « charge de la dernière fois » si elle existe |
| `none` | RIR / RPE seul ; **séance de calibration** : séries de travail à RIR 2–3 dont les résultats créent R1 (jamais un test maximal) | RIR / RPE seul |

- **%1RM** : utilisé seulement si la confiance est `high` **et** les reps dans la plage de validité de la table ; sinon, jamais affiché.
- **Arrondi au réalisable** (G4) : incréments déclarés (`equipmentIncrements`), sinon incréments par défaut du `loadModel` (paramètre G4 par type ; pour les piles de machine sans déclaration, pas de charge absolue mais « dernière charge + RIR »).
- **Plafond matériel** (ex. haltères de 24 kg maximum) : quand la charge requise dépasse le maximum, le moteur change de variable (reps dans la plage, tempo, unilatéral, variante plus difficile de la `progressionFamily`) : `DOSE.LOAD.CAP_REACHED`.
- **Apprentissage progressif** : chaque séance réalisée alimente R1 ou R2, et la confiance monte d'elle-même, sans questionnaire.

**INPUT** : dosage, capacités, matériel. **DECISION** : rang de la référence, puis confiance, puis mode. **OUTPUT** : `load` (absolue, suggérée ou indicative) et/ou effort cible (CORE-EXT-1). **VALIDATION** : aucune charge NaN, négative, nulle alors qu'elle est chargée, ni irréalisable (STR-V5) ; cohérence reps / %e1RM / RIR (STR-V3 : interdit par exemple 10 reps à un pourcentage qui n'en permet que 3). **FAILURE** : référence incohérente ⇒ confiance abaissée (jamais d'erreur) ; charge irréalisable ⇒ variable alternative ou `DOSE.LOAD.CAP_REACHED`.

## 11. Montée en charge (ramp-up)

**Erreur empêchée** : attaquer une charge lourde à froid, ou, à l'inverse, perdre 10 minutes en séries d'échauffement sur une élévation latérale.

| Question | Règle (paramètres G2) |
|----------|-----------------------|
| **Quand** | Exercice composé à charge externe (`loadModel` ∈ barre, disques, pile de machine lourde) **et** charge de travail relative ≥ seuil `strength.rampup.minRelativeIntensity` (si la confiance permet de l'estimer), ou reps de travail ≤ seuil. Premier exercice de chaque **pattern** de la séance ; le second exercice du même pattern reçoit au plus `strength.rampup.samePatternMax` paliers |
| **Pas de montée** | Isolation, accessoires légers, poids du corps, exercice dont la charge de travail est proche de la charge de départ (barre vide, poids du corps) |
| **Nombre de paliers** | Table `strength.rampup.steps[intensityBand][level]` : plus la charge est lourde, plus il y a de paliers. Novice : moins de paliers (charges plus faibles) |
| **Charges** | Pourcentages croissants de la **charge de travail** (et non de l'e1RM), arrondis au réalisable, sans doublon après arrondi (deux paliers qui tombent sur la même charge sont fusionnés) |
| **Reps** | Décroissantes, suffisamment basses pour ne pas fatiguer (table G2) |
| **Repos** | Court et croissant (paramètre), pris en compte par la durée |
| **Charge inconnue (mode RIR)** | Paliers d'effort croissant (« léger ×8, moyen ×5, lourd ×2–3 ») jusqu'à trouver la charge de travail ; leur nombre est un paramètre |
| **Durée** | Séries `kind: 'rampup'` du modèle CORE : **le DurationEngine les estime déjà** (reps × secondes par rep + repos + changements de charge `loadChangeS`) |
| **Volume** | **Ne comptent pas** dans E1 ni dans le volume (le CORE et l'AthleteState excluent `rampup`) |
| **Compression** | Aucun levier ne supprime les montées en charge ; `reduce_sets` ignore déjà `rampup` (CORE, testé en phase 3.5) |

**VALIDATION** : STR-V4 (montée présente quand elle est requise, absente sur l'isolation) ; charges strictement croissantes et inférieures à la charge de travail. **FAILURE** : aucun échec ; en cas de charge inconnue, paliers d'effort.
