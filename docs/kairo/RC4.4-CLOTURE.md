# REKKA — Clôture RC4.4 (bilan archivé)

| | |
|---|---|
| **Statut** | **Clôturé**, accord du 2026-10-19 |
| **Commit validé** | `9d6440a` sur `claude/kairo-rc4-dev` (identique à `origin/claude/kairo-rc4-dev` à la clôture) |
| **Base de comparaison** | `b8e312b` (RC4.3) |
| **Documents liés** | `RC4.4-DESIGN.md` (audit, décisions D1–D8, étude G5) · `RC4.4-REPORT.md` (rapport détaillé) |
| **Hors RC4.4** | Aucune fusion vers TEST ou production, aucun déploiement. Branches TEST, production et repli (`0cf2ceb`) inchangées. |

---

## 1. Vérifications de clôture (sans relancer les tests)

- **Répertoire de travail propre :** `git status` est vide, et `HEAD` = `origin/claude/kairo-rc4-dev` = `9d6440a`.
- **Les résultats correspondent au commit.** Comparaison des horodatages des journaux de validation avec ceux des fichiers suivis :
  - aucun fichier **source** n'a été modifié après le build, l'E2E ou `pnpm check` ;
  - après le build et l'E2E, seuls des rapports de test ont été réécrits par la suite de tests, au contenu identique (arbre propre), ainsi que le snapshot `strength-scenario-b.md` ;
  - après `pnpm check`, seule la ligne de validation de `RC4.4-REPORT.md` a été modifiée.

| Étape | Résultat |
|---|---|
| `pnpm check` (typage racine et application, ESLint, Vitest) | ✅ 240 fichiers, 2 874 tests, 1 ignoré (préexistant) |
| `pnpm kairo:build` | ✅ (avertissement préexistant sur la taille des chunks) |
| `pnpm kairo:e2e` (Chromium mobile, `vite preview`) | ✅ 221 vérifications |

---

## 2. Fonctionnalités livrées

