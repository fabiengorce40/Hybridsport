# KAIRO Beta 0 — « Modifier le programme » : blocage mobile et sémantique de la modification

## 1. Cause exacte du blocage

« Programme → Modifier et recréer le programme » rendait l'assistant (`Setup`) **à l'intérieur de l'onglet Programme**. L'App continuait d'afficher la barre de navigation principale :
- barre de navigation : `.tabbar`, `position: fixed; bottom: 0; z-index: 40` ;
- actions de l'assistant (Retour / Continuer) : en style inline, `position: fixed; bottom: 0; z-index: 5`.

Les deux occupaient le même bandeau en bas d'écran, et la barre passait devant.

Mesure sur la build déployée `ac26e39`, viewport Galaxy S9+ (Chromium) :
- « Continuer » : y = 598, hauteur 48 ;
- barre de navigation : y = 589, hauteur 69 ;
- Chromium : « `<nav class="tabbar">` … intercepts pointer events ».

L'onboarding initial n'était pas touché (pas de barre de navigation). Les tests jsdom ne pouvaient pas le voir (aucune mise en page) ; l'e2e navigateur ne couvrait que l'onboarding.

## 2. Correction UI (à la source)

- **Plein écran géré par l'App.** L'assistant de modification est un écran plein, **sans** barre de navigation, comme l'onboarding. `Programme0` demande l'ouverture (`onEdit`) et l'App rend `Setup`. Il n'est plus jamais rendu dans un onglet.
- **Actions en classe CSS** `.wizard-actions` :
  - fixes en bas, `z-index: 50`, donc au-dessus de toute barre par défense en profondeur ;
  - safe area : `env(safe-area-inset-bottom)` ;
  - groupe accessible « Navigation de l'assistant ».
- **Contenu de l'assistant** (`.wizard`) : marge basse = hauteur des actions + safe area. Le contenu défile entièrement au-dessus des actions ; retour en haut de page à chaque étape.
- `viewport-fit=cover` était déjà présent.

## 3. Sémantique de la modification (app-core)

**Données préremplies** :
- profil complet : sports, priorité, objectifs, fréquences, disponibilités, matériel, prénom ;
- **date d'objectif Course du programme actuel** (`previewBeta0Recreation`). Auparavant elle était perdue en silence si on ne la ressaisissait pas.

Les performances déjà enregistrées sont conservées (l'étape l'indique) ; seules les nouvelles sont ajoutées.

**Ce qui est enregistré** :
- le profil modifié ;
- un **nouveau** programme créé depuis ce profil (le programme en cours n'est jamais muté) ;
- les nouvelles performances déclarées ;
- l'audit `KAIRO.PROGRAMME_RECREATED`.

**Aperçu affiché avant validation** (calculé par app-core) :

| Situation de la semaine en cours | Effet |
|---|---|
| Au moins une séance enregistrée (commencée) | Semaine **reprise telle quelle** : même semaine persistée, résultats conservés, séances restantes réalisables, clôture normale. **Nouvelles intentions à partir du lundi suivant.** `WEEK_NOT_REPLACEABLE` respecté |
| Séance en cours (commencée, non terminée) | **Modification refusée** (`PROGRAMME_SESSION_IN_PROGRESS`) : jamais de brouillon supprimé en silence |
| Aucune séance enregistrée | Replanifiée dès aujourd'hui avec le nouveau programme. Les séances prévues à une date passée et non réalisées sont retirées, comptées et annoncées (ni faites, ni manquées) |

**Changement par rapport à avant.** Une semaine commencée était bien protégée, mais le nouveau programme ne démarrait que lundi prochain. Les séances restantes disparaissaient alors du planning et ne pouvaient plus être enregistrées : elles n'appartenaient plus au programme courant. Elles sont désormais reprises (semaine 0 du nouveau programme).

**Historique sportif.** Conservé :
- réalisations des moteurs (expositions Strength, tracks, courses, empreintes) ;
- séances terminées ;
- références.

Les marqueurs « manquée » des semaines déjà clôturées de l'ancien programme ne sont pas repris : ce sont des dérivations de l'ancien programme.

**Semaines suivantes.** Construites avec les nouvelles intentions. Pour Strength : composition S1, vérifiée de bout en bout.

## 4. Tests

- **`apps/kairo/scripts/e2e.mjs` — scénario D**, Chromium sur la build de production, aussi exécuté sur le site déployé, **Galaxy S9+ (320 × 658) et Pixel 7** :
  - ouverture de « Modifier » : plein écran, sans barre ;
  - Musculation + Course ;
  - Continuer visible dans l'écran et cliquable ;
  - Retour / Continuer visibles après défilement ;
  - retour arrière sans perte (prénom saisi) ;
  - récapitulatif (semaine commencée conservée, nouveau programme dès le 12 octobre) ;
  - validation ;
  - rechargement : programme modifié persisté ;
  - semaine commencée protégée (Full body, séance réalisée conservée) ;
  - lundi suivant : Haut / Bas / Haut / Bas composés par S1.
- **Exécuté contre la build déployée `ac26e39`** : ÉCHEC dès la première vérification. Le clic sur « Continuer » est intercepté par la barre ; le test reproduit donc bien le bug.
- **`packages/app-core/tests/beta0-modify.test.ts` (7)** :
  - aperçu ;
  - reprise de la semaine commencée (réalisable, historique, intégrité) ;
  - semaine suivante S1 ;
  - séance en cours refusée ;
  - export / import ;
  - semaine non commencée replanifiée ;
  - date d'objectif préremplie.
- **`apps/kairo/tests/modify-programme-dom.test.tsx`** : plein écran sans barre, actions groupées, conséquences annoncées, annulation sans effet.
- Fixture `pre-s1-started-state.json` : état réel produit par le code pré-S1 (séance de lundi terminée par le parcours de l'application).
