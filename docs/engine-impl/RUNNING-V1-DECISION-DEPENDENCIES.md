# RUNNING-V1-DECISION-DEPENDENCIES — ensemble des décisions et graphe (périmètre C)

> **Phase 5G. Aucune décision n’est approuvée.**

## 1. Ensemble exact

| Type | Décisions | Statut |
|---|---|---|
| **14 décisions expertes** | E-PROG, E-QUALITY, E-LONG, E-RPE, E-PACE, E-RECOVERY, E-DENSITY, E-RECENCY, E-LOAD, E-TAPER, E-FIRST, E-MODEL, E-VARIABILITY, E-RECENTLOAD | PENDING |
| **4 politiques G1** | G1-PAIN, G1-SCOPE, G1-NOVICE, G1-RETURN | UNSIGNED |
| **2 doses** | V33 (entrée novice), V34 (première exposition après une longue coupure) | UNRESOLVED |
| **Technique (fondateur)** | Approbation de CORE-EXT-R1 | READY_FOR_FOUNDER_APPROVAL |

## 2. Besoin d’implémentation, par décision

**Classes** :
- CODE : CODE_REQUIRED_NOW ;
- RULE : RULESET_REQUIRED_BEFORE_FEATURE_ACTIVATION ;
- PROD : PRODUCTION_REQUIRED ;
- GATE : CAN_REMAIN_GATED_AFTER_INITIAL_IMPLEMENTATION.

| Décision | CODE | RULE | PROD | GATE | Remarque |
|---|---|---|---|---|---|
| CORE-EXT-R1 | **oui** | — | oui | — | Seul vrai prérequis de code (vague 0) |
| G1-PAIN | non | oui | **oui** | non | S’applique à tous |
| G1-SCOPE | non | oui | **oui** | non | idem |
| G1-NOVICE (politique) | non | oui | **oui** | non | La détection de P-R0 est nécessaire même si P-R0 reste désactivé |
| G1-RETURN (politique, V24, UNKNOWN) | non | oui | **oui** | non | Toute interruption |
| V33 | non | oui | oui (pour P-R0) | **oui** | P-R0 désactivé d’ici là |
| V34 | non | oui | oui (pour le premier départ) | **oui** | NO_VALID d’ici là |
| E-RPE | non | oui | **oui** | non | Socle |
| E-DENSITY | non | oui | **oui** | non | Socle |
| E-RECENCY | non | oui | **oui** | non | Socle |
| E-RECENTLOAD | non | oui | **oui** | non | Socle |
| E-PROG | non (option C ⇒ structure d’algorithme : implémenter dans sa vague) | oui | pour sa fonction | **oui** | Restauration ou HOLD d’ici là |
| E-QUALITY | non | oui | pour sa fonction | **oui** | Défaut conservateur |
| E-LONG | non | oui | pour le marathon | **oui** | |
| E-PACE | non | oui | pour les cibles d’allure | **oui** | RPE seul d’ici là |
| E-RECOVERY | non | oui | pour les premières expositions et le taper | **oui** | |
| E-LOAD | non | oui | pour P-R1 et P-R0 | **oui** | |
| E-TAPER | non | oui | pour le taper | **oui** | Dernière semaine d’ici là |
| E-FIRST | non | oui | pour les premières expositions | **oui** | |
| E-MODEL | non (structure du modèle : dans sa vague) | oui | pour l’extrapolation | **oui** | Calibration d’ici là |
| E-VARIABILITY | non (estimation personnelle : dans sa vague) | oui | pour les mises à jour sur observations | **oui** | Conflit MAJOR d’ici là |

## 3. Graphe (dépendances logiques seulement)

```
P-R0 (NOVICE_ENTRY)
  → G1-SCOPE (frontière des populations)
  → G1-NOVICE (politique : P-R0 pris en charge = oui)
  → V33 (dose, cosignée programmation + sécurité)
  → drapeau running.noviceEntry → activation

Première prescription après une longue coupure
  → G1-RETURN (politique)
  → V24 (frontières, dont la falaise à 28 j)
  → V34 (dose, cosignée)
  → drapeau running.longReturn → activation

Marathon
  → E-LONG (mécanisme ± maximum produit)
     ← E-PROG (la progression du long run dépend de la règle)
     ← E-DENSITY (désignation HD du long run)
  → E-TAPER (volet marathon, 2–3 semaines observationnel)
  → stratégie d'allure par calibration (E-MODEL exclut le marathon ; aucune décision supplémentaire)
  → drapeau running.marathon → activation

Progression au-delà du maximum historique
  → E-RECENTLOAD (bestToleratedExposure)
  → E-PROG (option B ou C ; valeurs V23 par variable)
  → drapeau running.progressionBeyondHistory → activation

Première exposition de qualité
  → E-FIRST (doses d'initiation, ou « après test »)
  → E-RECOVERY (récupérations en première exposition)
  → E-QUALITY (si option C : minimum en première exposition)
  → drapeaux running.firstThresholdExposure / running.firstSevereExposure → activation

Cibles d'allure : E-VARIABILITY (si option B d'E-PACE) → E-PACE → drapeau running.paceTargets
Extrapolation : E-VARIABILITY (largeur) → E-MODEL → drapeau running.performanceExtrapolation
Taper : E-TAPER → drapeau running.taper
P-R1 progression : E-RECENTLOAD → E-LOAD
Hybride : intégration planificateur (technique) → drapeau running.hybridPlanning
Production (tout) : G1-PAIN + G1-SCOPE + G1-NOVICE (politique) + G1-RETURN (politique)
                    + E-RPE + E-DENSITY + E-RECENCY + E-RECENTLOAD + ruleset verrouillé
```

Aucune dépendance n’a été ajoutée sans raison logique : par exemple, E-RPE ne dépend d’aucune autre décision.
