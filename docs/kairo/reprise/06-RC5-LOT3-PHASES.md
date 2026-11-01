# Reprise RC5 — Lot 3 : phases des séries Musculation

- **Branche :** `claude/rekka-reprise-20261031`, locale.
- **Repris de RC5.4 lot A (`4c5b570`) :** le regroupement des séries par phase, sous un titre explicite.
- **Non repris (hors périmètre, aucune nouvelle information ni aucun doublon) :**
  - l'étiquette « Adaptée » par exercice : déjà expliquée par l'avis d'adaptation de la séance ;
  - l'état « en cours » de série ;
  - le renommage « Back-off N » ;
  - les styles du chronomètre RC5.4.

## 1. Règle

Les phases sont lues **uniquement** sur le type de série prescrit par le moteur (`kind`, champ obligatoire du contrat `domain` depuis l'origine).

| Type prescrit | Phase affichée |
|---|---|
| `rampup` | **Montée en charge** · « hors volume et progression » |
| `working`, `top_set`, `amrap` | **Séries de travail** · « comptent pour la progression » |
| `backoff` (seulement s'il est prescrit) | **Séries de recul** · « charge réduite après le travail » |

- **Regroupement :** contigu, indices d'origine conservés. Aucune série n'est créée, supprimée, déplacée ou recalculée.
- **Inchangés :** charges, répétitions, RIR, repos, volume et progression.
- **Exercice à une seule phase** (pas de montée en charge, ou séance ancienne sans montée) : **affichage historique identique**, sans aucun titre. Aucune classification n'est inventée.
- **Volume et progression :** tous les moteurs excluent déjà `rampup` (`progression.ts`, `session-demand.ts`, `stimulus-preservation.ts`, `checks.ts`, `planner/ports.ts`…). Les tests vérifient que les montées validées ne figurent jamais dans l'exposition de progression.

## 2. Ancien et nouvel affichage (captures `captures-lot3/`)

| Avant (`avant-360/390-01-exercice.png`) | Après (`apres-360/390-01/02/03-*.png`) |
|---|---|
| Montées et séries de travail dans une seule liste, distinguées par la seule bordure de couleur et le libellé « Montée N » | Deux groupes titrés : « MONTÉE EN CHARGE · 2 séries · hors volume et progression » et « SÉRIES DE TRAVAIL · 2 séries · comptent pour la progression » |
| Consignes : « N séries de montée avant le travail. » | Ligne retirée (doublon du titre de phase) |
| « Série de recul » dans l'objectif de chaque série de recul | Retiré **sous** le titre « Séries de recul » (doublon) ; inchangé pour un exercice sans titres |
| — | Titres de la couleur de la bordure existante de leurs séries (V2 : montée turquoise, travail vert-jaune) ; l'information est portée par le texte, jamais par la couleur seule |

**Inchangés :**
- lignes de série et libellés « Montée N » / « Série N » ;
- saisie des répétitions et de la charge ;
- bouton de validation (44 px), RIR, repos, chronomètre global ;
- en-tête « N séries » (séries de travail) et repos.

## 3. Données

**Aucune modification de données :** pas de nouveau champ, schéma v5 inchangé, aucune migration. Le lot ne touche que l'affichage (`StrengthWorkout.tsx`, deux feuilles de style).

## 4. Tests

| Test | Résultat |
|---|---|
| `apps/kairo/tests/rc5-lot3-phases-dom.test.tsx` (repris de `rc54-phases-dom.test.tsx` et complété) | 5/5 |
| E2E `e2e-rc5-lot3-phases.mjs`, 360 et 390 px (mobile, échelle 3) | 5 vérifications par largeur, OK |
| E2E parcours complet | **342** OK |
| E2E chronomètre lot 2, séance mobile, répétitions, personnalisation, jours Musculation, hors ligne, sécurité des données | OK |
| E2E migrations depuis la build V2.1 (v1–v3) et la build `b850b98` (v1–v4) | OK |
| `pnpm check` | **3 122 réussis**, 0 échec |

**Test unitaire et d'écran** (5 cas) :
- regroupement et indices ;
- aucune série ajoutée ni retirée ;
- séance réelle :
  - titres ;
  - nombre et types de séries identiques à la prescription ;
  - doublon retiré ;
  - validation, décochage et revalidation ;
  - repos et chronomètre global ;
  - prescription inchangée ;
  - exposition limitée à la série de travail ;
  - séance terminée ;
- rechargement et import sur un autre appareil ;
- séances terminées d'une ancienne version (fixture v2) :
  - séries identiques ;
  - titres seulement si plusieurs types ;
  - données et performances conservées.

**E2E** (5 vérifications par largeur) :
- phases et nombre de séries ;
- boutons de validation ≥ 44 px et aucun défilement horizontal ;
- validation, repos et chronomètre global ;
- rechargement ;
- séance terminée, montées hors exposition, aucune erreur JavaScript.
