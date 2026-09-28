# Course : revue D2 (premières séances de qualité) et D6 (convention RPE)

**Statut : VALIDÉ par le propriétaire du produit (2026-09-28)**, tel que proposé. Implémenté dans la surcouche `withProductDecisions` : valeurs candidates, sources et décisions d'implémentation tracées. Le registre expert reste inchangé.

## 0. Méthode et limites de la revue

- Recherche par moteur de recherche (2026-09-28). Le proxy de ce conteneur **bloque** PubMed, PMC, Wiley, Springer et les PDF hébergés : la plupart des **textes intégraux n'ont pas pu être lus**.
- Niveau de lecture de chaque source, repris de la convention du dépôt (5A–5G) :

  | Niveau | Sens |
  |---|---|
  | **SS** | Résumé ou description via la recherche ; texte intégral non lu |
  | **RE** | Recommandation d'entraîneur ou d'expert (ouvrage, consensus) |
  | **DI** | Décision d'implémentation (aucune source ne la fixe) |

- Confiance : HIGH / MEDIUM / LOW.
- Règle générale : **aucune étude ne définit une « première dose » de qualité par niveau**. Les études testent des protocoles complets sur des populations entraînées. Toute réduction pour une première exposition, et toute gradation P-R2 / P-R3 / P-R4, est donc une **décision d'implémentation** (DI).
- Le **TEST** (contre-la-montre de 5 km, ou de 10 km pour un objectif 10K) fixe l'**intensité** individuelle (V18, V05). Il ne sert **jamais** à calculer un volume de travail.

## 1. Sources retenues

| Id proposé | Source | Population | Ce que la source établit réellement | Lecture |
|---|---|---|---|---|
| RS-HELGERUD-2007-4X4 | Helgerud et al., *Med Sci Sports Exerc* 2007;39(4):665–671 | 40 hommes **modérément entraînés** | **4 × 4 min à 90–95 % FCmax, 3 min de récupération active** (60–70 % FCmax), **échauffement 10 min**, **retour au calme 5 min**, 3 fois par semaine pendant 8 semaines. VO₂max +≈7 %, gain supérieur à un entraînement continu de même charge | SS |
| RS-SEILER-2005-REST | Seiler & Hetlelid, *Med Sci Sports Exerc* 2005 | 9 coureurs **bien entraînés** (VO₂max ≈71) | 6 × 4 min, récupération de 1, 2 ou 4 min : passer de 1 à 2 min augmente un peu la vitesse moyenne (83 → 85 % vVO₂max) ; 4 min n'apporte rien de plus | SS |
| RS-BILLAT-2000-3030 | Billat et al., *Eur J Appl Physiol* 2000;81:188–196 | Coureurs entraînés | Répétitions de **30 s à vVO₂max / 30 s** de récupération : plus de temps passé à VO₂max qu'en course continue sévère. Protocole mené **jusqu'à épuisement**, pas un nombre de répétitions prescrit | SS |
| RS-BUCHHEIT-LAURSEN-2013 | Buchheit & Laursen, *Sports Med* 2013;43:313–338 (partie I) et partie II | Revue | Typologie des formats (intervalles courts / longs, rapports travail-récupération), justifiée par le temps passé près de VO₂max | SS |
| RS-GARCIAPINILLOS-2017-HIIT (déjà au registre) | García-Pinillos et al., *J Sport Health Sci* 2017;6:54–67 | Revue systématique, **coureurs loisir** | Les protocoles étudiés varient beaucoup (85–105 % vVO₂max, 3 à 4 km de volume). Aucun protocole standard d'initiation | SS |
| RS-DANIELS-CRUISE | Daniels, *Daniels' Running Formula* (ouvrage de référence d'entraîneur) | Coureurs entraînés | **Intervalles au seuil (« cruise intervals »)** : répétitions de 3 à 15 min, **1 min de récupération par 5 min de travail** (exemple 4 × 5–6 min) ; tempo continu ≈20 min ; seuil ≈ allure tenue 50–60 min en course | RE |
| RS-NORWAY-2024-SESSIONS | Haugen et al., *Sports Med* 2024, « Training Session Models in Endurance Sports: A Norwegian Perspective » | Entraîneurs de niveau mondial | Séances **contrôlées, non épuisantes** ; répétitions plus courtes et rapport travail-récupération plus faible quand l'intensité augmente. Contexte **élite** : non transposable tel quel à P-R2 | SS |
| RS-BARNES-2013-HILLS | Barnes et al., *Int J Sports Physiol Perform* 2013;8:639–647 | 20 coureurs **bien entraînés**, 5 programmes de côtes | Les programmes 2 à 5 améliorent les mesures aérobies ; le programme 1 (court, très intense) n'améliore que l'économie. **Durées, pentes et récupérations non lues** (texte intégral bloqué) | SS partiel |
| RS-FERLEY-2013-HILLS | Ferley et al., *J Strength Cond Res* 2013;27:1549–1559 | 32 coureurs bien entraînés (VO₂max ≈61) | Intervalles en côte contre intervalles à plat : effets sur VO₂max, Vmax, VLT et Tmax. **Structure exacte non lue** | SS partiel |
| RS-SEILER-KJERLAND-2006 | Seiler & Kjerland, *Scand J Med Sci Sports* 2006;16:49–56 | Skieurs juniors bien entraînés | Zones de **sRPE CR-10** alignées sur les seuils ventilatoires : **zone 1 = 1–4, zone 2 = 5–6, zone 3 = 7–10** | SS |
| RS-SCHERR-2013-RPE | Scherr et al., *Eur J Appl Physiol* 2013;113:147–155 | 2 560 adultes, tests incrémentaux | Échelle Borg **6–20** : seuil lactique ≈ **10,8 ± 1,8** ; seuil anaérobie individuel ≈ **13,6 ± 1,8**. RPE fortement corrélé à la FC et au lactate, avec une **variabilité individuelle importante** | SS |
| RS-FOSTER-2001-SRPE (déjà au registre) | Foster et al. 2001 | — | Échelle CR-10 modifiée pour la sRPE (ancrages verbaux) | SS |

