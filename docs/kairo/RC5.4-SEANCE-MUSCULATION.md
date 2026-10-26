# RC5.4 — Expérience de séance Musculation

- **Branche :** `claude/kairo-rc4-dev`, commits RC5.4 séparés des lots RC5.3.
- **Moteurs :** aucun moteur sportif modifié. Strength, la progression RC5.3, les estimations de durée du CORE et les temps de repos sont inchangés.
- **Déploiement :** ni production ni BÊTA.

## 1. Audit initial

| Sujet | Constat avant RC5.4 |
|---|---|
| Types de séries | Le moteur prescrit `rampup`, `working`, `top_set`, `amrap` et `backoff`. Les séries `backoff` n'existent que dans la variante « série lourde » (`DOSE.TOP_SET`). L'écran mélangeait les phases dans une liste unique, avec seulement une ligne grisée pour les montées. |
| Montées en charge et volume | Elles sont déjà exclues du volume musculaire (`workingOf` dans Strength) et des expositions de progression (`isWork` dans app-core). Un test le vérifie désormais depuis l'écran réel (§ 4). |
| Séries adaptées | Les changements du contrôle avant séance sont persistés avec la séance (`sets:<ex>:3>2`, `rir:<ex>:2>3`). C'est la seule source fiable par exercice. Les substitutions de matériel étaient déjà affichées. |
| Chrono de repos | Échéance horodatée persistée (`rest.endsAt`), avec pause, +15 s et « Passer ». Il est conservé tel quel. |
| Temps écoulé | Il était calculé depuis `startedAt` dans le sur-titre, sans pause, sans durée figée à la fin et non enregistré. |
| Durée prévue | Elle vient du CORE (`estimateDuration`, p50), persistée avec la séance. Pour une séance adaptée, c'est l'estimation de la séance adaptée. |
| Durée dans l'historique | « Durée réelle » = horloge entre début et fin, pauses comprises. |

### Durée prévisionnelle : ce qu'elle compte

Elle compte, par bloc, puis en additionnant les blocs :
- **Séries d'approche :**
  - leur travail (répétitions × secondes par répétition) ;
  - les repos qui les suivent ;
  - un changement de charge par montée (`loadChangeS`).
- **Séries de travail :** répétitions × durée par répétition (fourchette min / médiane / max). Les séries facultatives ne comptent que dans le p90.
- **Récupérations :**
  - repos prescrits entre séries, multipliés par le facteur de dépassement (`restOverrunFactor` = 1,1) ;
  - le dernier repos d'un exercice est remplacé par la transition.
- **Transitions :**
  - entre exercices d'un même bloc : table par classe de matériel (60 s par défaut, de 20 à 90 s) ;
  - mise en place de chaque exercice (`setupS`) ;
  - entre blocs : 60 s ;
  - consignes : 15 s par bloc.
- **Adaptations :** la séance adaptée est réestimée par le CORE au démarrage.

Le rapport du § 3 permettra de vérifier ces paramètres sur des séances réelles. Aucun paramètre n'a été modifié.

## 2. Ce qui a été livré

### Lot A — phases visuelles (`4c5b570`)

- **Titres de phase** sous chaque exercice, la couleur ne servant que d'appui :
  - « **Montée en charge** · approche · hors volume et progression » : gris bleuté ;
  - « **Séries de travail** · comptent pour la progression » : orange ;
  - « **Retour en charge (back-off)** » : seulement si le moteur en prescrit.
- **Exercice adapté :** étiquette « Adaptée » et explication neutre (par exemple « 3 → 2 séries de travail »).
- **État de chaque série** (à faire, en cours, validée), indépendant de son type. La série en cours est annoncée par le texte « en cours » et `aria-current`.
- Prescription, indices de série, saisies, validation et chrono de repos sont inchangés.

### Lot B — chronomètre global (`7d3e186`)

- **Horodaté, jamais compté en mémoire :** temps = maintenant − `startedAt` − pauses manuelles.
- **Persistance :** deux champs additifs dans le journal de séance :
  - `clock { pausedAt?, pausedS }` pendant la séance ;
  - `timing { activeS, pausedS, plannedS }` figé à la fin.
- **Démarrage** au lancement effectif, après le contrôle avant séance.
- **Affichage** permanent et compact dans la barre du haut, avec la durée prévue à partir de 390 px.
- **Pause manuelle « Pause séance »**, libellée « Séance en pause », distincte du repos : le chrono de repos n'est pas touché. Valider une série pendant une pause reprend la séance.
- Le chronomètre continue au changement d'exercice et à la navigation, et survit au verrouillage et au redémarrage. Il s'arrête à la fin de séance, y compris partielle.
- **Anciennes séances :** relues sans migration. Leur durée reste fin − début.

### Lot C — durées et historique (`4316878`)

