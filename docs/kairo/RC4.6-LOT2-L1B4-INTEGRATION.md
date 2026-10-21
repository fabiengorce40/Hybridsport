# RC4.6 — Lot 2 : L1b-4, tirage complémentaire à temps résiduel

**Décision appliquée :** lot 2 autorisé, en contenu versionné.

**Branche :** `claude/kairo-rc4-dev`. Running, TEST et production : inchangés. Aucune fusion, aucun déploiement.

## 1. Règle intégrée

Surcouche `packages/strength/tests/fixtures/l1b4.ts` : ruleset `0.7.0-strength-l1b4`, sur L1-V3, sur F6. **Aucun code des moteurs.**

| Paramètre | Changement |
|---|---|
| `strength.needs` | Besoin `pull_complement` : même exigence que le tirage horizontal. |
| `strength.archetypes` (Full Body seulement) | Emplacement `fb.pull_c` : accessoire **facultatif**, suivi, **à temps résiduel** (servi après toute la composition, accessoires prioritaires et mollets compris), **jusqu'à la cible hebdomadaire** de ses groupes (plancher du dos). Attributs F6 R1 et R2 existants. |
| `strength.interference` | `pull_complement` ajouté aux besoins **retirés** sous interférence de **préhension** (règle existante). |
| `strength.goals`, `strength.stimuli`, `strength.substitution.fallbackNeeds` | Besoin ajouté en dernier ; aucun repli de substitution. |

- **Jamais forcé :** le plancher du dos n'est servi que s'il reste du temps et qu'aucune voisine ne sollicite la préhension.
- **Haut / Bas, bloc Cross-training, catalogue :** inchangés.
- **Registre :** contenu courant L1b-4 ; L1-V3, F6 et 4F conservés et relus.

## 2. Banc RC4.6 : avant / après (8 profils, 6 semaines)

Séries par semaine (moyenne). ↓n : semaines sous le plancher ; ↑n : semaines au-dessus de la borne haute.

| Profil | Dos | Bras | Épaules | Pectoraux | Quadriceps | Ischio | Fessiers | Mollets | Tronc | Poussée / tirage | Durée moy. / max | Allègements | Exercices distincts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 avant | 9,2 ↓5 | 16,3 ↑6 | 13,6 | 13,7 | 7,5 ↓5 | 8,5 ↓2 | 11,8 | 1,3 ↓4 | 7,8 | 1,99 | 50 / 63 | 37 | 14 |
| P1 après | 10,5 ↓2 | 17 ↑6 | 13,6 | 13,7 | 7,5 ↓5 | 8,5 ↓2 | 11,8 | 1,3 ↓4 | 7,8 | 1,74 | 51 / 63 | 37 | 15 |
| P1b avant | 10,2 | 18,3 ↑6 | 15,2 | 12,3 | 9,2 ↓1 | 8,2 ↓1 | 12,3 | 3,3 ↓1 | 9,4 ↑2 | 1,91 | 44 / 60 | 62 | 16 |
| P1b après (identique) | 10,2 | 18,3 ↑6 | 15,2 | 12,3 | 9,2 ↓1 | 8,2 ↓1 | 12,3 | 3,3 ↓1 | 9,4 ↑2 | 1,91 | 44 / 60 | 62 | 16 |
| P2 avant | 9,3 ↓4 | 16,4 ↑6 | 13,7 | 13,7 | 10,7 ↓3 | 11,7 | 15,2 ↑6 | 3,3 ↓1 | 7,6 | 1,97 | 56 / 64 | 0 | 14 |
| P2 après | 10,5 ↓1 | 17 ↑6 | 14 | 13,7 | 10,7 ↓3 | 11,7 | 15,2 ↑6 | 3,3 ↓1 | 7,6 | 1,74 | 57 / 64 | 0 | 15 |
| P3 avant | 9 ↓5 | 16 ↑6 | 13,5 | 13,2 ↓1 | 9,2 ↓4 | 9,8 ↓1 | 12,8 ↑1 | 0,7 ↓5 | 7,8 | 1,98 | 51 / 63 | 17 | 15 |
| P3 après | 9,8 ↓3 | 16,4 ↑6 | 13,4 | 13,2 ↓1 | 9,2 ↓4 | 9,8 ↓1 | 12,8 ↑1 | 0,7 ↓5 | 7,8 | 1,82 | 51 / 64 | 17 | 16 |
| P4 | sans Musculation, identique | | | | | | | | | | | | |
| P5 avant | 9,3 ↓4 | 16 ↑6 | 14,3 | 13,2 | 4,3 ↓5 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 9,1 | 1,97 | 46 / 70 | 79 | 13 |
| P5 après | 10,8 | 16,8 ↑6 | 14 | 13,2 | 4,3 ↓5 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 9,1 | 1,69 | 47 / 70 | 79 | 14 |
| S3 avant | 9,5 ↓3 | 16,2 ↑6 | 14,1 | 12,8 | 10,7 ↓3 | 11,7 | 15,2 ↑6 | 1,3 ↓4 | 7,1 | 1,89 | 53 / 63 | 0 | 12 |
| S3 après | 10,2 ↓1 | 16,5 ↑6 | 14,1 | 12,8 | 10,7 ↓3 | 11,7 | 15,2 ↑6 | 1,3 ↓4 | 7,1 | 1,76 | 53 / 63 | 0 | 13 |
| S4 avant | 10,2 | 18,3 ↑6 | 15,2 | 12,3 | 16,3 | 12,2 | 16,2 ↑6 | 0 ↓6 | 9 | 1,91 | 48 / 60 | 0 | 15 |
| S4 après (identique) | 10,2 | 18,3 ↑6 | 15,2 | 12,3 | 16,3 | 12,2 | 16,2 ↑6 | 0 ↓6 | 9 | 1,91 | 48 / 60 | 0 | 15 |

