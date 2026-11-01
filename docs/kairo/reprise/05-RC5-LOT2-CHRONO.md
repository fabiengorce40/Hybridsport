# Reprise RC5 — Lot 2 : chronomètre global unique et durées fiables

- **Branche :** `claude/rekka-reprise-20261031`, locale.
- **Décisions appliquées :** D2 (chronomètre RC5.4 persistant ; une validation de série ne relance jamais une pause volontaire) et D3 (format v5 additif, champs déclarés au lot 1).
- **Non modifié :**
  - aucune règle scientifique, aucune prescription, aucun temps de repos ;
  - aucun moteur ne lit les durées (observation seulement) ;
  - aucun nouveau design : la présentation REKKA actuelle du chronomètre est conservée.

## 1. Avant / après

| | Avant (V2.x) | Après (lot 2) |
|---|---|---|
| Source du temps | Compteur **en mémoire** (`SessionClocks`), perdu au rechargement | **Horodatages enregistrés** dans le journal de séance (`log.clock`), seule source de vérité |
| Rechargement, fermeture | « Le temps précédent ne peut pas être récupéré… » + « Réinitialiser le chronomètre » | Temps relu exactement, aucune remise à zéro |
| Veille, écran verrouillé | Chrono invalidé si les horloges divergeaient | Calcul depuis les horodatages : rien n'est perdu ni compté deux fois |
| Deux onglets | Chaque onglet avait son propre chrono | Un seul chrono, partagé par la protection des données (Reprise 2) |
| Export / import | Chrono absent | Chrono et pause dans l'export, restaurés à l'identique |
| Fin de séance | Rien n'était figé | `timing { activeS, pausedS, plannedS }` figé, pause en cours close à la fin |
| Validation de série pendant une pause | — (RC5.4 relançait la séance) | **La pause est conservée** (règle impérative) |

Retirés :
- le module `apps/kairo/src/clock/session-clock.ts` et son test ;
- `store.sessionClocks`.

