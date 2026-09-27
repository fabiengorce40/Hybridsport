# RUNNING-EVIDENCE-REVIEW-PACK — sources prioritaires et questions scientifiques

> **Phase 5A.** Dossier destiné au contre-audit humain et scientifique. Sections couvertes : AB (sources prioritaires) et AC (questions falsifiables).

## 0. Méthode et limites

- **Accès** : PubMed, E-utilities et EuropePMC sont bloqués depuis l’environnement (EGRESS_BLOCKED avec curl et WebFetch). La seule voie disponible est la **recherche web**, qui renvoie des résumés de moteur de recherche.
- **Niveau maximal atteint : SEARCH_SUMMARY.** Aucun résumé d’article n’a été lu directement (ABSTRACT_VERIFIED) et aucun texte intégral (FULL_TEXT_VERIFIED). Les chiffres cités proviennent des résumés de recherche. Ils doivent être relus sur la source avant toute utilisation comme valeur.
- **Hiérarchie de preuve visée** : méta-analyse > revue systématique > consensus ou position officielle > essai randomisé > cohorte de qualité. Les blogs de coaching ne sont jamais utilisés comme preuve physiologique.
- **Identité** : `CONFIRMED` (auteurs, revue, année et PMID ou DOI concordants) ; `PARTIAL` (un élément manque ou n’est pas confirmé).

## AB. Sources

### AB.1 Sources prioritaires demandées par la mission

| ID | Référence | Type | Identité | Niveau | Constats (d’après le résumé de recherche) | Usage dans la spec |
|---|---|---|---|---|---|---|
| RS-OLIVEIRA-2024-TID | Oliveira, Boppre, Fonseca. *Sports Med* 2024. PMID 38717713. DOI 10.1007/s40279-024-02034-z | Méta-analyse (GRADE) | CONFIRMED | SEARCH_SUMMARY | 17 études, 437 participants, au moins 4 semaines. Polarisé > autres TID sur le VO2peak, SMD 0,24 (IC 95 % 0,01–0,48), surtout pour les interventions de moins de 12 semaines et chez les très entraînés. Pas de différence claire pour TT, TTE et VT2/LT2. | TID CONTEXT_DEPENDENT (§L) |
| RS-CSD-SCOPING-2026 | Scoping review CS/D’ en course. *Sports Med* 2026. PMID 41931241. DOI 10.1007/s40279-026-02410-x | Scoping review (PRISMA-ScR) | PARTIAL (auteurs non capturés) | SEARCH_SUMMARY | 124 études. Pas de consensus sur la mesure et la modélisation optimales, sur l’influence de CS et D’ sur la performance, ni sur leur application à l’entraînement. | CS comme signal parmi d’autres (§G) |
| RS-WANG-2023-TAPER | Wang et al. *PLoS One* 2023. PMID 37163550 | Méta-analyse | CONFIRMED | SEARCH_SUMMARY | 14 études. Le taper améliore TT et TTE. Jusqu’à 21 jours, réduction du volume de 41 à 60 %, intensité et fréquence inchangées : efficace. | Taper (§T) |
| RS-GONZALEZMOHINO-2020-ECON | González-Mohíno, Santos-Concejero, Yustres, González-Ravé. « The Effects of Interval and Continuous Training on the Oxygen Cost of Running in Recreational Runners ». *Sports Med* 2020;50:283–294. PMID 31606879 (non confirmé explicitement) | Revue systématique (ECR d’au moins 6 semaines) | PARTIAL | IDENTITY_ONLY | Résultats **non extraits** | Aucune conclusion tirée (§P) |
| RS-GARCIAPINILLOS-2017-HIIT | García-Pinillos, Soto-Hermoso, Latorre-Román. « How does high-intensity intermittent training affect recreational endurance runners? » *J Sport Health Sci* 2017. PMID 30356547 | Revue | CONFIRMED | SEARCH_SUMMARY | 2 à 3 séances HIIT par semaine combinées au continu améliorent VO2max et économie chez les coureurs loisirs. | Continu et intermittent complémentaires (§P) |
| RS-DAMSTED-2018-LOAD | Damsted et al. *Int J Sports Phys Ther* 2018. PMID 30534459 | Revue systématique | CONFIRMED | SEARCH_SUMMARY | 4 articles ; 3 trouvent une association entre hausse de charge et blessure ; preuves très limitées ; pas de seuil clair de 10 % ; pas de différence entre 10 % et 24 %. | Pas de règle des 10 % (§Q) |
| RS-HUIBERTS-2024-CONC | Huiberts, Wüst, van der Zwaard. *Sports Med* 2024 | Méta-analyse | CONFIRMED (PMID non relevé) | SEARCH_SUMMARY | 59 études, 1346 participants. Force du bas du corps atténuée chez les hommes, pas chez les femmes. Pas de différence de sexe pour la force du haut du corps, la puissance ou le VO2max. Gain de VO2max plus faible chez les non-entraînés. | Concurrent (§U), démographie (§C) |

