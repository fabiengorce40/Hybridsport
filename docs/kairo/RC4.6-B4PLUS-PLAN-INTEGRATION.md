# RC4.6 — B4+ compact : plan d'intégration et tests (NON intégré)

**Statut :** plan seulement. **Rien n'est intégré** ; aucune ligne de code de production n'est modifiée. L'intégration attend votre accord.
Étude de référence : `RC4.6-LOT3-B4PLUS-ETUDE.md` (option retenue : **R3 « projection si nécessaire »**).

## 1. Périmètre

| Inclus | Exclu |
|---|---|
| Cross-training et HYROX : persistance de la **projection** réellement lue par le moteur, seulement pour une séance que la semaine finale ne reproduit pas | Persistance de séances complètes (R0, exclue pour la taille) |
| Relecture de cette projection à la régénération (démarrage, diagnostic R-A) | Tout changement de règle sportive, de seuil ou de catalogue |
| Repli explicite (reconstruction depuis la semaine) quand le champ est absent | Musculation (déjà couverte par B4) |
| | Course à pied (aucune entrée croisée lue) |

## 2. Format (champ facultatif, versionné)

- **Champ :** `crossInputs` existant de la demande persistée (B4), avec une clé par sport : `{ v: 1, crosstraining?: [...], ctWeek?: [...], hyroxWeek?: [...] }`.
  - `ctWeek` : pour chaque séance CT lue, `[requestId, date, stimulus, empreinte]`, plus la prescription réduite que lit le port (`plannedSessions`).
  - `hyroxWeek` : expositions H2 (`h2ExposureOf`) et empreintes, par séance HYROX lue.
- **Version :** `v` est incrémentée si la projection d'un moteur change. Un `v` inconnu déclenche le repli explicite, sans erreur.
- **Écriture :** seulement en fin de planification, sur la semaine **retenue** (pas sur chaque organisation candidate G5), et seulement si la régénération de contrôle avec la semaine finale **diffère** de la séance planifiée.
- **Compaction :** retirée par la compaction de l'historique, comme B4 (déjà en place).

## 3. Étapes (commits séparés)

| # | Étape | Fichiers principaux |
|---|---|---|
| 1 | Ports CT et HYROX : exposer la projection lue, et accepter une projection en entrée (`withInputs`, sur le modèle du port Strength de B4) | `packages/planner/src/ports.ts`, ports CT / HYROX |
| 2 | Planificateur : régénération de contrôle unique par séance CT / HYROX retenue ; copie de la projection si elle est nécessaire | `packages/planner/src/planner.ts`, `model.ts` |
| 3 | App-core : schéma zod, persistance, régénération (`crossSource: 'persisted' \| 'rebuilt_from_week'` étendu à CT / HYROX), garde de démarrage | `model.ts`, `planning.ts`, `start-check.ts` |
| 4 | Déplacement manuel d'une séance de la semaine : recalcul des projections des séances CT / HYROX touchées (seul cas de changement après planification identifié) | `beta0-app.ts` |
| 5 | Mesures : taille d'état (6, 26 et 52 semaines), coût de planification (CPU normal et ralenti), divergences R-A | tests `rc46` |

**Arrêt :** si un programme change ou si un état ancien n'est plus relu à l'identique, arrêt de l'intégration et présentation du problème (même règle que B4).

## 4. Tests prévus

| Id | Test | Attendu |
|---|---|---|
| T1 | États écrits **avant** B4+ (P2F, P3, P5, consolidation), fixtures figées | Relus à l'identique ; 4 chemins de démarrage identiques au code d'avant ; repli explicite |
| T2 | Programmes planifiés, 6 profils × 6 semaines | Identiques à avant B4+ octet pour octet (enregistrements, raisons, dates) |
| T3 | Divergences R-A CT / HYROX à la planification | 0 (aujourd'hui : P2F 1, P3 1) ; champ retiré ⇒ valeurs d'avant |
| T4 | Champ écrit seulement si nécessaire | P2, consolidation, P4, P5 : aucun champ ; P2F, P3 : séances divergentes seulement |
| T5 | Démarrage avec contrôle (inconnu, fatigue, douleur genou P2 / épaule P1 / épaule P2) | Programme planifié intact ; adaptations explicables et reproductibles (même grille que `b4-start-adaptations`) |
| T6 | Déplacement manuel d'une séance CT / HYROX | Projections recalculées ; 0 divergence ensuite |
| T7 | Abandon, reprise après rechargement, « Modifier » le programme | Champ conservé ; poursuite identique ; semaine replanifiée avec champ |
| T8 | `v` inconnu, champ tronqué ou invalide | Repli explicite, aucune erreur, aucune donnée perdue |
| T9 | Compaction de l'historique | Champ retiré et tracé dans le marqueur |
| T10 | Taille | ≤ 1,5 % de l'état à 6 semaines ; < 1 % à 26 et 52 semaines (compaction appliquée) |
| T11 | Coût de planification (régénération de contrôle) | Mesuré avant / après, CPU normal et ralenti ×4 ; seuil d'acceptation à fixer avec vous |
| T12 | Gouvernance | Fichiers listés dans les listes fermées des tests d'architecture ; aucun littéral numérique non annoté |
| T13 | Validation complète | `pnpm check`, build, E2E (4 sports, mobile 360 / 390), E2E BÊTA |

## 5. Décision attendue

- Accord sur R3 (ou R1 si vous préférez la robustesse sans régénération de contrôle, pour +5 à +16 % d'état en Cross-training).
- Seuil acceptable pour le coût de planification (T11).
