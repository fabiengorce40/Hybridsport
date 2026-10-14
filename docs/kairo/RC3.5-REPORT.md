# KAIRO RC3.5 — Lecteur de séance Course

Branche `claude/kairo-rc3-dev`, base `31410a6`. Commit : `cf536aa`.

Garde-fous :
- aucune prescription Running, règle sportive, moteur ou planificateur modifiés ;
- RC1 TEST et production inchangés ;
- rien n'a été fusionné ni déployé.

## 0. Décisions bloquantes

**Aucune.** L'audit (section 1) montre que le CORE fournit déjà le déroulé linéaire d'une séance
(`executionSteps`, clés stables par étape). Le lecteur s'appuie dessus sans ajouter de valeur sportive. Les choix
faits par défaut sont listés en section 6.

## 1. Audit : ce que le moteur Running produit réellement

Le moteur Running ne produit **qu'un seul type de prescription** : `run_structure`. Les types `timed`, `distance` et
`intervals` existent dans le schéma, mais seuls les moteurs Musculation, Cross-training et HYROX les emploient.

Séances générées par le parcours Beta 0 réel (10K sans montre, 5K et semi avec montre ; TEST la semaine 1, séance
clé la semaine 2) :

| séance | étapes | unités |
|---|---|---|
| EASY / LONG (non structurée) | 1 segment continu | **durée** (30 min, = dernière durée réalisée) ; effort ≤ 3/10 ; aucune allure |
| THRESHOLD | échauffement, 3 ou 4 × travail, récupérations, retour au calme | **durées** (10 min, 5 min, 1 min trottinée, 5 min) ; effort 5–6/10 ; aucune allure |
| SEVERE (5K, après TEST) | échauffement, 4 × travail, récupérations, retour au calme | **durées** (4 min, 3 min trottinée) ; **allure cible** dérivée de la référence (± 3 %) |
| TEST | échauffement, test, retour au calme | échauffement et retour au calme en **durée** ; test en **distance** (5 ou 10 km) |

Constats :
- **Une seule étape en distance** dans tout le moteur : le segment du TEST. Son allure est l'allure **observée**
  (`observed_athlete_range`) : elle borne l'estimation de durée, ce n'est jamais une cible (priorité effort). Le
  lecteur ne l'affiche pas et n'en déduit **aucune** durée.
- Récupérations : toujours en durée, mode trottiné (`jog`). Les modes « marchée » et « à l'arrêt » sont prévus par le
  CORE, pas encore produits.
- Préparation, séries multiples et récupération entre séries existent dans le schéma, pas dans les séances produites.
  Le lecteur les gère quand même, via `executionSteps`.
- **Contrôle avant séance** : une douleur au genou P2 ou P3 adapte la séance. L'exclusion existante remplace la
  course par du **rameur**, à structure identique. Le lecteur déroule cette séance adaptée et l'indique.

## 2. Fonctionnement

| demande | réalisation |
|---|---|
| Étape en cours et suivante | « Étape 3 / 7 », nom de l'étape (Échauffement, Répétition 2 / 4, Récupération trottinée, Test, Retour au calme…), dose, cible prescrite ; « Ensuite : … » |
| Temps restant | étape en durée : compte à rebours ; étape en distance : **temps écoulé** |
| Répétitions et récupérations | enchaînées à l'échéance, sans toucher le téléphone |
| Pause / Reprendre / Étape suivante / Terminer | oui. Pour une étape en distance, « Étape suivante » devient « **Distance faite** » |
| Signal de changement d'étape | vibration (Android) et bip, avec un bouton « Son activé / coupé » mémorisé. Le signal est émis à l'échéance, pas après un appui de l'utilisateur. L'écran est maintenu allumé si le navigateur le permet ; sinon, l'écran le dit |
| Verrouillage, interruption, rechargement | la position est **recalculée depuis l'horodatage**. Seules les commandes sont écrites, jamais un compteur par seconde, comme pour le repos Musculation et le chrono CT / HYROX |
| Pas de séance « réalisée » automatiquement | à la fin du déroulé : « Toutes les étapes sont passées… La séance n'est pas encore enregistrée ». Seule la feuille de fin existante enregistre la séance, avec la saisie de l'utilisateur |
| Distance sans GPS | validation manuelle obligatoire ; aucune durée tirée d'une allure |

Feuille de fin :
- Elle affiche un **repère** : « Lecteur : 32:10 de temps actif (hors pauses) · 1 étape passée avant la fin · 2 étapes
  non atteintes. Repère seulement ».
- Pour un TEST, le bouton « Reprendre le temps du lecteur (45:00) » remplit le temps du test, mais **seulement sur
  appui** : rien n'est prérempli.

**Double validation.** « Étape suivante » porte la clé de l'étape affichée. Un second appui, ou un appui arrivé
après l'échéance, ne change rien. Un seul geste ne peut jamais passer deux étapes.

**Traçabilité.** Chaque étape quittée à la main est notée (`distance_validated` ou `skipped`, temps écoulé, instant)
dans le journal de séance. Ces notes ne sont lues par aucun moteur.