### AB.2 Sources d’élargissement

| ID | Référence | Type | Identité | Niveau | Constats (d’après le résumé de recherche) | Usage |
|---|---|---|---|---|---|---|
| RS-BUIST-2008-GRONORUN | Buist et al. *Am J Sports Med* 2008;36(1):33–39. PMID 17940147 | ECR (GRONORUN) | CONFIRMED | SEARCH_SUMMARY | 532 débutants ; programme gradué de 13 semaines (règle des 10 %) contre 8 semaines : 20,8 % contre 20,3 % de blessés, sans effet | §Q |
| RS-NIELSEN-2014-DANORUN | Nielsen et al. *J Orthop Sports Phys Ther* 2014 (DANO-RUN) | Cohorte prospective | CONFIRMED | SEARCH_SUMMARY | 874 débutants suivis par GPS ; hausse de plus de 30 % sur 2 semaines associée à plus de blessures liées à la distance qu’une hausse de moins de 10 % ; varie selon le type de blessure | §Q (association, pas seuil) |
| RS-FREDETTE-2022-INJ | Fredette et al. *J Athl Train* 2022;57(7):650–671 | Revue systématique | CONFIRMED | SEARCH_SUMMARY | 36 études ; preuves contradictoires entre paramètres d’entraînement et blessures ; distances plus longues associées | §Q, §N |
| RS-IMPELLIZZERI-2020-ACWR | Impellizzeri et al. *Int J Sports Physiol Perform* 2020;15(6) | Analyse critique | CONFIRMED | SEARCH_SUMMARY | L’ACWR n’est pas soutenu pour la gestion du risque de blessure ; artefacts statistiques | ACWR écarté (§Q) |
| RS-BOSQUET-2007-TAPER | Bosquet et al. 2007. PMID 17762369 | Méta-analyse | CONFIRMED | SEARCH_SUMMARY | 27 études ; taper de 2 semaines, réduction exponentielle du volume de 41 à 60 %, intensité et fréquence maintenues | §T |
| RS-JONES-2019-CP | Jones, Burnley, Black, Poole, Vanhatalo. *Physiol Rep* 2019;7(10):e14098 | Revue / position d’auteurs | CONFIRMED | SEARCH_SUMMARY | CP plutôt que MLSS comme indice de l’état stable métabolique maximal ; débattu (commentaire García-Tabar) | §G, §O |
| RS-GALANRIOJA-2020-CP | Galán-Rioja et al. *Sports Med* 2020 | Revue systématique | CONFIRMED | SEARCH_SUMMARY | CP vs MLSS, VT1, VT2, RCP : pas des synonymes (résultats chiffrés non extraits) | §O |
| RS-JAMNICK-2020-DOMAINS | Jamnick, Pettitt, Granata, Pyne, Bishop. *Sports Med* 2020;50:1729–1756. PMID 32729096 | Revue | CONFIRMED | SEARCH_SUMMARY | Pas de cadre consensuel sur la validité des méthodes de prescription de l’intensité ; évaluation par rapport aux domaines moderate, heavy et severe | §H |
| RS-FOSTER-2001-SRPE | Foster et al. *J Strength Cond Res* 2001. PMID 11708692 | Étude de validation | CONFIRMED | SEARCH_SUMMARY | sRPE valide par rapport à la méthode FC ; score absolu plus élevé | §Q, §Y |
| RS-MUJIKA-2000-DETRAIN | Mujika & Padilla. *Sports Med* 2000;30:79–87 (partie I) ; partie II PMID 10999420 | Revue | CONFIRMED | SEARCH_SUMMARY | Désentraînement court (moins de 4 semaines) : VO2max en baisse rapide chez les très entraînés, en restant au-dessus des non-entraînés ; seuil lactique abaissé | §S |
| RS-BLAGROVE-2018-STRECON | Blagrove, Howatson, Hayes. *Sports Med* 2018. PMID 29249083 | Revue systématique | CONFIRMED | SEARCH_SUMMARY | La musculation peut améliorer l’économie de course ; ampleur selon la méthode et la vitesse | §U |
| RS-ROSENBLAT-2019-POL | Rosenblat, Perrotta, Vicenzino. *J Strength Cond Res* 2019;33(12):3491–3500 | Méta-analyse | CONFIRMED | SEARCH_SUMMARY | 4 études POL vs seuil ; effet modéré en faveur du POL sur les TT ; preuves limitées | §L |
| RS-REED-TALKTEST | Reed & Pipe, talk test. PMID 25010379 | Revue | CONFIRMED | SEARCH_SUMMARY | Parole confortable sous VT/LT | §M |
| RS-TALKTEST-SR-CARDIO | Revue systématique du talk test chez des patients cardiopulmonaires. PMID 39076925 | Revue systématique | CONFIRMED | SEARCH_SUMMARY | Preuves surtout en populations cardiaques | §M (limite d’extrapolation) |
| RS-ZONE2-VAR | Variabilité de la « zone 2 ». PMID 40225831 | Étude | CONFIRMED | SEARCH_SUMMARY | Un % FCmax fixe montre de larges écarts individuels par rapport à VT1 ; CV de 6 à 29 % | §H, §M |