| Lot | Livré | Persistance |
|---|---|---|
| **A** — placement global G5 (F9) | Second passage du planificateur, déclenché seulement par des Full Body à J/J+1. Paramètre gouverné `planner.globalPlacement` (G3, TEST_ONLY). Critères existants, garde par replanification réelle et par groupe musculaire. V0 gardé et motivé sinon. | Aucune nouvelle structure : codes de raison et identifiant de simulation dans des tableaux existants |
| **B** — avertissements du planning (F10, F11) | 7 jours sur 7, plus longue suite (semaine précédente comprise), Full Body J/J+1 non évitables, conflits multisports non résolus. Courses libres comprises. Aucune séance retirée. | Aucune (calcul à la lecture) |
| **D** — déficit de volume (D6) | Séries retirées par groupe après un allègement de Musculation au démarrage. Aucune redistribution. Rien d'affiché si le calcul n'est pas fiable. | Aucune |
| **E** — HYROX au démarrage (D8) | Recalcul avec la station persistée du programme. Garde de reproductibilité, douleur et sécurité inchangées. | Aucune |
| **C** — avertissement musculaire et maintien | **Non livré** (migration et repli à présenter d'abord) | — |

### Effets mesurés (banc RC4, 6 profils × 6 semaines)
- **P1 :**
  - Full Body J/J+1 : 6 → 1 ;
  - enchaînements durs : 16 → 4 ;
  - quadriceps 3,7 → 7,2, ischio-jambiers 5,3 → 8,5, fessiers 7,8 → 11,5.
- **P3 :**
  - Full Body J/J+1 : 6 → 5 ;
  - jours consécutifs max : 4 → 3 ;
  - conflits M3 restants : 2 → 1 ;
  - bas du corps : +1,0 / +0,5 / +1,2.
- **P1b, P2, P4, P5 :** identiques à V0 (banc complet et matrice identique à `b8e312b`).
- **Course :** structures identiques pour les 6 profils.
- **Séances :** aucune supprimée, aucune non placée.
- **Coût du placement global :** P2 passe de 1,8 s à 10,2 s sur 6 semaines, soit environ 1,4 s par planification de semaine.

---

## 3. Tests ajoutés ou réécrits

| Fichier | Rôle |
|---|---|
| `packages/planner/tests/m3/g5-global-placement.test.ts` (15) | Paramètre absent ou PRODUCTION ⇒ V0 exact ; V0 gardé et motivé ; port sans mesure par groupe ; déterminisme |
| `packages/app-core/tests/rc44/rc44-week-load.test.ts` (14) | Identité V0 pour P1b, P2, P4, P5 ; gain P3 ; avertissements ; déficit ; HYROX au démarrage |
| `apps/kairo/tests/rc44-week-load-dom.test.tsx` (3) | Bandeau du Planning, absence de bandeau, déficit en français |
| `rc3-test/rc1-migration.test.ts` | G5 désactivé ⇒ empreinte RC1 exacte ; G5 actif ⇒ seule la trace de simulation est ajoutée |
| `rc4-audit/rc4-findings.test.ts` | F4 et F13 : constat V0 conservé et nouveau comportement documenté |
| Rapports régénérés | `strength-scenario-b.md`, `rc4-matrice.md` (P1 et P3 seulement), tailles d'état (+0,1 à +0,8 %) |

---

## 4. Limites connues (reprises de `RC4.4-REPORT.md` §5)

1. **Effet en cascade de G5 sur les semaines suivantes** (moyennes sur 6 semaines). Aucune semaine où G5 a déplacé des séances n'a fait baisser un groupe :
   - P1 : tronc 9,2 → 7,8, épaules −0,6, dos −0,1 ;
   - P3 : pectoraux −0,5, dos −0,2, épaules −0,1.
2. **P2 : F9 subsiste**, faute de meilleur placement à règles constantes. Il est signalé par un avertissement.
3. **Aucun seuil gouverné de « longue suite » :** la suite est affichée en information ; l'avertissement fort est réservé à 7/7.
4. **HYROX :** le moteur H2 reçoit les voisines mais ne les applique pas à la dose (aucune règle de charge).
5. **Déficit :** limité à la séance allégée, et à la Musculation avec exercices connus.
6. **Trace de simulation :** chaque semaine Beta 0 planifiée après la mise à jour porte `planner.globalPlacement`.
7. **Coût sur P2** (≈ 1,4 s par semaine planifiée) : mesuré sur la machine de test seulement.
8. **Lot C** non implémenté.

---

## 5. Dettes techniques identifiées

| # | Dette | Gravité | Proposition |
|---|---|---|---|
| T1 | Les déplacements G5 (`GLOBAL_PLACEMENT_APPLIED`) sont tracés mais **pas expliqués dans l'interface** : l'utilisateur ne sait pas pourquoi un Full Body a changé de jour. Les codes inconnus ne sont jamais affichés bruts. | Moyenne (traçabilité côté utilisateur) | RC4.5 — C1 |
| T2 | Coût de G5 **non mesuré sur téléphone** ; 6 replanifications complètes refusées chaque semaine sur P2. | Moyenne | RC4.5 — C2 (mesure avant toute optimisation) |
| T3 | `week-load.ts` répète des codes de raison en chaînes littérales au lieu des constantes du planificateur (`GP_CODES`). App-core dépend déjà de `@hybridsport/planner`. | Faible | RC4.5 — C3 |
| T4 | `planCore` exporté par `planner.ts` mais pas par l'index ; les tests importent le chemin interne. | Faible | RC4.5 — C3 |
| T5 | Durée de la suite de tests en hausse : simulations 6 semaines répétées (`rc4-findings`, `rc44`, matrice). | Faible à moyenne | RC4.5 — C4 (mutualiser les simulations par fichier) |
| T6 | Version de planification `beta0-m31` non incrémentée : les semaines déjà planifiées et non commencées ne profitent pas de G5. Choix prudent, à confirmer. | Décision | RC4.5 — décision P-V |
| T7 | Lot C : migration et repli non présentés. | Décision | RC4.5 — conception seulement |

---

## 6. Décisions encore ouvertes à la clôture

| Décision | Origine |
|---|---|
| Seuil de « longue suite » de jours consécutifs (ou aucun) | RC4.4 lot B |
| Régénération des semaines non commencées pour appliquer G5 (incrément de version) | RC4.4 lot A |
| P2 : accepter des Full Body à J/J+1 ou le rapprochement Musculation / Cross-training | D2, étude G5 |
| R6, R7, R9 (Musculation : compromis bas du corps, couverture et excès, variation) | Audit RC4, prévues en RC4.5 |
| Migration et repli du lot C | D7 |
