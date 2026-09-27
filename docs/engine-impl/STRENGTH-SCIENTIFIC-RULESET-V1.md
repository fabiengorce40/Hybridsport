# STRENGTH-SCIENTIFIC-RULESET-V1 — ruleset scientifique V1 (candidat)

> Document **généré** depuis le registre scientifique et le ruleset candidat : ne pas éditer à la main.

- Ruleset candidat : **0.3.0-strength-science-candidate** (étend `0.2.0-strength-test` sans en modifier aucune valeur) · registre **1.0.0**
- 37 paramètres : EXPERT_DESIGN_REVIEW 11 · PRODUCT_GUARDRAIL 2 · PROGRAMMING_HEURISTIC 17 · SAFETY_SIGNOFF_REQUIRED 4 · TECHNICAL 3
- Changements : new_policy 8 · reclassified 12 · unchanged 17 (`unchanged` = valeur et statut conservés ; `reclassified` = valeur conservée, statut précisé ; `new_policy` = paramètre facultatif introduit, absent en 0.2.0)
- **Aucune valeur existante n’est modifiée.** Les 7 écarts validés en phase 4C sont conservés. Toutes les valeurs restent **provisoires** : aucune validation formelle.
- Absence d’un paramètre facultatif = **sémantique du ruleset 0.2.0** (comportement historique reproduit à l’identique, testé), jamais une valeur par défaut sportive.

| Paramètre | Gouvernance | Statut | Changement | Sources |
|---|---|---|---|---|
| `strength.needs` | G2 | EXPERT_DESIGN_REVIEW | unchanged | 0 |
| `strength.archetypes` | G2 | EXPERT_DESIGN_REVIEW | unchanged | 1 |
| `strength.goals` | G2 | EXPERT_DESIGN_REVIEW | unchanged | 0 |
| `strength.stimuli` | G2 | PROGRAMMING_HEURISTIC | unchanged | 0 |
| `strength.session.mobility` | G2 | PROGRAMMING_HEURISTIC | reclassified | 1 |
| `strength.exerciseClass` | G2 | EXPERT_DESIGN_REVIEW | unchanged | 0 |
| `strength.selection.criteriaOrder` | G2 | EXPERT_DESIGN_REVIEW | unchanged | 0 |
| `strength.selection.recencyBandsDays` | G3 | PROGRAMMING_HEURISTIC | unchanged | 1 |
| `strength.selection.axialHighMaxPerSession` | G2 | PRODUCT_GUARDRAIL | reclassified | 0 |
| `strength.selection.minLoadCeiling` | G2 | EXPERT_DESIGN_REVIEW | unchanged | 1 |
| `strength.selection.primaryLoadRequired` | G2 | EXPERT_DESIGN_REVIEW | unchanged | 1 |
| `strength.selection.skillCeiling` | G1 | SAFETY_SIGNOFF_REQUIRED | unchanged | 0 |
| `strength.novice.technicalUnderFatigue` | G1 | SAFETY_SIGNOFF_REQUIRED | unchanged | 0 |
| `strength.dose.base` | G2 | PROGRAMMING_HEURISTIC | reclassified | 5 |
| `strength.dose.modifiers` | G2 | PROGRAMMING_HEURISTIC | reclassified | 0 |
| `strength.dose.nonRep` | G2 | PROGRAMMING_HEURISTIC | unchanged | 0 |
| `strength.load` | G2 | PROGRAMMING_HEURISTIC | reclassified | 2 |
| `strength.load.defaultIncrements` | G4 | TECHNICAL | unchanged | 0 |
| `strength.calibration` | G2 | PROGRAMMING_HEURISTIC | reclassified | 0 |
| `strength.rampup` | G2 | PROGRAMMING_HEURISTIC | reclassified | 1 |
| `strength.progression` | G2 | PROGRAMMING_HEURISTIC | reclassified | 3 |
| `strength.tracks` | G2 | PROGRAMMING_HEURISTIC | reclassified | 1 |
| `strength.volume` | G2 | PROGRAMMING_HEURISTIC | reclassified | 1 |
| `strength.volume.sessionCap` | G1 | SAFETY_SIGNOFF_REQUIRED (+ PRODUCT_GUARDRAIL) | reclassified | 0 |
| `strength.interference` | G2 | PROGRAMMING_HEURISTIC | reclassified | 1 |
| `strength.substitution.fallbackNeeds` | G2 | EXPERT_DESIGN_REVIEW | unchanged | 0 |
| `strength.topSet` | G2 | PROGRAMMING_HEURISTIC | unchanged | 0 |
| `strength.maxEffort.threshold` | G1 | SAFETY_SIGNOFF_REQUIRED | unchanged | 0 |
| `strength.proposals.max` | G4 | TECHNICAL | unchanged | 0 |
| `strength.science.registryVersion` | G4 | TECHNICAL | new_policy | 0 |
| `strength.prescriptionConfidence` | G2 | PROGRAMMING_HEURISTIC | new_policy | 2 |
| `strength.load.specificObservation` | G2 | EXPERT_DESIGN_REVIEW | new_policy | 1 |
| `strength.interference.assessment` | G2 | PROGRAMMING_HEURISTIC | new_policy | 2 |
| `strength.rampup.estimatedPolicy` | G2 | PROGRAMMING_HEURISTIC | new_policy | 1 |
| `strength.selection.repetitionPolicy` | G2 | EXPERT_DESIGN_REVIEW | new_policy | 1 |
| `strength.tracks.horizon` | G2 | EXPERT_DESIGN_REVIEW | new_policy | 1 |
| `strength.session.durationPriority` | G2 | PRODUCT_GUARDRAIL | new_policy | 1 |

