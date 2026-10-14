# KAIRO RC3 — Audit complémentaire du code réel (lecture seule)

**Base auditée :** RC1, `claude/kairo-rc1` @ `f0b09e4`, celle de RC1 TEST.
**Branche de développement RC3 :** `claude/kairo-rc3-dev`, créée depuis `f0b09e4`.

- Ce document est la seule modification de la branche.
- **Aucune** règle sportive ni ligne de code n'a été modifiée.

> Des tests verts ne prouvent pas la qualité sportive. Les constats ci-dessous viennent de la lecture du code et
> d'exécutions du **chemin réel de l'application** (`createBeta0Programme`, `ensureBeta0Week`,
> `startProgrammeSession`, `finishProgrammeSession`). Les sondes ont été supprimées après usage : le travail reste en
> lecture seule.

## 0. Méthode et correction d'un constat antérieur

**Sources de l'audit :**
- les écrans `apps/kairo/src` : chemin Beta 0 (`screens/beta0/*`, `workout/*`, `precheck/*`) et chemin V0 hérité ;
- `packages/app-core` (orchestration), le planificateur et les quatre moteurs ;
- l'E2E existant (221 vérifications) ;
- les études RC2, RC2 bis et RC3-prép ;
- des sondes du chemin réel : 6 profils Running sur 6 semaines, matériel × intention Cross-training, HYROX par
  niveau et matériel, fatigue déclarée sur 4 semaines.

**Correction.** `RC3-PREPARATION.md` disait que la distance de la dernière course n'était pas demandée à
l'inscription. **C'est inexact :** l'onboarding Beta 0 la demande, de façon facultative (`Setup.tsx`, « Votre dernière
course »). Il permet aussi d'ajouter une performance de référence ou de « programmer un test chronométré ». Le blocage
« facile uniquement » vient donc surtout :
- du **profil par défaut** (P_R1, course générale) ;
- d'une **distance non saisie** ;
- des **simulations**, qui ne saisissent jamais de distance et enregistrent toujours la course comme « modifiée ».

Voir la phase 2.

## PHASE 1 — Chemins complets, par discipline

Légende des statuts :

| statut | sens |
|---|---|
| ✅ | présente et accessible |
| ◐ | partielle |
| 🔒 | implémentée mais inaccessible |
| 🧪 | simulée seulement dans les tests |
| ✗ | absente |
| ⚠ | défectueuse |

### 1.1 Matrice

