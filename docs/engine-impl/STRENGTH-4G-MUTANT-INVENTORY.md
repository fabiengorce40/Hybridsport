# STRENGTH-4G-MUTANT-INVENTORY — mutants de la préservation du stimulus

> Phase 4G.
> - Source initiale : passage 2 de la mutation 4F (`reports/mutation/strength-4f-mutation.json`), périmètre `engine.ts:400–439` (code de la 4F, avant extraction).
> - Classes : `EQUIVALENT` · `TRACE_ONLY` · `NO_PRESCRIPTION_IMPACT` · `PRESCRIPTION_RELEVANT` · `UNCERTAIN`.
> - Un mutant n’est déclaré équivalent qu’avec une justification.

## 1. Inventaire initial (4F, 46 survivants sur 128 mutants)

Lignes du code 4F. Les lignes et colonnes renvoient à l’ancien `engine.ts`.

| ID | Ligne | Mutation | Classe | Scénario qui l’expose | Test existant (4F) | Action 4G |
|---|---|---|---|---|---|---|
| 186 | 404 | décompte `hold` → toujours vrai | PRESCRIPTION_RELEVANT | séance avec mobilité ou porté : séries indéfinies ⇒ dose NaN ⇒ échange refusé à tort | aucun | extraction `workingSetsOf` + test « séries prises en compte » |
| 187 | 404 | décompte `hold` → toujours faux | PRESCRIPTION_RELEVANT | maintien (gainage) retenu ⇒ couverture ou majorité faussées | aucun | idem |
| 188 | 404 | `=== 'hold'` → `!==` | PRESCRIPTION_RELEVANT | idem | aucun | idem |
| 189 | 404 | `'hold'` → `""` | PRESCRIPTION_RELEVANT | idem (maintien jamais compté) | aucun | idem |
| 192 | 407 | `fr < 0` → faux | PRESCRIPTION_RELEVANT | exercice supplémentaire d’un emplacement REQUIS omis (rang −1) : il délogerait tous les optionnels | aucun | G7 (`removalOrder('required_slot')` = ∅) |
| 193 | 407 | `fr < 0` → `fr <= 0` | PRESCRIPTION_RELEVANT | l’optionnel le plus prioritaire (rang 0) ne serait jamais protégé | aucun | G1, G3, G9 (omis de rang 1) et G7 ; scénarios moteur (rang 0 d’`iso_upper` en full body) |
| 195 | 408 | filtre des retirables supprimé | PRESCRIPTION_RELEVANT | optionnel suivi, requis, plus prioritaire ou même emplacement retiré | aucun | G7, G11 |
| 201 | 408 | `status === 'optional'` → vrai | EQUIVALENT | un emplacement requis a le rang −1 (absent de `slots.optional`), jamais `> fr ≥ 0` : la condition est redondante avec le rang | — | justification ; G7 le couvre au niveau pur (`optional: false`) |
| 202 | 408 | `(opt && !track) \|\| (id≠omis && rang>fr)` | PRESCRIPTION_RELEVANT | optionnel SUIVI de rang inférieur retiré | aucun | G7 (track), G11 moteur |
| 203 | 408 | sous-condition → vrai | PRESCRIPTION_RELEVANT | idem (garde `!track` neutralisée) | aucun | G7, G11 |
| 204 | 408 | `opt \|\| !track` | PRESCRIPTION_RELEVANT | optionnel suivi retirable | aucun | G7, G11 |
| 205 | 408 | `!track` → vrai | PRESCRIPTION_RELEVANT | idem | aucun | G7, G11 |
| 209 | 408 | `id ≠ omis` → vrai | EQUIVALENT | même emplacement ⇒ même rang ⇒ `rang > fr` faux : redondant | — | justification ; G7 couvre le rang égal |
| 212 | 408 | `rang > fr` → `>=` | PRESCRIPTION_RELEVANT | un exercice du MÊME emplacement serait retiré puis resélectionné (échange fictif tracé) | aucun | G7 (même emplacement) |
| 214 | 409 | comparateur de tri → aucun tri | PRESCRIPTION_RELEVANT | deux retirables admissibles : le plus prioritaire serait retiré | aucun | G1, P7 |
| 215 | 409 | comparateur `rang(y) + rang(x)` | PRESCRIPTION_RELEVANT | ordre d’essai faussé | aucun | G1, G5, P7 |
| 219 | 413 | `families.delete(victime)` supprimé | UNCERTAIN → NO_PRESCRIPTION_IMPACT | L’essai garderait la famille de la victime bloquée. Cela ne change l’omis resélectionné que si un exercice de la famille de la victime qualifie aussi pour l’emplacement omis. Victime et omis viennent d’emplacements de besoins différents ; dans les archétypes actuels, une famille n’apparaît que dans un seul besoin. | — | analyse ; revu après extraction (§2) |
| 223 | 416 | `families.clear()` supprimé (restauration) | NO_PRESCRIPTION_IMPACT | L’ensemble des familles ne fait que grossir. Après la préservation, seules les étapes de mobilité suivent (aucune sélection d’exercice) ; un omis suivant exclurait une famille en trop, et seulement si elle coïncide avec l’un de ses candidats (même analyse que 219). | — | analyse |
| 224 | 416 | ré-ajout des familles supprimé | NO_PRESCRIPTION_IMPACT | Même analyse : familles manquantes ⇒ un omis suivant pourrait choisir un exercice d’une famille déjà présente. Garde-fou du CORE : exercice en double refusé (fuzz). | — | analyse |
| 226 | 417 | `'blocked' in r` → faux | EQUIVALENT | Branche défensive inatteignable. L’omis avait déjà un candidat (sinon il serait omis pour `no_candidate`, pas pour `duration`). Retirer la victime ne fait que relâcher les filtres (familles, compteur technique F7b). | — | justification ; la branche est testée au niveau pur (G7, essai `blocked`) |
| 227 | 417 | `'blocked'` → `""` | EQUIVALENT | idem | — | idem |
| 228 | 417 | bloc `{restore; continue}` vidé | EQUIVALENT | idem | — | idem |
| 229 | 417 | `restore()` supprimé | EQUIVALENT | idem | — | idem |
| 231 | 419 | `families.add(omis)` supprimé | NO_PRESCRIPTION_IMPACT | Même analyse que 224. | — | analyse |
| 239 | 424 | filtre des groupes protégés supprimé | PRESCRIPTION_RELEVANT | échange sans perte disproportionnée | aucun | G3, G6, évaluation pure |
| 241 | 424 | `own > 0` → vrai | PRESCRIPTION_RELEVANT | omis sans série (0 ≥ 0 − 0) protégé | aucun | G6 (omis à 0 série), évaluation (`own = 0`) |
| 243 | 424 | `own > 0 \|\| majorité` | PRESCRIPTION_RELEVANT | tout omis avec séries protégé | aucun | G3, G6 |
| 244 | 424 | `own > 0` → vrai (conditionnel) | PRESCRIPTION_RELEVANT | idem 241 | aucun | G6 |
| 245 | 424 | `own > 0` → `own >= 0` | PRESCRIPTION_RELEVANT | idem 241 | aucun | G6 |
| 247 | 424 | majorité → vrai | PRESCRIPTION_RELEVANT | échange sans perte disproportionnée | aucun | G3, G6 |
| 248 | 424 | `>=` → `>` | PRESCRIPTION_RELEVANT | cas limite (3 = 3, S2 et full body 60 min) : échange refusé | S2 (`otherSets` 2) ne l’expose pas | G3 (limite), scénario moteur full body (3 = 3) |
| 251 | 424 | `planned[g] ?? 0` → `&&` | PRESCRIPTION_RELEVANT | dose d’autres exercices lue 0 ⇒ majorité toujours vraie | aucun | G3 |
| 252 | 426 | couverture `every` → `some` | PRESCRIPTION_RELEVANT | retrait de la seule couverture d’un groupe d’un optionnel multi-groupes | aucun | G2 |
| 254 | 426 | couverture → vrai | PRESCRIPTION_RELEVANT | idem | aucun | G2, évaluation |
| 256 | 426 | `> 0` → `>= 0` | PRESCRIPTION_RELEVANT | idem | aucun | G2, évaluation |
| 263 | 427 | `fits && groups` → `\|\|` | PRESCRIPTION_RELEVANT | échange hors durée | aucun | G5, évaluation (`fits` faux) |
| 264 | 427 | `groups.length > 0` → vrai | PRESCRIPTION_RELEVANT | échange sans groupe protégé | aucun | G3, G6 |
| 265 | 427 | `> 0` → `>= 0` | PRESCRIPTION_RELEVANT | idem | aucun | G3, G6 |
| 271 | 429 | recherche de l’omission initiale (`\|\|`) | TRACE_ONLY | La mauvaise omission retirée de la trace. Aucune décision sportive ne lit ces raisons après coup. | F4 (S2) | scénario moteur full body : trace exacte vérifiée |
| 272 | 429 | sous-condition → vrai | TRACE_ONLY | idem | F4 | idem |
| 273 | 429 | `code \|\| slot` | TRACE_ONLY | idem | F4 | idem |
| 274 | 429 | sous-condition → vrai | TRACE_ONLY | idem | F4 | idem |
| 277 | 429 | `slot === omis` → vrai | TRACE_ONLY | idem | F4 | idem |
| 279 | 429 | `cause === 'duration'` → vrai | TRACE_ONLY | idem | F4 | idem |
| 282 | 430 | `omitted >= 0` → vrai | TRACE_ONLY | `splice(-1)` retirerait la dernière raison (trace) | F4 | idem |
| 284 | 430 | `>= 0` → `> 0` | TRACE_ONLY | omission en position 0 non retirée (trace) | F4 | idem |

