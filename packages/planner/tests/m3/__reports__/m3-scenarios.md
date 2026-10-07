# M3 — scénarios d’arbitrage multisport (AVANT / APRÈS)

> Politique M3 TEST_ONLY (draft, provisoire) : règles, fenêtres, actions, importance et borne de passes de DÉMONSTRATION. Profil `KH↑↓AIsG` : lower_knee, lower_hip, upper_push, upper_pull, axial, locomotor_impact, high_intensity_systemic, grip (`·` none, `L` low, `M` moderate, `H` high).

## A — Strength ×3 + Running ×3 (Strength prioritaire)

Conflit `lower_knee` lundi (Strength, haut) / mardi (Running, haut) à 24 h. Running cède (rang). Le seul jour libre (samedi) crée une accumulation sam-dim-ven ; les échanges avec une séance Strength sont refusés (`protectPriority`) : conflit RÉSIDUEL visible, aucune suppression.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | strength | `HMHHH·HH` |  |
| mar | 60 | running | `HH···HH·` |  |
| mer | 60 | strength | `·MHHM·MM` |  |
| jeu | 60 | strength | `MLHHM·MM` |  |
| ven | 60 | running | `HH···HH·` |  |
| sam | 90 | — | `` |  |
| dim | 60 | running | `HH···HH·` |  |

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | strength | `HMHHH·HH` | conflit résiduel ×1 |
| mar | 60 | running | `HH···HH·` | conflit résiduel ×1 |
| mer | 60 | strength | `·MHHM·MM` |  |
| jeu | 60 | strength | `MLHHM·MM` |  |
| ven | 60 | running | `HH···HH·` |  |
| sam | 90 | — | `` |  |
| dim | 60 | running | `HH···HH·` |  |

- statut : **PARTIAL** · passes : 0 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.pair.medium|lower_knee|2026-10-05.strength.1,2026-10-05.running.2`
- résidu `m3.test.pair.medium|lower_knee|2026-10-05.strength.1,2026-10-05.running.2` — cause NO_ACTION_RESOLVES — essayé : MOVE:2026-10-10:NEW_M3_CONFLICT, SWAP:2026-10-05.running.1:NEW_M3_CONFLICT, SWAP:2026-10-05.running.3:NEW_M3_CONFLICT, RECOMPOSE:NO_ENGINE_LEVER

## A′ — même semaine, `protectPriority: false` (décision humaine simulée)

Sans protection, la course du mardi échange son jour avec une séance Strength non clé : conflit résolu.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | strength | `HMHHH·HH` |  |
| mar | 60 | running | `HH···HH·` |  |
| mer | 60 | strength | `·MHHM·MM` |  |
| jeu | 60 | strength | `MLHHM·MM` |  |
| ven | 60 | running | `HH···HH·` |  |
| sam | 90 | — | `` |  |
| dim | 60 | running | `HH···HH·` |  |

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | strength | `HHHHH·HH` |  |
| mar | 60 | strength | `MHHHH·HH` | SWAP |
| mer | 60 | strength | `MLHHM·MM` |  |
| jeu | 60 | running | `HH···HH·` | SWAP |
| ven | 60 | running | `HH···HH·` |  |
| sam | 90 | — | `` |  |
| dim | 60 | running | `HH···HH·` |  |

- statut : **RESOLVED** · passes : 1 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.pair.medium|lower_knee|2026-10-05.strength.1,2026-10-05.running.2`
- décision **SWAP** `2026-10-05.running.2` mar → jeu (échange avec `2026-10-05.strength.2`) — pourquoi : importance:tie ; rank:lower_priority_yields ; rule:m3.test.pair.medium ; structure:lower_knee ; delta:24h

## B — HYROX ×2 (course compromise, clé) + Running ×2

Conflit `lower_knee` / `lower_hip` / `locomotor_impact` lundi–mardi. Importance : HYROX `compromised_running` clé (table TEST_ONLY) ; la course standard cède et va au samedi.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HHHHHHHH` |  |
| mar | 60 | running | `HH···HH·` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | hyrox | `HH·HLHHH` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | running | `HH···HH·` |  |

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HH·MMHHH` |  |
| mar | 60 | — | `` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | hyrox | `HHHH·HHH` |  |
| ven | 60 | — | `` |  |
| sam | 90 | running | `HH···HH·` | MOVE |
| dim | 60 | running | `HH···HH·` |  |

