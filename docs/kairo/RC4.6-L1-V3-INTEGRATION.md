# RC4.6 — Intégration L1-V3 : une seule isolation du haut du corps en Full Body

**Décision appliquée :** L1-V3, intégration ciblée autorisée.

**Branche :** `claude/kairo-rc4-dev`. Running, TEST et production : inchangés. Aucune fusion, aucun déploiement.

## 1. Changement

| Élément | Avant (F6, `0.5.0-strength-f6`) | Après (L1-V3, `0.6.0-strength-l1v3`) |
|---|---|---|
| `str_full_body` / `fb.iso_upper` | 1 à 2 exercices | **1 exercice** |
| Autres archétypes : Haut (`up.iso_upper`), Bas, support, bloc Cross-training | — | inchangés |
| Catalogue | `0.3.0-strength-test-f6` | inchangé |
| Code des moteurs | — | **aucune modification** |

- **Contenu versionné, comme F6 :**
  - surcouche déclarative `packages/strength/tests/fixtures/l1v3.ts` ;
  - nouveau contenu courant dans `packages/app-core/src/provisional-content.ts` ;
  - le contenu F6 rejoint le registre `strengthContentFor`, à côté du contenu 4F.
- **Effet :** une séance déjà planifiée garde sa provenance F6 et reste régénérée avec F6. Seules les semaines planifiées après le changement utilisent L1-V3.

## 2. Compatibilité historique (relecture des anciennes semaines)

`packages/app-core/tests/rc46/l1v3-versioned-content.test.ts` : 9 tests.

- **Surcouche :** seul `fb.iso_upper` du Full Body diffère du ruleset F6. Tous les autres paramètres et emplacements sont identiques, vérifiés champ par champ.
- **Registre :** le contenu courant est L1-V3 ; F6 est conservé et relu ; une version inconnue ne renvoie aucun contenu (test F6 existant).
- **Relecture à l'identique :**
  - trois états réels écrits par le code d'avant L1-V3 (`7a8845f`) : S3 semaine 2 avec une semaine réalisée, P1 et P5 semaine 1 ;
  - provenance F6 sur toutes les séances, environnement de régénération F6 ;
  - les 4 chemins de démarrage (contrôle inconnu, fatigue, douleur, course libre la veille) donnent **exactement** les résultats du code d'avant : journal ouvert, contrôle, exercices.
- **Semaine suivante :** planifiée avec L1-V3, au plus une isolation du haut du corps par séance. Les enregistrements des semaines antérieures restent identiques octet pour octet.
- **Preuve que le registre est nécessaire :** les 3 séances F6 non commencées à 2 isolations changeraient toutes si on les régénérait avec le contenu courant.

## 3. Banc qualité : avant / après (8 profils, 6 semaines)

Séries par semaine (moyenne). ↓n : semaines sous le plancher ; ↑n : semaines au-dessus de la borne haute.

Bornes : dos 10–20, pectoraux 10–20, épaules 8–16, bras 6–14, quadriceps 10–18, ischio-jambiers 8–14, fessiers 6–14, mollets 4–10, tronc 4–10.