| fonctionnalité | Musculation | Course | Cross-training | HYROX |
|---|---|---|---|---|
| Onboarding, profil sportif | ✅ objectif, fréquence 1–4 (5–6 affichées mais non proposées ◐), niveau | ✅ niveau P_R0–P_R4, objectif, fréquence, dernière course, chrono, test demandé (⚠ voir A2) | ✅ intention, fréquence, reprise (⚠ intention impossible avec le matériel : A3) | ✅ équilibré ou rôle, objectif, fréquence, reprise |
| Génération du programme | ✅ Full Body 1–3, Haut / Bas à 4 | ◐ EASY / TEST / THRESHOLD / SEVERE ; **LONG jamais** (A4) ; RACE_PACE, STRIDES non implémentés | ✅ formats C3 et séance complète C4 | ✅ rôles H2 ; débutant **bloqué** (décision TEST_ONLY, message affiché) |
| Choix du type de séance | ✅ rotation A/B/C, variation intra-semaine TEST_ONLY | ◐ par objectif ; course générale = séance clé facile, par conception | ✅ moteur (format selon intention et matériel) | ✅ focus équilibré (le programme varie les rôles) |
| Durée réelle et contenu | ✅ estimation CORE ≤ créneau (0 dépassement mesuré, RC2 bis) | ◐ la dose EASY reprend la dernière course (30 min) quelle que soit la disponibilité ; aucune cible de volume par objectif | ✅ time cap et durée du bloc | ✅ time cap |
| Équipement | ✅ préréglage choisi explicitement ; substitution en séance (« matériel indisponible ») | — | ⚠ « force + conditionnement » refusé avec haltères seuls ou poids du corps (A3) | ✅ substitution (ex. haltères pour sac de sable) |
| Douleur avant séance | ✅ question obligatoire, P1 / P2, « Passer » conserve les douleurs connues, exclusions G1 | ✅ (même contrôle) | ✅ | ✅ |
| Douleur pendant la séance | ✅ bouton « Douleur » par exercice | ◐ seulement en fin de séance | ◐ seulement en fin de séance | ◐ seulement en fin de séance |
| Fatigue et récupération déclarées | ◐ RIR +1 seulement (règle TEST_ONLY) ; **non appliquée sur ~1 séance sur 3** (A1, message affiché) | ✗ aucun effet | ✗ aucun effet | ✗ aucun effet |
| Report et adaptation | ✅ séance adaptée (genou P2), reportée (épaule) | ◐ report par la pause douleur seulement | ◐ idem | ◐ idem |
| Séries, chronomètres | ✅ séries à cocher, charges, répétitions, RIR, chrono de repos horodaté (pause, +15 s), vibration | ◐ temps écoulé seul : **aucun minuteur d'intervalles** pour seuil, fractionné ou test (A7) | ✅ chrono horodaté AMRAP / EMOM / For time, pause, reprise | ✅ chrono et enchaînement des stations |
| Persistance et reprise | ✅ séries, chrono, RIR conservés au rechargement | ✅ séance démarrée reprise | ✅ chrono, compteurs | ✅ |
| Historique | ✅ | ✅ | ✅ | ✅ |
| Course libre hors programme | — | 🔒 `logFreeRun` seulement dans l'écran V0 `Course.tsx`, inaccessible en Beta 0 (A9) | — | — |
| Adaptation au niveau et à l'objectif | ◐ volume E1 par objectif ; 4 à 6 groupes **sous le plancher** (A5) | ◐ séance clé selon l'objectif, sans saisie de distance rien ne s'ouvre | ✅ intention | ✅ éligibilité par niveau |
| Interactions entre disciplines | ◐ allègement par la course voisine (jusqu'à 48 h pour une course « clé ») ; **aucune** récupération intra-Musculation (A6) | ✅ voisinage transmis | ✅ bloc de force délégué, demande composite TEST_ONLY | ✅ voisinage |
| Hors ligne, PWA | ✅ installable selon Chrome (E2E) ; service worker | | | |

### 1.2 Anomalies

| # | sév. | fonctionnalité | fichier(s) | cause (vérifiée) | correction proposée |
|---|---|---|---|---|---|
| A1 | **P1** | Fatigue et récupération déclarées sans effet sur environ un tiers des séances de Musculation | `packages/app-core/src/start-check.ts` (cause `readiness_requires_reproducible_session`, `regenerateSession`) | Sur 4 semaines, 4 séances sur 12 ne sont pas reproductibles (2 sur 3 en semaine 1). L'ajustement de l'état du jour exige une régénération identique, sinon il est refusé. Le message « l'effort n'est pas ajusté automatiquement » s'affiche. Cause probable : écart entre le contexte de génération (passe de voisinage, M3, variation intra-semaine) et le contexte relu. **À instrumenter avant toute correction.** | 1) Diagnostiquer précisément l'écart, séance par séance. 2) Appliquer l'ajustement d'effort (RIR seul) à la séance **persistée**, comme pour la douleur (R2, `adaptPersistedSession`), sans régénérer. **Technique**, aucune règle nouvelle. |
| A2 | **P1** | « Je n'ai pas de chrono récent : programmer un test chronométré » | `apps/kairo/src/screens/beta0/Setup.tsx:150` (`requestTest`), `packages/running/src/wave3/test.ts` | Sans distance de dernière course, le TEST est refusé (`OBSERVED_PACE_UNAVAILABLE`). La séance de course de la semaine 1 est **perdue** (« non planifiée ») au lieu d'être une course facile. | Exiger la distance quand la case est cochée, ou garder la séance en EASY si le TEST est impossible, avec un message. **Technique**, comportement à valider (C1). |
| A3 | **P1** | Cross-training « force + conditionnement » avec haltères seuls ou poids du corps | `Setup.tsx` (`CtSection`), moteur C3 (`C3_NO_FORMAT`) | L'intention est proposée quel que soit le matériel. Le moteur ne trouve aucun format et la séance est bloquée **chaque semaine** (profil D : 60 organisations sur 60 en RC2 bis). Les intentions « mixte » fonctionnent avec ce matériel. | Prévenir dans l'onboarding : refuser ou expliquer l'intention selon le matériel, en lisant la faisabilité **depuis le moteur** (sonde), jamais par une table inventée. **Technique.** |
| A4 | **P1** | Sortie longue jamais proposée (semi, marathon) | `packages/running/src/wave2/pipeline.ts` (ancre V19), `governance/product-decisions.ts` | Une LONG exige une LONG déjà réalisée. Aucune « première exposition » gouvernée n'existe pour elle (`DOSE_ANCHOR_UNAVAILABLE: NO_REALIZED_SESSION`). Le marathon se replie donc sur le seuil. | **Décision sportive** (D1) : première exposition LONG par niveau et objectif. |
| A5 | **P1** | Volume Musculation sous le plancher | `packages/strength/src/volume.ts`, composition, interférence | Profil masse 3×, RC1 : quadriceps, ischios, dos et pectoraux sous le plancher. Profil hybride : 8 séries de bas du corps par semaine (Musculation à J+1 d'une course, allégée). | Mesures de la phase 3 ; décisions D3 et D4. |
| A6 | P2 | Full Body consécutifs prescrits comme s'ils étaient espacés | `packages/planner/src/planner.ts` (placement glouton), `neighboursOf` (même sport exclu) | Aucune représentation de la récupération entre deux séances de Musculation (`same_discipline_recovery` bloquée). Exemple RC1 A : lun M · mar M. | Scénarios S1 à S3 (phase 3), proposition TEST_ONLY déjà prête (RC3-prép). **Décision** D3. |
| A7 | P2 | Séance de qualité Running sans minuteur d'intervalles | `apps/kairo/src/screens/Session.tsx` (`RunStructureView`), `Session0.tsx` | La structure (répétitions × travail / récupération) est affichée en texte statique, avec le temps écoulé seul. | Minuteur d'intervalles horodaté (même principe que le chrono CT), sans changer la prescription. **Technique**, UX. |
| A8 | P2 | Motif affiché trompeur pour une séance refusée | `packages/app-core/src/beta0.ts:512` (`mainReason`), `planner.ts` (`classifyRefusal`) | Le premier motif retenu est un avertissement (`RULE.RUNNING.CANDIDATE_VALUE_USED` : `INFORMATIVE` n’exclut que `PLAN.PLANNER.*`). Un refus pour donnée manquante est classé `governance_blocked` : « Les règles nécessaires… ne sont pas encore disponibles ». | Ignorer les codes d'information dans `mainReason` ; classer les refus pour donnée manquante à part, avec un message qui dit quoi saisir. **Technique.** |
| A9 | P2 | Course libre impossible à enregistrer en Beta 0 | `App.tsx` (onglet `run` → `Settings0`), `screens/Course.tsx` | `logFreeRun` n'est relié qu'à l'écran V0. Une course hors programme ne peut pas nourrir l'historique, ni l'allure observée, ni l'ancre de dose. | Exposer « Ajouter une course réalisée » dans Historique ou Réglages Beta 0, avec le même contrat que l'onboarding. **Technique.** |
| A10 | P2 | Une séance planifiée peut être faite un autre jour sans contrôle d'interférence | `packages/app-core/src/beta0-app.ts:387` (`startAssessment` : `placement !== 'composed_unplaced'` ⇒ OK) | Le contrôle G4 « Faire maintenant » ne s'applique qu'aux séances **non placées**. Une séance planifiée samedi peut être faite mercredi, collée à une autre discipline, sans avertissement ni recalcul du reste de la semaine. | Appliquer le même contrôle à toute séance démarrée **hors de son jour** (refus motivé ou avertissement, selon la décision D6). Technique, une fois la décision prise. |
| A11 | P2 | Douleur pendant la séance seulement en Musculation | `workout/CrossTrainingWorkout.tsx`, `HyroxWorkout.tsx`, `Session0.tsx` (Course) | Le bouton par exercice n'existe qu'en Musculation ; ailleurs, la douleur n'est saisie qu'en fin de séance. | Signal « douleur » accessible pendant la séance (présence seule, comme aujourd'hui en fin). **Technique**, UX. |
| A12 | P2 | Fin de repos : seulement une vibration, seulement application ouverte | `RestTimer0.tsx` | `navigator.vibrate`, absent sur iOS. Rien en arrière-plan. | Signal sonore facultatif, et visuel. Une notification en arrière-plan demande une décision produit (permissions). |
| A13 | P2 | Musculation 5–6 séances : affichées mais non proposées | `ProfileForm.tsx` (`strengthSupportedFrequencies`) | La composition ne gère que 1 à 4 séances (bande spec 02 §5.1 / 5.2). | **Décision sportive** (D5) : split à 5 et 6 séances. |
| A14 | P3 | Écrans V0 hérités, inaccessibles aux nouveaux profils | `screens/Home.tsx`, `Planning.tsx`, `Session.tsx`, `Course.tsx`, `Profile.tsx`, `Onboarding.tsx` | Chemin conservé pour les profils antérieurs sans programme. | Inventorier les profils concernés, puis retirer ou migrer, en étape dédiée. |
| A15 | P3 | Simulations non représentatives de la course | `packages/app-core/tests/consolidation/sim4.ts` | Course toujours « modifiée », sans distance. Corrigé sur `claude/kairo-rc3-prep` (option `runOutcome`, scénario équivalent). | Reporter ce banc sur la branche de développement RC3 (cherry-pick des fichiers de test). |

**Aucune anomalie P0 confirmée** (sécurité, perte de données, blocage total).
- **Douleur :** les exclusions G1 sont vérifiées par l'E2E, et aucune violation n'apparaît dans les simulations.
- **Persistance :** séries, chronos et reprise sont conservés.
- **A2** fait disparaître une séance, mais ne perd **aucune** donnée saisie.

## PHASE 2 — Running

**Mesures du chemin réel** : 6 semaines, courses enregistrées « comme prévu », 7 jours disponibles.

| niveau · objectif · fréquence | sans distance | avec distance (5,4 km) | sans distance + « test demandé » |
|---|---|---|---|
| P_R1 · générale · 2 (**profil par défaut**) | EASY seulement | EASY seulement | **1 course sur 2 perdue en semaine 1** (A2) |
| P_R2 · générale · 2 | EASY seulement | EASY seulement (séance clé = EASY, §R) | idem A2 |
| P_R2 · 5 km · 2 | EASY seulement | **S1 TEST, puis SEVERE chaque semaine** | idem A2 |
| P_R2 · 10 km · 2 | EASY seulement | **S1 TEST, puis THRESHOLD chaque semaine** | idem A2 |
| P_R3 · semi · 3 | EASY seulement | S1 TEST, puis THRESHOLD ; **aucune LONG** | idem A2 |
| P_R3 · marathon · 3 | EASY seulement | S1 TEST, puis THRESHOLD ; **aucune LONG** (la séance clé du marathon devrait être la LONG) | idem A2 |

### Pourquoi « running.easy »

1. Le profil par défaut est P_R1, course générale :
   - la qualité exige P_R2 ou plus ;
   - pour la course générale, la séance clé est une EASY (table §R).
2. Sans distance, il n'y a **aucune allure observée** : le TEST est refusé, et le seuil et le fractionné, qui exigent
   ce TEST, aussi.
3. La LONG n'a pas de première exposition (A4).
4. RACE_PACE et STRIDES ne sont pas implémentés.
5. Une course déclarée « adaptée » est enregistrée incomplète : elle n'alimente ni l'allure observée ni l'ancre de
   dose.

### Chemin minimal, sans règle nouvelle (accord requis seulement là où c'est marqué)

1. **Données.** Rendre visible, à l'onboarding et en fin de séance, que la **distance** débloque le test puis la
   qualité. Corriger A2 : exiger la distance, ou conserver une EASY.
2. **Course libre (A9).** Permettre d'enregistrer une course réalisée hors programme, ce qui alimente l'allure
   observée.
3. **Minuteur d'intervalles (A7)**, avant d'ouvrir largement la qualité.
4. **Décisions** : première exposition LONG (D1) ; fréquence lue sur les séances demandées ou placées (D2) ;
   RACE_PACE et STRIDES (D7).

Résultat attendu sans décision nouvelle : facile + test + qualité pour 5 km, 10 km, semi et marathon, à partir de
P_R2, dès que la distance est saisie. La **sortie longue reste impossible sans D1.**

## PHASE 3 — Musculation

Mesures RC1, 4 semaines, chemin réel. Sources : études RC2 et RC2 bis.

| point | constat | cause |
|---|---|---|
| Full Body consécutifs | Profil masse 3× : lun M · mar M chaque semaine, 8 paires à J+1 sur 4 semaines, 107 séries partagées à J+1 | Placement glouton (départage par la date la plus tôt), aucune règle même sport (A6) |
| Volume par groupe | Masse : bas 30,3 / haut 28 séries par semaine, 4 groupes sous le plancher. Hybride : bas **8**, 6 groupes sous le plancher. Haltères seuls : bas 17,3. | Allègement par la course voisine (bas du corps entier à ≤ 24 h d'une course facile, ≤ 48 h d'une course clé), pas de compensation |
| Répétition de variantes | Masse : 1 répétition de variante et 16 répétitions d'exercice intra-semaine sur 4 semaines ; salle complète 2 / 22 ; haltères seuls 3 / 26 | Catalogue restreint par le matériel ; variation intra-semaine TEST_ONLY |
| Haut / Bas | Disponible à 4 séances (alternance vérifiée E2E). 5–6 non pris en charge (A13). | Bande de composition 1–4 |
| Récupération intra-Musculation | Absente (A6) | Proposition TEST_ONLY « observation seule » prête (RC3-prép), non branchée |
| Interactions Course / CT | Allègement du bas du corps par la course ; le bloc de force CT compte dans la demande composite (TEST_ONLY) | Matrice d'interférence actuelle |

### Scénarios de correction mesurables

Mesures sur le banc à séances équivalentes de RC3-prép : même scénario, mêmes séances, volumes prescrits et réalisés
séparés.

| scénario | contenu | mesure d'acceptation | décision |
|---|---|---|---|
| S1 — Espacement au placement | départager les jours par l'écart à la dernière Musculation (déjà prototypé, RC2 « D0 ») | 0 paire de Full Body à J+1 si un jour libre le permet ; volume bas du corps ≥ RC1 − 10 % ; courses inchangées | D3 |
| S2 — Organisation dominante | adopter l'organisation qui domine RC1 (RC2 bis : par ex. hybride lun C · mar M · mer C · jeu C · ven X · sam M) | bas du corps hybride ≥ 18 séries (contre 8), conflits M3 0, courses 3 sur 3 | D3, D4 |
| S3 — Observation intra-Musculation | brancher la proposition TEST_ONLY **en trace seule** | séances et semaines identiques octet pour octet ; observations affichées dans le bilan | D3 |
| S4 — Fatigue (A1) | appliquer l'ajustement RIR à la séance persistée | 0 « non appliquée » sur 4 semaines ; RIR +1 identique à aujourd'hui sur les séances reproductibles | technique |

## PHASE 4 — Interface et expérience utilisateur

| point | constat |
|---|---|
| Cohérence des séances | La Musculation utilise le nouveau gabarit `k-workout` (barre d'action, chrono flottant) ; CT et HYROX ont leurs écrans propres ; la **Course utilise l'ancien gabarit** (`screen`, texte statique). Hétérogène. |
| Chronomètres | Musculation : repos horodaté. CT : horloge horodatée. HYROX : enchaînement. Course : temps écoulé seulement (A7). Tous survivent au rechargement. |
| États persistants | Séance commencée reprise directement (le contrôle avant séance n'est pas redemandé) ; séries et chronos conservés ; pause douleur visible partout. |
| Erreurs visibles | Bon socle : toast, avis d'enregistrement impossible, stockage indisponible, incohérence de planning. Exceptions : motif trompeur A8, séance « perdue » A2. |
| Navigation | 5 onglets Beta 0 (Accueil, Planning, Historique, Programme, Réglages) ; « Profil Course » dans les Réglages ; aucune entrée « course libre » (A9). |
| Mobile | E2E 360 × 640 et 390 × 844, profils Galaxy S9+ et Pixel 7 ; installabilité Chrome sans erreur ; cibles tactiles vérifiées (Musculation). Non vérifié sur un vrai téléphone. |
| Douleur en séance | Inégale selon le sport (A11). |
| Fin de repos | Vibration seule (A12). |

## PHASE 5 — Feuille de route RC3

### 5.1 Défauts réellement bloquants

Aucun P0. Les blocages **fonctionnels** pour un utilisateur réel sont :
- **A1**, fatigue sans effet sur un tiers des séances ;
- **A2**, séance de course perdue ;
- **A3**, Cross-training bloqué avec peu de matériel ;
- **A4**, pas de sortie longue, qui relève d'une décision ;
- **A5**, volume sous le plancher, qui relève de décisions.

### 5.2 Corrections techniques possibles immédiatement

Une à la fois, dans cet ordre. Aucune ne change une règle sportive.

1. **A2**, test demandé sans distance. C'est la plus courte, avec un effet utilisateur direct.
2. **A8**, motif affiché.
3. **A1**, fatigue appliquée à la séance persistée : diagnostic, puis correction.
4. **A3**, intention CT selon la faisabilité réelle du moteur.
5. **A9**, course libre en Beta 0.
6. **A7**, minuteur d'intervalles Course.
7. **A15**, report du banc de mesure équivalent.

### 5.3 Décisions sportives nécessitant votre accord

| # | décision |
|---|---|
| D1 | Première exposition LONG : ancrage (plus longue EASY réalisée ?), valeurs par niveau et objectif |
| D2 | Fréquence Running lue sur les séances **demandées** ou **placées** |
| D3 | Récupération intra-Musculation : espacement au placement (S1), bandes et délais (TEST_ONLY), action éventuelle |
| D4 | Compromis volume / espacement / protection des courses (fronts RC2 bis) |
| D5 | Musculation 5–6 séances par semaine (split) |
| D6 | Séance planifiée faite un autre jour : refus, avertissement ou recalcul |
| D7 | RACE_PACE et STRIDES : implémenter ou retirer des tables §R |
| D8 | Effet de la fatigue déclarée hors Musculation (Course, CT, HYROX) : aujourd'hui aucun |

### 5.4 Tests et critères d'acceptation, par correction

| correction | test de non-régression | critère d'acceptation |
|---|---|---|
| A2 | onboarding « test demandé » ± distance (app-core + DOM) | 0 séance perdue ; TEST seulement si une allure est observable ; sinon EASY et message |
| A8 | `notPlannedText` sur refus TEST, CT, HYROX | aucun code d'information affiché comme cause ; message qui dit quoi saisir |
| A1 | simulation 4 semaines à séances équivalentes, fatigue élevée | 0 « non appliquée » ; changements = RIR +1 seulement ; aucune série retirée ; contrôle douleur inchangé |
| A3 | matrice matériel × intention par la sonde moteur | aucune intention proposée qui produit `C3_NO_FORMAT` sans avertissement |
| A9 | course libre ⇒ allure observée ⇒ TEST possible | parcours DOM ; historique ; aucune modification des séances planifiées |
| A7 | minuteur horodaté, rechargement, pause | survit au rechargement ; structure prescrite inchangée |
| Toutes | `pnpm check`, build, E2E complet et E2E RC1 TEST (isolation) | 0 échec ; mesures RC1 publiées inchangées hors du périmètre corrigé |

### 5.5 Testable ensuite sur RC1 TEST

Après déploiement de la version de test, selon la procédure de `RC1-TEST-ENV.md` :

- **Course qualité, dès aujourd'hui :** profil P_R2 ou plus, objectif 5 km / 10 km / semi / marathon, **distance de
  la dernière course saisie**, séances terminées « comme prévu » avec distance. Attendu : test en semaine 1, puis
  seuil ou fractionné.
- **À vérifier sur le terrain :**
  - A2, en cochant « programmer un test » sans distance ;
  - A3, Cross-training « force + conditionnement » avec haltères seulement ;
  - A1, fatigue élevée déclarée sur plusieurs séances : le message « non ajusté » doit apparaître sur certaines.
- **Musculation :** Full Body 3× (lundi / mardi consécutifs observables) ; Haut / Bas à 4 séances ; séries, chrono,
  reprise après fermeture.
- **Retour terrain :** saisir les ressentis via le Journal Beta, puis l'export JSON.

**Prochaine étape proposée (une seule) :** correction A2, après votre validation. Elle se fera sur
`claude/kairo-rc3-dev`, avec ses tests, sans toucher aux règles sportives.
