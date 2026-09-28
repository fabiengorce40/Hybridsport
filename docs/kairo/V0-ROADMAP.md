# KAIRO V0 — audit court et feuille de route

Baseline : `4a03936` (933 tests, typecheck, lint verts). Stratégie : tranches verticales orientées produit, sans prescription non autorisée.

## 1. Audit (état réel du dépôt)

| Élément | État réel | Conséquence V0 |
|---|---|---|
| Frontend | **Aucun** (4 paquets TypeScript : domain, engine, strength, running) | À construire entièrement |
| CORE (`@hybridsport/engine`) | Pipeline d'une séance (`runSportSession`) : contrôle, durée, anti-doublon par empreintes, validation, réparation, trace. **Aucun planificateur hebdomadaire.** Pur, sans dépendance Node : exécutable dans un navigateur | Réutilisé tel quel, dans le navigateur |
| Ruleset CORE et catalogue | **Uniquement des fixtures de test** : valeurs `provisional`, statut `draft`, contenus G1 (douleur, éligibilité) **fictifs**. Aucun ruleset de production | Tout contenu affiché est **provisoire** |
| Strength | Moteur verrouillé techniquement (`STRENGTH_ENGINE_V1_FINAL_TECHNICAL_LOCK`), mais `STRENGTH_SCIENTIFIC_LOCK_V1 = LOCKED_PROVISIONAL` : 57–60 blocages PRODUCTION (visas G1, valeurs provisoires, sources non lues). Progression par tracks (`createTrack`, `updateTrack`, `classifyExposure`) | Utilisable **uniquement en mode provisoire signalé** (décision utilisateur 2026-09-28) |
| Running | Vague 1 durcie. Vague 2 : EASY seul, **simulation** uniquement (V19/V12/V02 candidats), durcissement NON PASSÉ (lots de mutation 2 et 3 différés). P-R0, P-HYBRID (course + autre sport), reprise longue : refus | EASY visible en **SIMULATION** ; refus exposés tels quels |
| Cross-training, HYROX | **Aucun moteur**, aucune règle validée | Sélectionnables, affichés « indisponible » ; jamais de séance factice |

## 2. Décisions prises (utilisateur, 2026-09-28)

1. Strength : séances affichées en mode « Provisoire — non validé » (bannière permanente, avertissement accepté à l'onboarding, provenance sur chaque séance).
2. Running : EASY affiché avec un badge SIMULATION, distinct du provisoire Strength.
3. Planificateur : règles **structurelles** uniquement (jours déclarés disponibles, ≤ 1 séance par jour, pas de double séance). Aucune durée de récupération : deux jours consécutifs sont **signalés** (« règle de récupération non gouvernée »), pas bloqués.
4. Format : **PWA** (React + Vite), installable depuis le navigateur du téléphone, hors ligne. Expo reste la cible de l'architecture à terme.

## 3. Blocages exigeant une décision experte (non contournés)

| Sujet | Blocage | Comportement V0 |
|---|---|---|
| Ruleset de production Strength | Valeurs provisoires, G1 fictif | Mode provisoire signalé |
| Règles de sécurité douleur (G1) | Contenu fictif | Douleur signalée ⇒ **toutes les séances suspendues** jusqu'à levée explicite par l'utilisateur (fail-closed), message « consulter un professionnel » |
| Périodisation (mésocycles, décharges) | Paramètres non gouvernés | Phase fixe `accumulation` S1/1 : aucune rampe de volume ni décharge planifiée |
| Choix de split Strength (full body / haut / bas) | Règle de programmation non gouvernée | `str_full_body` pour toutes les séances |
| Récupération minimale, interférences I1–I8 | Table `provisional` | Non appliquée ; jours consécutifs signalés |
| Running : V19 source-of-truth, V33, V34, G1, Q-W2-2 à 7 | Ouverts | Inchangés ; refus du moteur affichés |
| Running + autre sport (P-HYBRID) | Planificateur global non gouverné | Refus du moteur (HYBRID_PLANNER_UNAVAILABLE) affiché |
| Cross-training, HYROX | Aucune règle | Indisponibles |

## 4. Tranches

| Tranche | Livrables | Dépend de |
|---|---|---|
| **A** | Cet audit ; architecture : `packages/app-core` (logique produit pure, testée) + `apps/kairo` (PWA) | — |
| **B** | Profil (sports, objectifs, niveau, matériel, disponibilités) → planificateur hebdomadaire structurel → génération réelle des séances par les moteurs → persistance versionnée | A |
| **C** | Exécution : séries cochées, charges/répétitions réalisées, chrono de repos, fin de séance, feedback, historique | B |
| **D** | Adaptation : tracks Strength (fonctions du moteur), historique Running réalisé (ancre V19), régénération des séances non commencées ; états indisponibles CT/HYROX | C |
| **E** | PWA installable (manifest, service worker), tests de parcours complet, build, procédure de lancement, preview | B–D |

## 5. Architecture de livraison

```
apps/kairo (PWA React)  ──►  packages/app-core  ──►  @hybridsport/engine · strength · running
   UI, navigation,            profil, planificateur,       (inchangés)
   stockage navigateur        génération, exécution,
                              progression, persistance
                              (pur, horloge injectée)
```

- `app-core` n'implémente aucune règle sportive : il orchestre les moteurs et n'ajoute que des règles structurelles déclarées.
- Le contenu provisoire (ruleset, catalogue) est importé des fixtures **sans copie ni modification**, via un module unique `provisional-content`, marqué comme tel.
