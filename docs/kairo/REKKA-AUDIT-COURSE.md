# REKKA — Audit du parcours Course (test réel Android)

**Statut :** diagnostic seulement. **Aucune modification** du moteur Running, de l'application ni des données. Aucun déploiement.
Base auditée : `claude/kairo-rc4-dev` (`3ccfd48`), identique en Course à la BÊTA déployée (`0a194f0`).

**Cas reproduit par le chemin réel de l'application** (`createBeta0Programme`, `declareRunningPerformance`, `selectRunningProfile`, `selectBeta0Week`), le 2026-10-21 :
- profil Course P_R2, objectif « Courir régulièrement » (`GENERAL_RUNNING`), sans date, montre déclarée ;
- 5 km en 30:00 le 2026-10-15 et 10 km en 1:05:00 le 2026-08-14, saisis avec « Ajouter une performance » ;
- aucune « dernière course » à l'onboarding.

Tous les symptômes signalés sont reproduits à l'identique :
- 2 séances non planifiées « Une information manque » (profil hybride, Course 2×) ;
- seuil et VO₂ « disponibles » ;
- allure VO₂ 5:49–6:11 /km « fiabilité élevée » ;
- Critical Speed absente ;
- aucune zone d'allure.

## 1. Diagnostic précis

### 1.1 Chaîne complète

| Étape | Code | Ce qui se passe dans votre cas |
|---|---|---|
| Saisie | `apps/kairo/src/running/PerformanceForm.tsx` | Trois types seulement : « Course officielle » (`RACE_RESULT`), « Chrono personnel — effort maximal seul » (`TIME_TRIAL`, **choisi par défaut**), « Critical Speed mesurée ». **Aucun type « sortie d'entraînement ».** « Distance mesurée » est **cochée par défaut**. Le 5 km d'entraînement ne peut donc être saisi qu'en effort maximal. |
| Persistance | `app-core/src/running-profile.ts` `referenceFromDeclaration` | Référence `TIME_TRIAL`, source `USER_DECLARED`, `protocolDeclared = true` (distance mesurée), conditions normales, sans interruption. Ajoutée à `state.running.references` (jamais effacée). |
| Validation | `running/src/references.ts` `zRunningReference` | Valide : distance et durée présentes. Rien ne distingue un effort maximal d'une sortie (`maximalEffortDeclared` existe au contrat mais n'est jamais rempli). |
| Confiance | `referenceConfidence` (V12 récence : RECENT ≤ 8 sem., AGING ≤ 16 sem.) | 5 km du 15/10 : RECENT, confiance **HIGH**. 10 km du 14/08 (9,7 semaines) : AGING, confiance MEDIUM, jamais retenu. |
| Capacités | `analyzeRunning` | Le 5 km est retenu pour **repère d'intensité, seuil et domaine sévère (VO₂)**, confiance HIGH. |
| Allure VO₂ | `running/src/wave3/pace.ts` `severePace` | Ancre V18 = course ou chrono de 3 à 5 km. Allure du 5 km = 360 s/km. Largeur V03 en confiance HIGH = ±3 %, d'où **349,2–370,8 s/km = 5:49–6:11 /km**. |
| Séances clés | `wave3/first-exposure.ts` `firstExposure` | Exige un `TIME_TRIAL` de 5 ou 10 km récent : le 5 km saisi le satisfait, d'où « disponibles ». |
| Composition | `running/src/week/compose.ts` | « Courir régulièrement » : séance clé préférée = **EASY** (`GENERAL_RUNNING: ['EASY', 'STRIDES', 'THRESHOLD']`). Le footing étant toujours préféré, **aucune séance seuil ni VO₂ n'est jamais programmée pour cet objectif**, à 2, 3 ou 4 séances par semaine (vérifié sur 3 semaines). |
| Génération | `running/src/wave2/history.ts` `historyAnchor` (V19) | La dose d'un footing reprend la **dernière course réellement réalisée** du même type (footing continu), récente. Une performance déclarée n'est **jamais** une course réalisée. Sans course réalisée : refus `DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE`, cause `NO_REALIZED_SESSION`. |
| Placement | planificateur, `app-core` | Demandes conservées avec le statut `refused`, catégorie `governance_blocked`, affichage `missing_data`. Elles ne sont **pas perdues**, mais **jamais retentées**. |
| Affichage | `apps/kairo/src/present.ts` | Message « Une information manque pour construire cette séance. », complété par l'indice « Enregistrez une course réalisée… ». Aucune action directe n'est proposée. |

