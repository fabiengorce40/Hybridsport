# KAIRO Beta 0 : interface (UI1)

## Architecture

**Avant** : `UI → app-core V0 (planner.ts, generate.ts) → moteurs`. Le chemin Programme Engine n'était pas raccordé à l'interface.

**Après** : la voie principale passe par le programme.

```
UI → app-core Beta 0 (beta0-app.ts) → Programme Engine → Global Planner → Strength / Running
```

### Répartition des rôles

| Couche | Rôle |
|---|---|
| React | Affiche et saisit. Aucune composition, progression, interférence ni prescription calculée dans l'UI |
| `src/present.ts` | Mapping de présentation uniquement (codes et catégories → libellés) |
| app-core | Toutes les transitions et lectures (voir ci-dessous) |

**Transitions app-core** :
- `createBeta0Programme` : profil → programme → semaine ;
- `ensureBeta0Week` : à l'ouverture ;
  - clôture des semaines passées ;
  - séances non saisies dérivées « manquées » ;
  - planification de la semaine courante ;
  - jours déjà passés rendus indisponibles ;
- `startProgrammeSession`, `recordProgrammeSet`, `controlRest`, `toggleProgrammePainItem` ;
- `finishProgrammeSession` (→ `recordSessionExecution`) ;
- `recreateBeta0Programme`.

**Lectures app-core** : `selectBeta0Week`, `selectProgrammeSession`, `selectHistory`, `programmeWeekIndex`.

### Chemin V0

Le chemin V0 reste dans le code. Il ne sert plus qu'à un profil antérieur **sans programme** : l'accueil V0 propose « Créer mon programme », qui reprend le profil existant. Une fois le programme créé, la voie normale est Beta 0.

## Parcours

| Écran | Contenu |
|---|---|
| Onboarding | Avertissement « Beta expérimentale » à accepter ; sports : Musculation, Course, Musculation + Course (CT et HYROX invisibles) ; objectifs et fréquences supportés par les moteurs ; date cible Running (contrat `goal.targetDate`) ; dernière course réelle (base de la dose) ; disponibilités par jour ; priorité (hybride) ; matériel ; durée du programme (4, 8 ou 12 semaines) |
| Accueil | Date, prochaine séance (sport, type, rôle, durée estimée, statut), « Commencer la séance » ou « Reprendre la séance », progression de la semaine |
| Planning | Lundi → dimanche via `selectBeta0Week`. États : prévue, en cours, terminée, adaptée, arrêtée, manquée, non planifiée. Chaque état a une icône **et** un texte. Une séance non planifiée affiche une explication ; le détail technique reste replié |
| Séance Musculation | Voir ci-dessous |
| Séance Course | Type, rôle, badge TEST, structure prescrite (échauffement, blocs, récupérations, retour au calme, durée, allure si prescrite). Saisie : durée, distance, temps du TEST |
| Fin de séance | « Tout s'est passé comme prévu », « J'ai adapté la séance » ou « J'ai arrêté la séance » ; douleur signalée simplement |
| Historique | Séries réellement saisies ; course (durée, distance, TEST) ; séances manquées |
| Programme | Sports, objectifs, priorité, fréquence, semaine actuelle, statut expérimental. « Modifier et recréer le programme » : workflow explicite, une semaine commencée n'est jamais remplacée |
| Réglages | Pause douleur et sa levée, export, import, effacement |

### Séance Musculation

- Saisie réelle des répétitions et de la charge.
- Une plage de répétitions n'est jamais pré-remplie.
- La validation d'une série démarre automatiquement le chrono sur le repos **prescrit**.
- Commandes du chrono : Pause, +15 s, Passer.
- Le chrono reste visible pendant le défilement.
- Progression des séries affichée.
- Bouton « Douleur » par exercice.

### Chrono de repos

- L'échéance est horodatée et persistée dans `AppState.programmeLogs`.
- Le temps restant est recalculé depuis l'heure courante.
- L'intervalle d'affichage n'est jamais la source de vérité.
- Le chrono survit à la navigation, au verrouillage d'écran et au rechargement.

### Fin de séance et douleur

- La saisie est transmise à `recordSessionExecution`.
- La douleur signalée est transmise sans niveau inventé (`REPORTED`) et suspend la planification.

## Persistance

Champ additif `AppState.programmeLogs` (défaut `{}`, aucune migration). Il contient :
- les séances commencées ;
- les séries réellement faites ;
- le chrono ;
- l'issue.

Comportement :
- Une série non validée n'est jamais enregistrée comme faite, même après rechargement.
- L'export et l'import passent par `exportState` / `decodeState` (migrations app-core).
- Un fichier illisible ou plus récent est refusé et rien n'est modifié.

## Limites

