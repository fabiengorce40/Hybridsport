# Exemples mesurés — données fictives

Matériel complet, 60 min maximum en Musculation, niveau intermédiaire,
4 demandes Musculation et 2 HYROX. Semaine du 5 octobre 2026.
Les résultats ci-dessous viennent des tests `strength-replan.test.ts`.

## Quatre jours disponibles, lundi à jeudi uniquement

Avant : priorités pectoraux/épaules. Après : fessiers/cuisses/abdominaux.

| Jour | Avant | Après confirmation |
|---|---|---|
| Lundi | Musculation | Musculation selon les nouvelles priorités |
| Mardi | Musculation | Musculation selon les nouvelles priorités |
| Mercredi | HYROX | HYROX recalculé par son moteur |
| Jeudi | HYROX | HYROX recalculé par son moteur |
| Vendredi–dimanche | Indisponible | Indisponible |

Les dates ne changent pas : six séances ne peuvent pas entrer dans quatre jours
à une séance/jour. Deux demandes Musculation restent non planifiées, mais leurs
prescriptions et les motifs sont distingués. Quatre jours consécutifs restent
signalés : aucune disponibilité n'est inventée et aucune séance terminée déplacée.
Le recalcul change le contenu même si le calendrier reste identique : pectoraux
4 → 2 séries E1, tronc 2,5 → 3 ; les fessiers restent à 3 et les cuisses ne gagnent
pas de volume dans ce cas contraint. Une priorité n'est pas une promesse de volume
supplémentaire si le moteur ne peut le placer dans les contraintes restantes.

## Sept jours disponibles : comparaison des priorités

| Jour | FCA (fessiers/cuisses/abdos) | Pectoraux/épaules |
|---|---|---|
| Lundi | Musculation | Musculation |
| Mardi | HYROX | HYROX |
| Mercredi | Repos | Repos |
| Jeudi | Musculation | Musculation |
| Vendredi | Musculation | Musculation |
| Samedi | Musculation | Musculation |
| Dimanche | HYROX | HYROX |

Les deux calendriers comportent 4 Musculation + 2 HYROX, mais les exercices et
prescriptions diffèrent (comparaison des prescriptions complètes dans le test).
Les bornes hautes hebdomadaires du moteur ne sont dépassées dans aucun profil.

| Groupe | Priorités FCA | Priorités pectoraux/épaules |
|---|---:|---:|
| Fessiers | 6 | 5 |
| Quadriceps | 7 | 7 |
| Tronc | 5 | 3,5 |
| Pectoraux | 3 | 6 |
| Épaules | 6 | 7 |
| Dos | 2 | 3 |
| Ischio-jambiers | 6 | 6 |
| Mollets | 3 | 3 |
| Bras | 5,5 | 5 |

Volumes E1 = séries de travail pondérées, contributions secondaires comprises.
Les groupes non prioritaires restent entraînés. La recherche bornée conserve ici
une série de quatre jours consécutifs : elle ne prétend pas trouver l'optimum de
toutes les permutations. Les avertissements restent visibles avant confirmation.

## Une séance déjà réalisée

La séance réalisée garde exactement son identifiant, sa date, sa prescription et
son ancien profil de génération. Les résultats, séries, charges, journaux et
tracks restent identiques. Les seules séances remplacées sont futures, sans
journal ni performance. L'aperçu est annulable sans écriture ; un journal créé
entre aperçu et confirmation rend l'aperçu périmé.