| Profil | Dos | Pectoraux | Épaules | Bras | Quadriceps | Ischio | Fessiers | Mollets | Tronc | Poussée / tirage | Durée moy. / max |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 avant | 9,2 ↓5 | 14,3 | 15,5 ↑3 | 16,8 ↑6 | 7,2 ↓6 | 8,5 ↓2 | 11,5 | 1,3 ↓4 | 7,8 | 21 / 9,2 (2,28) | 51 / 62 |
| P1 après | 9,2 ↓5 | 13,7 | 13,6 | 16,3 ↑6 | 7,5 ↓5 | 8,5 ↓2 | 11,8 | 1,3 ↓4 | 7,8 | 18,3 / 9,2 (1,99) | 50 / 63 |
| P1b avant | 10,2 | 12,3 | 15,2 | 18,3 ↑6 | 9,2 ↓1 | 8,2 ↓1 | 12,3 | 3,3 ↓1 | 9,4 ↑2 | 19,5 / 10,2 (1,91) | 44 / 60 |
| P1b après (identique) | 10,2 | 12,3 | 15,2 | 18,3 ↑6 | 9,2 ↓1 | 8,2 ↓1 | 12,3 | 3,3 ↓1 | 9,4 ↑2 | 19,5 / 10,2 (1,91) | 44 / 60 |
| P2 avant | 9,3 ↓4 | 14,3 | 15,5 ↑2 | 16,4 ↑6 | 10,8 ↓3 | 11,2 | 14,8 ↑5 | 2,7 ↓2 | 7,6 | 20,5 / 9,3 (2,2) | 56 / 64 |
| P2 après | 9,3 ↓4 | 13,7 | 13,7 | 16,4 ↑6 | 10,7 ↓3 | 11,7 | 15,2 ↑6 | 3,3 ↓1 | 7,6 | 18,3 / 9,3 (1,97) | 56 / 64 |
| P3 avant | 9 ↓5 | 13,8 ↓1 | 15,4 ↑2 | 16,5 ↑6 | 9,3 ↓4 | 9,3 ↓1 | 12,5 | 0,7 ↓5 | 7,8 | 20,7 / 9 (2,3) | 52 / 62 |
| P3 après | 9 ↓5 | 13,2 ↓1 | 13,5 | 16 ↑6 | 9,2 ↓4 | 9,8 ↓1 | 12,8 ↑1 | 0,7 ↓5 | 7,8 | 17,8 / 9 (1,98) | 51 / 63 |
| P4 | sans Musculation, identique | | | | | | | | | | |
| P5 avant | 9,3 ↓4 | 9,8 ↓3 | 16,6 ↑3 | 16 ↑6 | 4,3 ↓5 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 9,1 | 19 / 9,3 (2,04) | 46 / 72 |
| P5 après | 9,3 ↓4 | 13,2 | 14,3 | 16 ↑6 | 4,3 ↓5 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 9,1 | 18,3 / 9,3 (1,97) | 46 / 70 |
| S3 avant | 9,5 ↓3 | 13,5 | 15 | 16,2 ↑6 | 10,8 ↓3 | 11,2 | 14,8 ↑5 | 0,7 ↓5 | 7,1 | 19,2 / 9,5 (2,02) | 53 / 64 |
| S3 après | 9,5 ↓3 | 12,8 | 14,1 | 16,2 ↑6 | 10,7 ↓3 | 11,7 | 15,2 ↑6 | 1,3 ↓4 | 7,1 | 18 / 9,5 (1,89) | 53 / 63 |
| S4 avant | 10,2 | 12,3 | 15,2 | 18,3 ↑6 | 16,3 | 12,2 | 16,2 ↑6 | 0 ↓6 | 9 | 19,5 / 10,2 (1,91) | 48 / 60 |
| S4 après (identique) | 10,2 | 12,3 | 15,2 | 18,3 ↑6 | 16,3 | 12,2 | 16,2 ↑6 | 0 ↓6 | 9 | 19,5 / 10,2 (1,91) | 48 / 60 |


**Continuité, variété, reproductibilité :**

| Profil | Transitions | Exercice changé | Retour en calibration | Baisse de charge | Items chargés | Items « à l'effort » | Exercices distincts | Similarité | Divergences R-A |
|---|---|---|---|---|---|---|---|---|---|
| P1 | 92 → 88 | 13 → 5 | 0 → 0 | 0 → 0 | 66 → 66 | 28 → 24 | 15 → 14 | 0,16 → 0,17 | 0 → 0 |
| P1b | 107 → 107 | 25 → 25 | 0 → 0 | 0 → 0 | 70 → 70 | 37 → 37 | 16 → 16 | 0,69/0,33 → 0,69/0,33 | 0 → 0 |
| P2 | 106 → 104 | 13 → 5 | 0 → 0 | 0 → 0 | 80 → 81 | 28 → 25 | 15 → 14 | 0,23 → 0,24 | 0 → 0 |
| P3 | 97 → 93 | 17 → 7 | 0 → 0 | 0 → 0 | 69 → 69 | 30 → 26 | 17 → 15 | 0,17 → 0,18 | 0 → 0 |
| P5 | 78 → 77 | 19 → 3 | 0 → 0 | 0 → 0 | 44 → 52 | 36 → 27 | 13 → 13 | 0,06 → 0,16 | 0 → 0 |
| S3 | 99 → 99 | 5 → 1 | 0 → 0 | 0 → 0 | 79 → 76 | 22 → 25 | 13 → 12 | 0,23 → 0,24 | 0 → 0 |
| S4 | 122 → 122 | 39 → 39 | 0 → 0 | 0 → 0 | 80 → 80 | 41 → 41 | 15 → 15 | 0,66/0,94 → 0,66/0,94 | 0 → 0 |

