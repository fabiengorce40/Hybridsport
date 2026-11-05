# REKKA V3 — import du bundle et intégration sur la BÊTA

Date : 5 novembre 2026. Branche d'intégration : `claude/rekka-v3-beta-integration`.

## 1. Import du travail graphique

| Élément | Résultat |
|---|---|
| Bundle `REKKA-V3-2996c241.bundle` | `git bundle verify` OK ; base requise `f2218c5` présente |
| Branche importée | `codex/rekka-v3-final-carbon` |
| SHA importé | `2996c24178680a004734a45da33334a7f504a9c4` (identique à l'attendu, aucun objet reconstruit) |
| Publication de la branche graphique | Poussée telle quelle (nouvelle branche, sans force) ; `ls-remote` et l'API GitHub renvoient le même SHA |
| Déclencheurs | Aucun workflow n'écoute `codex/rekka-v3-final-carbon` ; aucun statut ni check-run sur le commit ; pas d'intégration Git → Cloudflare détectée |

Les 7 commits V3 (`f65dcd0` … `2996c24`) reposent directement sur `f2218c5`, la BÊTA publiée. Ils ne modifient ni `.github`, ni les moteurs (`packages/`), ni les migrations.

## 2. Intégration (commits au-dessus de 2996c24)

- **Activation du rendu V3 dans la build BÊTA** : `build:beta` passe `VITE_REKKA_THEME=v2 VITE_REKKA_VISUAL=v3`. `SOBER_V3` reste conditionné à `IS_BETA`, donc la production n'est pas concernée. Un test (`beta-channel.test.ts`) fixe cette commande.
- **Report de séance sûr (P1 WORK-01 et WORK-02)** :
  - WORK-01 : la récupération entre deux séances de Musculation tient compte de la semaine suivante (report du dimanche vers le lundi) ;
  - WORK-02 : un report vers un jour dont la disponibilité est inférieure à la durée de la séance est refusé (`too_short`).
  - Deux tests échouent sans la correction et passent avec.
- **Commentaire périmé** (WORK-07) : `progression-stab-1` est indiquée active sur la BÊTA.
- **Scripts E2E** : ils sont adaptés au rendu V3 (`scripts/lib/v3-ui.mjs`), sans retrait d'assertion.
  - Le chronomètre global, « Terminer la séance » et l'effort (RIR) se trouvent dans « ⋮ Commandes de séance ».
  - La saisie se fait dans l'éditeur de la série choisie.
  - L'export / import se trouve dans « Données & sauvegardes ».
  - L'explication de séance se trouve dans « Objectif séance ».

Aucune politique scientifique nouvelle n'est activée ; seule `progression-stab-1` reste active. Les données, le format 5, les migrations et le préfixe `rekka-beta:` sont inchangés.

## 3. Contrôles

Voir § 5 (résultats de la build V3 locale, version `c0ffee0`).

## 4. Publication

- Cible : workflow `rekka-beta-pages.yml`, déclenché uniquement par un push sur `claude/rekka-beta` ; `CF_PROJECT: rekka-beta`, projet existant (aucune création) ; workflows identiques à `f2218c5`.
- Mode : avance rapide de `claude/rekka-beta` depuis `f2218c5`, sans force.
- Production : `claude/crosstraining-c1-c2-spike-vbg8dv` reste à `f9f7e2e`, non touchée.