### 1.2 Raison exacte de chaque séance non planifiée

| Séance | Code interne | Préconditions de la règle (V19) | Donnée réellement manquante |
|---|---|---|---|
| `2026-10-19.running.1` et `.2` (footings) | `PLAN.PLANNER.ENGINE_REFUSED` puis `DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE {archetype: EASY, cause: NO_REALIZED_SESSION}` | Une course **réalisée** (programme ou course libre) : footing continu, terminée, sans retour négatif, datée de moins de 8 semaines | **Une course réelle récente avec sa durée**, idéalement aussi sa distance et sa date. Votre 5 km d'entraînement est exactement cette donnée, mais il est entré comme chrono maximal. |

Contrôles complémentaires :
- Avec la même sortie saisie en « dernière course » à l'onboarding, ou en « course hors programme », les footings sont planifiés : 2 × footing, dose reprise de 30 min.
- **Saisir la course libre après coup ne débloque pas la semaine en cours.** Les demandes refusées restent refusées jusqu'au lundi suivant, ou jusqu'à « Modifier » le programme (vérifié).

### 1.3 Pourquoi l'interface annonce des capacités qu'elle ne produit pas

1. « Séances clés : disponibles » signifie seulement que **la règle de première exposition est satisfaite**. Ce n'est pas une promesse de programmation. Pour « Courir régulièrement », la composition ne choisit jamais le seuil ni le VO₂.
2. L'allure VO₂ est affichée **indépendamment** de toute séance VO₂ prévue, et à partir d'une référence dont le caractère maximal n'est pas vérifié.
3. Les capacités ne dépendent que des références : elles ignorent la condition indispensable à toute séance, une course réalisée.

### 1.4 Le 5 km d'entraînement est-il utilisé comme performance maximale ?

**Oui. C'est une erreur.**
- Il est enregistré en `TIME_TRIAL` (effort maximal), avec un protocole déclaré.
- Il est retenu en confiance élevée pour le seuil et le VO₂.
- Il sert d'ancre à l'allure VO₂ : 6:00 /km ± 3 % = 5:49–6:11 /km.
- Il débloque les premières séances de seuil et de VO₂.

Conséquence sportive : l'allure « VO₂ » affichée est votre allure de **footing**. Elle n'a aucun sens comme cible VO₂, et la fiabilité « élevée » affichée est fausse.

Si le 10 km était lui aussi une sortie d'entraînement, il est affecté de la même façon. Il n'est pas retenu aujourd'hui, car il est trop ancien.

### 1.5 Objectif sans date

Ce n'est **pas** un blocage. « Courir régulièrement » n'a pas de date par conception (champ masqué) : le programme est continu, construit semaine après semaine.

## 2. Règles qui bloquent la Course