### AB.3 Thèmes d’élargissement demandés, avec la couverture obtenue

| Thème | Couverture 5A | Manque principal |
|---|---|---|
| threshold | Jamnick 2020, Galán-Rioja 2020, Jones 2019 | Chiffres de correspondance entre méthodes |
| critical speed | Scoping review 2026, Jones 2019 | Protocole minimal validé en course de terrain |
| running economy | Blagrove 2018, García-Pinillos 2017 ; González-Mohíno 2020 non extrait | Méta-analyse d’interventions d’économie hors musculation |
| volume | Fredette 2022 (association) | Relation dose–réponse volume–performance chez les loisirs |
| frequency | — | **Aucune source vérifiée** |
| interval prescription | García-Pinillos 2017 | Dose (durée des répétitions, récupérations) comparée |
| race-specific training | — | **Aucune source vérifiée** |
| marathon | — | **Aucune source vérifiée** (long run, spécificité) |
| return after interruption | Mujika & Padilla 2000 | Protocoles de reprise en course de loisir |
| RPE / HR prescription | Foster 2001, talk test, zone 2 | Validité de l’auto-régulation par RPE en course |
| training load | Impellizzeri 2020, Foster 2001 | — |
| injury associations | Damsted 2018, Buist 2008, Nielsen 2014, Fredette 2022 | Autres types de blessures, populations entraînées |

---

## AC. Questions scientifiques falsifiables (72)

Chaque question est une hypothèse **réfutable** : le critère de réfutation est indiqué entre crochets. Les questions portent sur ce que le moteur ferait si l’hypothèse était vraie.

### Références (REF)
1. **Q-REF-1** Chez des coureurs P-R2 à P-R4, une course de 10 km datant de moins de 8 semaines prédit mieux la performance semi-marathon qu’un test VMA de même ancienneté. [Réfutée si l’erreur de prédiction n’est pas inférieure.]
2. **Q-REF-2** L’erreur de prédiction d’un modèle d’équivalence de distances croît avec le rapport entre distance cible et distance de référence. [Réfutée si l’erreur est indépendante de ce rapport.]
3. **Q-REF-3** La prédiction marathon à partir d’une seule course de 10 km est moins précise chez les coureurs sans historique de long run que chez ceux qui en ont un. [Réfutée si la précision est équivalente.]
4. **Q-REF-4** Un temps déclaré par l’utilisateur, sans preuve, diffère d’une performance mesurée ultérieurement de plus que la variabilité normale entre courses. [Réfutée si l’écart est dans la variabilité normale.]
5. **Q-REF-5** Une FCmax estimée par formule d’âge s’écarte de la FCmax mesurée au point de déplacer les bornes de domaines de plus d’un domaine pour une part notable des individus. [Réfutée si l’écart reste intra-domaine pour la grande majorité.]

