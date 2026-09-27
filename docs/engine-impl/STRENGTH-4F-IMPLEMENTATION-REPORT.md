# Phase 4F — STRENGTH SCIENTIFIC LOCK & G1 HANDOFF : rapport d’implémentation

> Corrections du contre-audit, verrou scientifique provisoire et dossier de validation sécurité.
> - Aucune modification du CORE.
> - CORE-EXT-5 non implémentée (RFC seulement).
> - Aucun nouveau modèle complexe.
> - **RunningEngine NOT STARTED.**

## 1. Gates

| Gate | Résultat | Fondement |
|---|---|---|
| STRENGTH_4F_CORRECTION_GATE | **PASS** | Voir le détail ci-dessous. |
| STRENGTH_SCIENTIFIC_LOCK_V1 | **LOCKED_PROVISIONAL** | Calculé par `scientificLock` : 0 anomalie ; 57 blocages PRODUCTION (4 visas G1, 35 valeurs provisoires, 15 sources citées non lues en texte intégral, 3 identités partielles citées). |

Critères du STRENGTH_4F_CORRECTION_GATE :

- les 4 corrections sont effectuées ;
- 606 tests verts, typecheck, lint et architecture verts ;
- aucun changement du CORE (test F20, empreinte des sources) ;
- S1–S7 sans différence inattendue (`UNEXPECTED = 0`, test) ;
- 0.2.0 et 4E reproductibles (F1, F2).

**LOCKED_PRODUCTION est impossible aujourd’hui** : les quatre G1 ne sont pas signés, aucune source n’est lue au-delà d’un résumé de recherche, et toutes les valeurs restent provisoires.

## 2. PHASE_4E_BASELINE (étape A)

- **État initial** : branche `claude/fitness-app-architecture-81fs92`, HEAD `69868f3`, arbre propre, synchronisé avec `origin` ; 560 tests verts ; typecheck et lint verts.
- **Gel de la baseline 4E** :
  - ruleset `0.3.0-strength-science-candidate`, avec des versions littérales dans le fixture (`SCIENCE_4E_RULESET_VERSION`, `SCIENCE_4E_REGISTRY_VERSION = '1.0.0'`) ;
  - goldens `__goldens_v1__/` inchangés.
- **Ruleset 4F** : `0.4.0-strength-science-lock`. Il étend le 4E ; ses corrections sont toutes des **paramètres facultatifs versionnés** : le 4E et le 0.2.0 se rejouent à l’identique.

## 3. Les quatre corrections

### Correction 1 — registre scientifique 1.1.0

- **Niveau de vérification** du contenu : `IDENTITY_ONLY` < `SEARCH_SUMMARY` < `ABSTRACT_VERIFIED` < `FULL_TEXT_VERIFIED`. Chaque source porte aussi sa date et la liste des points à vérifier lors de la revue humaine.
- **Accès direct** : PubMed, E-utilities, Europe PMC et WebFetch ont été testés à nouveau ; ils restent bloqués (politique réseau). Aucune source n’est donc présentée au-delà de `SEARCH_SUMMARY`.
- **Répartition** : 15 sources `SEARCH_SUMMARY`, 6 `IDENTITY_ONLY` (aucun résultat extrait, aucune revendication), 0 `ABSTRACT_VERIFIED`, 0 `FULL_TEXT_VERIFIED`.
- **Consolidations**, à partir de recherches ciblées (niveau `SEARCH_SUMMARY`, jamais présentées comme lectures) :

| Source | Consolidation |
|---|---|
| **41843416 (ACSM 2026)** | Vue d’ensemble de 137 revues systématiques, plus de 30 000 adultes, cadre de type GRADE. Message général : les détails de prescription comptent moins que la pratique. Les recommandations chiffrées sont connues par des **résumés secondaires** seulement : aucune valeur n’en est tirée. Tension à relire : la force maximale serait favorisée par des charges élevées, ce qui est cohérent avec le profil « heavy », pas avec une règle universelle. |
| **41343037 (Pelland 2026)** | 67 études, 2 058 participants. Rendements décroissants. Méthodes de décompte des séries indirectes comparées : **fractionnaire (0,5) = preuve la plus forte**. Revendication `C.FRACTIONAL` (`CONTEXT_DEPENDENT`, détermine `secondaryWeight`). |
| **38970765 (Robinson 2024)** | 55 études d’hypertrophie, 67 de force. Hypertrophie croissante avec la proximité de l’échec ; force : différences négligeables. RIR **estimé** : incertitude déclarée. |
| **34542869 (Halperin 2022)** | Sous-estimation d’environ 0,95 répétition. Précision meilleure pour les séries de moins de 12 répétitions. Hétérogénéité importante. |
| **35438660 (Kassiano 2022)** | Identité désormais confirmée (6 auteurs, JSCR). Variation systématique potentiellement utile, variation aléatoire excessive potentiellement défavorable. **Aucune durée d’ancre universelle** n’en découle. |
| **39205815 (Singer 2024)** | Identité confirmée (DOI). Petit bénéfice des repos de plus de 60 s, pas de différence appréciable au-delà de 90 s (hypertrophie). **Aucun seuil universel** (principe P5 reformulé). |
| **35038063 (Hickmott 2022)** | 15 études. Autorégulation de la charge et prescription en pourcentage : améliorations de force **similaires**. `C.AUTOREG` reformulée : « stratégie valide d’individualisation ; supériorité générale non établie ». |