- statut : **RESOLVED** · passes : 1 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.pair.medium|locomotor_impact|2026-10-05.hyrox.1,2026-10-05.running.2`, `m3.test.pair.medium|lower_hip|2026-10-05.hyrox.1,2026-10-05.running.2`, `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.1,2026-10-05.running.2`
- décision **MOVE** `2026-10-05.running.2` mar → sam — pourquoi : importance:standard_yields_to_key ; rule:m3.test.pair.medium ; structure:locomotor_impact ; delta:24h

## C — HYROX ×2 + Strength ×2

Conflit `lower_knee` HYROX lundi / Strength mardi.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HH·MMHHH` |  |
| mar | 60 | strength | `HMHHH·HH` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | hyrox | `HH·HLHHH` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | strength | `MHHHH·HH` |  |

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HH·MMHHH` |  |
| mar | 60 | — | `` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | hyrox | `HHHH·HHH` |  |
| ven | 60 | — | `` |  |
| sam | 90 | strength | `HMHHH·HH` | MOVE |
| dim | 60 | strength | `MHHHH·HH` |  |

- statut : **RESOLVED** · passes : 1 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.1,2026-10-05.strength.2`
- décision **MOVE** `2026-10-05.strength.2` mar → sam — pourquoi : importance:standard_yields_to_key ; rule:m3.test.pair.medium ; structure:lower_knee ; delta:24h

## D — Cross-training ×2 + Running ×2

Aucune paire `high` à moins de 48 h : M3 ne fait rien (et le dit : ADMISSIBLE).

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | crosstraining | `ML·M··ML` |  |
| mar | 60 | running | `HH···HH·` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | crosstraining | `HHHH··HM` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | running | `HH···HH·` |  |

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | crosstraining | `ML·M··ML` |  |
| mar | 60 | running | `HH···HH·` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | crosstraining | `HHHH··HM` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | running | `HH···HH·` |  |

- statut : **ADMISSIBLE** · passes : 0 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0

## E — Cross-training ×2 + HYROX ×2 (CT prioritaire)

Placement V2 déjà espacé : admissible.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | crosstraining | `ML·M··ML` |  |
| mar | 60 | hyrox | `HHHHLHHH` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | crosstraining | `HHHH··HM` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | hyrox | `HH·MMHHH` |  |

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | crosstraining | `ML·M··ML` |  |
| mar | 60 | hyrox | `HHHHLHHH` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | crosstraining | `HHHH··HM` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | hyrox | `HH·MMHHH` |  |

- statut : **ADMISSIBLE** · passes : 0 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0

## E′ — HYROX ×2 + Cross-training ×2 (HYROX prioritaire)

CT (mardi) à 24 h de HYROX (lundi), `lower_knee` / `lower_hip` hauts : CT cède, déplacé au samedi (seul jour qui l’éloigne des deux séances HYROX). Aucun mouvement ni station choisi par M3.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HH·MMHHH` |  |
| mar | 60 | crosstraining | `HHHH··HM` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | hyrox | `HHHHLHHH` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | crosstraining | `ML·M··ML` |  |

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HH·MMHHH` |  |
| mar | 60 | — | `` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | hyrox | `HHHHLHHH` |  |
| ven | 60 | — | `` |  |
| sam | 90 | crosstraining | `HHHH··HM` | MOVE |
| dim | 60 | crosstraining | `ML·M··ML` |  |

