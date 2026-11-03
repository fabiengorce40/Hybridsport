# REKKA FAST TRACK V1 — audit global de maturité

**Date :** 3 novembre 2026.
**Branche de travail :** `claude/rekka-v1-fast-track`, partie du lot 4.6 local `d59d91d`. Commit local uniquement.

**Méthode :**
- lecture du code, des tests et des documents ;
- deux explorations en lecture seule menées en parallèle (sports, parcours et données) ;
- chaque constat repris ici a été **revérifié dans le code** avant classement ;
- les preuves sont données en `fichier:ligne`.

## 0. Références vérifiées (avant tout travail)

| Référence | Valeur vérifiée | Constat |
|---|---|---|
| Branche BÊTA `claude/rekka-beta` | `097bacb` | Identique au rapport de publication. |
| Workflow BÊTA (exécution n° 7) | succès, `head_sha` = `097bacb`, 3 novembre 2026, 00:02 UTC | Publication et vérification vertes. |
| Production : `kairo-pages.yml` depuis `claude/crosstraining-c1-c2-spike-vbg8dv` | `f9f7e2e` | Inchangée. |
| Branche d'intégration RC5 | `5efd3c2` | Inchangée. |
| Lot 4.6 | `d59d91d`, local, non poussé | Présent. |
| Autres branches distantes | `codex/rekka-android-icon-fullbleed` (2 commits au-delà de la BÊTA), `claude/rekka-v2-2c` (3 commits) | Auditées au lot d'intégration (doc 13). Non reprises. |

**Limite rappelée :** la vérification de `rekka-beta.pages.dev` vient des journaux GitHub Actions (E2E exécuté par le CI sur le site réel). Le domaine reste bloqué depuis cet environnement. **Ce n'est pas un test manuel sur appareil réel** : la validation terrain (jalon 4) reste à faire.

## 1. Matrice de maturité des quatre sports

Légende : TERMINÉE · À STABILISER · INCOMPLÈTE · ABSENTE · EXPÉRIMENTALE · HORS V1.

| Fonction | Musculation | Course | HYROX | Cross-training |
|---|---|---|---|---|
| Choix à l'accueil | TERMINÉE (personnalisation en 7 étapes) | TERMINÉE | EXPÉRIMENTALE (débutant refusé après coup) | EXPÉRIMENTALE |
| Planification | À STABILISER (composition candidate) | À STABILISER | EXPÉRIMENTALE (gouvernance de test) | EXPÉRIMENTALE (gouvernance de test) |
| Séance complète | TERMINÉE (échauffement, phases, séries) | TERMINÉE (lecteur, tests, courses libres) | INCOMPLÈTE (bloc principal seul) | INCOMPLÈTE (bloc seul hors force + conditionnement) |
| Saisie des performances | TERMINÉE | TERMINÉE | TERMINÉE (charges réelles, temps) | TERMINÉE |
| Progression | À STABILISER (oscillations ; P-CLSTAB prête, inactive) | À STABILISER (allures EASY/LONG non prescrites, V40) | ABSENTE (doses fixes) | ABSENTE (CT-D5 non résolu) |
| Séance manquée | INCOMPLÈTE (lue à la clôture de semaine) | À STABILISER (DROP / MOVE / REPLAN_WEEK) | INCOMPLÈTE | INCOMPLÈTE |
| Reprise après une coupure | INCOMPLÈTE (reprise après douleur seulement) | À STABILISER (coupure longue refusée) | ABSENTE (`RETURN_NOT_SUPPORTED`) | ABSENTE (`RETURN_NOT_SUPPORTED`) |
| Historique | TERMINÉE | TERMINÉE | TERMINÉE | TERMINÉE |
| Tests | TERMINÉE (≈ 350 cas moteur + bancs + E2E) | TERMINÉE (≈ 420 cas, mutation 94 %) | À STABILISER (absent de l'E2E BÊTA) | À STABILISER (absent de l'E2E BÊTA) |
| **Statut V1 proposé** | **V1 après arbitrage P-CLSTAB** | **V1** | **EXPÉRIMENTAL en V1** (ou hors V1) | **EXPÉRIMENTAL en V1** (ou hors V1) |