**Synthèse initiale** :

| Classe | Nombre |
|---|---|
| PRESCRIPTION_RELEVANT | 29 |
| TRACE_ONLY | 8 |
| EQUIVALENT | 6 (201, 209, 226–229) |
| NO_PRESCRIPTION_IMPACT | 3 (223, 224, 231) |
| UNCERTAIN | 1 (219), puis NO_PRESCRIPTION_IMPACT après analyse |

## 2. Après la phase 4G

### 2.1 Changement de périmètre

La décision est extraite dans `stimulus-preservation.ts`, sans changement de comportement (goldens S1–S7 identiques). Le périmètre muté devient :

- `packages/strength/src/stimulus-preservation.ts` ;
- `packages/strength/src/engine.ts:402–439` (liaison : état de séance, essais, trace).

La numérotation change en conséquence. Les mutants 4F sont repris ci-dessous par leur équivalent 4G.

### 2.2 Passages de mutation 4G (`stryker.strength-4g.config.json`, environ 25 min par passage)

| Passage | Total | Tués | Survivants | Timeouts | Sans couverture | Score |
|---|---|---|---|---|---|---|
| 4G-1 (après G1–G12 et P1–P8) | 170 | 152 | 18 | 0 | 0 | 89,4 % |
| 4G-2 (après le scénario à deux essais) | 170 | 153 | 17 | 0 | 0 | **90,0 %** |