### Critical speed (CS)
6. **Q-CS-1** CS estimée à partir de 3 essais ou plus diffère de CS estimée à partir de 2 essais de plus que l’erreur de mesure. [Réfutée si la différence est dans l’erreur.]
7. **Q-CS-2** Le choix du modèle (linéaire distance–temps vs hyperbolique) change CS de façon pertinente pour la prescription. [Réfutée si l’écart est inférieur à la largeur des plages de cible.]
8. **Q-CS-3** Des courses récentes de distances différentes donnent une CS équivalente à un protocole dédié sur piste. [Réfutée si l’écart dépasse l’erreur du protocole.]
9. **Q-CS-4** Une séance continue à une vitesse légèrement inférieure à CS est tenue à l’état stable, alors qu’une séance légèrement au-dessus ne l’est pas, chez des coureurs loisirs. [Réfutée si la frontière observée diffère systématiquement de CS.]
10. **Q-CS-5** D’ estimée est trop peu fiable (entre essais) pour doser des répétitions en domaine sévère. [Réfutée si la fiabilité test–retest de D’ est comparable à celle de CS.]

### Seuil (THR)
11. **Q-THR-1** Les vitesses à LT2, MLSS et CS diffèrent systématiquement chez un même individu. [Réfutée si elles sont interchangeables à l’erreur près.]
12. **Q-THR-2** L’allure semi-marathon se situe sous CS chez la majorité des coureurs P-R2 à P-R4. [Réfutée si elle est au-dessus pour une part importante.]
13. **Q-THR-3** L’allure 10K se situe au-dessus de CS chez les coureurs dont la durée de 10 km dépasse un certain seuil (niveau plus faible). [Réfutée si la position par rapport à CS est indépendante du temps de course.]
14. **Q-THR-4** Les tests de seuil de terrain (durée fixe) ont une validité suffisante par rapport à MLSS pour prescrire THRESHOLD_LIKE. [Réfutée si l’erreur dépasse la largeur de la plage.]
15. **Q-THR-5** Le travail THRESHOLD_LIKE fractionné produit une adaptation de la fraction soutenable équivalente au continu à durée de travail égale. [Réfutée si l’une des formes est supérieure.]

### Domaines d’intensité (DOM)
16. **Q-DOM-1** Un modèle à trois domaines prédit mieux la réponse physiologique aiguë (lactate, dérive du VO2) qu’un modèle à 5 zones en % FCmax. [Réfutée si les deux sont équivalents.]
17. **Q-DOM-2** Des bornes en % FCmax fixes classent mal (hors du domaine visé) une part notable des individus. [Réfutée si le taux de mauvais classement est faible.]
18. **Q-DOM-3** Des bornes dérivées d’une référence de performance récente classent mieux que des bornes en % FCmax. [Réfutée si elles ne classent pas mieux.]

### Easy running (EASY)
19. **Q-EASY-1** Des coureurs loisirs guidés par un plafond d’effort courent leurs séances faciles plus bas que ceux guidés par une allure cible. [Réfutée si pas de différence.]
20. **Q-EASY-2** Le talk test place l’intensité sous VT1 chez des coureurs sains, pas seulement chez des patients cardiaques. [Réfutée si la concordance est faible chez les sains.]
21. **Q-EASY-3** Remplacer une partie du volume facile par du volume modéré (au-dessus de VT1) sans changer le volume total ne dégrade pas la tolérance chez P-R1 et P-R2. [Réfutée si la tolérance (retours, abandons) se dégrade.]
22. **Q-EASY-4** Chez les débutants, l’alternance course / marche améliore l’adhérence par rapport à la course continue. [Réfutée si pas de différence.]

### Long run (LR)
23. **Q-LR-1** La durée de la plus longue sortie explique une part de la performance marathon au-delà du volume hebdomadaire total. [Réfutée si elle n’ajoute rien au volume.]
24. **Q-LR-2** Une part fixe du volume hebdomadaire pour le long run n’est pas associée à une meilleure performance ou tolérance qu’une progression individuelle. [Réfutée si la part fixe fait mieux.]
25. **Q-LR-3** Une augmentation brutale de la plus longue sortie est associée aux blessures indépendamment du volume hebdomadaire. [Réfutée si pas d’association indépendante.]
26. **Q-LR-4** Des portions à allure spécifique dans le long run améliorent la performance semi ou marathon plus qu’un long run entièrement facile. [Réfutée si pas de différence.]

### Intervalles (INT)
27. **Q-INT-1** À temps en domaine sévère égal, des répétitions longues et courtes produisent des gains de VO2max équivalents chez les loisirs. [Réfutée si l’une est supérieure.]
28. **Q-INT-2** La combinaison continu + intermittent améliore l’économie plus que le continu seul chez les coureurs loisirs. [Réfutée si pas de différence.]
29. **Q-INT-3** Les répétitions en côte améliorent l’économie de course sur le plat. [Réfutée si pas d’effet.]
30. **Q-INT-4** Les lignes droites ajoutées à la course facile améliorent l’économie ou la vitesse. [Réfutée si pas d’effet.]
31. **Q-INT-5** Au-delà de deux séances à haute intensité par semaine, le gain de performance ne progresse plus chez P-R2 et P-R3. [Réfutée si le gain continue.]

