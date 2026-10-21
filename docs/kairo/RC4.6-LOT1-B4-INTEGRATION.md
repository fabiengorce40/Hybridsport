# RC4.6 — Lot 1 : B4 réduit (entrées croisées persistées pour la Musculation)

**Décision appliquée :** lot 1 autorisé.

**Branche :** `claude/kairo-rc4-dev`. Running, TEST et production : inchangés. Aucune fusion, aucun déploiement.

## 1. Changement

| Élément | Contenu |
|---|---|
| **Planificateur** (`packages/planner/src/ports.ts`, `model.ts`, `planner.ts`) | Le port Strength joint à chaque séance générée la forme **compacte** des blocs de force Cross-training qu'il a réellement lus (`compactCrossInputs`). Le résultat de planification la transporte (`crossInputs`). |
| **Persistance** (`app-core/src/model.ts`, `planning.ts`) | Champ **facultatif, versionné** `crossInputs: { v: 1, crosstraining: [{ requestId, date, archetypeId, items: [[exercice, séries de travail]] }] }` sur la séance de Musculation planifiée. |
| **Régénération** (`app-core/src/start-check.ts`) | Si le champ est présent, les séances Cross-training lues sont reconstruites depuis la forme compacte (`crossSource: 'persisted'`). **Repli explicite** s'il est absent (semaines d'avant B4) : reconstruction depuis la semaine persistée, comportement d'avant (`crossSource: 'rebuilt_from_week'`). |
| **Compaction de l'historique** (`history.ts`) | Champ retiré des semaines compactées, et tracé dans le marqueur (`fields: crossInputs`), comme le contexte des voisines. |
| **Contenu persisté** | Uniquement l'exercice et le nombre de séries de travail de chaque bloc de force lu : exactement ce que Strength en lit (volume hebdomadaire, expositions prévues). **Aucune séance dupliquée.** |
| **Moteurs sportifs** | **Aucune règle modifiée.** |

## 2. Non-régression des programmes

- **Séances planifiées identiques :**
  - banc qualité RC4.6 (8 profils) : rapport figé **inchangé** ;
  - autres rapports figés de planification : inchangés (rc4-matrice, c43-comparison, state-size, scénarios Strength) ;
  - volumes **planifiés** et durées **planifiées** des simulations de consolidation : identiques.
- **États enregistrés :** les fixtures d'état (lot C, R5.1) ne diffèrent que par l'ajout du champ (vérifié champ par champ).
- **Effet attendu, au démarrage seulement :** une séance de Musculation auparavant **non reproductible** passe désormais par la **régénération** du moteur au lieu du repli sur la séance persistée. Cas : bloc Cross-training relu dans sa version finale au lieu de la version lue.

  | Rapport | Avant | Après |
  |---|---|---|
  | `consolidation-4-semaines.md`, `r1-r2-avant-apres.md` : séances Musculation reproductibles au démarrage | 8 / 12 | 10 / 12 |
  | `multi-config-4-semaines.md`, config. A | 8 / 12 | 10 / 12 |
  | `multi-config-4-semaines.md`, config. E | 8 / 12 | 10 / 12 |

  **Séance du 19 octobre (genou P2), consolidation :**
  - avant : « recomposée (signalée) », avec retrait du Pallof press en plus ;
  - après : « régénérée (reproductible) », Pallof press conservé (aucune zone exclue) ;
  - le volume de tronc **exécuté** passe de 5 à 8 séries sur la semaine.

  Le programme planifié est inchangé ; seule la séance adaptée du jour diffère. **Point à votre appréciation.**

## 3. Reproductibilité R-A (Musculation, à la planification)

| Profil | Avant B4 | Après B4 |
|---|---|---|
| Consolidation (6 semaines) | 6 divergences | **0** |
| P2F (P2 avec CT force 2×, 6 semaines) | 1 | **0** |
| 8 profils du banc | 0 | 0 |
| Parcours R-A existant (consolidation, 12 séances) | 6 divergences du planificateur | **0** : 4 identiques, 2 en progression depuis la planification |

## 4. Compatibilité historique et parcours (`packages/app-core/tests/rc46/b4-cross-inputs.test.ts`, 12 tests)

- **Anciens états :** deux états écrits par le code d'avant B4 (`bfa6f80`) : consolidation semaine 2, P2F semaine 1.
  - Relus sans champ, avec repli explicite.
  - Les 4 chemins de démarrage (contrôle inconnu, fatigue, douleur, course libre la veille) donnent **exactement** les résultats du code d'avant.
- **Semaine suivante d'un ancien état :** nouvelles séances avec le champ et 0 divergence. Les enregistrements des semaines antérieures sont inchangés.
- **Modification (« Modifier » une semaine non commencée) :** semaine replanifiée avec le champ, 0 divergence.
- **Abandon d'une séance :** le champ des autres séances est intact, et leur régénération lit toujours les entrées persistées.
- **Reprise :** séance commencée, état enregistré puis relu. La poursuite est identique (journal, enregistrement, champ).
- **Repli :** champ retiré ⇒ les divergences d'avant B4 réapparaissent (7). Démarrage par le repli sur la séance persistée (`READINESS_PERSISTED`), au lieu de la régénération.
- **Format :**
  - champ réservé à la Musculation ;
  - aucun champ sans Cross-training dans la semaine ;
  - jamais de prescription ni de bloc complet ;
  - ≤ 600 octets par séance.
- **Compaction :** champ retiré des semaines compactées et tracé.

## 5. Coût de stockage (`packages/app-core/tests/rc46/__reports__/b4-storage.md`)

| Profil | Semaines | État persisté (octets) | `crossInputs` (octets) | Part |
|---|---|---|---|---|
| Consolidation (Musculation 3×, CT force 1×) | 6 (simulation, séances réalisées) | 570 061 | 1 158 | 0,20 % |
| P2F (Musculation 3×, CT force 2×) | 6 (simulation, séances réalisées) | 682 951 | 2 076 | 0,30 % |
| Consolidation | 26 (semaines planifiées, compaction appliquée) | 1 575 074 | 1 194 | 0,08 % |
| Consolidation | 52 (semaines planifiées, compaction appliquée) | 3 132 708 | 1 194 | 0,04 % |

- **Coût stable dans le temps :** la compaction retire le champ des semaines anciennes, il ne reste que celui des semaines récentes.
- **Rapport planificateur `m3-state-size.md` :** semaine planifiée +1 à +4 Ko sur 12 et 52 semaines.

## 6. Vérifications

- `pnpm check` (typecheck, lint, tests) : **2972 tests réussis**, 2 ignorés.
- `pnpm kairo:build` et `pnpm kairo:e2e` : réussis.
- Correctif séparé (`6009f32`) : la surcouche V3 (`packages/strength/tests/fixtures/l1v3.ts`) a été ajoutée à la liste fermée gouvernée du test d'architecture. Ce test ne la voyait pas avant son suivi par git : le commit V3 aurait échoué en CI.
