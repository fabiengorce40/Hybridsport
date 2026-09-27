# Phase 4G — STIMULUS PRESERVATION MUTATION HARDENING : rapport

> Seul sujet : la robustesse comportementale de la préservation du stimulus. Aucune modification du CORE, de PrescriptionConfidence, d’InterferenceAssessment, des G1 ni des paramètres scientifiques. **CORE-EXT-5 NOT IMPLEMENTED. RunningEngine NOT STARTED.**

## 1. Gates

| Gate | Résultat |
|---|---|
| STRENGTH_STIMULUS_PRESERVATION_GATE | **PASS** |
| STRENGTH_ENGINE_V1_FINAL_TECHNICAL_LOCK | **LOCKED** |
| STRENGTH_SCIENTIFIC_LOCK_V1 | **LOCKED_PROVISIONAL** (inchangé) |

**STRENGTH_STIMULUS_PRESERVATION_GATE : PASS**, car :

- G1–G12 couverts ;
- P1–P8 couvertes ;
- mutation relancée (2 passages ciblés) ;
- **0** survivant PRESCRIPTION_RELEVANT ;
- 630 tests verts ;
- S1–S7 identiques à la 4F.

**STRENGTH_ENGINE_V1_FINAL_TECHNICAL_LOCK : LOCKED**, car :

- CORE inchangé ;
- ruleset 0.2.0 reproductible ;
- baseline 4E reproductible ;
- PHASE_4F_FINAL_BASELINE identique ;
- tests strength verts ;
- architecture, typecheck et lint verts ;
- gate de préservation du stimulus PASS ;
- aucun défaut de prescription connu non documenté.

Ce verrou est **technique**. Il ne rend pas le moteur prêt pour la production : les quatre G1 restent à signer et `STRENGTH_SCIENTIFIC_LOCK_V1` reste `LOCKED_PROVISIONAL`.

## 2. Baseline (étape B)

- **État initial** : branche `claude/fitness-app-architecture-81fs92`, HEAD `66dd28b`, arbre propre ; 606 tests verts ; typecheck, lint et architecture verts.
- **PHASE_4F_FINAL_BASELINE** : goldens `__goldens_4f__/` (empreintes SHA-256 relevées avant toute modification).
- **Contrôle final** : empreintes identiques, S1–S7 inchangés sous 0.2.0 (F1), 4E (F2) et 4F.

## 3. Modification du code : isolation, sans changement de comportement

- **Module** : la décision est extraite dans `packages/strength/src/stimulus-preservation.ts`, avec
  - `removalOrder` : candidats au retrait et ordre d’essai ;
  - `evaluateSwap` : majorité, couverture, durée ;
  - `findStimulusSwap` : premier échange accepté ;
  - `workingSetsOf` : séries de travail et de maintien.
- **Rôle du moteur** (`engine.ts`) : il fournit l’essai d’échange (chaque essai repart de l’état initial) et écrit la trace.
- **Aucune règle modifiée** : S1–S7 identiques, et toute la suite antérieure reste verte sans changement.
- **Raison** : les scénarios G1–G12 exigent de contrôler finement priorités, contributions, couvertures et durées. Ce n’est possible que sur une décision isolée.
- **Aucune modification algorithmique** : aucun scénario raisonnable n’a échoué et aucun invariant n’a été violé.

## 4. Inventaire des mutants

Voir [`STRENGTH-4G-MUTANT-INVENTORY.md`](STRENGTH-4G-MUTANT-INVENTORY.md).

**Initial (4F, 128 mutants, 46 survivants)** :

| Classe | Nombre |
|---|---|
| PRESCRIPTION_RELEVANT | 29 |
| TRACE_ONLY | 8 |
| EQUIVALENT | 6 |
| NO_PRESCRIPTION_IMPACT | 3 |
| UNCERTAIN | 1 (puis NO_PRESCRIPTION_IMPACT après analyse) |

**Final (4G, 170 mutants, 17 survivants)** :

| Classe | Nombre |
|---|---|
| EQUIVALENT | 8 |
| TRACE_ONLY | 8 |
| NO_PRESCRIPTION_IMPACT | 1 (garanti par un invariant testé) |
| UNCERTAIN | 0 |
| **PRESCRIPTION_RELEVANT** | **0** |

## 5. Scénarios G1–G12 et propriétés P1–P8

Fichier : `tests/unit/stimulus-preservation.test.ts`, 24 tests.