Le module isolé `global-clock.ts` (clés `rekka.global-clock.v1.*`, jamais relié à l'interface) est **inchangé** : ses clés ne sont ni lues ni écrites par l'application.

## 2. Fonctionnement réel

- **Démarrage :** à `startedAt`, au lancement effectif de la séance (après le contrôle avant séance). Aucun champ n'est écrit tant qu'il n'y a pas de pause.
- **Temps actif :** maintenant (ou la fin) − lancement − pauses volontaires.
  - Pause en cours : le temps s'arrête au début de la pause.
  - Instants à la seconde, comme tous les horodatages enregistrés.
- **Pause :** `log.clock.pausedAt`. Une pause déjà en cours est sans effet.
- **Reprise :** la durée de la pause s'ajoute à `pausedS`. Une reprise hors pause est sans effet.
- **Rien d'autre ne lève une pause :**
  - valider, décocher ou modifier une série ;
  - les commandes du repos ;
  - la navigation ;
  - un rechargement.
- **Fin, y compris pendant une pause :**
  - la pause est close à l'instant de la fin ;
  - `timing.activeS`, `timing.pausedS` (total − actif) et `timing.plannedS` (durée estimée de la séance exécutée) sont figés ;
  - le chronomètre et ses commandes disparaissent ;
  - la fin de séance affiche « 14 min 01 · pauses 11 min 03 ».
- **Durée enregistrée :**
  - Musculation : le temps actif, dans l'historique (« Durée réelle … · pauses … · prévue ≈ … ») et le journal BÊTA (« durée réelle … (pauses …) ») ;
  - séances antérieures (sans `timing`) : l'horloge début → fin, **jamais recalculée**.
- **Chrono de repos :** inchangé et indépendant (`log.rest`) : pause, reprise, +15 s, passer, persistance.
- **Périmètre :**
  - le chronomètre global du journal concerne **la Musculation** (`hasGlobalSessionClock`) ;
  - Course (lecteur), Cross-training et HYROX gardent **leur** chrono persistant existant. Aucun second compteur n'est ajouté, et une pause globale sur ces sports est sans effet.
- **Temps de repos réellement pris :** non enregistrés aujourd'hui (seul le repos en cours est conservé). Les ajouter serait une nouvelle donnée, proposée pour plus tard.

## 3. Tests

| Test | Résultat |
|---|---|
| `packages/app-core/tests/rc5/rc5-lot2-session-clock.test.ts` | 11/11 |
| `apps/kairo/tests/beta0.test.tsx` (chrono réécrit) | 20/20 |
| `apps/kairo/tests/storage-guard-dom.test.tsx` (deux onglets) | 3/3 |
| E2E `e2e-rc5-lot2-clock.mjs`, 360 et 390 px | 11 vérifications par largeur, OK |
| E2E parcours complet (`e2e-beta.mjs` + `e2e.mjs`) | **342** OK |
| E2E migrations, build V2.1 (v3) → v5 et build `b850b98` (v4) → v5 | v1 à v4 → v5 OK, anciennes builds refusent v5 sans réécrire |
| E2E sécurité des données, personnalisation, jours Musculation, séance mobile (adaptée), répétitions, hors ligne, icônes, mise à jour A → B | OK |
| `pnpm check` (TypeScript, lint, tests) | **3 117 réussis**, 0 échec |

**Détail du test unitaire** (11 cas) :
- démarrage et arrière-plan ;
- pause et reprise sans double comptage ;
- **série validée pendant la pause** ;
- repos et global simultanés ;
- fin pendant une pause ;
- durée enregistrée et journal ;
- séances historiques inchangées ;
- séance commencée en v4 ;
- horloge reculée ;
- un seul chrono par sport ;
- précision à la seconde.

**Détail de l'E2E lot 2** (11 vérifications par largeur) :
- lancement ;
- 10 min d'arrière-plan ;
- repos et global ;
- **série pendant la pause** ;
- rechargement ;
- deux onglets ;
- fermeture et réouverture ;
- fin pendant la pause ;
- durées identiques après rechargement et après import sur un autre appareil ;
- 7 séances historiques identiques ;
- aucune erreur JavaScript.

### Tests adaptés, sans affaiblissement
- Ils vérifiaient l'ancien comportement (temps perdu, « Réinitialiser le chronomètre »). Ils vérifient désormais que le temps est relu, sans remise à zéro.
- Les fixtures d'interface restent des données **antérieures au lot 2** (format v2, relues aussi par la build V2.1). Les tests qui les comparent retirent les seuls champs `clock` et `timing` de l'état généré.

## 4. Limites Android / PWA

- **Horloge de l'appareil :** le temps repose sur elle. Si l'heure est changée pendant une séance, le temps suit ce changement ; il n'est jamais négatif.
- **Veille :** le système peut suspendre la PWA. L'affichage n'est pas mis à jour pendant la veille, mais il est exact dès le retour au premier plan, et rien n'est perdu.
- **Séance commencée sous une version antérieure :** le chrono repart du lancement enregistré. Les pauses de l'ancien chrono en mémoire n'ont jamais été enregistrées et ne peuvent pas être retrouvées.
- **Temps de saisie de fin :** il compte jusqu'à « Enregistrer » (comme RC5.4).
- **Onglets ouverts :** une action faite dans un onglet périmé est refusée sans écriture (Reprise 2). Il faut la refaire après relecture.

## 5. Risques de régression

| Risque | Traitement |
|---|---|
| Texte de l'écran de séance (temps relu au lieu de la remise à zéro) | E2E séance mobile et tests d'interface mis à jour |
| Durée affichée des nouvelles séances Musculation = temps actif (plus faible si pauses) | Voulu ; séances antérieures inchangées |
| Fixtures v2 relues par les anciennes builds | Conservées sans champ v5 (vérifié par les E2E V2.1) |
| Build intermédiaire | Toujours interdite avant la fin de RC5 (lot 1) |
