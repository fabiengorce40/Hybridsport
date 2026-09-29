# Cross-training : dossier de décision CT-D4 (durée du bootstrap)

**Statut : pour arbitrage.** Ce dossier ne fixe aucune valeur, ne modifie ni le registre, ni le code (CORE, Running, Strength, Cross-training), et ne signe aucune politique G1. Les contenus qualitatifs des 4 politiques CT-G1 sont décidés mais restent `UNSIGNED` jusqu'à leur formalisation.

## 0. Objet et corridor

Corridor C2 validé qualitativement (décisions 1 à 8, non rouvertes ici) :

```
firstExposure → continuous → timed → 1 mouvement de la bootstrapMovementAllowlist (CT_CONTENT gouverné) → durée CT-D4 gouvernée
```

La seule valeur à fixer est la **durée** `d` de l'unique item `timed` (`workS = d`, `rounds = 1`, `restS = 0`) du bloc `continuous`.

Faits de contrat qui encadrent la décision :
- **Estimation (mesuré, spike K-C)** : une durée `timed` n'exige aucune donnée d'estimation au catalogue. La durée estimée du bloc vaut `d` + mise en place + consignes.
- **Durée comme seule borne (décision 4)** : les gardes CT-D6 ne s'appliquent pas, puisque la prescription n'expose aucun nombre de répétitions. Pour ce corridor, `d` est donc la **seule** borne d'exposition prescrite.
- **Couple mouvement × durée (décision 8)** : CT-G1-EXERTIONAL n'admet la première exposition que dans un couple *mouvement autorisé × durée CT-D4*. La durée n'est donc pas nécessairement indépendante du mouvement (§6, question 1).
- **Novices (décision 6)** : aucun coefficient automatique de réduction ; l'absence d'historique KAIRO n'est pas le statut novice.
- **Temps disponible (STATIC, CORE)** : le CORE ne compresse jamais sans levier déclaré. Si `d` ne tient pas dans le temps disponible, la séance est refusée (Decision Gate, F-13).

## 1. Méthode et limites de vérification

1. **Sources du dépôt.** `CROSSTRAINING-EVIDENCE-PACK.md` (S1–S22) ; registre scientifique Course (`RUNNING-SCIENCE-REGISTRY-V1.md`) pour les éventuelles transpositions.
2. **Recherche externe.** Tentée le 2026-09-29.
   - **Accès direct refusé** par la politique réseau (`connect_rejected` ou `EGRESS_BLOCKED`) : `pubmed.ncbi.nlm.nih.gov`, `pmc.ncbi.nlm.nih.gov`, `eutils.ncbi.nlm.nih.gov`, `www.ebi.ac.uk` (Europe PMC), `api.crossref.org`, `api.semanticscholar.org`, `doi.org`, `acsm.org`, `health.gov`, `www.who.int`.
   - Seul le **moteur de recherche** répond. Il renvoie des titres et un résumé automatique des pages.