| # | Règle | Effet dans votre cas | Nature |
|---|---|---|---|
| B1 | **V19** `running.dose.historyAnchorPolicy` : dose = dernière dose réalisée du même type, récente ; jamais de dose par défaut | Bloque les footings | Règle sportive voulue (pas de volume inventé) : **à conserver** |
| B2 | Saisie sans type « sortie d'entraînement », `TIME_TRIAL` par défaut, « distance mesurée » cochée par défaut | La sortie devient un chrono maximal, et la donnée utile à B1 est perdue | **Défaut d'interface** |
| B3 | Aucune nouvelle tentative des demandes refusées quand la donnée manquante est ajoutée | Semaine bloquée jusqu'au lundi suivant | **Défaut d'application** |
| B4 | Message « Une information manque » sans nom précis ni action directe | L'utilisateur ne sait pas quoi faire | **Défaut d'interface** |
| B5 | V18 / V03 : ancre VO₂ = course ou chrono de 3 à 5 km, sans vérifier l'effort maximal | Fausse allure VO₂ | Règle saine, **mal alimentée** par B2 |
| B6 | Première exposition : un `TIME_TRIAL` récent suffit | Seuil et VO₂ « disponibles » à tort | Règle saine, **mal alimentée** par B2 |
| B7 | Composition `GENERAL_RUNNING` : séance clé préférée = footing | Jamais de seuil ni de VO₂ | Règle sportive (§R) : décision à prendre, hors correction minimale |
| B8 | Critical Speed jamais calculée ; aucun modèle entre distances | CS absente | Règle voulue (aucun modèle validé) |
| B9 | Zones d'allure : V40 (plafond facile) non résolu, V05 (seuil) absent | Aucune zone | Paramètres non gouvernés : à décider avec un expert |

## 3. Corrections proposées (aucune appliquée)

Toutes ces corrections sont dans l'application (`app-core` et interface). **Aucune règle du moteur Running ne change.** C1 à C5 forment la correction minimale.

| # | Correction | Détail |
|---|---|---|
| **C1** | Trois natures distinctes à la saisie | **Sortie d'entraînement** : allure observée, sans prétention de performance. Elle est enregistrée comme **course réalisée** (même chemin que « course hors programme » : durée, distance, date, ressenti). Elle alimente V19 et ne devient jamais une référence de performance. **Test chronométré** : effort maximal ou protocole contrôlé (`TIME_TRIAL`, `maximalEffortDeclared: true`). **Compétition** : `RACE_RESULT`. Aucun type par défaut : le choix est obligatoire, avec une question explicite « Était-ce un effort maximal ? ». « Distance mesurée » est décochée par défaut, sauf en compétition. |
| **C2** | Requalifier une performance déjà saisie | Action « Ce n'était pas un effort maximal » sur une référence `TIME_TRIAL` ou `RACE_RESULT` déclarée. La référence est **conservée** (historique) mais marquée « requalifiée », avec sa date, et **exclue** du contexte transmis au moteur. Une course réalisée équivalente est ajoutée. Champ facultatif, sans migration. **Votre 5 km du 15/10 serait ainsi corrigé.** |
| **C3** | Nouvelle tentative des demandes refusées | Après l'ajout d'une course, d'une performance ou d'un test, les demandes **refusées et non commencées** de la semaine en cours sont retentées par le planificateur : jours passés exclus, séances commencées ou réalisées intactes, autres sports inchangés. Rien n'est inventé : le moteur décide avec les nouvelles données. |
| **C4** | Message nommé, expliqué, avec actions | Pour `NO_REALIZED_SESSION`, par exemple : « Il manque **votre dernière course réelle** (durée, et si possible distance et date). Le footing reprend ce que vous avez vraiment couru, sans durée inventée. » Bouton **« Enregistrer une course »** (formulaire de course réelle, puis C3). La demande reste visible comme « en attente d'information », et non comme refusée. Même principe pour les autres causes : test exigé (bouton « Programmer un test »), distance manquante pour estimer le test. |
| **C5** | Capacités affichées = capacités programmées | « Séances clés » distingue : *autorisées par vos données* ; *prévues par votre objectif* (« Courir régulièrement : footings uniquement ») ; *bloquées* (cause et action). L'allure VO₂ n'est affichée que si l'ancre est un **effort maximal déclaré**, avec sa source et sa date (« estimée depuis votre test du … »). Sinon : « à l'effort (RPE 7–8) ». |
| C6 | Composition « Courir régulièrement » (B7) | **Décision sportive séparée**, hors correction minimale : faut-il y introduire des lignes droites ou un seuil occasionnel ? |