- statut : **RESOLVED** · passes : 1 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.pair.medium|lower_hip|2026-10-05.hyrox.1,2026-10-05.crosstraining.2`, `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.1,2026-10-05.crosstraining.2`
- décision **MOVE** `2026-10-05.crosstraining.2` mar → sam — pourquoi : importance:standard_yields_to_key ; rule:m3.test.pair.medium ; structure:lower_hip ; delta:24h

## F — Strength ×2 + Running ×2 + CT ×1 + HYROX ×2 (7 séances, 7 jours)

Aucun jour libre : seul SWAP est possible. Strength lundi cède à HYROX clé (importance avant rang) et échange avec CT ; l'accumulation ven–sam–dim reste NON résolue (égalité Running/Running : aucun choix arbitraire).

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | strength | `HMHHH·HH` |  |
| mar | 60 | hyrox | `HHHHHHHH` |  |
| mer | 60 | strength | `·MHHM·MM` |  |
| jeu | 60 | crosstraining | `MLLM··ML` |  |
| ven | 60 | running | `HH···HH·` |  |
| sam | 90 | hyrox | `HH·HMHHH` |  |
| dim | 60 | running | `HH···HH·` |  |

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | crosstraining | `MLLM··ML` | SWAP |
| mar | 60 | hyrox | `HHHHHHHH` |  |
| mer | 60 | strength | `·MHHM·MM` |  |
| jeu | 60 | strength | `MLHHM·MM` | SWAP |
| ven | 60 | running | `HH···HH·` | conflit résiduel ×6 |
| sam | 90 | hyrox | `HH··MHHL` | conflit résiduel ×9 |
| dim | 60 | running | `HH···HH·` | conflit résiduel ×6 |

- statut : **PARTIAL** · passes : 1 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.accumulation|locomotor_impact|2026-10-05.running.2,2026-10-05.hyrox.2,2026-10-05.running.1`, `m3.test.accumulation|lower_hip|2026-10-05.running.2,2026-10-05.hyrox.2,2026-10-05.running.1`, `m3.test.accumulation|lower_knee|2026-10-05.running.2,2026-10-05.hyrox.2,2026-10-05.running.1`, `m3.test.pair.medium|axial|2026-10-05.strength.1,2026-10-05.hyrox.1`, `m3.test.pair.medium|locomotor_impact|2026-10-05.hyrox.2,2026-10-05.running.1`, `m3.test.pair.medium|locomotor_impact|2026-10-05.running.2,2026-10-05.hyrox.2`, `m3.test.pair.medium|lower_hip|2026-10-05.hyrox.2,2026-10-05.running.1`, `m3.test.pair.medium|lower_hip|2026-10-05.running.2,2026-10-05.hyrox.2`, `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.2,2026-10-05.running.1`, `m3.test.pair.medium|lower_knee|2026-10-05.running.2,2026-10-05.hyrox.2`, `m3.test.pair.medium|lower_knee|2026-10-05.strength.1,2026-10-05.hyrox.1`
- décision **SWAP** `2026-10-05.strength.1` lun → jeu (échange avec `2026-10-05.crosstraining.1`) — pourquoi : importance:standard_yields_to_key ; rule:m3.test.pair.medium ; structure:axial ; delta:24h
- résidu `m3.test.accumulation|locomotor_impact|2026-10-05.running.2,2026-10-05.hyrox.2,2026-10-05.running.1` — cause NO_YIELDER:importance:standard_yields_to_key+rank:tie+UNDECIDED
- résidu `m3.test.accumulation|lower_hip|2026-10-05.running.2,2026-10-05.hyrox.2,2026-10-05.running.1` — cause NO_YIELDER:importance:standard_yields_to_key+rank:tie+UNDECIDED
- résidu `m3.test.accumulation|lower_knee|2026-10-05.running.2,2026-10-05.hyrox.2,2026-10-05.running.1` — cause NO_YIELDER:importance:standard_yields_to_key+rank:tie+UNDECIDED
- résidu `m3.test.pair.medium|locomotor_impact|2026-10-05.hyrox.2,2026-10-05.running.1` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:2026-10-05.crosstraining.1:NEW_M3_CONFLICT, SWAP:2026-10-05.running.2:NEW_M3_CONFLICT, RECOMPOSE:NO_ENGINE_LEVER
- résidu `m3.test.pair.medium|locomotor_impact|2026-10-05.running.2,2026-10-05.hyrox.2` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:2026-10-05.crosstraining.1:NEW_M3_CONFLICT, SWAP:2026-10-05.running.1:NEW_M3_CONFLICT, RECOMPOSE:NO_ENGINE_LEVER
- résidu `m3.test.pair.medium|lower_hip|2026-10-05.hyrox.2,2026-10-05.running.1` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:2026-10-05.crosstraining.1:NEW_M3_CONFLICT, SWAP:2026-10-05.running.2:NEW_M3_CONFLICT, RECOMPOSE:NO_ENGINE_LEVER
- résidu `m3.test.pair.medium|lower_hip|2026-10-05.running.2,2026-10-05.hyrox.2` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:2026-10-05.crosstraining.1:NEW_M3_CONFLICT, SWAP:2026-10-05.running.1:NEW_M3_CONFLICT, RECOMPOSE:NO_ENGINE_LEVER
- résidu `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.2,2026-10-05.running.1` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:2026-10-05.crosstraining.1:NEW_M3_CONFLICT, SWAP:2026-10-05.running.2:NEW_M3_CONFLICT, RECOMPOSE:NO_ENGINE_LEVER
- résidu `m3.test.pair.medium|lower_knee|2026-10-05.running.2,2026-10-05.hyrox.2` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:2026-10-05.crosstraining.1:NEW_M3_CONFLICT, SWAP:2026-10-05.running.1:NEW_M3_CONFLICT, RECOMPOSE:NO_ENGINE_LEVER
- résidu `NEIGHBOUR_REFRESH|2026-10-05.strength.2` — cause REFRESH_NEW_M3_CONFLICT

## G — semaine impossible : HYROX ×2 + Running ×2 + Strength ×2 sur lun–mar–mer

Trois jours pour six séances : trois demandes non planifiées (`slot_unavailable`, déjà V2). Sur les trois jours, conflits `lower_knee` : aucun jour libre, échanges refusés (priorité protégée), recomposition Strength sans effet : RÉSIDUS visibles.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HHHHHHHH` |  |
| mar | 60 | strength | `HMHHH·HH` |  |
| mer | 60 | running | `HH···HH·` |  |
| jeu | 0 | — (indisponible) | `` |  |
| ven | 0 | — (indisponible) | `` |  |
| sam | 0 | — (indisponible) | `` |  |
| dim | 0 | — (indisponible) | `` |  |

Non planifiées : 2026-10-05.hyrox.2 (unplaced / slot_unavailable), 2026-10-05.running.2 (unplaced / slot_unavailable), 2026-10-05.strength.2 (unplaced / slot_unavailable)

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HHHHHHHH` | conflit résiduel ×2 |
| mar | 60 | strength | `HMHHL·HL` | conflit résiduel ×3 |
| mer | 60 | running | `HH···HH·` | conflit résiduel ×2 |
| jeu | 0 | — (indisponible) | `` |  |
| ven | 0 | — (indisponible) | `` |  |
| sam | 0 | — (indisponible) | `` |  |
| dim | 0 | — (indisponible) | `` |  |

