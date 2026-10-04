# F1 : boucle fermée réalisation → historique des moteurs

Baseline : `055befc`. Architecture : 96 tests sur 14 fichiers. Le chemin complet fermé par ce lot :

```
programme → planificateur → moteur → séance planifiée → recordSessionExecution → historique du moteur → décision suivante du moteur
```

## A. Réessai planificateur sur contrainte de créneau

`classifyRefusal` (planner/refusal.ts) applique l'ordre de priorité suivant.

| Ordre | Classe | Codes concernés |
|---|---|---|
| 1 | `safety_blocked` | `SAFETY.*`, repos recommandé, refus de transfert de charge ou d'allure |
| 2 | `governance_blocked` | |
| 3 | `invalid_intent` | schéma, archétype inconnu, station absente |
| 4 | `retryable_slot_constraint` | **toutes** les causes ∈ { `PLAN.RUNNING.TIME_EXCEEDED`, `FEASIBILITY.TIME_EXCEEDED`, `DURATION.INFEASIBLE` } |
| 5 | `non_retryable_engine_refusal` | tout autre refus |

`engine_unavailable` relève du planificateur.

- **Réessai** : la même demande (sport, intention, station) est rejouée uniquement sur les créneaux **plus longs**, dans l'ordre déterministe existant. Interférence revérifiée. Chaque tentative est tracée (`PLAN.PLANNER.SLOT_RETRY`).
- **Épuisement** : sans créneau plus long, refus `slot_unavailable`.
- **Démonstration** : TEST Running (objectif 10 km) refusé sur 60 min, puis le même TEST accepté sur 90 min.

## B. Contrat d'exécution

**Partie commune** : identité (`requestId`), complétion (`completed_as_prescribed`, `modified`, `abandoned`, `missed`), douleur (`NONE` ou P1–P4 ; absente = inconnue), tolérance.

**Détails typés par sport :**

| Sport | Détails saisis |
|---|---|
| Strength | séries |
| Running | course (durée, distance, temps de TEST) |
| CT | résultat continu, sRPE |
| HYROX | résultat de station |

**Parcours** de `recordSessionExecution` (app-core) :
1. validation générique : séance planifiée connue, discipline, identité non encore enregistrée ;
2. dispatch typé par discipline ;
3. validation par le contrat du moteur ;
4. écriture dans l'historique du moteur ;
5. résultat générique et référence de preuve `evidence` transmis au programme ;
6. empreinte anti-doublon ;
7. pause douleur (règle V0).

- Les constructeurs CT/HYROX se trouvent dans `planner/execution.ts`, car app-core ne dépend pas de ces moteurs.
- Le Programme Engine ne lit que le statut générique et l'existence d'une preuve. `measured` est conservé en lecture seulement.

## C. Strength

- Réutilisation de `applyStrength`, factorisé en `applyStrengthExecution` : séance générée et séries saisies, traitées par `classifyExposure`, `updateTrack` et `createTrack`. Chemin V0 inchangé, instantané identique.
- « Telle que prescrite » exige chaque série de travail saisie, faite, avec ses répétitions.
- « Modifiée » produit un historique partiel : seules les séries saisies sont prises en compte.
- Une série inconnue est refusée.
- La semaine 2 reçoit les expositions et tracks réels, et le moteur recalcule la séance : le contexte diffère de celui d'un historique vide.

## D. Running

- Chemin existant (`realizedRunFrom`, `testReferenceFrom`).
- Une course ordinaire n'est jamais transformée en référence, même avec un temps saisi.

## E. Cross-training C2

- La réalisation suit le contrat C2 :
  - prescription continue lue dans la séance ;
  - résultat `total` ou abandon ;
  - `modified` devient `completed` ;
  - stimulus = stimulus du contrat CT déclaré par le programme.
- La semaine suivante est un **rejeu strict** (source `replay`), nouvelle occurrence.
- `modified`, `abandoned`, douleur, mauvaise tolérance ou douleur inconnue : pas de rejeu et aucun repli.
- Si la dernière séance n'est pas rejouable, aucun retour à une séance plus ancienne.
- Règles C2 inchangées.

## F. HYROX

- Nouveau `zHyroxStationExecution` :
  - **prescription** : station, mouvement, dose (distance, répétitions, calories, durée), charge prescrite ;
  - **résultat** séparé : quantité réalisée, temps, charge utilisée ;
  - complétion, douleur, tolérance ;
  - cohérences définitionnelles seulement.
- L'historique est transporté et validé dans `HyroxContext.sessionHistory`.
- **H1 ne l'exploite pas** : prescription identique avec ou sans historique (testé).

## Limites et fail-closed

- **Anti-doublon CT** : une fois un historique CT présent, l'anti-doublon exige des poids `crosstraining`. Ils ne sont pas gouvernés : le rejeu est refusé techniquement (fail-closed du CORE). Les tests utilisent des poids TEST_ONLY.
- **Dose en calories (HYROX)** : non générable avec le catalogue de test (aucun débit cal/min). Seul le contrat est testé, via la fonction de prescription réelle de H1.
- **Correction d'une exécution** : non prise en charge, refus explicite d'une seconde soumission.
- **Strength hors V0** : aucune saisie série par série pour les séances planifiées hors du chemin V0, au-delà de cette API.
- **HYROX** : aucune progression, aucune exploitation de l'historique.
- **Douleur** : une douleur déclarée suspend aussi la planification du programme (alignement sur V0).
