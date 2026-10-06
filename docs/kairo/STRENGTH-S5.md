# Strength S5 — effort, RIR et progression des charges

Base : `a50d4c1` (S4). Aucune règle numérique nouvelle. S5 rend la boucle **prescription → exécution → effort réel → preuve → progression** correcte, et laisse BLOQUÉ ce qui demande une décision scientifique.

## 1. Chemin de l'effort avant S5

| Étape | Effort (RIR) | Reps / charge / séries | Statut, douleur |
|---|---|---|---|
| Prescription Strength (`dose.ts`) | RIR cible : cellule `strength.dose.base[profil][rôle][classe]`, plus modificateurs de niveau, phase et interférence ; calibration `targetRir` = 3 | reps (plage), charge (track / historique / e1RM / calibration), séries | — |
| `session_record` | `intensity.effort.rir` par série | idem | — |
| UI Beta 0 (`SetLine`) | **aucune saisie** | reps et kg saisis (kg pré-rempli si prescrit) | douleur par exercice, fin de séance (statut + douleur) |
| `SetLog` / `programmeLogs` | `rir` facultatif (jamais rempli) | reps, kg, done | — |
| `recordSessionExecution` → `applyStrengthExecution` | `rir` recopié s'il existe | séries faites seulement | statut (S3) et douleur (S3) |
| Exposition (`strength.exposures`) | `rir` facultatif | idem | — |
| `classifyExposure` | RIR de la **dernière** série ; absent ⇒ ni `above` ni `below` possible | — | — |
| Progression `autoregulated` | **`rir ?? assumedRirWhenUnknown` (= 0)**, médiane avec l'e1RM de la track | e1RM Epley | — |
| Granularité (double progression) | idem (RIR 0 supposé) | — | — |
| Connaissance de charge (`load.ts`) | idem pour l'e1RM d'historique ; l'observation spécifique **exige** un RIR (`requireRir`) | — | — |

**Cause du « RIR 0 implicite ».** `assumedRirWhenUnknown = 0` (`strength.load`, provisoire) répond à la question F4 du dossier de preuves : « pour prescrire une série de **reconnaissance**, quel RIR supposer ? » (littérature de coaching, « choix prudent à confirmer »). Le code l'appliquait aussi à l'estimation de **progression** des tracks.

Comme l'UI ne saisissait jamais le RIR, chaque exposition était lue comme une série à l'échec. Mêlée par médiane à une estimation observée, cette valeur tirait l'e1RM **vers le bas** (50,67 → 49,33 pour 40 kg × 6).

## 2. Contrat S5 : effort observé / inconnu

- **Sources.** RIR saisi = **observé** (0 compris). Aucune saisie = **inconnu**. L'absence survit à toutes les couches : `SetLog`, logs, rechargement, export / import, expositions, tracks, audit. Aucune migration : les séances antérieures restent « effort inconnu ».
- **`effortEstimate`.** e1RM **observé** (séries avec RIR) et **borne inférieure** (séries sans RIR : RIR ≥ 0 ⇒ e1RM ≥ charge × (1 + reps / 30)). Dans la progression autorégulée, la borne ne peut que **relever** une estimation qu'elle contredit, jamais l'abaisser.
- **Granularité de la double progression.** Sans RIR, la prudence est inchangée, mais la cause est explicite : `granularity_effort_unknown`.
- **Connaissance de charge (`load.ts`).** Inchangée : convention F4 de reconnaissance, déjà étiquetée « sans RIR » dans sa confiance.
- **Preuve centralisée.** `exposureEvidence` (un seul endroit) produit :
  - le verdict `kind` : `pain`, `session_abandoned`, `substituted`, `insufficient_data`, `load_lower`, `partial_sets`, `reps_lower`, `effort_harder`, `load_higher`, `exceeded_reps`, `better_rir`, `exact_effort_known` ou `exact_effort_unknown` ;
  - les `signals` (reps, charge, RIR plus haut / plus bas, séance modifiée / abandonnée, série partielle, effort observé / inconnu) ;
  - `probative` et `why`.

  Le verdict et l'effort sont audités dans `PROGRESSION.EXPOSURE_CLASSIFIED`.
- **Historique longitudinal** (`track.evidence`) : réussites **exactes** consécutives à la même prescription (`exactStreak`, `effortKnown`, `effortUnknown`) et nature de l'e1RM (`observed` | `lower_bound`). C'est un contrat sans politique. `PROGRESSION.DECISION_BLOCKED` porte la situation (`exact_success` ou `exact_success_effort_unknown`) et `exactStreak`.

## 3. Granularité et UX retenues