**Fonctionnelles** :
- Aucun chrono cible Running : aucun champ ne le porte dans le contrat.
- Aucun GPS.
- Aucun éditeur fin du programme : modifier = recréer.
- Aucune correction d'une séance enregistrée.
- Aucune politique d'adaptation : les décisions de clôture sont `BLOCKED`.

**Planification** :
- Un programme commencé un jour où aucune disponibilité ne reste dans la semaine n'a pas de séance avant lundi.
- La composition Running se fait sur les jours attribués (voir `BETA-0.md`).

**Tests et PWA** :
- Le chrono n'est pas testé sur un écran réellement verrouillé : seul l'horodatage et le rechargement sont vérifiés.
- L'installation PWA exige HTTPS ou `localhost`. Aucun hébergement n'est configuré.

## Tests

| Suite | Contenu |
|---|---|
| `apps/kairo/tests/beta0.test.tsx` (jsdom) | Onboarding Musculation, Course et hybride ; semaine ; séance Strength : validation, chrono, pause et +15 s, reps et charge réelles, rechargement en cours de séance, fin ; Course : saisie et TEST ; historique ; douleur et levée ; import ; semaine suivante ; badge expérimental ; CT et HYROX absents |
| `apps/kairo/tests/app.test.tsx` | Chemin V0 legacy et passage V0 → Beta 0 |
| `packages/app-core/tests/beta0-app.test.ts` | Façade app-core |
| `apps/kairo/scripts/e2e.mjs` | Playwright, Chromium réel, viewport téléphone, build de production. Couvre le manifest, le service worker, le parcours hybride complet, le rechargement en pleine séance avec le chrono et l'absence d'erreur console |

## Version en ligne (HTTPS)

**https://fabiengorce40.github.io/Hybridsport/**

### Déploiement

- **Workflow** : `.github/workflows/kairo-pages.yml`, à chaque push sur la branche de travail qui touche l'application ou les paquets.
- **Garde** : `pnpm check` doit être vert.
- **Build et publication** : build de la PWA, puis publication sur la branche `gh-pages`, servie par GitHub Pages en HTTPS.
- **Identification** : `version.json` porte le commit publié.
- **Vérification de la build déployée** :
  - attente de `version.json` ;
  - en-têtes HTTPS ;
  - E2E Playwright sur l'URL publique : manifest, service worker, contexte sécurisé, installabilité selon Chrome (`Page.getInstallabilityErrors`), onboarding hybride, programme, séance, rechargement, historique.

### Sur Samsung (Chrome)

1. Ouvrir l'adresse ci-dessus.
2. Appuyer sur ⋮.
3. Appuyer sur « Installer l'application » (ou « Ajouter à l'écran d'accueil »).
4. Ouvrir KAIRO depuis l'écran d'accueil.

Les données restent dans le navigateur du téléphone (`localStorage` de l'origine `fabiengorce40.github.io`). « Exporter mes données » permet d'en garder une copie.

### Retour arrière

Point de retour : commit `b57038d` (tag local `kairo-beta0-ui1`). Republier une version antérieure revient à pousser cette version sur la branche de travail.

## Lancer et tester en local

### Sur ordinateur

```bash
pnpm install
pnpm kairo:dev                       # développement : http://localhost:5173
# ou, PWA de production (service worker actif) :
pnpm kairo:build && pnpm kairo:preview   # http://localhost:4173
# E2E navigateur (serveur preview lancé) :
pnpm kairo:e2e
```

### Sur téléphone Android, installation PWA sans hébergement public

1. Sur l'ordinateur : `pnpm kairo:build && pnpm kairo:preview` (port 4173).
2. Brancher le téléphone en USB, avec le débogage USB activé (Options pour les développeurs).
3. Dans Chrome sur l'ordinateur, ouvrir `chrome://inspect/#devices`, cliquer « Port forwarding… » et ajouter `4173` → `localhost:4173`.
4. Sur le téléphone, dans Chrome, ouvrir `http://localhost:4173`. C'est un contexte sécurisé : le service worker et l'installation sont actifs.
5. Menu ⋮ → « Installer l'application » (ou « Ajouter à l'écran d'accueil »), puis lancer KAIRO depuis l'icône (mode standalone).
6. Parcours : onboarding (« Musculation + Course », dernière course, disponibilités **incluant aujourd'hui**) → Créer mon programme → Planning → séance Musculation → valider des séries → Terminer → Historique. Fermez puis rouvrez l'application : tout est conservé.

**Variante réseau local** : `pnpm --filter @hybridsport/kairo preview --host`, puis `http://<IP-de-l'ordinateur>:4173` sur le téléphone. L'application fonctionne, mais sans service worker ni installation, car ce n'est pas un contexte sécurisé.
