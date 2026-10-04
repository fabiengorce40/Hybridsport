# Programme Engine P1 (`@hybridsport/programme`)

Baseline : `c2d8f00`. Architecture : 95 tests sur 14 fichiers (référence précédente : 88 sur 13).

## Inventaire réutilisé

| Source | Élément réutilisé |
|---|---|
| Strength | `phase` (accumulation, intensification, deload…, semaine dans le mésocycle), saisie libre par l'appelant ; objectifs `goal.primary` |
| Running | `RUNNING_GOALS` avec `targetDate`, séance TEST qui produit une référence TIME_TRIAL, complétion `COMPLETED`/`PARTIAL`/`SKIPPED` |
| Cross-training | `CT_GOALS` |
| Planificateur V2 | intention de programme, catégories de demande |
| Docs 07/08 | décharge toutes les 3 à 4 semaines, tests périodiques : **hypothèses non approuvées, non reprises** |

## Graphe

```
app-core → programme → planner → strength | running | crosstraining | hyrox → engine → domain
app-core → planner (V2), strength/running (V0)
```

- Le programme ne dépend d'aucun moteur.
- Personne ne dépend du programme, sauf app-core.
- Le graphe est vérifié par `dependency-graph.test.ts` (absence de cycle).

## Contrats

- **ProgrammeDefinition** : objectifs, horizon déclaré, priorité explicite, composition, intention par sport, station HYROX, déclarations, variantes PROGRESS/REGRESS déclarées, évaluation déclarée, phases déclarées. Aucune valeur par défaut. Une définition invalide donne `DEFINITION_INVALID` avec le chemin en cause.
- **Objectifs** : vocabulaires des moteurs (Running, CT via le planificateur, Strength `goal.primary`) ; HYROX : minimal (`RACE_PREPARATION`, `GENERAL`). Un objectif est transmis au contrat du moteur et n'entraîne aucune progression numérique.
- **ProgrammeState** (v1, dans `AppState.programmeState`, champ additif) :
  - intention courante par sport ;
  - semaines (intention, `plannerRef` vers `AppState.planner.weeks`, résumé des demandes, adhérence) ;
  - résultats, évaluations, décisions ;
  - journal d'audit.
- Les séances ne sont jamais recopiées : seule la référence `plannerRef` est stockée.

## Horizon glissant

| Statut | Condition |
|---|---|
| `closed` | semaine clôturée |
| `planned` | semaine planifiée, non clôturée |
| `plannable` | semaine courante, ou une des N semaines suivantes si `programme.planning.horizonWeeks` (G2) le permet |
| `awaiting_results` | une semaine précédente planifiée n'est pas clôturée |
| `projected` | au-delà de l'horizon planifiable |
| `past_unplanned` | semaine passée jamais planifiée |

- Une semaine sans résultat enregistré peut être replanifiée.
- Aucune durée d'horizon en production : sans paramètre, seule la semaine courante est planifiable.

## Retour d'expérience

- **Réalisations** : `completed_as_prescribed`, `modified`, `abandoned`, `missed`, plus la douleur et un résultat mesuré facultatif.
- Une séance passée sans saisie devient `missed` à la clôture (dérivé, tracé).
- **Adhérence descriptive** : demandées, planifiées, non planifiées, réalisées, telles que prescrites, modifiées, abandonnées, manquées, avec douleur. Aucun seuil.
- **Décisions** : HOLD, PROGRESS, REGRESS, REASSESS, BLOCKED, par sport. Elles appliquent la politique gouvernée `programme.adaptation.decisionPolicy` (G2) : des règles ordonnées sur les faits.
- Une décision devient BLOCKED (`POLICY_UNAVAILABLE` ou `NO_RULE_APPLIES`) si la politique est absente, non approuvée en production, ou si aucune règle ne s'applique.
- Chaque décision conserve sa provenance : politique, version, statut, règle appliquée, faits, résultats utilisés et raisons.

**Effets d'une décision :**

| Décision | Effet |
|---|---|
| PROGRESS / REGRESS | Seule la variante d'intention déclarée s'applique. Sans variante, `NO_VARIANT_DECLARED` : intention inchangée |
| REASSESS | Évaluation demandée pour la semaine suivante |

La prescription reste au moteur.

## Évaluations

- **Statuts** : `requested`, `scheduled`, `not_planned`, `content_unavailable`, `completed`, `result_missing`.
- L'intention d'évaluation remplace la première séance du sport, via la nouvelle surcharge d'intention par séance du planificateur.
- **Chemin réel** : la séance TEST du moteur Course est générée par le moteur, réalisée et chronométrée. Elle crée une référence TIME_TRIAL dans l'historique Running, et l'évaluation passe à `completed`.
- Un TEST trop long pour le créneau est refusé par le moteur (`TIME_EXCEEDED`) : l'évaluation passe à `not_planned`.

## app-core

**Fonctions** : `startProgramme`, `planProgrammeCurrentWeek`, `recordProgrammeSession`, `closeProgrammeWeekInApp`.

**Retour vers l'historique des moteurs**, par leurs contrats existants :
- courses réalisées (factorisé : `realizedRunFrom`, `testReferenceFrom`) ;
- références TEST ;
- empreintes ;
- pause douleur.

**Limites P1** : aucun suivi Strength série par série, et aucune séance réalisée CT ou HYROX versée à l'historique de leur moteur. Le contrat de réalisation CT n'a pas d'équivalence d'unités.

## Fail-closed

Sans valeurs approuvées :
- politique de décision et horizon d'avance ;
- tout ce qui l'était déjà dans les lots précédents.

Aucune périodisation, décharge, seuil d'adhérence ni progression universelle n'est introduit.

Le planificateur ne réessaie pas un autre jour après un refus du moteur lié au créneau (par exemple un TEST trop long) : c'est une décision à prendre.
