# REKKA V4 — Playfield Pro (branche graphique isolée)

## Référence graphique
Maquette Playfield Pro validée dans la conversation le 10 novembre 2026 :
sept vues — Accueil, Séance en cours, Progression, Planning, Détail exercice,
Bilan de séance et Profil — et illustration de développé couché corrigée.

**La maquette est une référence visuelle et NON un écran à incruster.**
Chaque élément visible doit être un composant React/TypeScript et CSS.
Aucune donnée sportive, valeur de performance ou statistique d’illustration
ne doit être utilisée en lieu et place des sélecteurs métier réels.

### Palette
- Bleu royal primaire : `#1647C8`
- Jaune d’action : `#FDCB32`
- Corail secondaire : `#FA6A58`
- Fond crème : `#FFF7EA`
- Texte bleu nuit : `#0E1B35`

La V4 abandonne le jaune-vert, les fonds de magnésie et l’ambiance carbone
de la BÊTA V3.1. Les contrastes, les tailles tactiles et la hiérarchie
fonctionnelle priment sur les animations.

## Architecture d’intégration
- Source BÊTA protégée : `claude/rekka-beta` à `3aa56291f4ce5b4697dd32760e32b89009ceb3f4`.
- Branche : `codex/rekka-v4-playfield-pro`.
- Thème conditionné par `SOBER_V3`, plus attribut HTML `data-rekka-theme="playfield-pro"`.
- V3.1 conservée comme ossature fonctionnelle : accordéons des exercices,
  poids/répétitions modifiables dans les lignes, chronomètres persistants,
  repos flottant, historique, validation et confirmation de fin de séance.
- Illustration neuve `playfield/assets/barbell-hero.svg` : barre et disques
  géométriquement coaxiaux, centres sur un même axe horizontal.
- SVG REKKA neuf ; pas d’import d’une capture de maquette comme interface.

## Écrans et contraintes
1. **Accueil** : salutation issue du profil, prochaine séance depuis la
   projection canonique, CTA réel, sport et semaine réels.
2. **Séance en cours** : cinq exercices si le programme en a cinq, pas
   « cinq » en dur ; mêmes prescriptions, mêmes brouillons, aucune valeur
   fictive, mêmes actions existantes.
3. **Progression** : `progressView` uniquement ; courbes des vraies données,
   historique réel, aucun KPI ou trophée inventé.
4. **Planning** : semaines et contraintes existantes ; conservations des
   avertissements, replanification avec consentement, séances non placées.
5. **Détail exercice** : consulter les prescriptions réelles et les options
   existantes, sans déformer le geste ou le matériel.
6. **Bilan de séance** : conserver le dialogue de confirmation, le ressenti,
   les douleurs déclarées et les statistiques enregistrées seulement.
7. **Profil** : objectifs, matériel, sports, sauvegarde et paramètres existants.

## Contrôles bloquants AVANT toute proposition de publication
- `pnpm check`, typecheck, ESLint, build BÊTA.
- E2E V3.1 et E2E BÊTA à 360 / 390 / 412 / 1024 px.
- Capture réelle des **sept vues**, données fictives, sans captures statiques
  utilisées comme composant.
- Vérification des cibles ≥44 px, contrastes, zoom texte, clavier Samsung.
- Contrôle du repos : ring décroissant réellement lié au temps restant,
  pause/reprise, prolongation 15 secondes, retour d’onglet et hors ligne.
- Non-régression : poids, répétitions, séries d’échauffement (hors volume),
  charge totale, RIR, validation/dévalidation, temps écoulé, historique.
- Migrations format 2→5 / 3→5 / 4→5, mise à jour depuis BÊTA V3.1,
  sauvegarde/restauration, multionglets, protection des données.
- Aucun moteur, règle de récupération, progression, planification, schéma
  ou workflow de déploiement modifié.
- Comparaison des SHA distants BÊTA et production après l’audit.

**État : le code graphique est en cours d’intégration. Aucun test de build
n’a encore été exécuté pour les changements V4. Aucun déploiement ni
fusion n’est autorisé par cette mission.**
