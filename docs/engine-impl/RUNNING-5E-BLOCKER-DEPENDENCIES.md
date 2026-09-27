# RUNNING-5E-BLOCKER-DEPENDENCIES — graphe des dépendances et ensemble minimal

> **Phase 5E.** Chaque chaîne mène d’un résultat bloqué aux décisions humaines qui le conditionnent.

## 1. Chaînes

```
R1 (novice, BLOCKED_G1)
  → G1-NOVICE (structure A / B / C / D)
     → V33 dose d'entrée (DECISION_REQUIRED, vide)
        → signature G1 + revue experte de la dose
           → R1 éligible à l'implémentation
     (option D ⇒ R1 reste hors V1, résultat valide)

R8 (reprise LONG sans séance post-retour, BLOCKED_G1)
  → G1-RETURN
     → V24 frontières (candidates) + unknownStateHandling (candidate)
     → V34 dose de premier départ (DECISION_REQUIRED, vide)
        → signature G1
           → R8 éligible
     (sans V34 : NO_VALID jusqu'aux séances post-retour, résultat accepté)

Progression au-delà du maximum toléré (toutes les semaines)
  → E-PROG
     → V23 (option B : plages par variable ; option C : unité minimale ; DECISION_REQUIRED)
        → nouvelle hausse possible
     (option A ou KEEP BLOCKED : restauration + HOLD, fonctionnel)

Allure semi sans semi récent (R4)
  → E-MODEL → vérification de l'exposant + largeur de prédiction → composant débloqué

Première séance de seuil ou sévère (R9, R12)
  → E-FIRST → doses d'initiation (DECISION_REQUIRED) → composants débloqués
  (KEEP BLOCKED : EASY + TEST seulement pour ces athlètes)

Composition hebdomadaire (R2–R12)
  → E-DENSITY (V10, V11) ─┐
  → E-RECENCY (V12)       ├→ proposition possible
  → E-RECENTLOAD (V21)    │
  → E-RPE (V02)           ┘

Production (tous)
  → G1-PAIN + G1-SCOPE + G1-RETURN (frontières, UNKNOWN) + G1-NOVICE (règle de périmètre P-R0)
     → signatures → production autorisée (sous réserve de l'implémentation)

Marathon (R6 et suivants)
  → E-LONG (mécanisme) + E-TAPER (durée 2–3 semaines, observationnel) + E-MODEL (marathon exclu ⇒ allure par calibration)
     → marathon dans le périmètre
```

## 2. Classification des décisions

| Décision | Classe | Raison |
|---|---|---|
| G1-PAIN | **IMPLEMENTATION_BLOCKER** | S’applique à tous ; sécurité |
| G1-SCOPE | **IMPLEMENTATION_BLOCKER** | idem |
| G1-RETURN : frontières + UNKNOWN | **IMPLEMENTATION_BLOCKER** | Toute interruption doit être traitée |
| G1-RETURN : V34 (dose de premier départ) | FEATURE_BLOCKER | Sans elle, le premier départ reste NO_VALID (acceptable) |
| G1-NOVICE : règle de périmètre P-R0 (pas de test maximal, refus ou redirection) | **IMPLEMENTATION_BLOCKER** | La détection de P-R0 doit être signée même si P-R0 est exclu |
| G1-NOVICE : V33 (dose) | FEATURE_BLOCKER | Fonction « novice » |
| E-RPE | **IMPLEMENTATION_BLOCKER** | NO_WEARABLE exige une cible RPE |
| E-DENSITY | **IMPLEMENTATION_BLOCKER** | Composition hebdomadaire |
| E-RECENCY | **IMPLEMENTATION_BLOCKER** | Vieillissement des références |
| E-RECENTLOAD | **IMPLEMENTATION_BLOCKER** | LCA |
| E-LOAD | FEATURE_BLOCKER | Fonction P-R1 (et P-R0) |
| E-PROG | FEATURE_BLOCKER | Nouvelle hausse ; dégradation : restauration ou HOLD |
| E-LONG | FEATURE_BLOCKER | Progression du long run, marathon |
| E-TAPER | FEATURE_BLOCKER (semi, 10K, 5K) ; **POST_V1_ALLOWED** (marathon, si le marathon est hors V1) | Dégradation : dernière semaine, sélection laissée à l’utilisateur ou au planificateur |
| E-FIRST | FEATURE_BLOCKER | Premières expositions |
| E-MODEL | FEATURE_BLOCKER | Dégradation : calibration |
| E-PACE | QUALITY_BLOCKER | Dégradation : RPE seul |
| E-RECOVERY | QUALITY_BLOCKER | Historique sinon |
| E-QUALITY | QUALITY_BLOCKER | Défaut conservateur |
| E-VARIABILITY | QUALITY_BLOCKER | Dégradation : conflit toujours MAJOR, mises à jour sur performance seulement |
| PROGRESSION_RUN (non sélectionné) | POST_V1_ALLOWED | Hors composition V1 |

## 3. Ensemble minimal pour une V1 utile

- **8 décisions humaines** :
  - **4 politiques G1** : PAIN, SCOPE, RETURN (frontières et UNKNOWN), NOVICE (règle de périmètre) ;
  - **4 décisions expertes** : E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD.
- **Plus les pré-requis techniques** : approbation puis implémentation de CORE-EXT-R1, et intégration au GlobalPlanner pour P-HYBRID.
- **Aucune exigence de sécurité n’est réduite** : les 4 G1 font toutes partie de l’ensemble minimal.