3. **Niveaux de vérification** :
   - `V-ABS` : résumé ou notice (niveau de l'Evidence Pack) ;
   - `V-SRCH` : **résumé automatique d'un moteur de recherche**, inférieur à `V-ABS`, attribution des chiffres non contrôlée.
   - **Aucun texte intégral n'a été lu.**
4. **Règles appliquées** (celles du dossier de preuve, reprises par la demande) :
   - aucune valeur chiffrée tirée d'un résumé ;
   - la durée totale d'un protocole HIFT ou CrossFit n'est jamais une durée sûre pour un mouvement continu ;
   - un protocole d'intervalles, Tabata, circuit ou ergomètre ne justifie jamais un `continuous timed` à un mouvement ;
   - aucun coefficient.

## 2. Sources

### 2.1 Sources déjà présentes dans le dépôt (Evidence Pack, `V-ABS`)

| Source | Population | Niveau | Modalité | Protocole | Durée | Intensité | Supervision | Effets / événements | Ce qu'elle permet de conclure pour le bootstrap | Ce qu'elle ne permet pas d'extrapoler |
|---|---|---|---|---|---|---|---|---|---|---|
| **S1** Feito 2018 (définition HIFT) | — | — | multimodal | définition | « durées d'activité variées » | relative à l'individu | — | — | L'intensité est **relative** : une même durée n'impose pas la même charge à deux athlètes | Toute durée |
| **S2** méta-analyse HIFT, sujets sains (2025) | 911 adultes sains, 19 études | variés | programmes HIFT | non vérifié | non vérifiée | non vérifiée | non vérifiée | effets positifs sur la condition physique | Le HIFT est bénéfique en moyenne | Une durée de séance ; toute relation dose-réponse |
| **S3** méta-analyse HIFT, athlètes (2023) | 478 athlètes de 10 à 24,5 ans | entraînés | HIFT ajouté | non vérifié | non vérifiée | non vérifiée | non vérifiée | force et puissance +, endurance = | Rien pour un adulte récréatif débutant | Toute durée |
| **S4** ACSM, Garber 2011 | adultes en bonne santé | tous | aérobie, force, souplesse | recommandation de santé publique | ≥ 30 min/j modéré ou ≥ 20 min/j vigoureux ; accumulation par blocs ≥ 10 min (version 2011) | modérée / vigoureuse | non | — | Cadre de **volume hebdomadaire** de population | Une durée de **séance** individuelle, a fortiori d'un mouvement unique ; le bloc de 10 min n'est pas un seuil de sécurité (voir E1) |
| **S6** Buchheit & Laursen 2013 | athlètes d'endurance et de sports collectifs | entraînés | HIIT cyclique | revue narrative | variable | élevée | — | — | Rien de direct | Toute durée continue multimodale |
| **S7** Milanović 2015 | adultes de 18 à 45 ans | variés | HIT vs continu (cyclique) | méta-analyse | non vérifiée | — | — | VO₂max ↑ dans les deux cas | Rien pour la durée | — |
| **S8** Tabata 1996 | jeunes hommes (n = 7 en expérience 2) | actifs | ergocycle | 7–8 × 20 s à ~170 % VO₂max / 10 s | ≈ 4 min | supra-maximale | laboratoire | capacités aérobie et anaérobie ↑ | Rien | **Exclu par règle** : intervalles supra-maximaux sur ergomètre |
| **S12** Smith 2025 | 12 pratiquants **entraînés** | entraînés | EMOM vs RFT, 4 mouvements | 5 tours, volume égal | non vérifiée | 77–95 % FCmax | laboratoire | RFT plus stressant ; CK à 24 h identique | Le **format** change la charge aiguë (qualitatif) | Toute durée ; population non débutante |
| **S13** Barba-Ruíz 2024 | 12 pratiquants (≥ 1 an) | entraînés | AMRAP / EMOM / RFT | 3 configurations | non vérifiée | — | laboratoire | vitesse et FC différentes selon le format | idem S12 | idem |
| **S15** Sports 2025 (AMRAP 5 vs 15 min) | pratiquants | entraînés | circuit rameur + thrusters + box jumps | AMRAP | **5 et 15 min** | maximale (AMRAP) | — | déterminants de performance différents selon la durée | La durée change **ce qui est sollicité** (qualitatif) | Une durée sûre ou adaptée à un débutant ; circuit multimodal ≠ mouvement unique |
| **S16** Brisebois 2018 | 14 adultes **inactifs** | inactifs, sans expérience HIFT | HIFT | 3 j/sem, 8 semaines | **non vérifiée** | non vérifiée | **supervisé** | condition physique ↑ (non relu) | Un programme HIFT **supervisé** a été mené chez des inactifs | Une durée de première séance ; tout transfert vers un usage non supervisé |
| **S17** IJERPH 2020 | 31 pratiquants | pratiquants | HIFT, 2 volumes | 6 semaines | non vérifiée | — | — | aucune amélioration dans les deux groupes | « Plus de volume » n'est pas « mieux » (qualitatif) | Une durée |
| **S18** blessures en HIFT (revues) | pratiquants | mixtes | HIFT | observationnel | — | — | — | 4,3 / 1000 h (attribution à vérifier) ; épaule, dos, genou | Le risque existe et siège souvent dans ces zones | Un seuil de durée |
| **S19** rhabdomyolyse et HIFT (revue, 2024) | surtout des cas rapportés, 20–40 ans | mixtes | HIFT | cas | — | — | — | membres supérieurs dans 63 % ; nombreuses répétitions de pompes et tractions ; inactivité récente comme facteur | Risque **qualitatif** d'une exposition nouvelle à fort volume | Un seuil ; une durée sûre |
| **S21** Mujika & Padilla 2000 | athlètes | entraînés | désentraînement | revue | < 4 semaines | — | — | perte partielle des adaptations | Rien pour une première exposition | — |
| Registre Course (RS-BUIST-2008, RS-NIELSEN-2014) | coureurs débutants | débutants | course | ECR / cohorte | — | — | — | règle des 10 % non protectrice ; association volume ↔ blessure | Rien : autre modalité, et ces sources portent sur la **progression**, pas sur une première dose | Toute durée Cross-training |

### 2.2 Sources externes consultées (`V-SRCH` seulement)

| Réf. | Source | Population | Niveau | Modalité | Protocole | Durée | Intensité | Supervision | Effets / événements | Ce qu'elle permet de conclure | Ce qu'elle ne permet pas d'extrapoler |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **E1** | Physical Activity Guidelines for Americans, 2e éd. (2018), et rapport du comité consultatif | adultes (États-Unis) | tous | activité physique modérée à vigoureuse | recommandation de santé publique | le **minimum de 10 min par bloc a été supprimé** : des blocs de toute durée comptent dans le volume | modérée à vigoureuse | non | bénéfices liés au **volume total** | Aucune durée minimale de bloc n'est requise pour le **bénéfice santé** de population | Une durée **sûre** ou **adaptée** pour une première exposition individuelle à un mouvement donné |
| **E2** | Riebe et al. 2015, *MSSE* 47(11):2473-9 (dépistage pré-participation ACSM) | adultes | inactifs et actifs | toute activité | algorithme de dépistage | — (détail non vérifié) | — | — | orientation médicale selon le risque cardiovasculaire | Question d'**éligibilité** (G1, population), pas de durée | Une durée ; les détails « léger à modéré au départ » n'ont pas été vérifiés et ne sont pas utilisés |
| **E3** | Wilke et al. 2019, *Scand J Med Sci Sports* (HIFCT chez des inactifs) | 33 adultes **inactifs**, randomisés | inactifs | circuit fonctionnel corps entier | 20 s « all-out » / 10 s, 3 ×/sem, 6 semaines | séances de **15 min** | maximale par bloc | non vérifiée | effets sur la fonction motrice | Un circuit intermittent de 15 min a été utilisé chez des inactifs dans un essai | **Exclu par règle** : intervalles « all-out » en circuit ≠ continu à un mouvement ; tolérance de la **première** séance non rapportée |
| **E4** | Micro-séances HIFCT sur mobile, 4 semaines (PMC5954292) | jeunes adultes non entraînés | non entraînés | circuit fonctionnel | quotidien | séances de **6 min** | élevée | à distance | force et qualité de vie ↑, capacité cardio-respiratoire = | Des séances très courtes ont été proposées à des non-entraînés, sans supervision directe | **Exclu par règle** : circuit à haute intensité ; aucune donnée de sécurité de première séance vérifiée |
| **E5** | Série de cas de rhabdomyolyse après une première séance de spinning (Cureus 2021, PMC8276198) et rapport de cas « first-time spinners » (PMC12212886) | adultes, dont des sujets **en bonne forme** | variés | vélo en salle collectif | **première** séance | séances d'environ **1 h** ; un cas décrit après **15 min** | élevée (cours collectif) | cours encadré | rhabdomyolyse d'effort (myalgies, urines foncées) dans la semaine | **Qualitativement** : une **première** exposition à une modalité nouvelle peut être suivie d'une rhabdomyolyse, y compris chez des sujets en forme et, selon un cas, après une durée courte. **La durée seule n'est pas une garantie de sécurité** | Un seuil de durée (cas rapportés, sans dénominateur) ; toute transposition du vélo à un mouvement Cross-training |

Liens (pages de résultats de recherche ; textes intégraux non lus) :
- [E1 — PAG, 2e édition](https://whish.stanford.edu/wp-content/uploads/2019/01/2018-Physical_Activity_Guidelines_2nd_edition.pdf) ; [E1 — questions et réponses ODPHP](https://odphp.health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines/about-physical-activity-guidelines/questions-answers)
- [E2 — Riebe 2015](https://pubmed.ncbi.nlm.nih.gov/26473759/)
- [E3 — Wilke 2019](https://onlinelibrary.wiley.com/doi/10.1111/sms.13313)
- [E4 — micro-séances HIFCT](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5954292/)
- [E5 — série de cas spinning](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8276198/) ; [E5 — rapport de cas](https://pmc.ncbi.nlm.nih.gov/articles/PMC12212886/)

## 3. Classement

### A — Evidence-supported

Aucune **valeur**. Seules des propositions **qualitatives** :
1. L'intensité en HIFT est relative à l'individu (S1) : une durée identique n'impose pas une charge identique.
2. La durée change ce qui est sollicité (S15, entraînés, aigu).
3. Une première exposition à une modalité nouvelle peut être suivie d'une rhabdomyolyse d'effort, y compris chez des sujets en forme. Le risque est surtout rapporté pour des volumes élevés de mouvements du haut du corps (S19, E5 ; cas rapportés, **preuve faible**).
4. Pour la santé de population, des blocs de toute durée comptent dans le volume (E1). Cela ne dit rien de la sécurité d'une première exposition.

### B — Derived

**Aucune.** Il n'existe aucune dérivation écrite et reproductible qui, partant de données soutenues, aboutisse à une durée de première exposition pour un mouvement continu unique. Chaque chemin envisageable passe par une transposition interdite :
- durée d'un protocole HIFT → durée sûre ;
- intervalles ou circuit → continu ;
- ergomètre ou vélo → mouvement Cross-training ;
- recommandation de population → prescription individuelle.

### C — Expert decision

- La valeur de `d`, ou une valeur par mouvement de l'allowlist (décision 8).
- Une valeur unique ou une plage bornée, où le moteur choisirait une valeur déterminée.
- Une valeur distincte pour les novices : ce serait une **valeur experte explicite**, jamais un coefficient (décision 6).
- Le sens prudent (cliquet G1, spec 09 §3 `safeDirection`) et la valeur de référence approuvée.

### D — Unsupported / KEEP BLOCKED

- Toute « durée sûre » ou « durée adaptée » présentée comme scientifique.
- Toute valeur tirée de S8, S12, S13, S15, E3, E4 (intervalles, circuits, formats multi-mouvements, sujets entraînés), de S4 ou E1 (santé publique), ou de E5 (cas rapportés).
- Toute différenciation novice / non-novice présentée comme fondée sur une source.

## 4. Réponses aux quatre questions

| Question | Réponse |
|---|---|
| Base suffisante pour une **durée unique** de première exposition ? | **Non.** Aucune source A ou B |
| Base suffisante pour une **plage** de durée ? | **Non.** Les durées observées (§5) viennent de protocoles non transférables |
| Base suffisante pour une durée **novice / non-novice** différente ? | **Non.** Aucune source ne compare des durées de première exposition selon le niveau. Une valeur distincte serait une décision C, sans coefficient |
| Existe-t-il une valeur scientifique transférable ? | **Non** |

**CT-D4 REQUIRES EXPERT VALUE**

## 5. Fiche d'arbitrage : contexte observé, **pas des recommandations KAIRO**

Ces durées apparaissent dans les sources. Elles sont données pour situer l'arbitrage, jamais comme valeur candidate.

| Durée observée | Où | Pourquoi elle n'est pas transférable au bootstrap |
|---|---|---|
| ≈ 4 min | S8 (Tabata) | Intervalles supra-maximaux sur ergocycle ; n = 7 |
| 6 min | E4 (micro-séances) | Circuit à haute intensité ; sécurité de la première séance non vérifiée |
| 5 et 15 min | S15 (AMRAP) | Sujets entraînés ; circuit de trois mouvements ; objectif de performance |
| 15 min | E3 (Wilke 2019) | Circuit « all-out » 20 s / 10 s |
| 15 min (un cas) et ≈ 60 min | E5 (premières séances de spinning) | **Événements indésirables**, pas des doses tolérées ; vélo |
| 10 min par bloc (supprimé en 2018) ; 20–60 min/j ; ≥ 20–30 min/j | S4, E1 | Santé publique, volume quotidien ou hebdomadaire de population |
| non vérifiée | S2, S3, S16, S17 | Durées de séance non relues en texte intégral |

Ce que l'expert doit trancher (forme de la décision, sans valeur) :
1. **Portée** : une durée commune à toute l'allowlist, ou une durée par mouvement (le couple de la décision 8) ?
2. **Forme** : une valeur fixe, ou une plage avec une règle déterministe de choix dans la plage (laquelle) ?
3. **Niveau** : une valeur identique pour tous les niveaux admis, ou des valeurs explicites par niveau (sans coefficient) ?
4. **Unité et granularité** : secondes, pas d'arrondi.
5. **Justification écrite** : classe C assumée, raisonnement, sources lues **en texte intégral**, limites.
6. **Sens prudent et révision** : cliquet G1, référence approuvée, conditions de révision (par exemple quand des séances réalisées existeront).
7. **Articulation avec le temps disponible** : si `d` dépasse le temps disponible, la séance est refusée (aucun levier dans le corridor). Faut-il le confirmer, ou déclarer un plancher de compression ? Ce second choix serait une décision distincte.

## 6. Qualifications de l'expert

Référentiel du projet (spec 09 §4) :
- les politiques G1 relèvent d'un **expert sportif qualifié**, non modifiables par le produit ;
- l'avis d'un **professionnel de santé** est recommandé pour la douleur et l'aptitude ;
- les métadonnées de catalogue (G5) relèvent d'un expert, par lot.

Pour CT-D4 dans ce corridor, rattaché à CT-G1-EXERTIONAL et à l'allowlist, le profil minimal à réunir est le suivant. Il peut s'agir d'une personne ou de plusieurs.

1. **Formation diplômante en sciences de l'exercice** : physiologie de l'exercice, STAPS, kinésiologie ou équivalent. Ou une certification professionnelle reconnue en préparation physique ou en prescription d'exercice (par exemple de type NSCA-CSCS, ACSM-EP ou ACSM-CEP, ou équivalent national).
2. **Expérience documentée** de l'encadrement de **débutants et d'adultes inactifs** en entraînement fonctionnel ou conditioning, y compris de premières séances.
3. **Capacité à lire et évaluer la littérature primaire en texte intégral**. Ce dossier n'a pu le faire pour aucune source.
4. **Connaissance de la rhabdomyolyse d'effort** et des facteurs de risque d'une première exposition.
5. Pour le volet médical (EXERTIONAL, éligibilité, message de sécurité) : relecture par un **médecin du sport** ou un professionnel de santé compétent, conformément à la recommandation de la spec 09 §4.
6. **Indépendance vis-à-vis du produit** pour la signature G1 (spec 09 §4 : non modifiable par l'équipe produit).
7. Pour l'allowlist (G5) : compétence pour valider les métadonnées de chaque mouvement (patterns, muscles, contre-indications, zones douloureuses, matériel, substitutions), dont dépendent l'empreinte et la sécurité.

## 7. Ce que ce dossier ne change pas

- Registre : `ct.firstExposure.byStimulus` (CT-D4) reste `UNRESOLVED`. Son indexation par stimulus contredit la décision 1, qui découple le bootstrap de toute taxonomie. C'est un point de conception à traiter lors de la formalisation (Bootstrap Feasibility Gate, §9 point 1), pas ici.
- Politiques CT-G1 : contenus qualitatifs décidés, statut `UNSIGNED`.
- Code : aucun changement.

**STOP.**
