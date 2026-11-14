# REKKA V4 — Contrat de refonte VISUELLE GLOBALE pixel-perfect

Statut : cahier d'exécution, **pas** validation visuelle ni autorisation de déployer.
Base locale contrôlée : `e87aa47d64a9e885a94b9ef682cd5d231137fa3b` ; branche `codex/rekka-v4-playfield-exercise-detail`.

## 1. Autorités visuelles et règle de priorité

1. **Accueil V4 déjà validé** : source de vérité pour le rendu réel des composants (typographie embarquée, gabarit téléphone, densité, ombres, boutons, icônes, arrondis, espacement, navigation). Ne modifier **aucun** fichier/style/rendu responsable de son apparence, y compris par effet de cascade.
2. **Planche Playfield Pro fournie par l'utilisateur** : source de vérité pour la composition des six autres écrans (Séance en cours, Progression, Planning, Détail exercice, Bilan, Profil). La planche complète fait 1024 × 1536 px et contient sept écrans avec différentes échelles : elle n'est **pas** une capture de téléphone à afficher telle quelle.
3. **Application réelle** : source de vérité pour les données, libellés métier, états, actions et parcours. Une valeur fictive de la planche n'est jamais une donnée réelle (Alex, niveau/XP, calories, records ou pourcentages non calculés).
4. Dans un conflit fidélité apparente / fonction réelle / accessibilité, conserver le comportement et signaler l'écart documenté, sans inventer d'information.

## 2. Périmètre et interdits

**Protégé intégralement :** Accueil approuvé ; moteurs `packages/*`, logique du planificateur, calculs, modèles, schémas, migrations, persistance, historique, chronomètres, validation des séries ; autres branches ; applications BÊTA / ESSAI / production ; workflows et déploiements. Aucune publication ni push sans autorisation et contrôle des déclencheurs Cloudflare.

**À refaire visuellement :** les six autres pages principales, leurs variations d'état, ainsi que les parcours annexes nécessaires à la cohérence globale : listes de séances, séance musculation, Course, HYROX, Cross-training, historique/progression détaillée, édition du profil, réglages, catalogue, replanification, modales, états vides, erreurs et formulaires de clôture. Ces annexes ne doivent pas être simplifiées ou supprimées.

Architecture : `VITE_REKKA_SKIN=playfield-pro`, `html[data-rekka-theme="playfield-pro"]`, composants React/TypeScript réels ; ni capture intégrée comme interface ni valeurs démo dans le produit. Ne pas étendre les styles à la V3.1 ou aux builds autres que V4.

## 3. Contrat de design partagé (à extraire de l'Accueil SANS le modifier)

- Palette officielle : primaire `#1647C8`, CTA `#FDCB32`, accent corail `#FA6A58`, fond crème `#FFF7EA`, texte `#0E1B35`. L'Accueil utilise quelques teintes dérivées propres au rendu approuvé : mesurer les valeurs effectives et réutiliser celles-ci pour les composants partagés.
- Composants communs : `PageHeader` (retour/titre/menu), `SurfaceCard`, `SportGlyph`, `SegmentedTabs`, `MetricTile`, `ActionButton`, `MiniProgress`, `CircularProgress`, `BottomTabs` (4 destinations), `EmptyState`, `Sheet/Dialog` et `TimerRing` visuels seulement.
- Mesures : capturer à 360, 390, 412 px mobiles ; 1024 px tablette. Standardiser rayon, ombre, épaisseur de trait, marges latérales, écart vertical, tailles et alignements mesurés sur **la build Accueil approuvée**, pas sur une nouvelle interprétation.
- Les interactions doivent rester utilisables : cibles tactiles >=44×44 px, contraste, affichage sans scroll horizontal, focus visible, clavier ouvert, safe areas, zoom texte et états chargement/erreur.
- Interdiction de faire dépendre les composants métier des illustrations de la maquette ; respecter barre/haltères et identifiants exacts d'exercice.

## 4. Six lots d'écrans — composition de référence

### Lot A — Séance en cours
Bandeau supérieur bleu (titre, chronomètre et pause) ; récapitulatif sport/progression ; exercices numérotés ; visuel de l'exercice conforme au matériel ; séries sous forme de grille Série / Charge / Répétitions / Statut ; contrôles −/+ et saisie existants ; validation et dévalidation ; repos circulaire bleu/jaune lié **au vrai chronomètre** ; série suivante ; navigation vers exercice suivant. Vérifier les données d'échauffement (hors volume), pause/reprise, +15 s, arrière-plan, fermeture et restauration. Ne pas masquer les éléments additionnels nécessaires aux autres sports.

### Lot B — Progression
En-tête centré ; sélecteur Semaine/Mois/Année ; anneau d'objectif ; résumé de séances ; tuiles factuelles ; répartition par sport ; courbe issue des vraies séries. Pas de calories estimées inventées, pas de courbe fictive, pas de « +2,5 % » arbitraire ; état « donnée indisponible » clair. Conserver tous les filtres et historiques utiles.

### Lot C — Planning
En-tête avec calendrier ; onglets Semaine/Agenda ; sept lignes des jours avec sport, repos, état, sélection jaune ; sections de détail/organisation et accès aux séances. Préserver demandes non planifiées, conflits, indisponibilités et **aperçu obligatoire Conserver / Appliquer** avant toute replanification.