Autres changements du registre :

- **Sources sans résultat extrait** (Grgic 2018, Hughes 2020, Fradkin 2010, Currier 2023, Chen 2024, 39593476) : elles ne portent plus aucune revendication. Les règles `SOURCE_LEVEL` et `SOURCE_WITHOUT_CONTENT` le vérifient.
- **Séparation mécanisme / ampleur** (`evidenceSplit`) sur 8 paramètres, par exemple :
  - dosage : mécanisme `SUPPORTED`, ampleur `PROGRAMMING_HEURISTIC` ;
  - interférence : `CONTEXT_DEPENDENT` / `PROGRAMMING_HEURISTIC`.
  La validation refuse une ampleur plus faible que le statut affiché.

### Correction 2 — préservation du stimulus

Voir [`STRENGTH-STIMULUS-PRESERVATION-V1.md`](STRENGTH-STIMULUS-PRESERVATION-V1.md).

- **Règle générale, sans quota** : un optionnel de plus haute priorité de stimulus, omis faute de temps, remplace un optionnel moins prioritaire à trois conditions :
  - sans lui, un groupe ciblé perdrait la majorité de sa dose de séance ;
  - le retrait ne supprime la seule couverture d’aucun autre groupe ;
  - la séance échangée tient dans la durée.
- **Trace** : `SELECT.STIMULUS_PRESERVED`.
- **S2** : pec deck conservé, Pallof retiré ; **pectoraux 2 → 5** (valeur 0.2.0), tronc 5,5 → 1,5 (couvert en secondaire) ; retour au calme rétabli.
- **Aucun effet ailleurs** : en S1, un échange aurait supprimé la seule couverture des mollets ; en S3–S7, aucune perte disproportionnée.

### Correction 3 — interférence : mécanisme soutenu, ampleur heuristique

- **Matrice** : NONE…VERY_HIGH et actions conservées.
- **Nouvelle trace** `PLAN.INTERFERENCE_BASIS {structure, level, action, mechanism, magnitude}` (option `traceEvidenceBasis`).
  - Le mécanisme (`CONTEXT_DEPENDENT`) et l’ampleur (`PROGRAMMING_HEURISTIC`) sont lus dans le **registre**, jamais dans la matrice.
  - Changer un bin ne change donc pas le niveau de preuve (F7).
- **MODERATE ⇒ RIR + 2** : explicitement heuristique (F6).
- **Bins 12/24/48/72 h** : documentés comme opérationnels, pas comme des frontières biologiques.

### Correction 4 — continuité novice / débutant

`strength.selection.repetitionPolicy` est étendu (`preferredLevels`, `rotationReasons`) :

| Niveau | Comportement |
|---|---|
| **Novice** | Forte continuité, y compris en début de cycle. |
| **Débutant** | Continuité préférée ; rotation permise en semaine 1 de cycle. |
| **Intermédiaire / avancé** | Variation contrôlée (récence historique). |

- **Raisons explicites de rotation** :
  - exercice non aimé, ou en stagnation (`consecutiveHolds ≥ stagnationHolds`) : l’exercice passe derrière les autres candidats ;
  - note `planned_variation` du planificateur : rotation pour toute la séance.
- **Déjà couverts** par les filtres et les critères antérieurs : équipement, douleur, tolérance et objectif.
- **Jamais un verrou** : la continuité est un départage de rang (critère `recency`), après ancre, adéquation de charge, rôle, volume, objectif et fatigue.
- **Anti-doublon** : les ancres déclarées restent des répétitions planifiées (F12).

## 4. PrescriptionConfidence (étape F)

Propriétés confirmées par test, sans réécriture du modèle 4E :