Non planifiées : 2026-10-05.hyrox.2 (unplaced / slot_unavailable), 2026-10-05.running.2 (unplaced / slot_unavailable), 2026-10-05.strength.2 (unplaced / slot_unavailable)

- statut : **PARTIAL** · passes : 0 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.accumulation|lower_knee|2026-10-05.hyrox.1,2026-10-05.strength.1,2026-10-05.running.1`, `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.1,2026-10-05.strength.1`, `m3.test.pair.medium|lower_knee|2026-10-05.strength.1,2026-10-05.running.1`
- résidu `m3.test.accumulation|lower_knee|2026-10-05.hyrox.1,2026-10-05.strength.1,2026-10-05.running.1` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:NO_PARTNER, RECOMPOSE:NO_EFFECT
- résidu `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.1,2026-10-05.strength.1` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:PRIORITY_PROTECTED, RECOMPOSE:NO_EFFECT
- résidu `m3.test.pair.medium|lower_knee|2026-10-05.strength.1,2026-10-05.running.1` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:PRIORITY_PROTECTED, RECOMPOSE:NO_EFFECT

## Paire — Running qualité (KEY, composée) + Strength

Running compose KEY / EASY ; la séance KEY est clé (table TEST_ONLY). Strength (standard) à côté d'une KEY cède.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | running (KEY) | `HH···HH·` |  |
| mar | 60 | strength | `HMHHH·HH` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | running (EASY) | `HH···HH·` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | strength | `MHHHH·HH` |  |

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | running (KEY) | `HH···HH·` |  |
| mar | 60 | — | `` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | running (EASY) | `HH···HH·` |  |
| ven | 60 | — | `` |  |
| sam | 90 | strength | `HHHHH·HH` | MOVE |
| dim | 60 | strength | `MHHHH·HH` |  |

- statut : **RESOLVED** · passes : 1 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.pair.medium|lower_knee|2026-10-05.running.1,2026-10-05.strength.2`
- décision **MOVE** `2026-10-05.strength.2` mar → sam — pourquoi : importance:standard_yields_to_key ; rule:m3.test.pair.medium ; structure:lower_knee ; delta:24h

## Paire — Cross-training + Strength

Deux sports chargés.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | crosstraining | `ML·M··ML` |  |
| mar | 60 | — | `` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | strength | `HHHHH·HH` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | strength | `MHHHH·HH` |  |

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | crosstraining | `ML·M··ML` |  |
| mar | 60 | — | `` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | strength | `HHHHH·HH` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | strength | `MHHHH·HH` |  |

- statut : **ADMISSIBLE** · passes : 0 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0

## Triplet — HYROX + Running + Strength

Objectif course-hybride.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HHHHHHHH` |  |
| mar | 60 | hyrox | `HH·HLHHH` |  |
| mer | 60 | running | `HH···HH·` |  |
| jeu | 60 | strength | `HMHHH·HH` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | running | `HH···HH·` |  |

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HH·MMHHH` |  |
| mar | 60 | hyrox | `HH·HLHHH` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | strength | `HMHHH·HH` |  |
| ven | 60 | — | `` |  |
| sam | 90 | running | `HH···HH·` | MOVE |
| dim | 60 | running | `HH···HH·` |  |

