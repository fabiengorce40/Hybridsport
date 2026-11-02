# REKKA V2.2 — replanification Musculation / HYROX

Base vérifiée : branche `codex/rekka-v2-1-android-integration`, commit
`56959172912973abc72d5577b0feefbe9862f0c1`. Branche de correction :
`codex/rekka-v2-2-replanification`. Aucune publication ni fusion autorisée.

## Diagnostic

| Observation | Nature et cause dans la V2.1 | Correction / comportement V2.2 |
|---|---|---|
| Objectifs changés mais anciennes séances identiques | Comportement volontaire de `updateStrengthPersonalization` (`packages/app-core/src/strength-personalization.ts`) : copie du profil antérieur dans les semaines existantes, modification du profil et du programme futurs seulement. Limite UX : aucune action immédiate. | Deux actions explicites : prochaines semaines sans remplacement, ou aperçu d'un recalcul courant. |
| Quatre Musculation demandées, deux placées | Pas nécessairement un bug de dose. Une ancienne semaine peut encore contenir l'ancienne fréquence. Sinon le planificateur impose une seule séance par jour, les jours déclarés, G4 inter-sports et les refus de durée/récupération des moteurs. Quatre jours disponibles ne permettent pas six séances (4 + 2). | Demandes actuelles / séances placées / anciennes générations / nouvelles demandes non encore générées séparées. Aucune promesse de quatre séances. |
| Quatre jours consécutifs | Les disponibilités peuvent l'imposer. Autre limite : `globalPlacement` (`packages/planner/src/global-placement.ts`) ne recherche un réarrangement que pour des Full Body à J/J+1 ; les semaines upper/lower hybrides n'activent pas ce levier. `weekLoadWarnings` signale mais ne déplace pas. | Recherche bornée du planning complet restant : organisation normale puis chaque jour de repos possible (au plus huit candidats). Départage : nombre placé, priorités sportives déclarées, conflits M3 restants puis plus longue suite consécutive. Aucun jour indisponible créé, aucun nombre sportif inventé. |
| Alertes musculaires | Avertissements M3/récupération, distincts de G1 sécurité ou des refus de prescription. Les alertes seules ne prouvent pas un programme dangereux et ne doivent pas être assimilées à un refus médical. | Les alertes restent lisibles dans l'aperçu. Elles ne retirent pas automatiquement une séance. Le maintien explicite d'une séance composée avec interférence reste celui de `startAssessment` / `startProgrammeSession`, déjà testé ; douleur/qualité bloquantes ne sont pas contournées. |
| Motifs vagues des séances non placées | `slot_unavailable` recouvre notamment l'absence de jour libre et la durée insuffisante. L'ancien libellé et « vous pouvez la faire quand vous voulez » dans `Home0.tsx` sont trompeurs. | Jours compatibles occupés, durée, récupération, volume, gouvernance, sécurité et conflits sont expliqués séparément, avec alternatives à prévisualiser. Le texte « quand vous voulez » est supprimé. |
| Semaine commencée impossible à recalculer | `writePlannedWeek` et le Programme Engine refusent volontairement de remplacer toute semaine commencée. Assouplir cette garde générale mettrait les historiques en danger. | Nouvelle transaction dédiée, sans changer la garde générale. Résultats, logs, performances et dates passées verrouillent chaque séance. Les autres sports restent fixes. |
| Résumé après recalcul mixte incohérent | Un seul `week.strengthProfile` ne suffit plus si une semaine conserve une ancienne séance et régénère les suivantes. | Instantanés par nouvelle séance, repris au démarrage et dans la progression ; résumé et bilan utilisent la dernière génération de cette semaine, pas un objectif futur non appliqué. |
| Bouton de sauvegarde restant actif | Comparaison du profil entier, incluant `equipment.confirmedAt` renouvelé lors de la sauvegarde. | Comparaison des champs éditables uniquement. |

Le profil et les observations fournis sont reproduits avec des données fictives.
Les disponibilités et réalisations précises du téléphone ne sont pas connues :
aucune sauvegarde personnelle n'a été demandée ou importée. Les exemples indiquent
leurs hypothèses ; ils ne prétendent pas reconstruire la semaine personnelle exacte.

## Transaction et sécurité

`previewStrengthWeekReplan` est pure : aucun accès au stockage et aucune écriture.
Elle applique le brouillon à une copie, garde les séances protégées, réserve leurs
jours, transmet leur charge aux moteurs et recalcule seulement le reste Musculation/
HYROX via le planificateur existant. Les moteurs sportifs et leurs contenus ne
changent pas. Les exercices, séries, répétitions et progressions restent leurs décisions.

L'aperçu présente les dates, types, profils d'origine, exercices et séries, comptes,
avertissements et alternatives. Annuler le jette sans changement. Confirmer exige
une case explicite, un état source toujours identique et la même date ; le calcul
est reproduit et comparé avant écriture par `writeReplannedWeek`. Une série saisie,
un profil modifié ou un changement de jour invalide l'aperçu. Aucun remplacement
de séance protégée n'est admis, même via la passerelle appelée directement.

La confirmation applique aussi le profil aux prochaines semaines. Les données
historiques, tracks, résultats et journaux restent identiques ; seuls les objets de
planning des séances remplaçables, le profil et l'audit évoluent. Les contraintes
G1 et l'environnement sont vérifiés. Un dépassement de borne haute du moteur
empêche la confirmation plutôt que d'effacer le travail conservé.

## Sauvegardes

Format **v4** : champs optionnels `strengthProfile` et `plannedAt` par requête.
Migration v3 → v4 additive : seul `schemaVersion` change. Les migrations v1/v2
continuent la chaîne. Les fixtures historiques ne sont pas réécrites.
L'ancien lecteur v3 de V2.1 refuse la v4 comme version plus récente, sans l'écraser.
Aucune opération `clear()`/suppression de localStorage ou d'IndexedDB n'est ajoutée.

## QA et limites

Tests : aperçu/annulation/confirmation, état périmé, séances commencées avec séries,
séances réalisées, protection des performances et anciennes prescriptions, contraintes
de jours et de durée, cas 4 Musculation + 2 HYROX, comparaison FCA / pectoraux-épaules,
migrations et export/import. Les tests existants de maintien explicite d'interférence
et de sécurité restent exécutés.

Le workflow `rekka-v22-qa.yml` n'utilise aucun secret Cloudflare et n'a aucune étape
de déploiement. Il vérifie types, lint, suite complète, build, migrations depuis le
build exact V2.1, Chrome à 360/390 px avec séries/chrono, aperçu/annulation/confirmation,
manifeste et cache. Les seules données utilisées sont fictives et les contextes jetables.

Limites : recherche bornée, pas d'optimum global garanti ; une seule séance/jour,
fréquence Musculation 1–4, prescriptions candidates. Le recalcul vise la semaine
courante non clôturée et les futures séances Musculation/HYROX ; les autres sports
restent en place. Annulation avant confirmation ; après confirmation, un nouveau
recalcul est possible avec les mêmes protections, pas une restauration automatique
d'un ancien planning devenu périmé. Une ancienne séance verrouillée et le matériel
actuel peuvent imposer un allègement ou un refus lors du contrôle pré-séance.
Le Samsung physique n'est pas accessible ; validation Chromium à 360/390 px.