Détail du passage 4G-2 : `stimulus-preservation.ts` 97,7 % (85 tués sur 87) ; liaison `engine.ts` 81,9 % (68 tués sur 83).

**Survivant PRESCRIPTION_RELEVANT révélé par le passage 4G-1**

- **Mutant 30** : `restore()` au début de chaque essai supprimé.
- **Effet** : sans lui, l’état d’un essai refusé fuirait dans l’essai suivant.
- **Scénario ajouté** : bas du corps, intermédiaire et avancé, 65 min. Le tronc est essayé et refusé, puis la fente bulgare est retirée au profit du leg extension.
- **Résultat** : tué au passage 4G-2, comme le mutant 17 (`families.clear()` dans la restauration).

### 2.3 Survivants finaux (17) et classification

| ID | Ligne | Mutation | Classe | Justification | Test / garde |
|---|---|---|---|---|---|
| 21 | engine.ts:410 | `optional: status === 'optional'` → vrai | EQUIVALENT | Un emplacement requis a le rang −1 (absent de `slots.optional`) et n’est jamais `> fr ≥ 0` : il reste exclu par le rang. | G7 (pur, `optional: false`) |
| 28 | engine.ts:411 | initialisation de `local` → tableau non vide | EQUIVALENT | `local` est réaffecté (`local = []`) au début de chaque essai, avant toute lecture. | — |
| 32 | engine.ts:419 | `families.delete(victime)` supprimé | NO_PRESCRIPTION_IMPACT | L’essai garderait la famille de la victime bloquée. Or aucun candidat de l’emplacement omis n’appartient à une famille candidate d’un autre emplacement optionnel. | invariant structurel testé (« deux emplacements optionnels distincts ne partagent aucune famille candidate ») |
| 35 | engine.ts:422 | `'blocked' in r` → faux | EQUIVALENT | Branche défensive inatteignable. L’omis avait un candidat lors de sa tentative (sinon cause `no_candidate`, pas `duration`) ; retirer une victime ne fait que relâcher les filtres (familles, compteur technique). | G7 (pur : essai `blocked` ⇒ victime suivante) |
| 36 | engine.ts:422 | `'blocked'` → `""` | EQUIVALENT | idem | idem |
| 37 | engine.ts:422 | valeur renvoyée `'blocked'` → `""` | EQUIVALENT | idem (branche inatteignable) | idem |
| 39 | engine.ts:424 | `families.add(omis)` supprimé | EQUIVALENT | Tout essai et toute restauration reconstruisent les familles à partir de la séance ; l’ensemble n’est plus lu avant la reconstruction suivante (seules les étapes de mobilité suivent, sans sélection). | — |
| 61 | engine.ts:433 | recherche de l’omission initiale : `(code && slot) \|\| cause` | TRACE_ONLY | Seule la raison retirée de la trace change ; aucune décision n’est lue dans ces raisons. | F4 ; scénarios moteur (trace vérifiée) |
| 62 | engine.ts:433 | sous-condition → vrai | TRACE_ONLY | idem | idem |
| 63 | engine.ts:433 | `code \|\| slot` | TRACE_ONLY | idem | idem |
| 64 | engine.ts:433 | sous-condition → vrai | TRACE_ONLY | idem | idem |
| 67 | engine.ts:433 | `slot === omis` → vrai | TRACE_ONLY | idem | idem |
| 69 | engine.ts:433 | `cause === 'duration'` → vrai | TRACE_ONLY | idem | idem |
| 72 | engine.ts:434 | `omitted >= 0` → vrai | TRACE_ONLY | `splice(-1)` retirerait la dernière raison (trace seulement) | idem |
| 74 | engine.ts:434 | `>= 0` → `> 0` | TRACE_ONLY | omission en position 0 non retirée (trace seulement) | idem |
| 121 | stimulus-preservation.ts:56 | `slotId !== omis` → vrai | EQUIVALENT | Même emplacement ⇒ même rang (rang = index unique de l’emplacement) ⇒ `rang > fr` faux : la garde est redondante avec le rang strict. | G7 (même emplacement) |
| 124 | stimulus-preservation.ts:56 | `rang > fr` → `>=` | EQUIVALENT | À rang égal, seul le même emplacement est possible, et il est exclu par la garde `slotId`. Les deux gardes sont mutuellement redondantes. | G7 |

