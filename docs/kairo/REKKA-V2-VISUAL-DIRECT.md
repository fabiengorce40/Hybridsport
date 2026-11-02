# REKKA V2 — refonte visuelle directe

Branche : `claude/rekka-v2-visual-direct`, créée depuis `claude/rekka-v2-2b`, commit de départ `cdec1cf113071133bbdc4e7939aa88b7f5a12090`.

## Périmètre et analyse

La branche de départ contient un prototype React/TypeScript indépendant dans `apps/kairo/prototype`. Les interactions et données de démonstration y sont déjà isolées de l'application sportive. Cette refonte conserve cette architecture : aucun branchement au stockage ou aux moteurs n'a été ajouté. Le bandeau de démonstration reste visible. Aucune fonctionnalité de l'application publiée n'a été remplacée.

Les archives fournies contiennent des illustrations géométriques et un logo vectoriel typographique, différents des scènes anime et du lettrage au pinceau de la planche jointe. Elles ne contiennent pas les sources séparées des cinq illustrations cinématographiques représentées sur cette planche.

| Écran | Écart initial | Modification |
| --- | --- | --- |
| Accueil | Ville géométrique, logo typographique | Scène anime avec personnage roux, logo pinceau vectorisé depuis le logo autonome de la planche, kanjis vectoriels, cadrage et carte du jour |
| Planning | Paysage géométrique, cartes espacées | Paysage japonais illustré, cartes plus compactes, couleurs et état du jour |
| Séance | Décor abstrait de musculation | Athlète anime dans une salle néon, bannière et blocs de séries ajustés |
| Progression | Décor géométrique, filtres défilants | Paysage illustré, quatre filtres simultanément visibles, cartes sombres et graphique conservé |
| Profil | Initiale et tuiles à pictogrammes | Avatar anime, paysage japonais, vignettes illustrées et onglets conservés |

Les nouveaux décors sont des **recréations**, pas les sources originales exactes de la planche. Le paysage est partagé entre Planning, Progression et Profil ; les vignettes de disciplines réemploient les décors. Les polices locales Inter et Barlow Condensed sont conservées. Aucun niveau ou XP fictif n'a été ajouté. Ces écarts sont explicites pour la validation visuelle.

## Ressources et provenance

Les ressources nouvelles se trouvent dans `apps/kairo/prototype/art/visual/` et ne remplacent aucun asset partagé de production.

- `logo-brush.svg` et `kanji.svg` : contours vectorisés des logos autonomes fournis dans la planche. Aucune capture d'écran n'est utilisée comme interface.
- `hyrox.svg` et `cross-training.svg` : icônes de l'archive révisée fournie, avec couleur de trait explicite pour fonctionner dans une balise `img`.
- `accueil.webp`, `paysage.webp`, `seance.webp`, `avatar.webp` : illustrations originales recréées avec l'outil intégré imagegen, converties en WebP pour le prototype. Elles ne contiennent aucune interface.

Prompts de création :

1. Accueil : illustration anime cinématographique, jeune athlète roux de dos assis au bord de l'eau, hoodie sombre avec petit emblème flamme, skyline japonaise cyberpunk, soleil doré, reflets cyan et magenta, encrage détaillé et cel shading, paysage 16:9, sans texte ni interface.
2. Paysage : vallée japonaise alpine, lac turquoise, torii rouge, ruine en arche de pierre, soleil doré et cerisiers, ombres bleu nuit, nuages magenta, paysage anime cinématographique 16:9, sans texte ni interface.
3. Séance : athlète roux musclé soulevant des haltères, vue arrière trois quarts, salle moderne à éclairage néon magenta/cyan, sujet à droite et espace sombre à gauche, encrage anime détaillé, paysage 16:9, sans texte ni interface.
4. Avatar : portrait carré anime d'un jeune homme roux aux yeux ambrés et quelques taches de rousseur, hoodie noir, vue trois quarts, fond cyan/violet et lumière magenta, sans texte ni interface.

## Interactions conservées

Navigation à cinq onglets ; ouverture de séance depuis l'accueil et le planning ; planning liste/grille et filtrage par jour ; séries cochables, champs de répétitions/charge et phases ; chronomètre de séance et pause ; chronomètre de repos et ajout de dix secondes ; filtres discipline/période et graphique ; onglets Objectifs/Stats/Badges du profil. Les contrôles qui étaient déjà des simulations ou des emplacements réservés restent tels quels.

## Reproduire les vérifications

```sh
pnpm install --frozen-lockfile
TZ=UTC pnpm check
pnpm --filter @hybridsport/kairo proto:build
pnpm --filter @hybridsport/kairo proto:preview
E2E_URL=http://127.0.0.1:4180 node apps/kairo/scripts/e2e-prototype.mjs docs/kairo/captures/visual-direct
```

Captures Chromium en émulation Android tactile : largeurs CSS 360 et 390 px, hauteur 800 px, DPR 3, locale française, fuseau Europe/Paris. Il ne s'agit pas de tests sur téléphone physique. Les fichiers `v2-*-review-*.png` montrent les cinq écrans à leur état initial ; les autres captures montrent également les états d'interaction et les pages complètes.

## Isolation

Aucun changement dans `packages/`, `apps/kairo/src/`, les manifestes, service workers, workflows, configurations de build, BÊTA ou production. Les workflows de déploiement existants ciblent d'autres branches ; aucun déploiement n'est lancé. Aucun merge.

## Résultats de validation — 27 octobre 2026

- `TZ=UTC pnpm check` : réussi, TypeScript et ESLint sans erreur ; 261 fichiers de tests réussis, 2 ignorés ; **3 024 tests réussis, 2 ignorés**.
- `proto:build` : réussi.
- E2E Chromium Android 360/390 : réussi. Aucun débordement horizontal, aucune erreur navigateur, aucune requête externe, aucune écriture dans le stockage local ; logo et illustrations chargés ; commandes principales accessibles ; filtres de discipline et navigation tactiles d'au moins 44 px de haut.
- `git diff --check` : réussi.
- Revue visuelle des captures : logo pinceau, kanjis sans dépendance à une police japonaise système, icônes révisées avec couleurs explicites, avatar et illustrations affichés.
- Premier lancement de la suite sans `TZ=UTC` : deux échecs dans `rc43-free-run-type-dom.test.tsx`, reproduits sur le commit de départ dans un worktree séparé (décalage horaire dans les identifiants de course). La suite complète passe en UTC, sans modification de ces tests ni du code sportif.

Planche comparative : [revue 360/390](captures/visual-direct/revue-360-390.jpg).