## 2. D2 : premières structures de qualité (proposition)

Commun à toutes les structures :
- **Échauffement 600 s, retour au calme 300 s.** Source : protocole Helgerud 2007 (10 min et 5 min), cohérent avec les planchers candidats du registre (V06 `floorS` 600, V07 `minS` 300). Type : source + registre. Confiance MEDIUM.
- **Déclenchement** : jamais sans historique du type **ET** sans TEST valide. La première séance de qualité n'est proposée qu'après un TEST (D2-B) réalisé dans la bande RECENT (V12). Le TEST fournit l'allure (vague R5) ; le volume vient **uniquement** de la table ci-dessous.
- **Ensuite** : historique (V19) et progression par pas minimal (D1). La table ne sert qu'une fois par type.

### 2.1 THRESHOLD (fractionné ; continu réservé à P-R3+, §K)

| Niveau | Structure proposée | Sourcé | Décision d'implémentation (DI) |
|---|---|---|---|
| P-R2 | **3 × 5 min, récupération 60 s trottinée** | Format et rapport 5:1 (RS-DANIELS-CRUISE) ; 60/300 = 0,20 est dans V08 THRESHOLD (0,20–0,35) | 3 répétitions : 15 min de travail, sous l'exemple 4 × 5–6 et sous les 20 min du tempo « idéal ». Réduction choisie pour une première exposition |
| P-R3 | **4 × 5 min, 60 s** | Exemple de la source (4 × 5–6 min) | Borne basse de l'exemple |
| P-R4 | **4 × 6 min, 75 s** | Exemple de la source (4 × 6), rapport 5:1 conservé (75/360 ≈ 0,21) | Borne haute de l'exemple |

Confiance : **LOW à MEDIUM**. La source est une recommandation d'entraîneur, sans essai sur une première dose.

Limite : le « seuil » de Daniels (allure tenue 50–60 min en course) n'est pas strictement le domaine THRESHOLD_LIKE du moteur. L'intensité est portée par le RPE (D6) et par la borne V05 « pas plus vite que l'allure 10K ».

