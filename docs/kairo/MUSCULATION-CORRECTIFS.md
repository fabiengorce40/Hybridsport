# KAIRO — Correctifs Musculation après audit

Branche `claude/strength-fixes-precheck`, issue de la tête C4.3 (`fccdd77`, PR #2) : les travaux C4.3 sont conservés
tels quels. Rien n'est fusionné ni déployé.

Les règles sportives nouvelles introduites ici sont **toutes `TEST_ONLY`**, tracées et listées au §6 ; aucune règle
approuvée n'a été modifiée.

## 1. P0 — Contrôle pré-séance

| Avant (reproduit sur la base) | Après |
|---|---|
| L'état du jour était figé à `readiness: 'normal'`, `activePain: []` à la génération et au démarrage. | L'état par défaut est **inconnu** (`UNKNOWN_CORE_STATE` : `readiness: 'unknown'`, aucune douleur déclarée). |
| « Commencer la séance » et « Faire maintenant » démarraient sans aucune question (`checkIns` absent de l'état). | Tout **nouveau** démarrage ouvre « Avant de commencer » : douleur actuelle (zone + intensité P1–P3, signal général P4), fatigue et récupération. « Passer » est toujours possible et enregistre un état **inconnu**. |
| Aucune adaptation possible selon l'état du jour. | La séance est **régénérée** sur son propre créneau (graine, minutes, contexte voisin, semaine multisport persistés) avec l'état déclaré. Les règles existantes décident : séance inchangée, **adaptée** (changements et raisons affichés), **reportée** (aucun exercice compatible, raisons lisibles) ou **pause douleur** (règles G1 : P4, ou P3 sur une zone centrale / plusieurs zones). |
| — | Une séance **déjà commencée** reprend sans contrôle et sans perte (séries, charges, RIR, repos). |
| — | Récidive : un P1 déclaré deux fois en 14 jours devient P2 (règle G1 existante `detectRecurrence`). |

Aucun diagnostic médical : les messages renvoient vers un professionnel de santé lorsque la pause est déclenchée.

Fichiers : `app-core/src/checkin.ts`, `start-check.ts`, `beta0-app.ts` (`startProgrammeSession`), `kairo/src/precheck/PreSessionCheck.tsx`.

### 1.1 Sécurisation : réponse douleur explicite et douleurs connues (comportement exact)

**Question douleur.** Trois statuts sont enregistrés (`painStatus`) :

| Réponse | Statut | Effet |
|---|---|---|
| « Non » | `none` | Aucune douleur aujourd'hui ; les douleurs connues sont **résolues**. |
| « Oui » + zones et/ou signal général | `reported` | Les zones déclarées **remplacent** les douleurs connues. À « Oui », les zones connues sont **présélectionnées** (modifiables), pour qu'aucune ne soit oubliée par mégarde. |
| Aucune réponse : « Passer », ou douleur non renseignée côté app-core | `unknown` | Jamais lu comme « aucune douleur » : les douleurs connues restent appliquées. |

- Dans l'interface, « Valider et commencer » est refusé tant que la question douleur n'a pas reçu « Non » ou « Oui »
  (message explicite) ; « Passer » reste toujours possible.
- Côté app-core, une entrée sans `painAnswer` vaut `yes` si des zones sont fournies, sinon `unknown`, jamais `no`.
- Les combinaisons incohérentes (« Oui » sans zone, « Non » ou « inconnu » avec des zones) sont refusées
  (`CHECKIN_INVALID`), sans rien modifier dans l'état.

**Douleurs connues.** Ce sont les douleurs du **dernier contrôle à réponse explicite**, au niveau enregistré (après
récurrence). Elles sont annulées dans trois cas :

- ce contrôle répondait « Non » ;
- il a déclenché la pause douleur ;
- la pause douleur a été levée explicitement depuis (`safety.clearedAt`, posé quand la levée de la pause est confirmée dans les réglages).

Les contrôles sans réponse sont ignorés : ils ne lèvent rien. Le statut CORE `isActive` est respecté : un signalement
reste actif jusqu'à sa résolution, et aucune durée d'expiration n'a été inventée.

**« Passer » (ou douleur sans réponse) :**
- Le contrôle est enregistré avec `pains: []` et `knownPains: [...]` (zone, niveau, contrôle d'origine, date).
- La raison `KAIRO.CHECKIN_KNOWN_PAIN_KEPT` est affichée en clair : « Douleur déjà signalée, toujours prise en compte
  faute de réponse ».
- Les règles G1 s'appliquent aux douleurs connues comme au premier signalement : zone restreinte, puis séance
  régénérée (adaptée) ou reportée.
- Le formulaire rappelle les douleurs connues avant toute réponse (« Douleur déjà signalée … Répondez « Non » si elle
  a disparu »).
- Une pause douleur active n'est **jamais** levée par « Passer » : le démarrage est refusé (`SAFETY_PAUSE_ACTIVE_PAIN`)
  avant tout contrôle, et l'état reste inchangé.
- Fatigue et récupération ne sont **pas** reportées : sans réponse, l'état du jour reste `unknown`.

**Récurrence (règle G1 `detectRecurrence`, inchangée).** Seules les douleurs **déclarées** (`pains`) comptent. Les
douleurs connues reportées ne sont jamais recomptées : un P1 suivi de « Passer » reste P1, alors qu'un P1 déclaré deux
fois en 14 jours passe en P2, même avec un « Passer » entre les deux.

**Chemins de démarrage.**

| Chemin | Comportement |
|---|---|
| Planifiée, « Faire maintenant » | Même contrôle ; la séance est régénérée sur son créneau. |
| Non placée (manuelle) | Le contrôle est enregistré. La séance n'est pas régénérable : elle est reportée si une zone exclue est sollicitée (ex. course avec un genou P2 connu), sinon elle démarre telle quelle (raison tracée). |
| Reprise | Aucun contrôle, aucune douleur appliquée a posteriori ; séries, repos et adaptation sont conservés. |
| Fin directe d'une séance non démarrée | La séance a déjà eu lieu : aucun contrôle ni adaptation a posteriori. La garde de pause douleur s'applique toujours. |

### 1.2 Reproductibilité de la séance avant adaptation (correctif de consolidation)

**Anomalie corrigée.** La composition Strength dépend aussi de l'historique : expositions et progression. Dès qu'une
séance est réalisée dans la semaine, recomposer une autre séance planifiée donne d'autres exercices, même à état
identique. Le même effet apparaît sur une semaine composée par une version antérieure du moteur : état réel de la
version déployée `f9f7e2e`, ou séance Cross-training C3 qui deviendrait une séance C4. Le contrôle attribuait alors ces
écarts à l'état du jour. Exemple : « fatigue élevée » affichait « développé couché, tirage, pec deck retirés ».

**Comportement.**
- Une séance n'est adaptée que si sa régénération à état **inconnu** redonne exactement la séance planifiée.
- Sinon, si aucune zone exclue n'est sollicitée et que la haute intensité n'est pas suspendue :
  - la séance planifiée est gardée **telle quelle** ;
  - la raison `KAIRO.CHECKIN_ADAPTATION_NOT_APPLIED {cause: session_not_reproducible}` est tracée ;
  - l'ajustement d'effort lié à la fatigue n'est donc pas appliqué.
- Sinon (une zone exclue est sollicitée), la sécurité prime :
  - la séance recomposée par le moteur est proposée sans la zone, avec `KAIRO.CHECKIN_SESSION_RECOMPOSED`
    (« certains changements ne sont pas liés à la douleur ») ;
  - si le moteur la refuse, elle est reportée.

Aucune règle sportive n'est ajoutée. Tests : `precheck-reproducibility.test.ts`. Il couvre 4 cas en semaine courante
et 5 états réels générés par le code déployé : séance en cours, Cross-training C3 en cours, pause douleur, prise de
masse 4 séances par semaine.

Tests : `packages/app-core/tests/strength-fixes/precheck-safety.test.ts` (21 tests) et `apps/kairo/tests/precheck-dom.test.tsx`
(2 tests ajoutés).

## 2. P1 — Programmation Strength

- **Full Body A/B/C** est conservé pour 1 à 3 séances (règle de composition inchangée, aucun Upper/Lower imposé à 3).
- **Lisibilité** : titre « Full body A / B / C » quand l'archétype se répète dans la semaine. Deux séances aux mêmes
  exercices principaux portent la même lettre : rien n'est présenté à tort comme une variation. Le panneau de séance
  affiche les mouvements dominants, les séries de travail par groupe musculaire et les raisons d'allègement tracées par
  Strength. La carte Programme affiche le volume hebdomadaire par groupe, à titre d'information seulement.
- **Récupération** : les séances de force à un jour d'écart sur les mêmes groupes ou les mêmes exercices sont
  **signalées**, y compris le bloc de force Cross-training C4.3. Aucune règle de récupération intra-discipline n'est
  gouvernée (`same_discipline_recovery`) : le signal n'est **jamais appliqué**.
- **4 séances** : si une séance Upper ou Lower est strictement identique à la précédente du même archétype, elle est
  régénérée avec la note de rotation existante `planned_variation` (règle `planner.strength.withinWeekVariation.test-0`,
  `TEST_ONLY`). La variante n'est retenue que si elle diffère **et** garde exactement les mêmes séries de travail par
  groupe ; sinon l'original est conservé et le résultat est tracé (`no_governed_variation`).
- **5–6 séances** : ces options sont désactivées dans le formulaire (« pas encore pris en charge »). Une alerte et la
  carte Programme proposent les fréquences composables (1 à 4, lues dans les bandes de la règle).
- **Volume** : il n'est jamais augmenté pour atteindre les planchers expérimentaux. Le garde-fou du volume par groupe
  a corrigé une régression détectée en test : les mollets passaient sous le plancher quand la variation remplaçait
  « Mollets machine ».

## 3. P1 — Matériel

| Avant | Après |
|---|---|
| Nouveau profil présélectionné sur « Salle complète ». | Aucune présélection : un choix explicite est requis avant « Créer » (bouton désactivé, message). |
| Profils existants : matériel présumé. | Bandeau « Votre matériel est-il toujours… ? » avec « C’est bien mon matériel » (pose `confirmedAt`, ne modifie rien) et « Modifier mon matériel ». |
| Aucune issue si une machine est indisponible. | « Matériel indisponible » sur chaque exercice non commencé. Le remplacement se fait par un substitut **direct** du contrat Strength, faisable sans le matériel manquant, non exclu et hors zone restreinte du jour. La charge en kg n'est pas transférée et devient l'effort prescrit. Sans substitut validé, le **refus est explicite et tracé** (`no_declared_substitute`, `no_compatible_substitute`, `load_not_transferable`). Le remplacement est refusé après une série validée. |

Tous les préréglages ont été vérifiés : chaque séance générée est faisable avec le matériel déclaré, et aucune
machine n'est supposée présente.

## 4. P1 — Interface mobile

- **Bouton de validation de série** : la bordure était presque invisible (rgb(36,36,40) sur fond sombre) ; elle est
  désormais contrastée (blanc 62 %) avec un fond léger, en zone tactile de 44 px ou plus. L'état désactivé est en
  pointillés.
- **Répétitions obligatoires** : 19 boutons sur 26 étaient désactivés sans explication. Le champ affiche maintenant
  la fourchette prescrite et un message explique qu'il faut saisir les répétitions réalisées pour valider la série.
- **Chrono flottant** : il masquait 6 contrôles en bas de page. La page a désormais une marge basse et la série
  suivante défile automatiquement au-dessus du chrono.
- **Persistance** : séries, charges, RIR, chrono, adaptation, remplacements et historique sont vérifiés après
  rechargement (E2E).

## 5. Validation

- **Tests unitaires** : `packages/app-core/tests/strength-fixes/` (25 tests) couvre :
  - masse 3 séances/semaine avec Running et CT, masse 4/semaine ;
  - douleur épaule et membre inférieur, signal général ;
  - matériel incomplet ;
  - séance déjà commencée, séance manuelle et non placée ;
  - persistance et historique.
- **Tests DOM** : `precheck-dom` et `equipment-dom` sont nouveaux ; les parcours existants passent désormais le
  contrôle pré-séance.
- **E2E** : bloc « CORRECTIFS MUSCULATION (360 × 640) », captures `mu-01` à `mu-10`.
- **Commandes** : `pnpm check`, `pnpm kairo:build` et `pnpm kairo:e2e` passent.

## 6. Règles TEST_ONLY introduites (à approuver)

| Règle | Contenu |
|---|---|
| `app.checkin.readinessMapping` 0.1.0-test | Fatigue élevée **ou** récupération mauvaise ⇒ `caution` (dose Strength existante : RIR +1). Toute réponse ⇒ `normal`. Aucune réponse ⇒ `unknown`. |
| `planner.strength.withinWeekVariation.test-0` | À 4 séances, une séance identique à sa jumelle de la semaine est régénérée avec `planned_variation`, à volume par groupe strictement identique, sinon elle est conservée. |

## 7. Non résolu / décisions attendues

1. **`same_discipline_recovery`** : la récupération entre séances de force proches (Strength et bloc CT) est
   signalée, pas gouvernée. Faut-il une règle (écart minimal, groupes, exercices) ?
2. **Substitutions du catalogue** : pec deck, élévations latérales machine et hack squat n'ont aucune substitution
   déclarée, donc le refus est explicite. Le catalogue doit être complété.
3. **Full Body + épaule P2** : les créneaux poussée et tirage obligatoires sont bloqués, donc la séance est
   **reportée** plutôt qu'adaptée. Faut-il une variante Full Body sans haut du corps ?
4. **Séances non régénérables** (HYROX, séance non placée) : le contrôle est enregistré et la pause s'applique, mais
   la séance n'est pas adaptée à la fatigue ou à une douleur localisée ; elle démarre telle quelle (raison
   `KAIRO.CHECKIN_ADAPTATION_NOT_APPLIED`), ou est reportée si une zone exclue est sollicitée ou si la haute intensité
   est suspendue.
5. **5–6 séances/semaine** : à composer (Push/Pull/Legs ou autre) ou à garder désactivées.
6. **Validation des deux règles `TEST_ONLY`** du §6.

## 8. Captures mobiles (360 × 640)

- **Avant** (`musculation-correctifs/avant/`) : matériel présélectionné, fréquences 1–6, trois « Full body » sans
  distinction, démarrage sans contrôle, bouton de série peu visible, chrono masquant le bas de page.
- **Après** (`musculation-correctifs/apres/`, générées par `pnpm kairo:e2e`) :
  - `mu-01` matériel à choisir, `mu-02` matériel choisi ;
  - `mu-03` planning avec les variantes ;
  - `mu-04` contrôle pré-séance, `mu-05` douleur au genou, `mu-06` séance adaptée et panneau de lecture ;
  - `mu-07` matériel indisponible, `mu-08` série suivante visible au-dessus du chrono ;
  - `mu-09` épaule P2 : séance reportée ;
  - `mu-10` volume hebdomadaire et signal de récupération.
  - `mu-11` douleur connue rappelée et présélectionnée au contrôle suivant.