## `strength.needs`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | table (688 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Nouvelle valeur / plage (V1) | table (688 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Lecture | Table besoin → exigence de mouvement, inchangée. |
| Statut | `EXPERT_DESIGN_REVIEW` — choix de conception soumis à revue d’expert |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | aucune (type le plus fort : expert_design) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Découpage des besoins à relire par un expert. |
| Justification | Taxonomie de conception (patterns, régions) ; aucune question empirique directe. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | — |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.archetypes`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | table (11235 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Nouvelle valeur / plage (V1) | table (11235 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Lecture | Archétypes et emplacements inchangés. |
| Statut | `EXPERT_DESIGN_REVIEW` — choix de conception soumis à revue d’expert |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.PELLAND_2026` (type le plus fort : meta_analysis) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Choix de conception ; la fréquence optimale dépend de l’objectif. |
| Justification | Structure de séance (emplacements, groupes de choix) ; la fréquence est un outil de répartition du planificateur (P6). |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.FREQ` CONTEXT_DEPENDENT (principe) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.goals`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | table (1026 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Nouvelle valeur / plage (V1) | table (1026 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Lecture | Priorités de besoins par objectif, inchangées. |
| Statut | `EXPERT_DESIGN_REVIEW` — choix de conception soumis à revue d’expert |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | aucune (type le plus fort : expert_design) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | À relire par un expert par objectif. |
| Justification | Ordre de priorité de conception. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | — |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.stimuli`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | table (999 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Nouvelle valeur / plage (V1) | table (999 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Lecture | Ordres des optionnels et répartitions énergétiques inchangés. |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | aucune (type le plus fort : expert_design) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Aucune source. |
| Justification | Heuristiques de programmation. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | — |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.session.mobility`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `{"warmupS":{"min":180,"max":300},"cooldownS":{"min":0,"max":180}}` |
| Nouvelle valeur / plage (V1) | `{"warmupS":{"min":180,"max":300},"cooldownS":{"min":0,"max":180}}` |
| Lecture | warmupS 180–300 s et cooldownS 0–180 s inchangés ; en V1 le minimum d’échauffement seul est garanti (politique `strength.session.durationPriority`). |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.WARMUP_FORCE_MA` (type le plus fort : meta_analysis) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Aucune durée démontrée ; effets d’échauffement surtout sur la puissance et le taux de développement de la force. |
| Justification | L’échauffement général est contextuel et distinct de la montée spécifique (P12) ; le retour au calme est facultatif (P13). |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.WU_RFD` CONTEXT_DEPENDENT (principe) ; `C.WU_DUR` PROGRAMMING_HEURISTIC (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.exerciseClass`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `{"highLoadCeilingMin":2,"cappedLoadCeilingMax":0}` |
| Nouvelle valeur / plage (V1) | `{"highLoadCeilingMin":2,"cappedLoadCeilingMax":0}` |
| Lecture | Seuils de classe sur l’échelle ordinale du catalogue, inchangés. |
| Statut | `EXPERT_DESIGN_REVIEW` — choix de conception soumis à revue d’expert |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | aucune (type le plus fort : expert_design) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Dépend des métadonnées du catalogue. |
| Justification | Classification de conception. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | — |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.selection.criteriaOrder`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | table (385 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Nouvelle valeur / plage (V1) | table (385 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Lecture | Ordres lexicographiques inchangés. |
| Statut | `EXPERT_DESIGN_REVIEW` — choix de conception soumis à revue d’expert |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | aucune (type le plus fort : expert_design) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Préférence de fait pour la modalité la plus stable. |
| Justification | La phase 4C a montré que le premier critère différenciant est décisif (stabilité des accessoires) : décision d’expert. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | — |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.selection.recencyBandsDays`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `[2,5]` |
| Nouvelle valeur / plage (V1) | `[2,5]` |
| Lecture | [2, 5] jours inchangés. |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G3 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.KASSIANO_2022` (type le plus fort : systematic_review) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Aucune source pour les bandes. |
| Justification | Départage par récence, sans rotation imposée. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.VAR` CONTEXT_DEPENDENT (principe) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.selection.axialHighMaxPerSession`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `1` |
| Nouvelle valeur / plage (V1) | `1` |
| Lecture | 1 inchangé, reclassé garde-fou produit (P11). |
| Statut | `PRODUCT_GUARDRAIL` — garde-fou produit |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | aucune (type le plus fort : product_policy) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Aucune preuve d’une limite physiologique à un exercice. |
| Justification | Limite prudente de conception ; dose axiale cumulée à préparer. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.AXIAL` INSUFFICIENT_EVIDENCE (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.selection.minLoadCeiling`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `{"novice":0,"beginner":0,"intermediate":1,"advanced":1}` |
| Nouvelle valeur / plage (V1) | `{"novice":0,"beginner":0,"intermediate":1,"advanced":1}` |
| Lecture | Plafonds minimaux par niveau inchangés. |
| Statut | `EXPERT_DESIGN_REVIEW` — choix de conception soumis à revue d’expert |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.LOPEZ_2021` (type le plus fort : network_meta_analysis) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Échelle ordinale du catalogue. |
| Justification | Faisabilité de la dose selon le niveau. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.HEAVY` SUPPORTED (principe) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.selection.primaryLoadRequired`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `["strength_heavy"]` |
| Nouvelle valeur / plage (V1) | `["strength_heavy"]` |
| Lecture | [strength_heavy] inchangé. |
| Statut | `EXPERT_DESIGN_REVIEW` — choix de conception soumis à revue d’expert |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.LOPEZ_2021` (type le plus fort : network_meta_analysis) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Mécanisme soutenu, valeur de conception. |
| Justification | Le mécanisme (charge et force) est soutenu ; la liste des stimuli concernés est un choix de conception. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.HEAVY` SUPPORTED (principe) ; `C.HEAVY_LIST` EXPERT_DESIGN_REVIEW (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.selection.skillCeiling`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `{"novice":2,"beginner":3,"intermediate":4,"advanced":5}` |
| Nouvelle valeur / plage (V1) | `{"novice":2,"beginner":3,"intermediate":4,"advanced":5}` |
| Lecture | Plafonds par niveau inchangés (G1). |
| Statut | `SAFETY_SIGNOFF_REQUIRED` — visa de sécurité requis (G1) |
| Gouvernance | G1 · visa expert requis · visa sécurité requis · provisoire oui |
| Sources | aucune (type le plus fort : expert_design) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Aucune source ; visa requis. |
| Justification | Sécurité technique par niveau. |
| Si la preuve reste insuffisante | Paramètre G1 : bloqué sans visa de sécurité ; aucune promotion possible, la valeur provisoire reste la référence prudente du cliquet G1. |
| Revendications | `C.SKILL` SAFETY_SIGNOFF_REQUIRED (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.novice.technicalUnderFatigue`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `{"levels":["novice","beginner"],"minTechnical":2,"maxPerSession":1,"allowedRoles":["primary"]}` |
| Nouvelle valeur / plage (V1) | `{"levels":["novice","beginner"],"minTechnical":2,"maxPerSession":1,"allowedRoles":["primary"]}` |
| Lecture | Règle novice inchangée (G1). |
| Statut | `SAFETY_SIGNOFF_REQUIRED` — visa de sécurité requis (G1) |
| Gouvernance | G1 · visa expert requis · visa sécurité requis · provisoire oui |
| Sources | aucune (type le plus fort : expert_design) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Aucune source ; visa requis. |
| Justification | Sécurité : exercices techniques sous fatigue chez le novice. |
| Si la preuve reste insuffisante | Paramètre G1 : bloqué sans visa de sécurité ; aucune promotion possible, la valeur provisoire reste la référence prudente du cliquet G1. |
| Revendications | `C.NOV_TECH` SAFETY_SIGNOFF_REQUIRED (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.dose.base`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | table (5351 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Nouvelle valeur / plage (V1) | table (5351 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Lecture | Table stimulus × rôle × classe inchangée ; les principes sont soutenus, les nombres exacts sont des heuristiques. |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.GRGIC_2018`, `SRC.LOPEZ_2021`, `SRC.REFALO_2023`, `SRC.ROBINSON_2024`, `SRC.SINGER_2024` (type le plus fort : network_meta_analysis) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Force (1RM), hypertrophie |
| Confiance | very_low |
| Incertitude | Aucune cellule n’est une valeur démontrée ; RIR estimé à environ une répétition près. |
| Justification | Principes P1, P2, P4 et P5 : répétitions basses pour la force, large plage pour l’hypertrophie, jamais l’échec par défaut, repos long pour le lourd. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.HEAVY` SUPPORTED (principe) ; `C.HYP_LOADS` SUPPORTED (principe) ; `C.FAILURE` CONTEXT_DEPENDENT (principe) ; `C.REST` CONTEXT_DEPENDENT (principe) ; `C.CELLS` PROGRAMMING_HEURISTIC (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.dose.modifiers`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | table (633 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Nouvelle valeur / plage (V1) | table (633 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Lecture | Modificateurs inchangés ; décharge (rirDelta +2, setsFactor 0,6) reclassée en heuristique (P8). |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | aucune (type le plus fort : expert_design) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Aucune ampleur démontrée. |
| Justification | Mécanismes conservés ; politique de conflit « la plus prudente » = garde-fou produit. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.DELOAD` PROGRAMMING_HEURISTIC (valeur) ; `C.CONFLICT` PRODUCT_GUARDRAIL (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.dose.nonRep`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `{"holdSeconds":{"min":30,"max":45},"carryMeters":{"min":30,"max":40}}` |
| Nouvelle valeur / plage (V1) | `{"holdSeconds":{"min":30,"max":45},"carryMeters":{"min":30,"max":40}}` |
| Lecture | Durées de maintien et distances de porté inchangées. |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | aucune (type le plus fort : expert_design) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Aucune source. |
| Justification | Heuristique. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | — |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.load`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | table (497 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Nouvelle valeur / plage (V1) | table (497 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Lecture | Inchangé ; la formule d’Epley (diviseur 30) et `pctByRepsToFailure` sont reclassés en REPLI d’amorçage, sous les données spécifiques récentes (V1). |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.GRGIC_2020`, `SRC.HALPERIN_2022` (type le plus fort : systematic_review) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Précision des références de charge |
| Confiance | very_low |
| Incertitude | Formules génériques non individualisées ; RIR sous-estimé d’environ une répétition ; fenêtres de récence et tolérance de conflit heuristiques. |
| Justification | Hiérarchie de référence : données spécifiques récentes > historique de l’exercice > modèle personnel (contrat) > e1RM générique > calibration prudente. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.1RM_REL` CONTEXT_DEPENDENT (principe) ; `C.RIR_ERR` CONTEXT_DEPENDENT (principe) ; `C.EPLEY` PROGRAMMING_HEURISTIC (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.load.defaultIncrements`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `{"barbell":2.5,"dumbbell_pair":2,"dumbbell_single":2,"kettlebell":4,"machine_stack":5,"plate_loaded":5,"bodyweight_plus":2.5,"implement_fixed":1}` |
| Nouvelle valeur / plage (V1) | `{"barbell":2.5,"dumbbell_pair":2,"dumbbell_single":2,"kettlebell":4,"machine_stack":5,"plate_loaded":5,"bodyweight_plus":2.5,"implement_fixed":1}` |
| Lecture | Incréments matériels par défaut inchangés. |
| Statut | `TECHNICAL` — paramètre technique |
| Gouvernance | G4 · visa expert non requis · visa sécurité non requis · provisoire non |
| Sources | aucune (type le plus fort : technical) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (paramètre technique) |
| Confiance | not_applicable |
| Incertitude | Dépend de la salle (surchargée par les incréments déclarés). |
| Justification | Donnée matérielle. |
| Si la preuve reste insuffisante | Sans objet (technique). |
| Revendications | — |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.calibration`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `{"targetRir":3,"sets":2,"intraSessionProgression":true,"stopCriterion":"target_effort_reached","mediumAfterExposures":1,"highAfterExposures":2}` |
| Nouvelle valeur / plage (V1) | `{"targetRir":3,"sets":2,"intraSessionProgression":true,"stopCriterion":"target_effort_reached","mediumAfterExposures":1,"highAfterExposures":2}` |
| Lecture | targetRir 3, 2 séries inchangés ; `mediumAfterExposures` et `highAfterExposures` ne sont lus par aucun code (dette) et sont remplacés en V1 par `strength.prescriptionConfidence`. |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | aucune (type le plus fort : expert_design) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Aucune source pour la cible d’effort. |
| Justification | Calibration prudente sans référence. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.CAL` PROGRAMMING_HEURISTIC (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.rampup`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | table (692 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Nouvelle valeur / plage (V1) | table (692 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Lecture | Paliers inchangés, reclassés : principe conservé, paliers non optimaux (P9). |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.WARMUP_FORCE_MA` (type le plus fort : meta_analysis) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Paliers non démontrés. |
| Justification | Montée spécifique prioritaire, distincte de l’échauffement général. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.WU_RFD` CONTEXT_DEPENDENT (principe) ; `C.RAMP_STEPS` PROGRAMMING_HEURISTIC (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.progression`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | table (2324 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Nouvelle valeur / plage (V1) | table (2324 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Lecture | Familles de modèles conservées ; cycleCapFraction 0,15, regressionFraction 0,10, regressAfterBelow 2, stagnationHolds 3 reclassés en heuristiques (P7). |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.AUTOREG_NMA_2025`, `SRC.HICKMOTT_2022`, `SRC.MOESGAARD_2022` (type le plus fort : network_meta_analysis) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Force (1RM) |
| Confiance | very_low |
| Incertitude | Aucune fraction démontrée. |
| Justification | Progression structurée et autorégulée favorable à la force. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.PERIOD` CONTEXT_DEPENDENT (principe) ; `C.AUTOREG` CONTEXT_DEPENDENT (principe) ; `C.PROG_FRACTIONS` PROGRAMMING_HEURISTIC (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.tracks`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `{"anchorMaxWeeks":{"novice":12,"beginner":10,"intermediate":8,"advanced":6},"tier2AutoCreateAfter":2,"rotateAtMesocycleEnd":{"novice":false,"beginner":false,"intermediate":false,"advanced":true}}` |
| Nouvelle valeur / plage (V1) | `{"anchorMaxWeeks":{"novice":12,"beginner":10,"intermediate":8,"advanced":6},"tier2AutoCreateAfter":2,"rotateAtMesocycleEnd":{"novice":false,"beginner":false,"intermediate":false,"advanced":true}}` |
| Lecture | anchorMaxWeeks 12/10/8/6 inchangés ; en V1 horizon de REVUE au plus (politique `strength.tracks.horizon`). |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.KASSIANO_2022` (type le plus fort : systematic_review) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Aucune durée démontrée. |
| Justification | Trois niveaux conservés ; une ancre ne change que pour une raison traçable (P10). |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.VAR` CONTEXT_DEPENDENT (principe) ; `C.WEEKS` PROGRAMMING_HEURISTIC (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.volume`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | table (7296 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Nouvelle valeur / plage (V1) | table (7296 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Lecture | Bornes hebdomadaires et secondaryWeight 0,5 inchangés ; bornes = repères SOFT, pas des frontières (P3). |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.PELLAND_2026` (type le plus fort : meta_analysis) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Hypertrophie, force |
| Confiance | very_low |
| Incertitude | Réponse individuelle non modélisée ; population des sources majoritairement masculine. |
| Justification | Dose–réponse à rendements décroissants ; décompte fractionnaire des muscles secondaires = approximation. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.DOSE` SUPPORTED (principe) ; `C.WEEKLY` PROGRAMMING_HEURISTIC (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.volume.sessionCap`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `{"novice":10,"beginner":12,"intermediate":14,"advanced":16}` |
| Nouvelle valeur / plage (V1) | `{"novice":10,"beginner":12,"intermediate":14,"advanced":16}` |
| Lecture | Plafonds par niveau inchangés ; garde-fou produit et de sécurité (G1). |
| Statut | `SAFETY_SIGNOFF_REQUIRED` + `PRODUCT_GUARDRAIL` — visa de sécurité requis (G1) |
| Gouvernance | G1 · visa expert requis · visa sécurité requis · provisoire oui |
| Sources | aucune (type le plus fort : expert_design) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Aucune source pour un plafond par séance. |
| Justification | Plafond de séries par groupe et par séance. |
| Si la preuve reste insuffisante | Paramètre G1 : bloqué sans visa de sécurité ; aucune promotion possible, la valeur provisoire reste la référence prudente du cliquet G1. |
| Revendications | `C.CAP` SAFETY_SIGNOFF_REQUIRED (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.interference`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | table (601 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Nouvelle valeur / plage (V1) | table (601 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Lecture | Notes et ajustements par structure inchangés ; `neighborWindowHours` 36 h ne sert plus qu’au ruleset 0.2.0 (règle binaire historique). |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.WILSON_2012` (type le plus fort : meta_analysis) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Force, hypertrophie en entraînement concurrent |
| Confiance | very_low |
| Incertitude | Aucune fenêtre temporelle démontrée. |
| Justification | L’interférence dépend de la modalité, de la fréquence et de la durée d’endurance. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | `C.CONC` CONTEXT_DEPENDENT (principe) ; `C.STRUCT_DELTAS` PROGRAMMING_HEURISTIC (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.substitution.fallbackNeeds`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | table (301 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Nouvelle valeur / plage (V1) | table (301 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Lecture | Replis de besoin inchangés. |
| Statut | `EXPERT_DESIGN_REVIEW` — choix de conception soumis à revue d’expert |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | aucune (type le plus fort : expert_design) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | À relire par un expert. |
| Justification | Conception. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | — |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.topSet`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `{"stimuli":["strength_heavy"],"levels":["advanced"],"backoffSets":3,"backoffLoadFraction":0.9}` |
| Nouvelle valeur / plage (V1) | `{"stimuli":["strength_heavy"],"levels":["advanced"],"backoffSets":3,"backoffLoadFraction":0.9}` |
| Lecture | Série lourde + séries allégées (0,9) inchangées. |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | aucune (type le plus fort : expert_design) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Aucune source. |
| Justification | Heuristique de programmation avancée. |
| Si la preuve reste insuffisante | Valeur conservée ; en l’absence de validation, le moteur applique la valeur provisoire du ruleset et le trace (parametersUsed). |
| Revendications | — |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.maxEffort.threshold`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `0.9` |
| Nouvelle valeur / plage (V1) | `0.9` |
| Lecture | 0,9 inchangé (G1, cliquet « decrease »). |
| Statut | `SAFETY_SIGNOFF_REQUIRED` — visa de sécurité requis (G1) |
| Gouvernance | G1 · visa expert requis · visa sécurité requis · provisoire oui |
| Sources | aucune (type le plus fort : expert_design) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Aucune source ne justifie 0,9 plutôt qu’une valeur voisine. |
| Justification | Seuil d’éligibilité à l’effort maximal ; aucune fausse précision revendiquée. |
| Si la preuve reste insuffisante | Paramètre G1 : bloqué sans visa de sécurité ; aucune promotion possible, la valeur provisoire reste la référence prudente du cliquet G1. |
| Revendications | `C.MAXEFF` INSUFFICIENT_EVIDENCE (valeur) |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.proposals.max`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | `2` |
| Nouvelle valeur / plage (V1) | `2` |
| Lecture | 2 inchangé. |
| Statut | `TECHNICAL` — paramètre technique |
| Gouvernance | G4 · visa expert non requis · visa sécurité non requis · provisoire non |
| Sources | aucune (type le plus fort : technical) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (paramètre technique) |
| Confiance | not_applicable |
| Incertitude | Sans objet. |
| Justification | Nombre de propositions (technique). |
| Si la preuve reste insuffisante | Sans objet (technique). |
| Revendications | — |
| Version du paramètre | 0.1.0 · revue 2026-09-27 |

## `strength.science.registryVersion`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | *absent (sémantique 0.2.0)* |
| Nouvelle valeur / plage (V1) | `"1.0.0"` |
| Lecture | Absent en 0.2.0 ; « 1.0.0 » en V1. |
| Statut | `TECHNICAL` — paramètre technique |
| Gouvernance | G4 · visa expert non requis · visa sécurité non requis · provisoire non |
| Sources | aucune (type le plus fort : technical) |
| Population | Sans objet (choix de conception du moteur) |
| Critère | Sans objet (paramètre technique) |
| Confiance | not_applicable |
| Incertitude | Sans objet. |
| Justification | Version du registre tracée dans chaque séance (reproductibilité). |
| Si la preuve reste insuffisante | Sans objet (technique). |
| Revendications | — |
| Version du paramètre | 0.3.0 · revue 2026-09-27 |

## `strength.prescriptionConfidence`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | *absent (sémantique 0.2.0)* |
| Nouvelle valeur / plage (V1) | `{"rulesVersion":"pc-1.0.0","high":{"minSessions":2,"minObservations":4},"rirUncertainLevels":["novice","beginner"],"declaredCap":"medium"}` |
| Lecture | Absent en 0.2.0 (1 exposition avec RIR = high) ; V1 : HIGH exige ≥ 2 séances ET ≥ 4 observations, fraîches, cohérentes, RIR fiable, sans conflit ni transfert ; capacité déclarée plafonnée à MEDIUM ; RIR des novices et débutants traité comme incertain. |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.GRGIC_2020`, `SRC.HALPERIN_2022` (type le plus fort : systematic_review) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Précision des références de charge |
| Confiance | very_low |
| Incertitude | Seuils de séances et d’observations heuristiques ; l’effet de l’expérience sur la précision du RIR n’est pas vérifié dans les sources lues. |
| Justification | Confiance ordinale à facteurs tracés, sans coefficient ; deux observations ne garantissent pas HIGH. |
| Si la preuve reste insuffisante | Règles appliquées telles quelles et tracées (DOSE.LOAD.CONFIDENCE) ; toute incertitude abaisse la confiance, jamais l’inverse. |
| Revendications | `C.RIR_ERR` CONTEXT_DEPENDENT (principe) ; `C.1RM_REL` CONTEXT_DEPENDENT (principe) ; `C.PC_THRESH` PROGRAMMING_HEURISTIC (valeur) ; `C.PC_LEVELS` INSUFFICIENT_EVIDENCE (valeur) |
| Version du paramètre | 0.3.0 · revue 2026-09-27 |

## `strength.load.specificObservation`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | *absent (sémantique 0.2.0)* |
| Nouvelle valeur / plage (V1) | `{"repsTolerance":1,"rirTolerance":1,"requireRir":true}` |
| Lecture | Absent en 0.2.0 ; V1 : série récente (fenêtre « high ») à ± 1 répétition et ± 1 RIR de la cible, RIR requis. |
| Statut | `EXPERT_DESIGN_REVIEW` — choix de conception soumis à revue d’expert |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.HALPERIN_2022` (type le plus fort : scoping_review) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Tolérances heuristiques ; aucune source ne compare directement ces hiérarchies. |
| Justification | Hiérarchie de référence : une donnée spécifique récente décrit l’athlète mieux qu’une formule générique. |
| Si la preuve reste insuffisante | Sans observation spécifique : repli sur l’e1RM générique (tracé DOSE.LOAD.FROM_E1RM), puis calibration. |
| Revendications | `C.RIR_ERR` CONTEXT_DEPENDENT (principe) ; `C.SPEC_TOL` PROGRAMMING_HEURISTIC (valeur) |
| Version du paramètre | 0.3.0 · revue 2026-09-27 |

## `strength.interference.assessment`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | *absent (sémantique 0.2.0)* |
| Nouvelle valeur / plage (V1) | table (449 caractères), voir `packages/strength/tests/fixtures/ruleset.ts` |
| Lecture | Absent en 0.2.0 (règle binaire 36 h) ; V1 : matrice ordinale (demande + importance + bandes de proximité 12/24/48 h + impact locomoteur sur une demande déjà haute), fenêtre de recherche 72 h, actions graduées (MODERATE = RIR seulement ; HIGH = ajustement complet ; VERY_HIGH = complet + signal). |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.LUNDBERG_2022`, `SRC.WILSON_2012` (type le plus fort : meta_analysis) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Force, hypertrophie en entraînement concurrent |
| Confiance | very_low |
| Incertitude | Bornes des bandes et deltas ordinaux heuristiques ; aucune source ne fixe une fenêtre en heures. |
| Justification | Interférence graduée selon la modalité (impact locomoteur de la course), l’importance et la proximité ; VERY_HIGH = signal au planificateur, qui décide. |
| Si la preuve reste insuffisante | Matrice appliquée telle quelle et tracée (PLAN.INTERFERENCE_ASSESSED) ; le moteur ne déplace ni ne supprime jamais une séance. |
| Revendications | `C.CONC` CONTEXT_DEPENDENT (principe) ; `C.RUN` CONTEXT_DEPENDENT (principe) ; `C.MATRIX` PROGRAMMING_HEURISTIC (valeur) |
| Version du paramètre | 0.3.0 · revue 2026-09-27 |

## `strength.rampup.estimatedPolicy`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | *absent (sémantique 0.2.0)* |
| Nouvelle valeur / plage (V1) | `{"band":"by_relative_intensity"}` |
| Lecture | Absent en 0.2.0 (charge suggérée ⇒ un seul palier de la première bande) ; V1 : bande selon l’intensité relative, paliers ≤ estimatedLastStepMax (0,7). |
| Statut | `PROGRAMMING_HEURISTIC` — heuristique de programmation (aucune valeur démontrée) |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.WARMUP_FORCE_MA` (type le plus fort : meta_analysis) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Paliers heuristiques. |
| Justification | La confiance ordinale rend la charge suggérée (MEDIUM) plus fréquente sur le travail lourd : la montée spécifique doit rester prioritaire (P9), sans palier proche d’une charge incertaine. |
| Si la preuve reste insuffisante | Paliers existants appliqués ; aucun palier au-delà du plafond estimé. |
| Revendications | `C.WU_RFD` CONTEXT_DEPENDENT (principe) ; `C.RAMP_STEPS` PROGRAMMING_HEURISTIC (valeur) |
| Version du paramètre | 0.3.0 · revue 2026-09-27 |

## `strength.selection.repetitionPolicy`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | *absent (sémantique 0.2.0)* |
| Nouvelle valeur / plage (V1) | `{"levels":["novice"],"recency":"prefer_repeat"}` |
| Lecture | Absent en 0.2.0 (la récence fait tourner les exercices à égalité) ; V1 : au niveau novice, la famille pratiquée le plus récemment est préférée. |
| Statut | `EXPERT_DESIGN_REVIEW` — choix de conception soumis à revue d’expert |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.KASSIANO_2022` (type le plus fort : systematic_review) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Choix de conception ; niveaux concernés à confirmer par un expert (débutant ?). |
| Justification | Principe H : simplicité et répétition chez le novice ; une variation aléatoire excessive peut nuire, une variation systématique (alternance A/B des groupes de choix) reste admise. |
| Si la preuve reste insuffisante | Politique appliquée et tracée (critère décisif « recency »). |
| Revendications | `C.VAR` CONTEXT_DEPENDENT (principe) |
| Version du paramètre | 0.3.0 · revue 2026-09-27 |

## `strength.tracks.horizon`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | *absent (sémantique 0.2.0)* |
| Nouvelle valeur / plage (V1) | `{"policy":"review"}` |
| Lecture | Absent en 0.2.0 (clôture max_weeks) ; V1 : « review » (horizon de revue, jamais une clôture automatique). |
| Statut | `EXPERT_DESIGN_REVIEW` — choix de conception soumis à revue d’expert |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.KASSIANO_2022` (type le plus fort : systematic_review) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Choix de conception. |
| Justification | Une ancre ne change que pour une raison traçable (P10). |
| Si la preuve reste insuffisante | La revue est signalée (PROGRESSION.REVIEW_DUE) ; la track reste active. |
| Revendications | `C.VAR` CONTEXT_DEPENDENT (principe) |
| Version du paramètre | 0.3.0 · revue 2026-09-27 |

## `strength.session.durationPriority`

| Champ | Valeur |
|---|---|
| Ancienne valeur (0.2.0) | *absent (sémantique 0.2.0)* |
| Nouvelle valeur / plage (V1) | `{"warmupExtra":"if_fits_after_optionals","cooldown":"if_fits_after_optionals","primaryRest":"reduce_last"}` |
| Lecture | Absent en 0.2.0 (5 min + 3 min imposées hors contrainte ; repos du principal réduit avec les autres) ; V1 : échauffement supplémentaire et retour au calme seulement s’ils tiennent après les optionnels ; repos du principal réduit en dernier. |
| Statut | `PRODUCT_GUARDRAIL` — garde-fou produit |
| Gouvernance | G2 · visa expert requis · visa sécurité non requis · provisoire oui |
| Sources | `SRC.WARMUP_FORCE_MA` (type le plus fort : meta_analysis) |
| Population | Adultes en bonne santé, majoritairement jeunes et masculins selon les sources ; transposition aux femmes, aux seniors et aux sportifs d’endurance non vérifiée |
| Critère | Sans objet (aucune mesure d’effet) |
| Confiance | very_low |
| Incertitude | Choix produit ; aucune durée démontrée. |
| Justification | Ordre de priorité de la durée (4E §I) : travail principal, repos, montée spécifique, secondaires, accessoires, puis échauffement général supplémentaire et retour au calme. |
| Si la preuve reste insuffisante | Politique appliquée et tracée (SELECT.SLOT_OMITTED i.warmup_extra / i.cooldown ; DOSE.MODIFIED time:primary_rest en dernier recours). |
| Revendications | `C.WU_RFD` CONTEXT_DEPENDENT (principe) |
| Version du paramètre | 0.3.0 · revue 2026-09-27 |