### 2.2 SEVERE / VO₂ (intervalles longs)

| Niveau | Structure proposée | Sourcé | DI |
|---|---|---|---|
| P-R2 | **3 × 4 min, récupération 180 s trottinée** | Durée de répétition et récupération de Helgerud 2007 (population modérément entraînée) | 3 répétitions au lieu de 4 : première exposition réduite d'une répétition |
| P-R3 | **4 × 4 min, 180 s** | **Protocole Helgerud 2007 exact** | — |
| P-R4 | **4 × 4 min, 120 s** | 4 × 4 de Helgerud ; récupération de 2 min suffisante chez les bien entraînés (Seiler 2005) | Association des deux sources ; 4 répétitions au lieu des 6 de Seiler pour une première exposition |

Les rapports 180/240 = 0,75 et 120/240 = 0,5 sont dans V08 SEVERE (0,5–1,0). Confiance : **MEDIUM** pour P-R3 (protocole étudié tel quel) ; **LOW à MEDIUM** pour P-R2 et P-R4 (adaptations).

Limite : Helgerud prescrit à 90–95 % FCmax. Le moteur prescrit au RPE (D6) et à l'allure du TEST (V18, R5), jamais à la FCmax, qui n'est pas mesurée.

### 2.3 SHORT_INTERVAL (intervalles courts)

