# REKKA — retour utilisateur : répétitions et programmation

Base BÊTA vérifiée : f4820b48a082f867b8381e416908a4524b798c34.

## Affichage des répétitions
Les plages de répétitions étaient rendues dans un champ à 28 px sur une colonne pouvant descendre à 64 px. La taille intrinsèque des champs pouvait aussi dépasser leur colonne. Le placeholder est maintenant à 18 px, et le champ ainsi que son conteneur peuvent rétrécir dans la grille. Les valeurs saisies gardent leur taille ; aucune prescription ni donnée ne change.

## Deux Haut du corps A
La BÊTA utilise les archétypes historiques. strengthWeekInsights attribue les lettres selon les exercices des blocs de force : deux signatures identiques donnent deux A. La BÊTA documente explicitement l’absence de RC5.1.
La branche claude/kairo-rc4-dev, vérifiée à dc99d25, contient RC5.1 : véritables archétypes str_upper_a / str_upper_b, préférences de mouvements complémentaires, rotation pour hypertrophie à quatre séances. Ce comportement ne doit pas être simulé en renommant la deuxième séance. Les semaines persistées doivent conserver leur contenu d’origine.

## Séance estimée à 33 minutes
StrengthWorkout et Session0 affichent estimatedDurationS, avec repli sur targetDurationS. Il ne s’agit donc pas nécessairement du créneau demandé. Sans l’export de la semaine utilisateur, la cause exacte (prescription, volume restant, contraintes ou estimation) ne peut pas être établie. Ne pas rallonger artificiellement les séances ou remplacer une semaine sauvegardée.

## Suite fonctionnelle
Auditer séparément la reprise de RC5.1 et ses dépendances, conserver les semaines existantes, comparer les nouvelles semaines A/B et les estimations. RC5.3/RC5.4 ne sont pas intégrées par ce correctif. Demander un export Profil pour tracer précisément les deux séances signalées et leurs raisons de génération.