- HIGH exige plusieurs signaux cohérents ; jamais avec des observations incohérentes (F13) ni avec deux observations seules (K7).
- Une donnée spécifique récente passe avant le repli générique ; Epley et `pctByRepsToFailure` restent des replis (F14, K4).
- Le RIR déclaré est traité comme incertain (absent, ou niveau novice / débutant) (K8).
- Une capacité déclarée seule est plafonnée à MEDIUM.

## 5. S1–S7 : 0.2.0 → 4E → 4F

Détail généré dans [`STRENGTH-4F-BASELINE-DIFF.md`](STRENGTH-4F-BASELINE-DIFF.md).

| Séance | 4E conservé | Correction 4F | Inattendu |
|---|---|---|---|
| S1 | 16 | 0 | 0 |
| S2 | 7 | 17 (préservation du stimulus) | 0 |
| S3 | 7 | 1 (trace de base de preuve) | 0 |
| S4 | 6 | 1 (trace de base de preuve) | 0 |
| S5 | 12 | 0 | 0 |
| S6 | 7 | 0 | 0 |
| S7 | 10 | 0 | 0 |
| **Total** | 65 | 19 | **0** |

Seule S2 change de prescription en 4F. S3 et S4 ne gagnent qu’une trace.

## 6. Tests

- **Total** : 606 tests verts sur 55 fichiers (CORE 370, strength 236 ; +46 depuis la 4E), dont 16 tests de durcissement ciblés (`tests/unit/mutation-4f.test.ts`).
- **F1–F20** et le verrou : `tests/unit/science-lock.test.ts` (21 tests).
- **Goldens 4F** : `tests/golden/science-lock.test.ts`.
- **Classification** : test `UNEXPECTED = 0` dans `tests/golden/science-docs.test.ts`.
- **Fuzz** : 120 scénarios avec les invariants rejoués sous 0.2.0, 4E et 4F.

## 7. Mutation

Configuration : `stryker.strength-4f.config.json`.

- **Cibles** : `confidence.ts`, `interference.ts`, `selection.ts` (critères et continuité, lignes 60–145), `engine.ts` (préservation du stimulus, lignes 400–439), `science/validate.ts`.
- **Tests exécutés** : unitaires et d’intégration strength. F20 est ignoré dans le bac à sable, comme les tests d’architecture.

| Module | Passage 1 | Passage 2 (après 16 tests ciblés) | Survivants | Timeouts | Sans couverture |
|---|---|---|---|---|---|
| PrescriptionConfidence (`confidence.ts`) | 76,9 % | **89,4 %** | 18 | 0 | 0 |
| InterferenceAssessment (`interference.ts`) | 66,3 % | **78,6 %** | 40 | 0 | 0 |
| Continuité et critères (`selection.ts`) | 85,3 % | **91,4 %** | 17 | 2 | 0 |
| StimulusPreservation (`engine.ts` 400–439) | 59,4 % | **64,1 %** | 46 | 0 | 0 |
| Validation du registre (`science/validate.ts`) | 60,6 % | **63,1 %** | 151 | 0 | 0 |
| **Total** | 68,5 % | **75,1 %** | 272 | 2 | 0 |

Durée : 80 minutes par passage, 1 088 mutants. Aucun score de 100 % n’a été visé.

**Survivants pouvant modifier une prescription réelle**

1. **Préservation du stimulus**, `engine.ts:408, 424, 426, 427` (22 survivants).
   - Mutations de l’éligibilité de l’optionnel retiré (`optional`, sans track, rang inférieur) et des conditions d’échange (`own > 0`, « majorité », couverture `every`/`some`, `fits && groups`).
   - Un seul golden (S2 : retrait mono-groupe, un échange) exerce la règle.
   - Une mutation pourrait autoriser le retrait d’un optionnel suivi, ou un échange sans perte disproportionnée.
   - **Dette** : scénarios dédiés (retrait multi-groupes, optionnel suivi, deux échanges candidats).
2. **Préservation du stimulus**, `engine.ts:409` (ordre de retrait, du moins prioritaire au plus prioritaire) : pourrait changer l’optionnel retiré quand plusieurs sont admissibles. Aucun golden n’en a deux.
3. **Interférence**, `interference.ts:99` : départage à niveau égal entre voisines. Il change la voisine citée dans la trace, pas le niveau retenu, sauf si les actions diffèrent à niveau égal (impossible : action = fonction du niveau).

**Survivants sans effet sur la prescription**

- **Trace** :
  - `engine.ts:429–433` : nettoyage de l’omission initiale, paramètres de `STIMULUS_PRESERVED` ;
  - `interference.ts:102, 111` : ordre d’émission des raisons ;
  - `interference.ts:113` : repli `INSUFFICIENT_EVIDENCE` sur un registre toujours présent.