- statut : **RESOLVED** · passes : 1 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.accumulation|locomotor_impact|2026-10-05.hyrox.1,2026-10-05.hyrox.2,2026-10-05.running.2`, `m3.test.accumulation|lower_hip|2026-10-05.hyrox.1,2026-10-05.hyrox.2,2026-10-05.running.2`, `m3.test.accumulation|lower_knee|2026-10-05.hyrox.1,2026-10-05.hyrox.2,2026-10-05.running.2`, `m3.test.accumulation|lower_knee|2026-10-05.hyrox.2,2026-10-05.running.2,2026-10-05.strength.1`, `m3.test.pair.medium|locomotor_impact|2026-10-05.hyrox.2,2026-10-05.running.2`, `m3.test.pair.medium|lower_hip|2026-10-05.hyrox.2,2026-10-05.running.2`, `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.2,2026-10-05.running.2`, `m3.test.pair.medium|lower_knee|2026-10-05.running.2,2026-10-05.strength.1`
- décision **MOVE** `2026-10-05.running.2` mer → sam — pourquoi : importance:standard_yields_to_key ; rule:m3.test.accumulation ; structure:locomotor_impact ; delta:24h

## Triplet — Strength + Running + CT

Force d'abord.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | strength | `HHHHH·HH` |  |
| mar | 60 | strength | `·MHHM·MM` |  |
| mer | 60 | running | `HH···HH·` |  |
| jeu | 60 | crosstraining | `MLLM··ML` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | running | `HH···HH·` |  |

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | strength | `HHHHH·HH` |  |
| mar | 60 | strength | `·MHHM·MM` |  |
| mer | 60 | running | `HH···HH·` |  |
| jeu | 60 | crosstraining | `MLLM··ML` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | running | `HH···HH·` |  |

- statut : **ADMISSIBLE** · passes : 0 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0

## Triplet — CT + HYROX + Running

Deux sports à stations + course.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | crosstraining | `MLLM··ML` |  |
| mar | 60 | hyrox | `HHHH·HHH` |  |
| mer | 60 | running | `HH···HH·` |  |
| jeu | 60 | running | `HH···HH·` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | hyrox | `HH·HHHHH` |  |

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | crosstraining | `MLLM··ML` |  |
| mar | 60 | hyrox | `HHHH·HHH` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | running | `HH···HH·` |  |
| ven | 60 | running | `HH···HH·` | MOVE |
| sam | 90 | — | `` |  |
| dim | 60 | hyrox | `HH·HHHHH` |  |

- statut : **RESOLVED** · passes : 1 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.accumulation|locomotor_impact|2026-10-05.hyrox.2,2026-10-05.running.2,2026-10-05.running.1`, `m3.test.accumulation|lower_hip|2026-10-05.hyrox.2,2026-10-05.running.2,2026-10-05.running.1`, `m3.test.accumulation|lower_knee|2026-10-05.hyrox.2,2026-10-05.running.2,2026-10-05.running.1`, `m3.test.pair.medium|locomotor_impact|2026-10-05.hyrox.2,2026-10-05.running.2`, `m3.test.pair.medium|lower_hip|2026-10-05.hyrox.2,2026-10-05.running.2`, `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.2,2026-10-05.running.2`
- décision **MOVE** `2026-10-05.running.2` mer → ven — pourquoi : importance:standard_yields_to_key ; rule:m3.test.pair.medium ; structure:locomotor_impact ; delta:24h

## Objectif réel — très ouverte (7 × 90 min)

Priorités déclarées : HYROX, Running (composé), Strength, CT.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 90 | hyrox | `HHHHHHHH` |  |
| mar | 90 | crosstraining | `MLLM··ML` |  |
| mer | 90 | hyrox | `HH·HMHHH` |  |
| jeu | 90 | strength | `HMHHH·HH` |  |
| ven | 90 | running (KEY) | `HH···HH·` |  |
| sam | 90 | strength | `·MHHM·MM` |  |
| dim | 90 | running (EASY) | `HH···HH·` |  |

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 90 | hyrox | `HH·HHHHH` |  |
| mar | 90 | crosstraining | `MLLM··ML` |  |
| mer | 90 | hyrox | `HHHH·HHH` | conflit résiduel ×2 |
| jeu | 90 | strength | `HMHHH·HM` | conflit résiduel ×3 |
| ven | 90 | running (KEY) | `HH···HH·` | conflit résiduel ×2 |
| sam | 90 | strength | `·MHHM·MM` |  |
| dim | 90 | running (EASY) | `HH···HH·` |  |

- statut : **PARTIAL** · passes : 0 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.accumulation|lower_knee|2026-10-05.hyrox.2,2026-10-05.strength.1,2026-10-05.running.2`, `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.2,2026-10-05.strength.1`, `m3.test.pair.medium|lower_knee|2026-10-05.strength.1,2026-10-05.running.2`
- résidu `m3.test.accumulation|lower_knee|2026-10-05.hyrox.2,2026-10-05.strength.1,2026-10-05.running.2` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:2026-10-05.crosstraining.1:NEW_M3_CONFLICT, SWAP:2026-10-05.strength.2:NEW_M3_CONFLICT, RECOMPOSE:NO_EFFECT
- résidu `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.2,2026-10-05.strength.1` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:2026-10-05.strength.2:NEW_M3_CONFLICT, SWAP:2026-10-05.crosstraining.1:NEW_M3_CONFLICT, RECOMPOSE:NO_EFFECT
- résidu `m3.test.pair.medium|lower_knee|2026-10-05.strength.1,2026-10-05.running.2` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:2026-10-05.crosstraining.1:NEW_M3_CONFLICT, SWAP:2026-10-05.strength.2:NEW_M3_CONFLICT, RECOMPOSE:NO_EFFECT

## Objectif réel — 5 jours

Priorités déclarées : HYROX, Running (composé), Strength, CT.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HHHHHHHH` |  |
| mar | 60 | hyrox | `HH·HLHHH` |  |
| mer | 60 | strength | `HMHHH·HH` |  |
| jeu | 0 | — (indisponible) | `` |  |
| ven | 60 | crosstraining | `MLLM··ML` |  |
| sam | 0 | — (indisponible) | `` |  |
| dim | 90 | running (EASY) | `HH···HH·` |  |