Le moteur lit le RIR de la **dernière série de travail** (classement), l'e1RM des séries avec RIR (médiane) et l'observation spécifique (série avec RIR). Option retenue : **B, RIR de la dernière série validée de l'exercice**. Le RIR série par série n'apporte rien au modèle actuel.

Interface :
- une rangée de 6 pastilles (0 à 5, valeurs exactes) sous les séries, après la première série de travail validée ;
- libellé « Reps en réserve · Série N · cible X · facultatif » ;
- re-toucher la pastille efface la saisie ;
- transition dédiée `recordProgrammeSetEffort` : le chrono de repos n'est jamais relancé ni modifié ;
- vérifié sur Galaxy S9+ : une seule ligne, rien de masqué par le chrono ou la navigation.

## 4. Modèle autorégulé (principaux, intermédiaire / avancé)

| Élément | Valeur | Provenance |
|---|---|---|
| e1RM | charge × (1 + (reps + RIR) / 30) | `strength.load.e1rmDivisor`, Epley, `PROGRAMMING_HEURISTIC` |
| Validité | reps + RIR dans [1, 12] | `validRepRange` |
| Lissage | médiane (e1RM de la track, mesure de la séance) — mémorisé dans la track | code `progression.ts` |
| Charge suivante | arrondi inférieur au pas de e1RM × `pctByRepsToFailure[reps + RIR]`, au moins la charge courante, au plus +1 pas | table du ruleset (heuristique) ; pas = `defaultIncrements` × `loadStepIncrements` |
| Preuves | 2 succès (`evidenceRequired.autoregulated`), compteur remis à 0 après chaque décision | `strength.progression` (draft) |
| Plafond par cycle | +15 % (`cycleCapFraction`) | idem |

Toutes ces valeurs sont provisoires (contenu Beta 0).

## 5. Résultats (scénario C, moteur ; scénarios A et A sans RIR, application)

- **Réussite exacte, RIR connu.** e1RM 50,67 → 40 × 0,80 → 40,5 kg, arrondi à 40. C'est un **point fixe** : la charge ne monte jamais. La table `pctByRepsToFailure` (0,80 à 8 répétitions jusqu'à l'échec) est légèrement plus haute que l'inverse d'Epley (0,789), d'où les +1,3 % absorbés par l'arrondi. La série de réussites exactes est mémorisée (8/8) et chaque décision est BLOQUÉE.
- **Réussite exacte, RIR inconnu.** e1RM = borne 48, jamais abaissée, aucune hausse. Décision BLOQUÉE « effort inconnu ».
- **Meilleur RIR.** +1 (RIR 3) : l'estimation plafonne à 52, aucune hausse. +2 (RIR 4) : hausse à la 8ᵉ exposition.
- **Plus de répétitions, RIR inconnu.** 8 au lieu de 6 ne prouvent rien de plus que 6 à RIR 2. 10 au lieu de 6 suffisent (borne 53,3) : hausse dès la 2ᵉ exposition, puis plafond de cycle.
- **Amélioration sous le pas.** Le gain est **mémorisé** dans l'e1RM de la track (50,67 → 53,08 en 8 expositions), sans être perdu, mais pas encore converti. Le lissage par médiane de deux valeurs divise chaque gain par deux.
- **Effort mêlé** (observé une séance sur deux). Avant S5, l'e1RM était tiré vers le bas. En S5, il reste stable.
- **Double progression.** Inchangée : une réussite exacte fait progresser les répétitions puis la charge, avec ou sans RIR.
- **Poids du corps en haut de plage.**
  - RIR 4 : `METHOD_UNGOVERNED`, effort `reserve_above_target`.
  - RIR 0 : échec (`below`), pas de « méthode à choisir ».
  - RIR inconnu : `METHOD_UNGOVERNED`, effort `unknown`.
- **Le moteur encourage-t-il le dépassement ?** Oui, pour le modèle autorégulé. Une réussite exacte ne fait jamais monter la charge. La progression exige un RIR saisi supérieur d'au moins 2 à la cible pendant plusieurs séances, ou, sans RIR, au moins 10 répétitions au lieu de 6. La double progression n'a pas ce défaut.

## 6. Fail-closed

`exact_success_progression` (aucune règle gouvernée pour une série de réussites exactes) reste BLOQUÉE ; le contrat longitudinal est prêt (`track.evidence`). `bodyweight_overload_method` reste BLOQUÉE, le signal d'effort est disponible. Les autres capacités S3 et S4 sont inchangées.

## 7. Coût et persistance

- **Coût** : +31 Kio à 52 semaines (+1 %), via l'audit (verdict et effort) et `track.evidence`. La donnée source (RIR de la dernière série) n'est stockée que dans le log et l'exposition, comme les répétitions.
- **Version de planification** inchangée (`beta0-s4`) : la planification n'est pas modifiée.