**Votre cas après C1 à C5 :**
- Le 5 km est requalifié en sortie : 2 footings planifiés dans la semaine en cours, d'environ 30 min, à l'effort facile (RPE ≤ 3), sans allure.
- Allure VO₂ : « à l'effort ».
- Séances clés : non prévues par l'objectif. Le test est proposé si vous voulez des repères (5 km chronométré).

## 4. Critical Speed

**Règle actuelle :** aucune CS calculée. Une CS n'est acceptée que **mesurée ailleurs** (laboratoire, appareil, coach), avec le nombre d'essais et le modèle. Aucun modèle entre distances n'est implémenté (`performanceModel: unavailable`).

**Estimation à partir de plusieurs performances (modèle à 2 paramètres, distance = CS × temps + D′) :**
- Conditions de fiabilité (littérature de référence, à faire relire : Hill 1993 ; Poole et al. 2016 ; Jones et Vanhatalo 2017) :
  - au moins 2, idéalement 3 efforts **maximaux** ;
  - durées d'environ **2 à 15 minutes** ;
  - réalisés sur une courte période (quelques jours à 2 semaines) ;
  - conditions comparables.
- Seuils d'acceptation de l'ajustement : erreur standard de CS et de D′, à **gouverner par un expert**, non fixés ici.

**Vos deux chronos ne le permettent pas :**
1. Le 5 km n'est **pas maximal** : il est exclu d'office.
2. Le 10 km dure 65 min, bien au-delà de la plage de validité. Il est daté de 9,7 semaines, soit 9 semaines avant le 5 km.
3. Deux points donnent toujours une droite exacte, sans aucune mesure d'erreur. Le calcul brut donnerait CS ≈ 7:00 /km et D′ ≈ 714 m : une valeur **plus lente que l'allure tenue 65 min** sur le 10 km, ce qui est physiologiquement incohérent.

**Protocole proposé (à valider) :**
- Trois contre-la-montre maximaux sur terrain plat et mesuré, durant entre environ 3 et 13 minutes : par exemple 800 m, 1 600 m et 2 400 m, sur 2 semaines, avec 48 h au moins entre les essais.
- Ajustement linéaire distance–temps, avec ses erreurs.
- Affichage « **Critical Speed estimée (protocole terrain)** », avec la fiabilité et les essais. Ce n'est **jamais** « mesurée ».
- Ne pas intégrer avant décision : modèle, seuils d'erreur et gouvernance.

## 5. Zones d'entraînement