Non planifiées : 2026-10-05.running.2 (unplaced / slot_unavailable), 2026-10-05.strength.2 (unplaced / slot_unavailable)

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HH·MMHHH` |  |
| mar | 60 | hyrox | `HHHH·HHH` |  |
| mer | 60 | crosstraining | `MLLM··ML` | SWAP |
| jeu | 0 | — (indisponible) | `` |  |
| ven | 60 | strength | `HHHHH·HH` | SWAP |
| sam | 0 | — (indisponible) | `` |  |
| dim | 90 | running (EASY) | `HH···HH·` |  |

Non planifiées : 2026-10-05.running.2 (unplaced / slot_unavailable), 2026-10-05.strength.2 (unplaced / slot_unavailable)

- statut : **RESOLVED** · passes : 1 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.accumulation|lower_knee|2026-10-05.hyrox.1,2026-10-05.hyrox.2,2026-10-05.strength.1`, `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.2,2026-10-05.strength.1`
- décision **SWAP** `2026-10-05.strength.1` mer → ven (échange avec `2026-10-05.crosstraining.1`) — pourquoi : importance:standard_yields_to_key ; rule:m3.test.accumulation ; structure:lower_knee ; delta:24h

## Objectif réel — 4 jours

Priorités déclarées : HYROX, Running (composé), Strength, CT.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HHHHHHHH` |  |
| mar | 0 | — (indisponible) | `` |  |
| mer | 60 | strength | `HHHHH·HH` |  |
| jeu | 0 | — (indisponible) | `` |  |
| ven | 60 | crosstraining | `MLLM··ML` |  |
| sam | 0 | — (indisponible) | `` |  |
| dim | 90 | running (EASY) | `HH···HH·` |  |

Non planifiées : 2026-10-05.hyrox.2 (unplaced / slot_unavailable), 2026-10-05.running.2 (unplaced / slot_unavailable), 2026-10-05.strength.2 (unplaced / slot_unavailable)

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HH·MMHHH` |  |
| mar | 0 | — (indisponible) | `` |  |
| mer | 60 | strength | `HMHHH·HH` |  |
| jeu | 0 | — (indisponible) | `` |  |
| ven | 60 | crosstraining | `MLLM··ML` |  |
| sam | 0 | — (indisponible) | `` |  |
| dim | 90 | running (EASY) | `HH···HH·` |  |

Non planifiées : 2026-10-05.hyrox.2 (unplaced / slot_unavailable), 2026-10-05.running.2 (unplaced / slot_unavailable), 2026-10-05.strength.2 (unplaced / slot_unavailable)

- statut : **ADMISSIBLE** · passes : 0 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0

## Objectif réel — jours fixes (lun / mer / ven / dim)

Priorités déclarées : HYROX, Running (composé), Strength, CT.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HHHHHHHH` |  |
| mar | 0 | — (indisponible) | `` |  |
| mer | 60 | strength | `HHHHH·HH` |  |
| jeu | 0 | — (indisponible) | `` |  |
| ven | 60 | crosstraining | `MLLM··ML` |  |
| sam | 0 | — (indisponible) | `` |  |
| dim | 60 | running (EASY) | `HH···HH·` |  |

Non planifiées : 2026-10-05.hyrox.2 (unplaced / slot_unavailable), 2026-10-05.running.2 (unplaced / slot_unavailable), 2026-10-05.strength.2 (unplaced / slot_unavailable)

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HH·MMHHH` |  |
| mar | 0 | — (indisponible) | `` |  |
| mer | 60 | strength | `HMHHH·HH` |  |
| jeu | 0 | — (indisponible) | `` |  |
| ven | 60 | crosstraining | `MLLM··ML` |  |
| sam | 0 | — (indisponible) | `` |  |
| dim | 60 | running (EASY) | `HH···HH·` |  |

Non planifiées : 2026-10-05.hyrox.2 (unplaced / slot_unavailable), 2026-10-05.running.2 (unplaced / slot_unavailable), 2026-10-05.strength.2 (unplaced / slot_unavailable)

- statut : **ADMISSIBLE** · passes : 0 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0

## Objectif réel — créneaux courts (30 min)

Priorités déclarées : HYROX, Running (composé), Strength, CT.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 30 | hyrox | `HH·LLHHM` |  |
| mar | 30 | — | `` |  |
| mer | 30 | — | `` |  |
| jeu | 30 | hyrox | `HH·HLHHM` |  |
| ven | 30 | — | `` |  |
| sam | 30 | — | `` |  |
| dim | 30 | crosstraining | `MLLM··ML` |  |

Non planifiées : 2026-10-05.running.1 (refused / slot_unavailable), 2026-10-05.strength.1 (refused / engine_refused), 2026-10-05.running.2 (refused / slot_unavailable), 2026-10-05.strength.2 (refused / engine_refused)

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 30 | hyrox | `HH·LLHHM` |  |
| mar | 30 | — | `` |  |
| mer | 30 | — | `` |  |
| jeu | 30 | hyrox | `HH·HLHHM` |  |
| ven | 30 | — | `` |  |
| sam | 30 | — | `` |  |
| dim | 30 | crosstraining | `MLLM··ML` |  |

Non planifiées : 2026-10-05.running.1 (refused / slot_unavailable), 2026-10-05.strength.1 (refused / engine_refused), 2026-10-05.running.2 (refused / slot_unavailable), 2026-10-05.strength.2 (refused / engine_refused)