### Volume (VOL)
32. **Q-VOL-1** Chez les loisirs, la performance 10K augmente avec le volume hebdomadaire jusqu’à un plateau dépendant du niveau. [Réfutée si pas de relation ou pas de plateau.]
33. **Q-VOL-2** Le volume exprimé en durée prédit la tolérance aussi bien que le volume en distance. [Réfutée si l’un est nettement supérieur.]
34. **Q-VOL-3** Un historique de volume élevé (passé) réduit le risque associé à une hausse de volume actuelle. [Réfutée si l’historique ne modère pas l’association.]

### Fréquence (FREQ)
35. **Q-FREQ-1** À volume égal, plus de séances plus courtes améliorent la tolérance des débutants. [Réfutée si pas de différence.]
36. **Q-FREQ-2** Avec deux séances par semaine, l’ajout d’une séance de qualité n’améliore pas la performance d’un débutant plus que deux séances faciles. [Réfutée si la qualité fait mieux.]
37. **Q-FREQ-3** Chez les P-HYBRID, une fréquence de course plus faible à volume constant ne réduit pas la performance course. [Réfutée si elle la réduit.]

### Progression (PROG)
38. **Q-PROG-1** Faire progresser une seule variable par cycle réduit les interruptions par rapport à une progression simultanée de plusieurs. [Réfutée si pas de différence.]
39. **Q-PROG-2** Une hausse de 10 % par semaine n’est pas associée à moins de blessures qu’une hausse plus rapide mais bornée chez les débutants. [Réfutée si les 10 % protègent.]
40. **Q-PROG-3** Les hausses d’allure fondées sur une nouvelle performance produisent moins d’échecs de séance que des incréments automatiques. [Réfutée si pas de différence.]
41. **Q-PROG-4** La progression en durée du long run est mieux tolérée que la progression en distance quand la référence d’allure est incertaine. [Réfutée si pas de différence.]
42. **Q-PROG-5** Une décharge conditionnelle (déclenchée par les retours) produit des résultats au moins équivalents à une décharge périodique fixe. [Réfutée si la périodique fait mieux.]

### TID
43. **Q-TID-1** L’avantage du polarisé sur le VO2peak disparaît au-delà de 12 semaines d’intervention. [Réfutée s’il persiste.]
44. **Q-TID-2** Chez les coureurs loisirs peu entraînés, polarisé et pyramidal donnent une performance TT équivalente. [Réfutée si l’un est supérieur.]
45. **Q-TID-3** À très faible fréquence (2 ou 3 séances), la TID exprimée en % de temps n’a pas de lien avec la performance. [Réfutée si un lien apparaît.]
46. **Q-TID-4** Chez les P-HYBRID, compter l’intensité des autres disciplines change la classification de TID de l’athlète. [Réfutée si la classification reste la même.]

### Taper
47. **Q-TAPER-1** Pour un 5K ou un 10K, un taper plus court que pour un marathon donne une performance équivalente ou meilleure. [Réfutée si un taper long est supérieur.]
48. **Q-TAPER-2** L’amplitude de réduction optimale du volume diffère selon la charge antérieure. [Réfutée si elle est indépendante.]
49. **Q-TAPER-3** Réduire l’intensité pendant le taper dégrade la performance par rapport à son maintien. [Réfutée si pas de différence.]
50. **Q-TAPER-4** Chez les coureurs à faible volume (P-R1), un taper n’améliore pas la performance. [Réfutée si un gain est observé.]

### Spécificité de course (SPEC)
51. **Q-SPEC-1** Le travail à allure spécifique en phase SPECIFIC améliore la performance cible plus qu’un volume équivalent de travail non spécifique. [Réfutée si pas de différence.]
52. **Q-SPEC-2** L’allure marathon des loisirs se situe dans le domaine modéré ou heavy selon le niveau, et non à une fraction fixe de CS. [Réfutée si une fraction fixe convient à tous.]