### Lot D — Détail exercice
En-tête retour/trois points ; pictogramme sport ; titre/chaîne musculaire ; illustration anatomique correspondante ; onglets Infos/Historique/Conseils ; consignes compactes et emplacement média seulement si média vérifié. Gérer le catalogue entier avec messages explicites quand dessin/vidéo spécifique manquent. L'historique doit être filtré par identifiant de mouvement exact.

### Lot E — Bilan de séance
En-tête, médaille de validation, titre de fin de séance ; tuiles durée/séries/données disponibles ; note d'objectif uniquement si vérifiable ; CTA principal jaune, action retour secondaire. Conserver ressenti, douleurs, confirmation d'arrêt/fin, stockage, distinction échauffement/travail. Aucune statistique inventée.

### Lot F — Profil
En-tête paramètres ; zone d'identité issue du profil (avatar réel ou pictogramme neutre) ; objectifs, profil sportif, matériel, santé/récupération, données/sauvegardes, chevrons ; états vides ou sans informations. **Ne pas créer de niveau/XP** pour imiter la maquette.

## 5. Lots transversaux

- T1 : inventaire des routes et états dans `App.tsx`, `screens/*`, `screens/beta0/*`, `sober/*`, `workout/*`; classifier principal / secondaire / modal ; préserver les parcours.
- T2 : inventaire des CSS Playfield existants (`playfield.css`, `fidelity.css`, `reference.css`, `precision.css`, `refinement-pass2.css`, `home-reference.css`, `exercise-detail.css`). Mesurer la cascade avant de supprimer des règles. **`home-reference.css` et ses dépendances validées restent gelés**.
- T3 : créer une couche de styles **non-Accueil** à spécificité contrôlée, après les anciens styles, sans sélecteur global qui altère l'Accueil ; migrer écran par écran et éliminer les `!important` redondants dans le seul périmètre modifié.
- T4 : vérifier icons/pictogrammes, avatars et illustrations ; ne pas substituer d'illustration de mouvement inadéquat ; éviter toute ressource distante obligatoire.
- T5 : vérifier toutes les variations (aucune donnée, programme rempli, séance commencée, partiellement terminée, terminée, erreur, petit écran, longue chaîne de texte).

## 6. Contrôle pixel-perfect / non-régression

Pour chaque écran et état, conserver **l'image source**, la **capture de build** aux mêmes dimensions utiles, une **superposition 50 %**, une **différence** et un relevé JSON de positions des blocs. Comme les écrans sont de tailles différentes sur la planche, recadrer et normaliser explicitement les coordonnées, ne jamais comparer la planche entière à une viewport arbitraire.

Critères d'acceptation :
1. Accueil : captures avant/après identiques au niveau de rendu pertinent (zéro régression graphique) ; aucun changement de comportement.
2. Six vues principales : structure, ordre, alignements, typographie, couleurs, rayons, ombres, icons et pictos mesurés et justifiés ; écarts résiduels documentés. « Pixel-perfect » seulement après **comparaison de captures compilées**, jamais à partir du CSS seul.
3. 360 / 390 / 412 / 1024 px : aucun débordement horizontal, aucune commande cachée par clavier, tabbar ou dock de repos, cibles >=44 px, contraste vérifié, états sans données cohérents.
4. Tests `pnpm check`, `pnpm kairo:build:beta`, `apps/kairo/scripts/e2e-v4-screens.mjs`, E2E V3.1/BÊTA, tests d'échauffement, chronos, stockage, sérialisation, historique, migration, replanification.
5. Diff de périmètre : aucune modification de `packages/*`, écrans/feuilles de l'Accueil, workflows, migrations, données réelles. Confirmation du SHA distant BÊTA/production inchangé.
6. Validation **écran par écran** par l'utilisateur, puis vérification globale des transitions. Pas de fusion ni déploiement sans nouvelle autorisation.

## 7. Ordre d'exécution recommandé

0. Baseline : figer HEAD, sauvegarde git bundle, captures approuvées de l'Accueil ; identifier références visuelles et fixtures de démonstration isolées.
1. Socle visuel partagé **non-Accueil** et pages secondaires : typographie, système cartes, titres, navigation.
2. **Séance en cours + repos** (écran le plus critique fonctionnellement).
3. **Planning** et ses états / replanification.
4. **Progression** (données réelles, graphiques et états vides).
5. **Détail exercice** (réutiliser le commit existant, ne pas reconstruire).
6. **Bilan de séance**, puis **Profil**.
7. Toutes les pages secondaires et modales ; captures, correction des diffs, tests et revue finale.

## 8. Situation vérifiée lors de l'établissement du cahier

- Dépôt local présent et branche `codex/rekka-v4-playfield-exercise-detail` au SHA `e87aa47d64a9e885a94b9ef682cd5d231137fa3b`.
- Référence utilisateur du tour actuel consultée (planche sept écrans).
- Sources et test existants inspectés ; `apps/kairo/scripts/e2e-v4-screens.mjs` couvre quatre largeurs.
- Pas de `node_modules` dans cette copie : aucun test/build/capture n'est certifié dans ce travail préparatoire.
- **Ce document ne prétend pas que les six pages ont déjà été refaites ou validées.**