- statut : **ADMISSIBLE** · passes : 0 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0

## Objectif réel — aucune solution parfaite (3 jours consécutifs)

Priorités déclarées : HYROX, Running (composé), Strength, CT.

### AVANT (V2, aucune politique M3)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 0 | — (indisponible) | `` |  |
| mar | 0 | — (indisponible) | `` |  |
| mer | 0 | — (indisponible) | `` |  |
| jeu | 0 | — (indisponible) | `` |  |
| ven | 60 | hyrox | `HHHHHHHH` |  |
| sam | 60 | strength | `HMHHH·HH` |  |
| dim | 60 | running (EASY) | `HH···HH·` |  |

Non planifiées : 2026-10-05.crosstraining.1 (unplaced / slot_unavailable), 2026-10-05.hyrox.2 (unplaced / slot_unavailable), 2026-10-05.running.2 (unplaced / slot_unavailable), 2026-10-05.strength.2 (unplaced / slot_unavailable)

- statut : **POLICY_UNAVAILABLE** · passes : 0 · politique : indisponible

### APRÈS (politique M3 TEST_ONLY)

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 0 | — (indisponible) | `` |  |
| mar | 0 | — (indisponible) | `` |  |
| mer | 0 | — (indisponible) | `` |  |
| jeu | 0 | — (indisponible) | `` |  |
| ven | 60 | hyrox | `HHHHHHHH` | conflit résiduel ×2 |
| sam | 60 | strength | `HMHHL·HL` | conflit résiduel ×3 |
| dim | 60 | running (EASY) | `HH···HH·` | conflit résiduel ×2 |

Non planifiées : 2026-10-05.crosstraining.1 (unplaced / slot_unavailable), 2026-10-05.hyrox.2 (unplaced / slot_unavailable), 2026-10-05.running.2 (unplaced / slot_unavailable), 2026-10-05.strength.2 (unplaced / slot_unavailable)

- statut : **PARTIAL** · passes : 0 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.accumulation|lower_knee|2026-10-05.hyrox.1,2026-10-05.strength.1,2026-10-05.running.1`, `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.1,2026-10-05.strength.1`, `m3.test.pair.medium|lower_knee|2026-10-05.strength.1,2026-10-05.running.1`
- résidu `m3.test.accumulation|lower_knee|2026-10-05.hyrox.1,2026-10-05.strength.1,2026-10-05.running.1` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:NO_PARTNER, RECOMPOSE:NO_EFFECT
- résidu `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.1,2026-10-05.strength.1` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:PRIORITY_PROTECTED, RECOMPOSE:NO_EFFECT
- résidu `m3.test.pair.medium|lower_knee|2026-10-05.strength.1,2026-10-05.running.1` — cause NO_ACTION_RESOLVES — essayé : MOVE:NO_FREE_DAY, SWAP:PRIORITY_PROTECTED, RECOMPOSE:NO_EFFECT

## Objectif réel — synthèse des disponibilités

| disponibilité | planifiées | conflits initiaux | décisions | résidus | statut |
|---|---|---|---|---|---|
| très ouverte (7 × 90 min) | 7 / 7 | 3 | — | 3 | PARTIAL |
| 5 jours | 5 / 7 | 2 | SWAP | 0 | RESOLVED |
| 4 jours | 4 / 7 | 0 | — | 0 | ADMISSIBLE |
| jours fixes (lun / mer / ven / dim) | 4 / 7 | 0 | — | 0 | ADMISSIBLE |
| créneaux courts (30 min) | 3 / 7 | 0 | — | 0 | ADMISSIBLE |
| aucune solution parfaite (3 jours consécutifs) | 3 / 7 | 3 | — | 3 | PARTIAL |

### Fenêtre near (24 h) — HYROX ×2 + Running ×2

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HHHHHHHH` |  |
| mar | 60 | running | `HH···HH·` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | hyrox | `HH·HLHHH` |  |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | running | `HH···HH·` |  |

- statut : **ADMISSIBLE** · passes : 0 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0

### Fenêtre medium (48 h) — HYROX ×2 + Running ×2

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HH·MMHHH` |  |
| mar | 60 | — | `` |  |
| mer | 60 | — | `` |  |
| jeu | 60 | hyrox | `HHHH·HHH` |  |
| ven | 60 | — | `` |  |
| sam | 90 | running | `HH···HH·` | MOVE |
| dim | 60 | running | `HH···HH·` |  |

- statut : **RESOLVED** · passes : 1 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.pair.medium|locomotor_impact|2026-10-05.hyrox.1,2026-10-05.running.2`, `m3.test.pair.medium|lower_hip|2026-10-05.hyrox.1,2026-10-05.running.2`, `m3.test.pair.medium|lower_knee|2026-10-05.hyrox.1,2026-10-05.running.2`
- décision **MOVE** `2026-10-05.running.2` mar → sam — pourquoi : importance:standard_yields_to_key ; rule:m3.test.pair.medium ; structure:locomotor_impact ; delta:24h