## 4. Critères de validation

| Critère | Résultat |
|---|---|
| Aucun nouveau groupe sous son plancher | **Respecté.** Aucune semaine sous le plancher en plus, sur aucun profil. Il y en a moins : P1 quadriceps 6 → 5, P2 mollets 2 → 1, P5 pectoraux 3 → 0, S3 mollets 5 → 4. |
| Épaules | **Plus aucun dépassement** de la borne haute. P1 : ↑3 → 0 ; P2, P3 : ↑2 → 0 ; P5 : ↑3 → 0. Volume −0,9 à −2,3 séries. |
| Pectoraux | −0,6 à −0,7 série (P1, P2, P3, S3), toujours ≥ 12,8 (plancher 10). P5 : **+3,4** (9,8 → 13,2, plus sous le plancher). |
| Dos | **Inchangé** sur tous les profils. Hors du périmètre de V3 : L1-bis. |
| Durées | Moyenne −1 à 0 min, maximum −2 à +1 min, aucun dépassement du temps disponible. |
| Progressions | Aucun retour en calibration, aucune baisse de charge ni de répétitions. Exercices changés entre deux expositions : 13 → 5 (P1), 17 → 7 (P3), 19 → 3 (P5). Séances plus stables. |
| Haut / Bas (P1b, S4) et P4 | Strictement identiques. |
| Interférences, arbitrages, R-A | Inchangés. 0 divergence du planificateur. |

**Écarts à signaler (non bloquants, à votre appréciation) :**
- **Fessiers au-dessus de la borne haute une semaine de plus** en P2 (5 → 6), P3 (0 → 1) et S3 (5 → 6). Volume +0,3 à +0,4 série.
  - **Cause :** le temps libéré par la seconde isolation profite au squat bulgare et au leg curl (ischio +0,5).
  - La borne haute est un seuil doux : statut F5, sans blocage.
- **Pec deck toujours présent** dans 16 à 17 séances Full Body sur 18. C'est l'élévation latérale qui disparaît presque toujours. La rotation des isolations (B3, lot L6) n'est pas traitée par V3.
- **Exercices distincts sur 6 semaines :** −1 à −2 par profil (élévation latérale). Similarité entre séances consécutives : +0,01 en général, **P5 0,06 → 0,16**.
- **Autres rapports régénérés (cause commune : une isolation de moins)** :
  - `multi-config-4-semaines.md` : config. B, bras 13,8 → 10,8 (extension triceps retirée) ; config. C, pectoraux 14,8 → 13,8, épaules 15,6 → 13,6.
  - Config. C, séance du 16 octobre : 4 exercices. Le Pallof est omis par la règle existante « volume au-dessus de la borne haute » : le tronc était déjà servi plus tôt dans la semaine. Le volume hebdomadaire du tronc est inchangé (7).
  - `c43-comparison.md`, `rc4-matrice.md`, `strength-scenario-b.md`, `state-size.md` (état persisté −1 %), fixtures des parcours E2E (lot C, R5.1).

## 5. Vérifications

- `pnpm check` (typecheck, lint, tests) : **2960 tests réussis**, 2 ignorés.
- `pnpm kairo:build` et `pnpm kairo:e2e` : réussis.

## 6. Conséquences sur les programmes existants

- **Semaines déjà planifiées :** aucune. Contenu persisté F6, relu et régénéré avec F6.
- **Nouvelles semaines Full Body :** une isolation du haut du corps au lieu de deux, la plupart du temps le pec deck.
- **Élévations latérales :** elles n'étaient pas suivies (accessoire « à l'effort ») ; aucune progression n'est donc interrompue.
- **« Modifier » une semaine non commencée :** elle est replanifiée avec le contenu courant (comportement F6-5 existant, testé).