- **Équivalents** :
  - `confidence.ts:64` : le comparateur de tri ne change que l’ordre, et la récence est prise sur le maximum ;
  - `confidence.ts:72` : garde `mid > 0` ;
  - `interference.ts:79` : tri des voisines, dont le niveau retenu est le maximum.
- **Messages et diagnostics** de `validate.ts` : 58 conditions et 51 chaînes. Aucune ne touche une séance ; les règles bloquantes clés sont couvertes par K1–K3 et F15–F18.
- **Code antérieur à la 4E** inclus dans la plage de `selection.ts` (logistique, boucles de classement) : déjà audité en 4C.

## 8. Paramètres encore heuristiques

38 paramètres, chacun avec une catégorie principale :

- 17 `PROGRAMMING_HEURISTIC` : stimuli, mobilité, dosage (cellules), modificateurs, non-répétitions, charge (Epley et table), calibration, montée, montée estimée, progression, tracks, volume (bornes), interférence (ajustements), matrice d’interférence, série lourde, PrescriptionConfidence, bandes de récence ;
- 12 `EXPERT_DESIGN_REVIEW` : besoins, archétypes, objectifs, classes d’exercice, ordre des critères, plafond de charge minimal, principal chargeable, replis de besoin, observation spécifique, répétition / continuité, préservation du stimulus, horizon des ancres ;
- 2 `PRODUCT_GUARDRAIL` : `axialHighMaxPerSession`, priorités de durée ;
- 4 `SAFETY_SIGNOFF_REQUIRED` : les G1 ;
- 3 `TECHNICAL`.

**Aucune valeur n’est `SUPPORTED`.** Sont soutenus : des mécanismes (P1, P2, P3), le décompte fractionnaire selon le contexte.

## 9. G1 (voir [`STRENGTH-G1-REVIEW-PACK.md`](STRENGTH-G1-REVIEW-PACK.md))

| Paramètre | Valeur | Visa |
|---|---|---|
| `strength.selection.skillCeiling` | 2 / 3 / 4 / 5 | **non signé** |
| `strength.novice.technicalUnderFatigue` | novice + débutant ; technique ≥ 2 ; 1 par séance, principal seulement | **non signé** |
| `strength.volume.sessionCap` | 10 / 12 / 14 / 16 séries E1 par groupe et par séance | **non signé** |
| `strength.maxEffort.threshold` | 0,9 (cliquet « decrease ») | **non signé** |

Chaque fiche contient les questions falsifiables, les marges observées dans S1–S7 et le formulaire APPROVE / ADJUST / REJECT.

## 10. Dette

**Scientifique**

- Lecture des résumés officiels, puis des textes intégraux : 15 sources citées ; identités partielles (Halperin, NMA autorégulation, échauffement 2025) ; extraction ACSM 2026 (recommandations chiffrées et niveaux GRADE).
- **Tensions à arbitrer** :
  - repos des accessoires du ruleset (45–75 s) face au petit bénéfice rapporté au-delà de 60 s (Singer 2024) ;
  - recommandations chiffrées ACSM face aux bornes hebdomadaires et aux profils.
- Transposition aux femmes, aux seniors et aux sportifs d’endurance ; précision du RIR selon l’expérience ; réponse individuelle au volume ; dose axiale cumulée ; décharge contextuelle.
- Critère de préservation du stimulus (« majorité de la dose ») et rotation débutant en semaine 1 : choix de conception à faire relire.

**Technique**

- CORE-EXT-5 (RFC, option B recommandée) ; `perSide` pour l’unilatéral.
- `strength.calibration.mediumAfterExposures` / `highAfterExposures` : déclarés, non lus.
- `anchorReviewDue` et `PersonalLoadModel` : non branchés.
- La préservation du stimulus n’examine qu’un optionnel retiré à la fois.
- Survivants de mutation de la préservation du stimulus (§7) : scénarios dédiés à ajouter.

## 11. CORE-EXT-5

- **Recommandation** : option B, `targetRir: { min, max, preferred? }`.
  - Forme unique ;
  - migration `session_record` v3 → v4 explicite (`r` ⇒ `{ min: r, max: r }`) ;
  - STR-V3 sur la borne basse (la plus prudente) ;
  - progression conforme / en deçà / au-delà.
- **Statut** : non implémentée ; en attente de validation humaine.
- **RFC** : [`CORE-EXT-5-RIR-RANGE-RFC.md`](CORE-EXT-5-RIR-RANGE-RFC.md).

**RunningEngine NOT STARTED.**