| Niveau | Structure proposée | Sourcé | DI |
|---|---|---|---|
| P-R2 | **10 × 30 s, récupération 30 s trottinée** | Format 30 s / 30 s à vVO₂max (Billat 2000) ; rapport 1,0 dans V08 SHORT (0,5–1,0) | Nombre de répétitions : 5 min de travail. Aucune source ne fixe un nombre (protocole mené jusqu'à épuisement) |
| P-R3 | **12 × 30 s / 30 s** | idem | idem |
| P-R4 | **15 × 30 s / 30 s** | idem | idem |

Confiance : **LOW** pour les nombres de répétitions (DI pure), **MEDIUM** pour le format.

Limite : Billat 2000 utilisait une récupération passive. La récupération trottinée est une DI de cohérence avec les autres séances. La marche reste admise si l'utilisateur l'a réalisée ; l'historique est ensuite rejoué tel quel.

### 2.4 HILLS : **proposition de laisser la première exposition BLOQUÉE**

Barnes 2013 et Ferley 2013 établissent l'intérêt de programmes de côtes chez des coureurs **bien entraînés**. Mais la durée des répétitions, la pente, la récupération et le nombre de répétitions n'ont **pas pu être lus** (textes intégraux inaccessibles), et §N fixe « aucune pente universelle ». Proposer une structure reviendrait à l'inventer.

Proposition :
- HILLS reste **sans première exposition** (V37 non résolu) ;
- la première séance de côtes ne vient que d'une séance **déclarée par l'utilisateur**, rejouée ensuite (V19) ;
- réévaluation quand les textes intégraux de Barnes 2013 et Ferley 2013 seront lus.

### 2.5 Paramètres du registre concernés (valeurs candidates, surcouche de décisions produit)

- `running.firstExposure.threshold` : table 2.1, avec échauffement et retour au calme.
- `running.firstExposure.severe` : tables 2.2 (SEVERE) et 2.3 (SHORT_INTERVAL).
- `running.firstExposure.hills` : **non résolu** (2.4).
- Chaque valeur porte sa provenance : identifiants de sources, et marqueur **DI** pour chaque part non sourcée.

## 3. D6 : convention RPE unique

### 3.1 Origine de la divergence (établie dans le dépôt)

| Document | THRESHOLD_LIKE | SEVERE | STEADY | Date |
|---|---|---|---|---|
| RUNNING-PARAMETERS-V0 (V02) | **5–6** | **7–8** | **4–5** | 5C |
| RULESET-V0 §G.3, §K, §L, §N | 5–6 | 7–8 | 4–5 | 5C (non mis à jour ensuite) |
| 5D, arbitrage B8, puis V1-CANDIDATE (registre actuel) | **5–7** | **7–9** | **3–5** | 5D : bandes « élargies et chevauchantes » |

Il n'y a pas deux sources concurrentes. L'arbitrage 5D a **élargi** les bandes au nom de l'absence de correspondance validée entre RPE et domaine. Il n'a apporté **aucune nouvelle source** : il cite les mêmes (Foster 2001, talk test). Le texte du ruleset n'a pas été mis à jour.

### 3.2 Ce que disent les sources

- **Seiler & Kjerland 2006** (SS) : les zones CR-10 alignées sur les seuils ventilatoires sont **1–4 / 5–6 / 7–10**. La frontière 1 (VT1) tombe entre 4 et 5, la frontière 2 (VT2) entre 6 et 7.
- **Scherr 2013** (SS, n = 2 560) : les seuils ont des valeurs RPE moyennes stables (seuil lactique ≈10,8, seuil anaérobie ≈13,6 sur l'échelle 6–20), mais avec un **écart-type d'environ 1,8 point** : la variabilité individuelle est réelle.
- **Pratique norvégienne 2024** (SS) : les séances de seuil sont **contrôlées** (lactate de 2 à 4,5 mmol/L) et ne doivent **pas basculer dans le domaine sévère** ; le fractionné intense est contrôlé, non maximal.

### 3.3 Proposition : bandes de 5C, alignées sur Seiler & Kjerland, pour tout le moteur

| Domaine | Bande CR-10 | Justification |
|---|---|---|
| EASY_LOW | **plafond 3** (inchangé) | Sous VT1 (zone 1 = 1–4), avec une marge d'un point ; cohérent avec le talk test |
| STEADY | **4–5** | Chevauche la frontière VT1 (entre 4 et 5) : c'est la définition de STEADY (haut du domaine modéré, bas du domaine heavy) |
| THRESHOLD_LIKE | **5–6** | Zone 2 de Seiler & Kjerland : **au plus à VT2**. Admettre 7 autoriserait un effort du domaine sévère sous l'étiquette « seuil », ce qui contredit la définition du domaine et la pratique de seuil contrôlé |
| SEVERE, SHORT_INTERVAL, HILLS | **7–8** | Zone 3 (au-delà de VT2). **9–10 reste réservé au TEST et à l'effort maximal** : un fractionné est une séance contrôlée, non maximale (Helgerud 90–95 % FCmax ; pratique norvégienne) |
| TEST | **9–10** (inchangé) | Effort maximal par protocole |
| SPRINT | descripteur (inchangé) | — |

- **Chevauchement** : un seul point, 5, partagé entre STEADY et THRESHOLD_LIKE, à la frontière VT1. Il est voulu : la frontière est individuelle (Scherr).
- **Variabilité individuelle** : elle n'est pas absorbée en élargissant les bandes, ce qui mélangerait les domaines. Elle l'est :
  1. par l'**allure du TEST** quand elle existe (R5) ;
  2. par le **retour de tolérance** (D1, D5) ;
  3. plus tard, par la FC mesurée.
- **Pas « le plus restrictif par défaut »** : la bande THRESHOLD reste large de 2 points, STEADY remonte de 3–5 à 4–5, la cohérence est vérifiée sur toute l'échelle et chaque frontière est rattachée à VT1 ou VT2.
- **Confiance : MEDIUM**. Limite : Seiler & Kjerland 2006 classe des **séances entières** (sRPE), alors que le moteur cible l'effort **pendant la répétition**. Transposer ces bornes est une décision d'implémentation, à confirmer par un expert.
- **Effet sur le code** : V02 est remplacé dans la surcouche de décisions produit (le registre expert reste intact). EASY est inchangé (plafond 3). Les bandes THRESHOLD, SEVERE, SHORT et HILLS rétrécissent d'un point en haut.

## 4. Validation demandée

1. **D2** : structures 2.1–2.3, HILLS maintenu bloqué (2.4), déclenchement seulement après un TEST RECENT.
2. **D6** : convention 3.3 appliquée à tout le moteur.