**Synthèse finale** :

| Classe | Nombre |
|---|---|
| EQUIVALENT | 8 (21, 28, 35, 36, 37, 39, 121, 124) |
| TRACE_ONLY | 8 (61, 62, 63, 64, 67, 69, 72, 74) |
| NO_PRESCRIPTION_IMPACT | 1 (32, garanti par un invariant testé) |
| UNCERTAIN | 0 |
| **PRESCRIPTION_RELEVANT** | **0** |

### 2.4 Correspondance avec l’inventaire initial

- **Les 29 mutants PRESCRIPTION_RELEVANT de la 4F** portent désormais sur `removalOrder`, `evaluateSwap`, `findStimulusSwap` et `workingSetsOf`, tous tués (97,7 % du module), ainsi que sur la liaison des essais, tuée (mutants 17 et 30).
- **Mutants 201 et 209** (4F) : redondances d’éligibilité, qui correspondent aux 21, 121 et 124 (EQUIVALENT).
- **Mutants 226 à 229** (4F) : branche « blocked », qui correspond aux 35 à 37 (EQUIVALENT).
- **Mutants 219, 223, 224 et 231** (4F) : familles.
  - 223 correspond au 17 (tué) ;
  - 219 correspond au 32 (NO_PRESCRIPTION_IMPACT, invariant testé) ;
  - 231 correspond au 39 (EQUIVALENT) ;
  - 224 correspond à la reconstruction dans `restore`, tuée.
- **Mutants 271 à 284** (4F) : nettoyage de trace, qui correspond aux 61 à 74 (TRACE_ONLY).

