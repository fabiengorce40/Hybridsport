# REKKA V4 — PLAYFIELD PRO / Revue de fidélité aux maquettes

**Référence principale** : la planche validée `a_polished_high_detail_ui_mockup_for_the_rekka_p.png`, disponible dans les fichiers de cette conversation. Elle illustre Accueil, Séance en cours, Progression, Planning, Détail exercice, Bilan et Profil.

**La référence contient des données fictives.** Les moteurs, préférences et prescriptions réels sont toujours prioritaires. Aucune calorie, XP, record, courbe ou charge ne peut être inventée pour reproduire la maquette.

Branche créée depuis `codex/rekka-v4-playfield-pro` (`6759e7211446155263c179a76539cd6645baf069`) : `codex/rekka-v4-playfield-fidelity`.

## Cartographie des neuf captures transmises

| Capture | Vue | Écart avec la planche | Correctif de la branche |
|---|---|---|---|
| A | Séance en cours, repos flottant | En-tête et cartes massifs ; dock de repos trop haut, cache la fin des séries | Barre supérieure et lignes de saisie resserrées ; dock compact sur deux colonnes, correctif d'espacement clavier et zone de sécurité |
| B | Accueil | Carte bleue avec une longue explication technique, absence des synthèses visuelles de la planche | Héro éditorial, explications conservées dans « Pourquoi cette séance ? », CTA et statistiques réelles |
| C | Présentation de séance | Cartes listées trop textuelles | Styles de préparation, objectif et titres harmonisés. *La planche montre le détail d'un exercice, pas exactement cet écran : validation visuelle distincte nécessaire.* |
| D | Profil | Pas de résumé visuel du profil, rubriques trop longues | Avatar à initiale réelle, nom du profil réel, nombre de sports activés, cartes compactes |
| E | Séance, focus saisie | Champs hauts, surbrillance trop agressive | Champs 44 px, focus bleu discret et contraste préservé |
| F | Séance, repos 2:00 | Chrono imposant, commandes écartées | Dock mini, anneau dégressif préservé, +15 et Passer alignés |
| G | Séance, repos 1:00 | Même disposition trop grande | Même mini-dock dans tous les états |
| H | Confirmation de fin | Modal fonctionnelle brute, différente du bilan illustré | Hiérarchie et sélections repensées, CTA jaune. *La planche représente le bilan après confirmation, état différent.* |
| I | Accueil variante | Même écart que B | Même gabarit Playfield Pro |

## Écrans complémentaires directement modifiés

- **Progression** : nouvel en-tête statistique lisant la semaine canonique, cercle de réalisation réelle, trois valeurs mesurées (pas de données fabriquées), répartition par sport sur l'historique réel.
- **Planning** : semaine de sept jours issue de `weekOf`/séances existantes, statut visible et navigation vers les séances ; anciennes fonctions de replanification conservées.
- **Détail d'exercice / séance active** : illustration vectorielle originale du développé couché avec deux haltères indépendants ou barre coaxiale selon l'identifiant. Aucune image de la maquette réutilisée comme écran.
- **Chronomètres** : port ciblé des correctifs V3.1.1 `useAlignedSecond`, `SessionClock` et `RestTimer0`, plus réduction du rafraîchissement du conteneur à 30 secondes en V3/Playfield.

## Contrats à vérifier avant toute publication

1. `pnpm check`, typecheck, ESLint, build V4.
2. E2E V4 + V3.1 ; contrôle des chronos après port V3.1.1 ; mesures sur build finale.
3. Captures de toutes les vues aux largeurs 360, 390, 412 et 1024 px.
4. Aucune régression : saisie directe, coches, historique, repos, pause/reprise, stockage auxiliaire, mise à jour depuis la BÊTA, fonctionnement hors ligne.
5. Contraste et taille des cibles tactiles, non-recouvrement avec clavier Android et barre système.
6. Essai réel sur Samsung : particulièrement la régularité des secondes et le mini-dock fixe.
7. Le nouveau récapitulatif du planning n'est qu'une **projection**, jamais une écriture dans le planificateur.
8. Les mesures de progression n'utilisent que des séances enregistrées ; aucune valeur de maquette n'est fixée en dur.

**Aucune publication, fusion ni modification des workflows n'est autorisée dans cette branche.**

### Limites de cette passe

L'environnement de l'assistant n'a pas accès au runtime Node complet de ce dépôt ni à un Samsung : la refonte est enregistrée sur la branche GitHub, mais les tests et les captures **après compilation** ne sont pas encore exécutés. Ne pas considérer l'interface comme validée avant ces contrôles.