| Scénario | Couverture |
|---|---|
| G1 — deux optionnels concurrents | Le moins prioritaire est retiré ; ordre d’essai et décision déterministes. |
| G2 — contribution à deux groupes | Refus de retirer la seule couverture d’un groupe d’un optionnel multi-groupes ; majorité évaluée sur chaque groupe de l’omis. |
| G3 — stimulus déjà couvert | Optionnel redondant non protégé ; limite 3 = 3 (échange) et 4 > 3 (aucun). |
| G4 — contrainte sévère | 30 à 65 min : aucune séance hors durée ; principal et montée identiques avec et sans la règle. |
| G5 — optionnel coûteux | La victime bon marché est essayée puis refusée (durée), la suivante est retenue ; aucun échange si aucun retrait ne suffit. |
| G6 — aucune préservation nécessaire | Aucun échange, aucune raison artificielle ; omis sans série jamais protégé. |
| G7 — aucun candidat valide | Optionnel suivi, requis, plus prioritaire, même emplacement, omis hors optionnels, essai bloqué : aucun échange forcé. |
| G8 — égalité | Même rang = même emplacement ⇒ ordre de placement (tri stable), sans hasard. |
| G9 — conflit multi-stimulus | La priorité vient de l’intention (rang) ; inverser l’intention inverse le résultat ; jamais l’ordre du catalogue. |
| G10 — anti-doublon | Voir ci-dessous. |
| G11 — ancre / track | Un optionnel suivi (Pallof) n’est jamais retiré ; l’ancre déclarée du principal reste. |
| G12 — budgets 120 → 30 min | Jamais plus d’optionnels quand le temps baisse ; un stimulus protégé présent à un budget court l’est aussi aux budgets plus longs. |

**G10 — anti-doublon** : après une séance identique récente,

- le travail requis et le principal restent ;
- la séance reste VALID ;
- aucun doublon fort n’est retenu ;
- au niveau débutant, le stimulus protégé est conservé.

Constat hors périmètre : au niveau intermédiaire, la variation contrôlée des accessoires (critère de récence, 4F) remplace le pec deck (pectoraux 6 → 3). Ce n’est ni la préservation du stimulus ni l’anti-doublon, voir §9.

**Tests moteur complémentaires** :

- full body 60 min : pec deck conservé à la place du Pallof, trace exacte ; sans la règle, la perte reste tracée ;
- bas du corps 60 et 65 min : leg extension à la place de la fente bulgare, dont un cas à **deux essais** (tronc refusé, puis fente acceptée) ;
- invariants structurels des familles.

| Propriété | Test |
|---|---|
| P1 déterminisme | Même entrée, graine, ruleset et catalogue ⇒ même trace (fast-check). |
| P2 monotonie du temps | G12. |
| P3 aucun dépassement de durée | G4. |
| P4 contraintes dures | Exclusion utilisateur, matériel et état respectés pendant l’échange. |
| P5 protection des ancres | G11. |
| P6 aucun quota universel | La décision ne dépend que du rapport contribution de l’omis / autres ; invariante par mise à l’échelle (fast-check, 300 cas). |
| P7 invariance d’ordre | Permuter des optionnels de rangs distincts ne change pas la victime ; à rang égal, le contrat documenté est l’ordre de placement (G8). |
| P8 idempotence | Rejouer la règle sur la séance réparée ne la modifie plus. |

## 6. Mutation (périmètre préservation du stimulus seulement)

| Passage | Total | Tués | Survivants | Timeouts | Sans couverture | Score |
|---|---|---|---|---|---|---|
| 4F (référence, ancien périmètre) | 128 | 82 | 46 | 0 | 0 | 64,1 % |
| 4G-1 | 170 | 152 | 18 | 0 | 0 | 89,4 % |
| 4G-2 | 170 | 153 | 17 | 0 | 0 | **90,0 %** |

- **Mutant 30** (restauration entre deux essais), seul survivant PRESCRIPTION_RELEVANT au passage 4G-1 : il est tué par le scénario à deux essais.
- **Les 17 survivants finaux** sont classés et justifiés dans l’inventaire.

## 7. S1–S7 : 4F → 4G

| S1 | S2 | S3 | S4 | S5 | S6 | S7 |
|---|---|---|---|---|---|---|
| IDENTICAL | IDENTICAL | IDENTICAL | IDENTICAL | IDENTICAL | IDENTICAL | IDENTICAL |

## 8. Tests

- **Avant** : 606 tests sur 55 fichiers.
- **Après** : **630 tests sur 56 fichiers** (CORE 370, strength 260) ; +24 tests dans `tests/unit/stimulus-preservation.test.ts`.
- Typecheck, lint et architecture verts.

## 9. Dette restante

- **Observation à relire (hors périmètre 4G)** : au niveau intermédiaire, après une séance récente identique, la variation contrôlée des accessoires peut déplacer le volume d’un groupe (pectoraux 6 → 3 en full body). C’est le comportement voulu en 4F (variation contrôlée au-delà du débutant) ; son ampleur reste à valider par un expert.
- **Préservation du stimulus** :
  - un seul optionnel retiré par échange, sans recherche combinatoire ;
  - critère « majorité de la dose » : choix de conception (`EXPERT_DESIGN_REVIEW`).
- **Survivants de mutation** : 17, tous sans effet sur une prescription (8 équivalents, 8 de trace, 1 garanti par un invariant testé).
- **Hors 4G, inchangé** :
  - les quatre G1 non signés ;
  - sources non lues en texte intégral ;
  - CORE-EXT-5 et `perSide` ;
  - champs de calibration non lus ;
  - `anchorReviewDue` et `PersonalLoadModel` non branchés.