### Fenêtre far (72 h) — HYROX ×2 + Running ×2

| jour | min | séance | profil KH↑↓AIsG | M3 |
|---|---|---|---|---|
| lun | 60 | hyrox | `HHHHHHHH` | conflit résiduel ×3 |
| mar | 60 | running | `HH···HH·` | conflit résiduel ×6 |
| mer | 60 | — | `` |  |
| jeu | 60 | hyrox | `HH·HLHHH` | conflit résiduel ×3 |
| ven | 60 | — | `` |  |
| sam | 90 | — | `` |  |
| dim | 60 | running | `HH···HH·` |  |

- statut : **PARTIAL** · passes : 0 · politique : 0.1.0/0.1.0/0.1.0/0.1.0/0.1.0/0.1.0
- conflits initiaux : `m3.test.pair.far|locomotor_impact|2026-10-05.hyrox.1,2026-10-05.running.2`, `m3.test.pair.far|lower_hip|2026-10-05.hyrox.1,2026-10-05.running.2`, `m3.test.pair.far|lower_knee|2026-10-05.hyrox.1,2026-10-05.running.2`, `m3.test.pair.far|locomotor_impact|2026-10-05.running.2,2026-10-05.hyrox.2`, `m3.test.pair.far|lower_hip|2026-10-05.running.2,2026-10-05.hyrox.2`, `m3.test.pair.far|lower_knee|2026-10-05.running.2,2026-10-05.hyrox.2`
- résidu `m3.test.pair.far|locomotor_impact|2026-10-05.hyrox.1,2026-10-05.running.2` — cause NO_ACTION_RESOLVES — essayé : MOVE:2026-10-10:NEW_M3_CONFLICT, MOVE:2026-10-09:NEW_M3_CONFLICT, MOVE:2026-10-07:NEW_M3_CONFLICT, SWAP:2026-10-05.running.1:NEW_M3_CONFLICT, RECOMPOSE:NO_ENGINE_LEVER
- résidu `m3.test.pair.far|lower_hip|2026-10-05.hyrox.1,2026-10-05.running.2` — cause NO_ACTION_RESOLVES — essayé : MOVE:2026-10-10:NEW_M3_CONFLICT, MOVE:2026-10-09:NEW_M3_CONFLICT, MOVE:2026-10-07:NEW_M3_CONFLICT, SWAP:2026-10-05.running.1:NEW_M3_CONFLICT, RECOMPOSE:NO_ENGINE_LEVER
- résidu `m3.test.pair.far|lower_knee|2026-10-05.hyrox.1,2026-10-05.running.2` — cause NO_ACTION_RESOLVES — essayé : MOVE:2026-10-10:NEW_M3_CONFLICT, MOVE:2026-10-09:NEW_M3_CONFLICT, MOVE:2026-10-07:NEW_M3_CONFLICT, SWAP:2026-10-05.running.1:NEW_M3_CONFLICT, RECOMPOSE:NO_ENGINE_LEVER
- résidu `m3.test.pair.far|locomotor_impact|2026-10-05.running.2,2026-10-05.hyrox.2` — cause NO_ACTION_RESOLVES — essayé : MOVE:2026-10-10:NEW_M3_CONFLICT, MOVE:2026-10-07:NEW_M3_CONFLICT, MOVE:2026-10-09:NEW_M3_CONFLICT, SWAP:2026-10-05.running.1:NEW_M3_CONFLICT, RECOMPOSE:NO_ENGINE_LEVER
- résidu `m3.test.pair.far|lower_hip|2026-10-05.running.2,2026-10-05.hyrox.2` — cause NO_ACTION_RESOLVES — essayé : MOVE:2026-10-10:NEW_M3_CONFLICT, MOVE:2026-10-07:NEW_M3_CONFLICT, MOVE:2026-10-09:NEW_M3_CONFLICT, SWAP:2026-10-05.running.1:NEW_M3_CONFLICT, RECOMPOSE:NO_ENGINE_LEVER
- résidu `m3.test.pair.far|lower_knee|2026-10-05.running.2,2026-10-05.hyrox.2` — cause NO_ACTION_RESOLVES — essayé : MOVE:2026-10-10:NEW_M3_CONFLICT, MOVE:2026-10-07:NEW_M3_CONFLICT, MOVE:2026-10-09:NEW_M3_CONFLICT, SWAP:2026-10-05.running.1:NEW_M3_CONFLICT, RECOMPOSE:NO_ENGINE_LEVER

## Fenêtres TEST_ONLY — synthèse

Valeurs de DÉMONSTRATION (proche / moyenne / lointaine), jamais une recommandation.

| fenêtre | heures | conflits initiaux | décisions | résidus | statut |
|---|---|---|---|---|---|
| near | 24 | 0 | — | 0 | ADMISSIBLE |
| medium | 48 | 3 | MOVE running.2 | 0 | RESOLVED |
| far | 72 | 6 | — | 6 | PARTIAL |