### Récupération (REC)
53. **Q-REC-1** Après une séance VO2_INTERVALS, la performance d’une séance de qualité le lendemain est dégradée par rapport à un intervalle de deux jours chez P-R2. [Réfutée si pas de dégradation.]
54. **Q-REC-2** La durée de récupération après une course croît avec la distance de course. [Réfutée si pas de relation.]
55. **Q-REC-3** Les masters demandent plus de récupération entre séances intenses que les jeunes adultes à niveau égal. [Réfutée si pas de différence ; tant que non démontré, aucune correction d’âge.]

### Reprise (RET)
56. **Q-RET-1** Après une interruption courte, la performance revient au niveau antérieur plus vite chez les entraînés que chez les débutants. [Réfutée si pas de différence.]
57. **Q-RET-2** Reprendre au niveau de charge antérieur après une interruption longue est associé à plus de blessures qu’une reprise progressive. [Réfutée si pas d’association.]
58. **Q-RET-3** Le seuil lactique baisse de façon mesurable dès une interruption courte chez les coureurs entraînés. [Réfutée si pas de baisse mesurable.]

### Entraînement concurrent (CONC)
59. **Q-CONC-1** Une séance de jambes lourde la veille dégrade la qualité d’une séance THRESHOLD_LIKE par rapport à un ordre inverse. [Réfutée si pas de différence.]
60. **Q-CONC-2** L’atténuation de la force du bas du corps en concurrent est présente chez les hommes et absente chez les femmes pour des programmes course + musculation. [Réfutée si la différence de sexe disparaît dans la course seule.]
61. **Q-CONC-3** L’ajout de musculation lourde améliore l’économie de course des P-R2 et P-R3. [Réfutée si pas d’amélioration.]
62. **Q-CONC-4** La charge locomotrice HYROX (sled, fentes) interfère avec les séances de course au même titre que la course elle-même. [Réfutée si son effet est différent.]
63. **Q-CONC-5** La proximité temporelle entre musculation et course a un effet dépendant de l’intensité de la course (plus marqué pour les séances sévères). [Réfutée si l’effet est indépendant de l’intensité.]

### RPE
64. **Q-RPE-1** La sRPE (RPE × durée) suit la charge interne en course aussi bien que les méthodes fondées sur la FC. [Réfutée si l’accord est faible.]
65. **Q-RPE-2** Une prescription par RPE seule place les coureurs loisirs dans le domaine visé aussi souvent qu’une prescription par allure issue d’une référence récente. [Réfutée si l’allure fait nettement mieux.]

### Fréquence cardiaque (HR)
66. **Q-HR-1** La dérive cardiaque sur les séances longues fait sortir une prescription FC du domaine visé (sous-intensité en fin de séance). [Réfutée si pas de dérive pertinente.]
67. **Q-HR-2** Une FC mesurée à la frontière 1 individuelle place mieux l’easy qu’un % de FCmax. [Réfutée si pas de différence.]

### Charge mécanique (MECH)
68. **Q-MECH-1** Le volume à vitesse élevée (SEVERE + sprint) est associé aux blessures indépendamment du volume total. [Réfutée si pas d’association indépendante.]
69. **Q-MECH-2** Une descente rapide répétée génère une fatigue musculaire supérieure à une montée à effort égal. [Réfutée si pas de différence.]

### Association charge–blessure (INJ)
70. **Q-INJ-1** Chez les débutants, une hausse de distance sur deux semaines supérieure à une borne est associée aux blessures liées à la distance, et l’effet varie selon le type de blessure. [Réfutée si pas d’association dans des cohortes de réplication.]
71. **Q-INJ-2** L’ACWR n’ajoute pas de pouvoir prédictif au changement de charge simple. [Réfutée s’il en ajoute après correction des artefacts.]

### Programmation débutant (BEG) et avancée (ADV)
72. **Q-BEG-1** Un programme P-R0 fondé uniquement sur l’effort (sans allure) aboutit à une adhérence au moins égale à un programme fondé sur une allure estimée. [Réfutée si l’allure fait mieux.]
73. **Q-BEG-2** Un test maximal en première semaine chez P-R0 augmente les abandons précoces. [Réfutée si pas d’effet.]
74. **Q-ADV-1** Chez P-R4, un polarisé de courte durée améliore davantage le VO2peak qu’un pyramidal. [Réfutée si pas de différence.]
75. **Q-ADV-2** Chez P-R4, plusieurs références concordantes réduisent l’écart entre allure prescrite et allure tenue par rapport à une référence unique. [Réfutée si pas de réduction.]

**Total : 75 questions** (minimum requis : 60).