| Élément | Proposition (étude, rien d'intégré) |
|---|---|
| Source | Seulement des efforts **maximaux** récents (test ou compétition) pour les allures cibles. Les sorties d'entraînement donnent une **allure observée** (« votre footing habituel : 6:00 /km, le 15/10 »), descriptive, jamais une zone. |
| Méthode | Allure VO₂ : règle existante V18 / V03 (3–5 km maximal, ±3 % en confiance élevée, ±6 % en moyenne). Seuil et facile : **aucune** allure tant que V05 et V40 ne sont pas gouvernés. Rien n'est fabriqué : ni seuil lactique, ni VO₂max, ni FC max, ni CS. |
| Confiance | Celle du moteur (type, récence, conditions, conflit), affichée avec la source et la date. |
| Estimée ou validée | « Allure estimée » (une référence maximale, confiance moyenne ou élevée) ; « zone validée » réservée à un test du protocole REKKA ou à une mesure de laboratoire. |
| Mise à jour | Recalcul à chaque nouvelle performance ou requalification. L'historique est conservé. |
| Repli | Sans référence maximale récente : **effort perçu** (repères gouvernés actuels, en validation : facile ≤ 3, soutenu 4–5, seuil 5–6, VO₂ 7–8, test 9–10). |

## 6. Risques

| Risque | Nature | Maîtrise |
|---|---|---|
| Un vrai effort maximal saisi par erreur en « sortie » | Sportif, prudent : perte des cibles d'allure | Question explicite, requalification possible dans les deux sens |
| Un footing pris pour un maximum (situation actuelle) | Sportif : fausses cibles VO₂, premières séances clés débloquées à tort | Corrigé par C1, C2, C5 |
| Nouvelle tentative du planificateur (C3) | Placement : autre jour, interférences | Même planificateur, mêmes règles (G5, M3). Séances commencées ou réalisées jamais touchées. Autres sports inchangés (à prouver par T10 et T11) |
| États existants | Compatibilité | Champ facultatif (requalification) ; anciennes références relues à l'identique. Aucune semaine passée modifiée. Les `TIME_TRIAL` existants restent tels quels tant que l'utilisateur ne les requalifie pas : aucune détection automatique, pour ne pas deviner |
| Données BÊTA | Compatibilité | Préfixe `rekka-beta:` inchangé, mise à jour sans perte (procédure BÊTA existante) |

## 7. Plan de tests

| Id | Cas | Attendu |
|---|---|---|
| T1 | Un chrono récent seul (test maximal 5 km, 2 semaines) | Allure VO₂ = allure du test ±3 %, « estimée depuis votre test du … ». Séances clés autorisées. Footings bloqués tant qu'il n'y a pas de course réalisée, avec message nommé et action. |
| T2 | Deux chronos cohérents (5 km et 10 km maximaux, même mois) | Pas de conflit. Le plus récent des 3–5 km sert d'ancre VO₂. Aucune CS calculée (2 points, durées hors plage). |
| T3 | Deux chronos discordants (deux 5 km maximaux à 10 % d'écart) | Conflit détecté, calibration demandée, référence la plus prudente retenue (règle existante). |
| T4 | Chronos anciens (> 16 semaines) | Récence STALE, confiance faible : aucune allure, séances clés « test récent nécessaire », action « Programmer un test ». |
| T5 | Aucun chrono | Effort perçu seul. Footings planifiés si une course réalisée existe ; sinon message nommé et action. |
| T6 | **Votre cas** : sortie de 5 km (15/10) et 10 km (14/08) | Après C1 : 2 footings planifiés d'environ 30 min, à l'effort. Aucune allure VO₂. Séances clés non prévues par l'objectif. Avant C1 : symptômes reproduits (test de non-régression du diagnostic). |
| T7 | Requalification d'un `TIME_TRIAL` existant | Référence conservée et marquée. Exclue des capacités et de l'allure VO₂. Course réalisée ajoutée. Semaine retentée. |
| T8 | Objectif sans date | Programme continu, semaines suivantes planifiées. Aucune date inventée. |
| T9 | Test chronométré demandé | TEST placé si une course réelle avec distance existe ; sinon footing en repli (règle RC3.1), message nommé. Résultat du test enregistré en `TIME_TRIAL` APP_RECORDED, puis allure VO₂ et séances clés mises à jour. |
| T10 | Génération et placement réels (chemin de l'application, 1 à 4 séances par semaine, Course seule et hybride) | Après saisie d'une course : demandes refusées retentées le jour même, placées sur des jours disponibles non passés, sans interférence nouvelle. |
| T11 | Conservation | Semaines passées et séances commencées ou réalisées identiques octet pour octet. Anciennes références relues à l'identique. Export / import identique. Mise à jour BÊTA A → B sans perte. |
| T12 | Interface (DOM, E2E mobile 360 / 390 px) | Choix obligatoire du type. Requalification. Message nommé avec boutons. Capacités « autorisées / prévues / bloquées ». Aucune allure affichée sans effort maximal déclaré. |
| T13 | Validation complète | `pnpm check`, build, E2E de production et BÊTA, parcours des quatre sports. |

## 8. Décisions attendues

1. Accord sur la correction minimale **C1 à C5** (application seulement, moteur Running inchangé).
2. C6 : faut-il des séances de qualité dans « Courir régulièrement » ? Décision sportive séparée.
3. Critical Speed estimée et zones : études à mener avec validation experte. Rien n'est intégré.