- **Fin de séance :** durée réelle et durée prévue.
- **Historique :** « Durée réelle » = temps actif (pauses exclues), suivi de « prévue ≈ … ».
- **Rapport « Durées prévues et réelles »** (Historique, section repliable), produit par `strengthDurationReport` :
  - une ligne par séance : prévue, réelle, écart en % ;
  - une synthèse : nombre de séances mesurées, écart médian, rapport réel / prévu moyen, nombre à ± 15 % ;
  - les séances arrêtées et celles d'avant RC5.4 (« horloge, non mesurée ») sont listées mais exclues de la synthèse.

### Lot D — tests et ajustements mobiles

- Corrections issues des captures :
  - à 360 px, le marqueur de série en cours chevauchait les répétitions : il est remplacé par le texte « en cours » coloré ;
  - le bouton du chronomètre s'appelle « Pause séance », pour le distinguer de « Pause » du repos ;
  - à 360 px, la durée prévue est masquée dans la barre du haut (elle reste dans l'en-tête de séance).

## 3. Vérifications

| Vérification | Résultat |
|---|---|
| Tests app-core RC5.4 (`tests/rc54`) | 6 / 6 : horodatage, pause et reprise, absence de double comptage, relecture, fin figée, anciennes séances, historique, rapport |
| Tests d'interface RC5.4 (`rc54-phases-dom`, `rc54-clock-dom`) | 5 / 5 : phases, états, prescription intacte, montées hors exposition, chronomètre (redémarrage, navigation, pause, fin), historique, rapport |
| Tests d'interface existants | 37 fichiers verts (deux fixtures d'interface régénérées : les séances terminées portent désormais leurs durées) |
| `pnpm check` | voir le bilan de livraison |
| Build de production | OK |
| E2E principal (`scripts/e2e.mjs`) | OK, 303 vérifications |
| E2E RC5.4 (`scripts/e2e-rc54.mjs`), 360 et 390 px | OK, 38 vérifications (§ 4) |

### Scénarios E2E RC5.4 (Chromium mobile, build de production, service worker actif)

1. Aucun chronomètre avant le lancement effectif. Phases titrées, une seule série « en cours », aucun défilement horizontal, chronomètre entièrement visible dans la barre du haut.
2. Montées et première série de travail validées : le chrono de repos et le chronomètre global sont visibles ensemble.
3. Dix minutes en arrière-plan sont comptées une seule fois (1 → 602 s).
4. Pause de séance, puis **rechargement en pleine séance** : il équivaut à la fermeture de la PWA ou au chargement d'une nouvelle version. L'état enregistré est identique octet pour octet, la pause est conservée et les séries validées aussi.
5. **Hors ligne :** rechargement servi par le service worker. Une série validée est enregistrée.
6. Navigation (sortie de séance puis retour) sans perte de temps.
7. Fin partielle : durées réelle et prévue, historique, rapport.
8. Aucune erreur JavaScript.

### Nouvelle version BÊTA publiée pendant une séance

Avec le mécanisme actuel, une nouvelle version n'est chargée qu'au rechargement de la page. Le scénario 4 montre qu'un rechargement en pleine séance ne perd ni série, ni repos, ni temps de séance, ni pause.

Le comportement « attendre la fin de séance avant d'appliquer la mise à jour » relève du mécanisme de mise à jour automatique. Celui-ci est **proposé mais pas encore validé** (`docs/kairo/REKKA-BETA-MAJ-AUTO.md`) et n'a pas été modifié ici.

## 4. Captures Android (`docs/kairo/captures/rc54/`)

| Fichier | Contenu |
|---|---|
| `rc54-{360,390}-01-phases.png` | Début de séance : chronomètre, phases « Montée en charge » / « Séries de travail », série en cours |
| `rc54-{360,390}-02-repos-et-chrono.png` | Montées validées, série de travail validée, chrono de repos et chronomètre global |
| `rc54-{360,390}-03-pause.png` | « Séance en pause », bouton « Reprendre », repos indépendant |
| `rc54-{360,390}-04-fin.png` | Fin de séance : durée réelle et durée prévue |
| `rc54-{360,390}-05-historique-rapport.png` | Historique et rapport prévu / réel |

## 5. Limites et suite

- **Pas de captures sur un vrai téléphone :** les captures viennent de Chromium en émulation mobile. Le verrouillage et le redémarrage Android sont approchés par avance d'horloge et rechargement.
- **Back-off :** aucune séance du banc ne contient de série lourde. Le regroupement « Retour en charge » n'est donc couvert que par le test unitaire de regroupement.
- **Charte REKKA V2** (jaune-vert néon, bleu nuit) : non appliquée ici, comme demandé pour RC5.4 (thème sombre et orange conservés). Les couleurs de phase sont des variables CSS, faciles à rebasculer.
- **Publication BÊTA :** après validation de RC5.4, sur une branche issue de `claude/rekka-beta`, sans RC5.3, avec votre accord. Elle passera par le mécanisme de mise à jour automatique une fois celui-ci validé.
