# KAIRO RC3.4 — Historique Running fiabilisé

Branche `claude/kairo-rc3-dev`, base `9c310db`. Commit : `a635668`.

Garde-fous :
- aucune règle sportive, prescription ou critère de référence modifiés ;
- moteur Running, contrat Running et planificateur inchangés ;
- RC1 TEST et production inchangés ;
- rien n'a été fusionné ni déployé.

## 0. Décisions bloquantes

**Aucune.** L'audit (sections 1, 3, 5) a montré que chaque point pouvait se faire sans changer une règle sportive ni
le contrat d'un moteur. Les choix faits par défaut sont listés en section 7, pour validation.

## 1. Course réalisée ≠ performance de référence (audit des règles existantes)

| | course réalisée (`running.realized`) | performance de référence (`running.references`) |
|---|---|---|
| Origine | séances du programme, courses libres, dernière course de l'onboarding | performances **déclarées** (course officielle, chrono personnel, test de Critical Speed : date, conditions, parcours mesuré) et TEST réalisés dans l'application |
| Lue par le moteur Running pour | dose de départ (dernière séance du même type et de la même famille, si récente) ; expositions ; garde-fous d'intensité ; **borne** de l'estimation de durée d'un TEST (`ESTIMATE_BOUND_ONLY`, jamais une cible) | estimation des allures, accès aux séances clés (seuil, VO₂) |
| Peut devenir l'autre ? | **jamais automatiquement** | — |

Ce qui est fait :
- Constat vérifié par test : une course libre, même rapide (5 km en 18 min), ne crée aucune référence.
- La distinction est affichée sur la carte (« Historique d'entraînement (pas une performance de référence) ») et dans
  le formulaire. Un chrono fait à fond se déclare à part, dans Profil Course → « Ajouter une performance ».
- Aucune conversion automatique, aucun critère modifié.

À savoir (constat, rien de changé) : toute course libre est enregistrée comme course facile continue (`EASY`,
`CONTINUOUS`). Une séance intense faite hors programme compte donc comme une course facile pour la dose de départ et
les garde-fous d'intensité. Un « type de course » à la saisie relèverait d'une décision sportive.

## 2. Date de la dernière course à l'onboarding

- Nouveau champ facultatif : « Date de cette course », jamais dans le futur ; un bouton désactivé dit pourquoi.
- **Avec une date**, la course est enregistrée à cette date selon la convention de jour existante de l'application
  (`sessionInstant`). L'heure n'est **jamais inventée** :
  - elle est marquée « inconnue » (`running.timeUnknown`) ;
  - l'historique affiche « heure non renseignée » ;
  - une course datée d'aujourd'hui est bornée à maintenant.
- **Sans date**, le comportement est inchangé : compatibilité avec les anciens profils, aucune date historique inventée.

## 3. Corriger ou supprimer une course libre

### Analyse d'impact (avant implémentation)

| domaine | impact | traitement |
|---|---|---|
| Historique Running | entrée modifiée ou retirée de `running.realized` | une seule entrée, toujours ; identifiant recalculé sur l'instant de fin |
| Allures de référence | **aucun** (une course libre n'est jamais une référence) | — |
| Programmes persistés | **aucun** : les semaines et séances sont persistées ; ni le planificateur (`recentOf`) ni les autres sports ne lisent cet historique | aucun recalcul. `refreshSessions`, recalcul hérité de l'ancien chemin V0, n'est **pas** appelé à la correction ou à la suppression. Testé : semaines et programme identiques, y compris si la course supprimée servait de dose de départ |
| Commentaires | rattachés à l'identifiant | ils suivent la correction et disparaissent avec la suppression |
| Export / import | annexes facultatives (`notes`, `timeUnknown`) | les anciens états, RC3.3 compris, sont relus tels quels (test de migration) |
| Doublons | une correction peut créer un chevauchement | mêmes contrôles qu'à la saisie, chevauchement hors elle-même ; refus explicite |
| Sécurité | — | la douleur déclarée n'est pas modifiable ; supprimer une course ne lève **jamais** une pause douleur |
| Courses du programme | — | non modifiables ici (`FREE_RUN_UNKNOWN`) |

### Interface

Chaque carte de course libre a deux actions :
- **« Corriger »** : formulaire prérempli. Une course dont seule la date est connue reste « date seule » tant
  qu'aucune heure n'est saisie.
- **« Supprimer »** : confirmation explicite. Le message rappelle que les séances prévues ne changent pas et que la
  pause douleur éventuelle reste active.

Note sur la séance d'aujourd'hui déjà planifiée : son contrôle avant séance se rabat, si besoin, sur la séance
persistée (RC3.1 A1). Elle n'est jamais régénérée.

## 4. Douleur

- Case « Douleur pendant ou après cette course », avec des zones facultatives (mêmes zones que le contrôle avant
  séance).
- Le formulaire prévient avant l'enregistrement que la planification sera mise en pause.
- C'est le **mécanisme existant** : la pause douleur, levée explicitement dans les Réglages.
- **Défaut corrigé.** Une nouvelle douleur **remplaçait** la pause active et effaçait ses zones. Les zones sont
  désormais ajoutées et la date de début conservée.
- Sans douleur déclarée, la sécurité reste inchangée : une pause active n'est jamais effacée.

## 5. Profils HYROX sans Course

**Étude.** L'historique de course n'est lu que par le contexte du moteur Running (`runningContext`). Rien d'autre ne
le lit :
- ni le moteur HYROX ;
- ni le planificateur, via `recentOf` ;
- ni la Musculation ;
- ni le Cross-training.

Enregistrer une course sans Course activée n'exige donc aucun moteur fictif et ne touche aucune prescription. Pas de
blocage.

**Implémentation.**
- « Ajouter une course » est affiché pour les profils HYROX, avec la mention « sans effet sur vos séances HYROX ».
- Testé : séances HYROX de la semaine en cours **et** de la suivante identiques avec ou sans course libre.
- Si la Course est activée plus tard, ces courses rejoindront naturellement l'historique lu par le moteur Running.

## 6. Validation

| contrôle | résultat |
|---|---|
| `pnpm check` | ✅ 2 727 réussis, 1 ignoré |
| app-core RC3.4 | ✅ 9 : référence, date d'onboarding (date, sans date, aujourd'hui, futur, invalide, persistance), correction, refus, suppression, dose de départ supprimée, douleur, HYROX, migrations |
| DOM RC3.4 | ✅ 5 : correction, suppression avec confirmation, douleur → pause à l'accueil, HYROX, date d'onboarding puis correction en date seule |
| Non-régression RC3.3 | ✅ 9 + 4 (une attente mise à jour pour les deux nouveaux champs de la vue) |
| Build production | ✅ |
| E2E complet | ✅ 221 contrôles |
| Mobile 360 px (profil Galaxy S9+) | ✅ aucun défilement horizontal, aucune erreur ; captures : date d'onboarding, douleur, historique avec Corriger / Supprimer, confirmation de suppression |

## 7. Choix par défaut à confirmer

1. **Douleur non modifiable** après coup. La retirer par erreur pourrait masquer une pause légitime ; la pause se
   lève dans les Réglages.
2. **Course datée sans heure** : l'instant suit la convention de jour de l'application, sans heure affichée.
3. **Seulement les profils HYROX** gagnent l'entrée sans Course activée ; Musculation seule et Cross-training seul ne
   l'ont pas.
4. **Type de course** : toujours « facile continue ». Distinguer une séance intense serait une décision sportive
   (section 1).

## 8. Suite

RC3.4 terminé. La prochaine étape annoncée est le minuteur d'intervalles Course (A7), en attente de votre feu vert.