Sources des statuts « reprise » :
- Cross-training : `packages/crosstraining/src/engine.ts:166` ;
- HYROX : `packages/hyrox/src/engine.ts:84` ;
- Musculation : `resumeTrack` gère uniquement la douleur (`packages/strength/src/progression.ts:521`).

**Pourquoi HYROX et Cross-training ne peuvent pas être déclarés « opérationnels » sans arbitrage :**
- leur gouvernance (doses, durées limites, charges, fenêtres d'interférence) est chargée depuis des **dossiers de tests** dans le code livré (`packages/app-core/src/beta0.ts:26-30` : `planner/tests/ct-beta0.js`, `hr-beta0.js`, `m3-governance.js`, `programme/tests/rotation-governance.js`) ;
- leurs valeurs n'ont jamais été relues par un expert ;
- le registre Cross-training est entièrement `UNRESOLVED` ; CT-G1 (novice, reprise, excentrique) n'est pas signé ; les gates C1/C2 et anti-doublon attendent un arbitrage (`docs/kairo/CROSSTRAINING-*-GATE.md`) ;
- aucune progression ni reprise n'existe pour ces deux sports.

Conformément à la mission, **ces protections ne sont pas contournées**. Un périmètre V1 réduit est proposé (§ 6, décision D1).

## 2. Les 20 parcours

| # | Parcours | Statut avant | Statut après FAST TRACK (commit local) | Preuve et commentaire |
|---|---|---|---|---|
| 1 | Installation PWA | À STABILISER | À STABILISER | Manifeste et SW propres au canal. Couleur de thème verte **corrigée en bleu nuit**. Icônes encore KAIRO (P1-6). |
| 2 | Création du profil | TERMINÉE | TERMINÉE | `Setup.tsx`. L'avancement de l'accueil n'est pas conservé au rechargement (P2). |
| 3 | Objectifs | TERMINÉE | TERMINÉE | `Setup.tsx`, faisabilité CT et HYROX. |
| 4 | Choix des sports | TERMINÉE | TERMINÉE | Les 4 sports sont proposés. |
| 5 | Disponibilités | TERMINÉE | TERMINÉE | Jours de musculation, E2E `e2e-strength-days`. |
| 6 | Génération du planning | TERMINÉE | TERMINÉE | `createBeta0Programme`, `ensureBeta0Week`. |
| 7 | Présentation d'une séance | TERMINÉE | TERMINÉE | Contrôle avant séance (douleur). |
| 8 | Réalisation d'une séance | TERMINÉE | TERMINÉE | Musculation (phases, séries), Course (lecteur), CT et HYROX (minuteurs). |
| 9 | Chronomètres et récupération | TERMINÉE | TERMINÉE | Repos persistés, pause, +15 s, passer. `clock/global-clock.ts` n'est pas relié (P2). |
| 10 | Enregistrement des performances | TERMINÉE | TERMINÉE | Saisie série par série, `FinishSheet`. |
| 11 | Historique | TERMINÉE | TERMINÉE | `History0.tsx`. |
| 12 | Progression visible | INCOMPLÈTE | INCOMPLÈTE | 3 compteurs seulement ; aucune évolution de charge ni record (P1-4). |
| 13 | Modification du profil | À STABILISER | À STABILISER | « Modifier et recréer le programme » avec aperçu ; écrans Musculation et Course séparés. |
| 14 | Replanification | À STABILISER | À STABILISER | Avant / après avec confirmation (Musculation, HYROX). **Replanification silencieuse de la semaine courante après une mise à jour** (P1-1). |
| 15 | Séance manquée | INCOMPLÈTE | INCOMPLÈTE | Lue à la clôture de semaine ; aucune action « déclarer / reporter » (P1-5). |
| 16 | Sauvegarde | TERMINÉE | TERMINÉE | Export JSON complet. |
| 17 | Restauration | **À STABILISER (risque de perte)** | **TERMINÉE** | **Corrigé** (P0-1) : confirmation avec comparaison, export proposé, copie exacte avant remplacement. |
| 18 | Mise à jour PWA | TERMINÉE | TERMINÉE | `version.json` et bandeau. Texte « KAIRO » restant (P2). |
| 19 | Hors ligne | À STABILISER | **TERMINÉE (à confirmer sur appareil)** | **Corrigé** (P1-2) : précache complet. Défaut démontré avec l'ancien SW (5 fichiers sur 5 absents du cache). |
| 20 | Reprise après interruption | TERMINÉE | TERMINÉE | Séance persistée, « Reprendre la séance », garde multi-onglets. |

## 3. Anomalies

### P0 — bloquant V1

| ID | Anomalie | Statut |
|---|---|---|
| P0-1 | **Import = remplacement immédiat** : le choix d'un fichier valide remplaçait profil, programme et historique sans confirmation ni copie (`Settings0.tsx`, ancienne version de `onImport`). Une erreur de fichier faisait perdre les données. | **CORRIGÉ** (commit local) : la fenêtre « Confirmer l'import » compare les données actuelles et le fichier, propose l'export préalable et permet d'annuler. À la confirmation, une copie exacte est écrite sous `kairo.beforereplace.<empreinte>` **avant** le remplacement ; si la copie échoue, rien n'est remplacé. « Tout effacer » est protégé de la même façon. Tests DOM : 4. Six scripts E2E sont adaptés et compatibles avec les anciennes builds. |
| P0-2 | **HYROX et Cross-training : gouvernance de test dans le code livré**, sans progression ni reprise. | **DÉCISION D1.** Non contourné. |

### P1 — important V1

| ID | Anomalie | Statut |
|---|---|---|
| P1-1 | Semaine courante **replanifiée sans accord** après une mise à jour qui change la version de planification (`beta0-app.ts:283-289`). Seule trace : un audit `KAIRO.WEEK_REPLANNED_STALE`. Contraire à « aucune modification silencieuse ». | À FAIRE (chantier B) : proposer « Planning actuel / Planning proposé » avec « Conserver mon planning » et « Appliquer le nouveau planning ». |
| P1-2 | Hors ligne fragile à la première visite (seule la coquille était en cache). | **CORRIGÉ** : précache des fichiers de la build (BÊTA seulement, production inchangée). Test `e2e-offline-smoke` renforcé (cache du SW vérifié fichier par fichier) et ajouté à la vérification post-déploiement du workflow BÊTA. |
| P1-3 | Progression Musculation instable (331 changements de sens sur 24 semaines). | Politiques versionnées **prêtes, inactives** (§ 4). **DÉCISION D2.** |
| P1-4 | Écran Progression réduit à 3 compteurs. | À FAIRE (chantier C) : évolution des charges par exercice principal, séances par sport. Lecture seule de données existantes. |
| P1-5 | Séance manquée reconnue seulement à la clôture de la semaine. | À FAIRE (chantiers B et A) : action « Je ne l'ai pas faite » ; la règle sportive existe déjà pour la Course (DROP / MOVE / REPLAN_WEEK). |
| P1-6 | Identité : couleurs de sport non conformes à la charte, couleur de thème verte, icônes et textes KAIRO. | **Couleurs et couleur de thème CORRIGÉES.** Icônes REKKA : branche `codex/rekka-android-icon-fullbleed` à auditer et intégrer. Textes KAIRO : P2. |
| P1-7 | Reprise Musculation après une longue coupure : aucune règle de désentraînement. | **DÉCISION D4** (règle scientifique à valider). |
| P1-8 | E2E BÊTA sans parcours CT ni HYROX. | À FAIRE (chantier E), selon D1. |
| P1-9 | Replanification limitée à Musculation et HYROX. | À FAIRE après P1-1 (même composant). |
| P1-10 | Course : allures EASY/LONG non prescrites (V40 non résolu). | Durée et RPE à la place. **DÉCISION D5.** |

### P2 — reportable

- Textes « KAIRO » restants : bandeau de mise à jour, accueil, profil.
- Avancement de l'accueil non conservé au rechargement.
- `clock/global-clock.ts` non relié.
- Aucun test DOM pour `LiveProgress`.
- Incréments de charge non reliés à l'équipement déclaré (aucun palier inventé ; doc 14 § 6).

## 4. Lot 4.6 — audit de P-CLSTAB (priorité sportive)

| Point demandé | Résultat |
|---|---|
| 1. Scénarios individuels (14, sur 24 semaines) | Changements de sens 331 → 146, allers-retours 273 → 96. Détail : `packages/app-core/tests/rc5/__reports__/lot46-stabilisation.md`. |
| 2. Exercices principaux | 24 semaines : squat, RDL et développé couché **égaux ou supérieurs** dans les 14 scénarios et les 20 profils. Seule baisse : L41-DIFF à 12 semaines, développé couché 65 → 62,5 (profil « difficulté »). |
| 3. Profils qui régressent (20 profils, **nouvelle mesure** 12 et 24 semaines) | **Aucun profil n'a plus de changements de sens qu'avec A.** Somme des charges finales à 24 semaines : −3 à −5 % sur 5 profils hybrides (L4-2, L41-RUN, L42-RUN3, L43-HYX3, L43-RECOV), qui oscillaient le plus avec A. Exercices principaux inchangés ; l'écart porte sur les accessoires. B-CLAMP : −2,4 à −3,1 % sur ces profils. |
| 4. L'hystérésis masque-t-elle une fatigue persistante ? | **Non.** Elle ne bloque que les HAUSSES (`stabilize`, `progression.ts`). E-FPERS baisse toujours (100 → 80) ; E-DIFF identique (100 → 85). Test : `rc5-lot46-stabilization` et `rc5-fasttrack-progression-policy`. |
| 5. Décisions après interruption | L'hystérésis compte des EXPOSITIONS, pas des jours : après une coupure, une baisse antérieure bloque encore les 3 hausses suivantes, ce qui est prudent. E-BACK et E-MISS identiques à A. |
| 6. Séances volontairement allégées | Lecture R4 absente de la politique (aucun `policy`) : comportement actuel conservé. La lecture au plafond ne s'applique qu'au-delà de la plage de validité, inchangée. |
| 7. Incréments matériels | Paliers réels du ruleset (barre 2,5 kg…). Sauts > 10 % : 138 → 47, par report et sans palier inventé. Équipement déclaré non relié (P2). |
| 8. Ruleset identifiable et relisible | **Fait.** `PROGRESSION_POLICIES` (`packages/app-core/src/progression-policies.ts`) : `progression-clamp-1` (B-CLAMP) et `progression-stab-1` (P-CLSTAB). L'identifiant est écrit dans chaque `PROGRESSION.EXPOSURE_CLASSIFIED` (`progressionPolicy`, paramètre facultatif déclaré dans `strength/src/codes.ts`). |
| 9. Migration et compatibilité | Aucun changement de schéma : paramètre facultatif d'audit. L'export puis l'import conservent l'audit à l'identique (test). Le test a révélé qu'une activation **sans** déclarer le paramètre aurait fait échouer chaque fin de séance Musculation. Corrigé avant toute activation. |
| 10. Activation contrôlée | `withProgressionPolicy(env, id)`, jamais appelé par le produit ; `beta0Environment().progressionReading` reste `undefined` (test). Activer = une ligne dans `beta0Environment`, plus les E2E, **après décision D2**. |

**Redistribution :**
- critères comparés au lot 4.6 (doc 14 § 8) : couverture, séances placées, durée, petits groupes, course ;
- **la sélection automatique (RED-GUARD par défaut, SW-ALT + RED-GUARD pour les profils hybrides compatibles) n'est pas encore codée** ;
- critère explicite proposé (D3) : semaine courte, déficit sur des groupes du bas du corps et au moins 2 séances de course ou de HYROX ⇒ SW-ALT ; sinon RED-GUARD ; aucune redistribution si une garde de récupération ou de durée est menacée.

**B1ISO — cause des « 140 changements » (profil forme), démontrée :**
- les exercices principaux (squat, RDL) **ne changent jamais** sur 24 semaines ;
- l'ancien compteur mesurait la **position** #0 / #1 dans la séance. Avec B1ISO, l'alternance A/B programmée fait passer la poussée verticale au jour « hanche » et la poussée horizontale au jour « genou » : composition périodique, stable dès la semaine 8. Ce sont des rotations prévues, pas des remplacements indésirables ;
- remplacements réels dans un même emplacement : A 8, B1ISO 12 sur 72 séances (poussée horizontale 2 → 4, isolation du bas 0 → 2) ;
- aucune instabilité à corriger. Test de non-régression : `rc5-fasttrack-b1iso.test.ts` (principaux jamais remplacés, composition périodique).

## 5. Dépendances, risques, parallélisme

**Dépendances :**
- P1-1 (proposition de replanification) précède P1-9 (même composant) et l'activation de toute politique qui change le planning (D3) ;
- D2 (P-CLSTAB) précède l'écran Progression (P1-4), pour afficher des charges stabilisées ;
- D1 (périmètre CT / HYROX) conditionne P1-8 et le contenu de l'accueil.

**Risques :**
1. **Gouvernance de test livrée (CT, HYROX).** Risque sportif si ces sports sont présentés comme validés.
2. **Changement du SW BÊTA à chaque build.** Le SW est désormais mis à jour à chaque déploiement (liste des fichiers). Navigation toujours « réseau d'abord », un seul cache `rekka-beta-1`, aucune suppression de données. Coût : environ 3,2 Mo téléchargés à chaque mise à jour. À valider sur Android (jalon 4).
3. **Aucune validation sur appareil réel** pour l'instant.

**Chantiers parallélisables (fichiers disjoints) :**

| Chantier | Périmètre | Indépendant de |
|---|---|---|
| A — moteurs | `packages/strength`, `running`, `app-core/progression*` | C, D |
| B — planning | `packages/app-core/beta0-app.ts`, `strength-replan.ts`, `apps/kairo/src/strength/StrengthReplan.tsx` | C (hors composant de replanification) |
| C — interface | `apps/kairo/src/rekka/*`, `screens/beta0/History0.tsx` (Progression), icônes | A, D |
| D — données | `app-core/store.ts`, `write-guard.ts`, `public/sw.js`, `vite.config.ts` | A, C |
| E — QA | `apps/kairo/scripts/*`, `packages/*/tests` | tous (intégration) |

## 6. Chemin critique vers la V1 et décisions regroupées

**Chemin critique :** D1 (périmètre) → P1-1 (proposition de replanification) → P1-5 (séance manquée) → P1-4 (Progression) → E2E complets + migrations → Release Candidate → **validation terrain Android** (jalon 4).

**Décisions qui demandent ton arbitrage :**

| ID | Décision | Options | Recommandation |
|---|---|---|---|
| D1 | Périmètre V1 de HYROX et du Cross-training | (a) V1 = Musculation + Course ; CT et HYROX visibles mais marqués « Expérimental » ; (b) CT et HYROX hors V1 (masqués) ; (c) faire valider leur gouvernance par un expert avant la V1 | **(a)** : rien n'est contourné, l'utilisateur est informé, aucun travail perdu. |
| D2 | Politique de progression Musculation | `progression-stab-1` (P-CLSTAB) ; `progression-clamp-1` (B-CLAMP) ; statu quo | **`progression-stab-1`**, activation BÊTA d'abord : oscillations divisées par 2,3, exercices principaux préservés. Coût : −3 à −5 % de charge accessoire finale sur 5 profils hybrides sur 24 semaines. |
| D3 | Redistribution | RED-GUARD général ; plus SW-ALT conditionnel (critère § 4) ; aucune | Coder la sélection explicite, **puis** décider après simulation. Pas d'activation en V1 sans ce résultat. |
| D4 | Reprise Musculation après une coupure longue | Pas de règle (actuel) ; réduction de charge selon la durée de coupure (règle à sourcer) | Règle simple et sourcée en V1 ; à défaut, avertissement à l'utilisateur. |
| D5 | Allures Course EASY/LONG | Durée + RPE (actuel) ; allures dérivées des tests | Garder durée + RPE en V1 (sûr). |
