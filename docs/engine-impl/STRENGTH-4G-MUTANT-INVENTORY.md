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

MUTATION_4G