## 3. Sécurité et cohérence (réutilisé, inchangé)

- **Démarrage.** Il passe toujours par le contrôle avant séance existant. Une douleur qui met la planification en
  pause empêche le départ, donc le lecteur. Une pause douleur active refuse tout nouveau départ.
- **Séance déroulée.** C'est la séance persistée, adaptée le cas échéant (`selectProgrammeSession`). Le lecteur ne
  lit aucune autre source.
- **Persistance.** Le champ `runPlayer` est un champ **facultatif** du journal de séance. Les anciens journaux sont
  relus tels quels, avec le lecteur en attente de départ. À la fin de séance, le lecteur est figé.
- **Autres sports.** Le lecteur leur est refusé (`RUN_PLAYER_UNAVAILABLE`).

## 4. Validation

| contrôle | résultat |
|---|---|
| `pnpm check` | ✅ 2 740 réussis, 1 ignoré |
| app-core RC3.5 | ✅ 10 : audit des unités réelles (EASY, TEST, THRESHOLD sans montre, SEVERE avec allure) ; transitions dérivées de l'horloge et toutes étapes passées ≠ séance terminée ; pause et reprise ; rechargement et ancien journal ; distance jamais terminée seule (10 h) ; validation manuelle ; double validation ; fin de séance et refus ensuite ; contrôle avant séance (douleur → pas de départ) ; séance adaptée (genou P2 → rameur) ; autre sport |
| DOM RC3.5 | ✅ 3 : TEST complet (distance, rechargement, fin déclarée, temps du lecteur repris sur appui → référence 10 km enregistrée) ; seuil (répétitions, vibration à l'échéance et pas sur appui, pause de 20 min figée, rechargement en pause, étape passée, Annuler la fin) ; footing non structuré |
| Non-régression | ✅ suite complète, dont le parcours TEST existant (`beta0.test.tsx`) |
| Build production | ✅ |
| E2E complet | ✅ 221 contrôles |
| Mobile 360 × 740 (Chromium, tactile) | ✅ aucun défilement horizontal (largeur 360), aucune erreur de page ; 7 captures : seuil avant départ, répétition, récupération, pause ; TEST en distance ; fin du déroulé ; feuille de fin |

## 5. Limites

### Techniques

1. **Écran verrouillé.** Une application web ne peut pas émettre de son ni de vibration de façon fiable écran
   verrouillé : le navigateur suspend ou ralentit les minuteurs. Le chrono reste juste (horodatage) et le signal
   arrive au déverrouillage. Pour l'atténuer, l'écran est maintenu allumé (Wake Lock) quand le navigateur le permet :
   Chrome Android oui, Safari iOS à partir de la version 16.4 en principe, sinon non. L'écran indique ce qu'il en est.
2. **Vibration.** Elle n'existe pas sur iPhone (Safari) : seuls le son et l'affichage y sont disponibles. Le son
   exige un premier appui (« Lancer le minuteur » ou « Reprendre ») et dépend du volume média.
3. **Pas de GPS.** Rien n'est mesuré ; une distance est toujours validée à la main. Une mesure GPS fiable demanderait
   la géolocalisation en arrière-plan, que les navigateurs coupent écran verrouillé. Ce n'est pas faisable de façon
   honnête dans une application web.
4. **Précision.** Le temps entre deux appuis (par exemple le temps du test) dépend de la réactivité de l'utilisateur.
   Il reste un repère, repris seulement sur geste.
5. **Changement d'appareil.** L'état est local au navigateur, comme toute la Beta.

### Sportives (constats, rien de changé)

1. **Enchaînement automatique.** Les récupérations s'enchaînent à l'échéance, comme prescrit. Le lecteur ne juge
   pas si l'athlète est prêt.
2. **Seule la durée totale courue est enregistrée.** Le lecteur n'envoie aucun résultat par répétition au moteur
   Running. Le contrat de résultat du moteur ne connaît que la séance entière. Une répétition passée ou abrégée
   n'est pas transmise : c'est à l'utilisateur de choisir « J'ai adapté la séance ».
3. **Allure.** Elle n'est affichée que si elle est la cible prescrite (séance sévère avec référence), jamais pendant un
   TEST. Sans montre, l'effort perçu reste le seul guide.
4. **Les tests verts ne prouvent pas la qualité sportive** du déroulé : un essai terrain reste nécessaire.

## 6. Choix par défaut à confirmer

1. **Démarrage du lecteur.** Il démarre sur « Lancer le minuteur », pas au démarrage de la séance. On peut ainsi
   ranger le téléphone ou se placer avant de lancer.
2. **« Étape suivante » sur une étape en durée.** Elle est permise, comme dans le chrono de repos, et tracée
   « passée ».
3. **Aucun retour arrière** (« étape précédente »). Ce n'était pas demandé, et cela compliquerait la traçabilité.
4. **Son activé par défaut.** La préférence est mémorisée sur l'appareil.

## 7. Suite

RC3.5 terminé. En attente de votre validation avant la prochaine étape.
