# REKKA V2 — corrections visuelles et propositions de bannières

Demande de Fabien : retirer les coins de visée de la carte Musculation de l'accueil ; reprendre les pictogrammes des quatre sports ; remplacer les paysages Planning, Progression et Profil par l'univers cyberpunk de l'accueil ; présenter quatre bannières sportives avant intégration et corriger les mains de la scène de musculation.

## Corrections appliquées au prototype existant

- Suppression de l'image `p-deco-corner` de la carte du jour et de sa règle CSS. L'icône et le cadre de carte sont conservés.
- Quatre SVG cohérents, tracés à la main en code : haltère, coureur, athlète poussant un traîneau, kettlebell. Formes simplifiées, épaisseur de trait commune, couleurs de discipline explicites. Les icônes sont utilisées par toutes les pages du prototype.
- Planning, Progression et Profil réutilisent la ville cyberpunk de l'accueil, avec cadrage adapté aux en-têtes. La vignette Course du profil utilise également cet univers.
- Aucune modification de moteur, d'état sportif, de BÊTA ou de production.

## Quatre propositions, en attente de validation

Créées avec l'outil intégré imagegen, à partir de l'accueil validé et du personnage existant. Elles ne sont pas importées dans l'application. Les fichiers de travail sont dans `apps/kairo/prototype/art/proposals/` ; les images sont présentées dans la conversation pour validation.

Direction commune : bannière panoramique 3:1, anime cinématographique, ville japonaise futuriste au coucher du soleil, bleu nuit, néons cyan et magenta, athlète roux à droite, espace sombre à gauche pour les futurs titres HTML. Sans texte, logo ou interface dans l'image. Vérifier les mains, poignets et prises sur le matériel.

- Course : course à pied sur la promenade au bord de l'eau, posture dynamique, tenue noire avec détails cyan.
- Musculation : curl avec un haltère, main autour de la poignée métallique centrale entre les deux disques, poignet aligné ; nouvelle scène plutôt que réutilisation de la prise défectueuse.
- Cross-training : battle ropes dans une salle fonctionnelle ouverte sur la ville, une corde dans chaque main, cage et kettlebells au second plan.
- HYROX : poussée de traîneau lesté sur piste, une main sur chaque montant, position inclinée cohérente.

Après validation, prévoir un catalogue de bannières par sport pour la séance. La séance existante étant une démonstration de musculation, ne pas inventer de séances course/HYROX/cross-training pour exposer artificiellement les quatre images.
