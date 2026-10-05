# KAIRO Beta 0 — audit de la semaine affichée et outil « Recréer mon programme de test »

## 1. Audit de l'état affiché (avant toute modification)

État reproduit : AppState RÉEL produit par le code pré-S1 (`packages/app-core/tests/fixtures/pre-s1-state.json`), ouvert avec la version déployée `99a9a07` un jour après lundi.

**Full body visibles.** C'est l'ancienne semaine persistée, conservée telle quelle :
- semaine `2026-10-05` identique octet pour octet à la fixture ;
- pas de `planningVersion` ;
- 4 demandes `str_full_body` sans composition ;
- aucune trace `PLAN.WEEK_COMPOSITION` ;
- aucun audit `KAIRO.WEEK_REPLANNED_STALE`.

S1 ne l'a pas régénérée : la séance de lundi est passée, donc la politique `stale_kept` / `past_sessions` s'applique. C'est l'invariant voulu.

**Semaine suivante.** Elle est réellement composée par S1 :
- haut / bas / haut / bas ;
- `PLAN.WEEK_COMPOSITION` et `PLAN.PLANNER.COMPOSITION_APPLIED` sur chaque séance ;
- expositions prévues transmises 0, 1, 2, 3 (`PLAN.PLANNER.WEEK_EXPOSURES`) ;
- `planningVersion = beta0-s1`.

**Jeudi 8 en double : non reproductible depuis les données pré-S1.**
- Le planning rendu (application réelle, jsdom) affiche 7 jours uniques, un seul « Jeu 8 ».
- Le sélecteur `selectBeta0Week` produit 7 dates distinctes.
- Les dates sont calculées en UTC, sans ambiguïté de fuseau.
- Une exploration automatique de 8 200 états a été menée à partir de l'état pré-S1 : ouverture à différents jours, TEST Course demandé, recréation du programme (même profil, disponibilités et fréquences modifiées), séance commencée et terminée, référence déclarée, semaine suivante. Chaque état a été vérifié sur trois dates : **aucune** date dupliquée, **aucun** jour à deux séances.

Le doublon observé ne vient donc ni du sélecteur, ni du calcul des dates, ni d'un chemin de l'application à partir de cet état. Il ne peut provenir que de données propres au téléphone (historique antérieur non reproduit).

Plutôt que de le masquer, un **contrôle d'intégrité** permanent (`beta0Integrity`) le rend visible dans le Planning (« Incohérence de données détectée », détail technique). Il signale :
- jour dupliqué ;
- deux séances le même jour ;
- date hors de sa semaine ;
- demande présente dans deux semaines ;
- clé de semaine incohérente.

Les deux séances restent affichées.

Correction connexe : `sessionTitle` (écrans V0 hérités) renvoyait « Full body » pour toute séance Strength. Il utilise maintenant le libellé de l'archétype réel ; un archétype inconnu devient une erreur de données.

## 2. Outil Beta / dev : « Recréer mon programme de test »

`resetBeta0Data(state, clock, BETA0_RESET_CONFIRMATION, env)` dans app-core ; section « Outils de test Beta » des Réglages.

**Garde-fous** :
- explicite : jeton de confirmation exigé, case « Je comprends… » cochée, bouton « Effacer et recréer » désactivé sinon, « Annuler » ne modifie rien ;
- **refusé hors environnement `beta0_experimental`** (production, mode PRODUCTION) ;
- ce n'est pas une replanification : aucune semaine n'est modifiée partiellement, et l'invariant `WEEK_NOT_REPLACEABLE` est inchangé pour tous les autres chemins.

**Effacé** (produits du programme et de ses exécutions) :
- programme, semaines planifiées (y compris commencées), séances en cours ;
- réalisations Strength (expositions, tracks), empreintes ;
- courses réalisées dans le programme, références issues des TEST KAIRO ;
- anciennes séances V0.

**Conservé** (déclarations de l'utilisateur) :
- profil ;
- courses libres déclarées ;
- références de performance déclarées ;
- **pause douleur active** : un reset de test ne lève jamais une protection, et aucune séance n'est alors planifiée.

Ensuite, un programme neuf est créé depuis le profil actuel (date d'objectif Course conservée) et la semaine courante est planifiée par le moteur courant. Audit `KAIRO.BETA_DATA_RESET` (programme effacé, nombre d'éléments effacés et conservés).

**Calendrier.** Les jours déjà passés de la semaine sont indisponibles. Un reset le lundi donne la semaine entière (4 séances Strength) ; un reset le mercredi place les séances à partir d'aujourd'hui, et les autres sont « non planifiées » avec leur raison (`slot_unavailable`).

## 3. Contenu après reset (profil reproduit, lundi 5 octobre)

| Jour | Archétype persisté | Exercices (session_record) |
|---|---|---|
| lun. 5 | `str_upper` | développé couché, traction, rowing machine, développé épaules machine, pec deck |
| mer. 7 | `str_lower` | squat barre, soulevé de terre roumain unilatéral, Pallof |
| jeu. 8 | `str_upper` | développé couché, tirage vertical, rowing poulie, développé épaules machine, élévations latérales machine, Pallof, pec deck |
| ven. 9 | `str_lower` | squat barre, soulevé de terre roumain, leg curl, fente bulgare, mollets machine |

Mar. 6 et dim. 11 : footing facile. Pour les quatre séances Strength :
- autorité de composition `provisional`, règle `strength.rules.weeklyComposition@0.1.0-candidate` ;
- expositions prévues 0 / 1 / 2 / 3 ;
- version de planification `beta0-s1` ;
- aucun `str_full_body`, aucune donnée héritée, aucune date dupliquée.

## 4. Tests

- **`packages/app-core/tests/beta0-reset.test.ts`** :
  - audit de l'état affiché ;
  - semaine suivante S1 ;
  - reset refusé sans confirmation ou hors Beta ;
  - reset lundi (4 séances) et mercredi (calendrier) ;
  - effacement cohérent d'une semaine commencée ;
  - pause douleur conservée ;
  - export / import ;
  - intégrité.
- **`apps/kairo/tests/beta-reset-dom.test.tsx`** :
  - parcours complet jusqu'au DOM (avant : Full body + avis ; reset confirmé ; après : séances S1) ;
  - annulation sans effet ;
  - incohérence signalée sans masquage.
- **`apps/kairo/scripts/e2e.mjs`** (Chromium, build de production, aussi exécuté sur le site déployé) : scénario C, reset Beta, AppState puis DOM, dates uniques.