## 3. Conditions de la décision

| À conserver | Résultat |
|---|---|
| Volumes des jambes et des mollets | **Identiques** sur les 8 profils, **P3 (HYROX) compris** : quadriceps, ischio-jambiers, fessiers et mollets inchangés au dixième de série. |
| Limites de durée | Moyenne +0 à +1 min, maximum +0 à +1 min. Aucun dépassement du temps disponible. |
| Progressions existantes | Aucun retour en calibration, aucune baisse de charge. Les tracks actives des anciens états restent actives la semaine suivante (test). |
| Variété des exercices | +1 exercice distinct sur 6 semaines (rowing machine). Similarité entre séances consécutives : −0,01 à +0,01. |
| Décisions M3 | Arbitrages et allègements **identiques** sur tous les profils. Le temps résiduel est hors de la mesure G5 (garde R3 étendue au tirage complémentaire). |
| Relecture des anciennes semaines | Trois états écrits avant L1b-4 (S3 semaine 2, P3, P5) : provenance L1-V3 conservée. Les 4 chemins de démarrage donnent un résultat identique au code d'avant. |
| P3 (HYROX) | Le tirage complémentaire n'est **jamais** ajouté un jour d'interférence de préhension. Son retrait est tracé (`SELECT.SLOT_OMITTED`, cause `interference`). Test dédié. |
| Plancher du dos non forcé | Dos sous le plancher : P1 5 → 2, P2 4 → 1, **P3 5 → 3**, P5 4 → 0, S3 3 → 1 semaines. Le plancher n'est pas atteint quand le temps ou la récupération ne le permettent pas. |

**Effets à votre appréciation :**
- **Bras :** +0,3 à +0,8 série par semaine sur le banc. Le rowing ajoute des séries secondaires de biceps (× 0,5). Dans les simulations de consolidation, le test de garde R1 est ajusté de +1,5 pour les bras uniquement, avec justification.
  - Les bras restaient déjà au-dessus de la borne haute avant L1b-4 : question de convention de comptage (lot 4).
- **Rapport poussée / tirage :** 1,9–2,0 → 1,7–1,8.
- **Durée hebdomadaire planifiée** (simulation multi-configuration) : +4 à +8 min par semaine.

## 4. Autres rapports régénérés

- **Consolidation, multi-configuration** : le dos passe de 9 à 11 séries planifiées (« achieved »), les bras de +0,5 à +1, les jambes et mollets sont identiques.
- Autres rapports : `c43-comparison.md`, `rc4-matrice.md`, `strength-scenario-b.md`, `state-size.md`.
- Fixtures des parcours E2E (lot C, R5.1).
- Tests adaptés, avec justification :
  - `f6-r3-planner.test.ts` : **tous** les emplacements à temps résiduel sont hors de la mesure G5 ;
  - `r1-r2-comparison.test.ts` : marge de bras de +1,5 ;
  - versions attendues du contenu courant.

## 5. Vérifications

- `pnpm check` (typecheck, lint, tests) : **2981 tests réussis**, 2 ignorés.
- `pnpm kairo:build` et `pnpm kairo:e2e` : réussis.
- Nouveau test : `packages/app-core/tests/rc46/l1b4-versioned-content.test.ts` (9 tests). Il couvre :
  - la surcouche, paramètre par paramètre ;
  - le registre ;
  - la relecture des anciennes semaines ;
  - la semaine suivante et les progressions ;
  - la règle de préhension sur P3.
- Surcouche ajoutée à la liste fermée gouvernée du test d'architecture.
