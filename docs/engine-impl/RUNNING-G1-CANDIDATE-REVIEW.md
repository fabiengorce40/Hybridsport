# RUNNING-G1-CANDIDATE-REVIEW — reclassement des candidats G1 Running

> **Phase 5B (corrections B5 et X), documentation seulement.** Aucune valeur n’est proposée ni signée ; les G1 Strength ne sont pas modifiés.
>
> **Classes possibles**
> - `G1_SAFETY` : signature de sécurité requise avant production ;
> - `EXPERT_DESIGN_REVIEW` : revue d’expert de programmation (G2) ;
> - `PRODUCT_GUARDRAIL` : borne produit (G2 ou G3) ;
> - `NORMAL_PROGRAMMING_RULE` : règle de ruleset ordinaire.

## 1. Critère de décision

Un candidat reste **G1_SAFETY** seulement si ses **deux** conditions sont réunies :
1. le risque contrôlé concerne **la personne** (santé, dommage), et pas seulement la qualité ou l’efficacité du programme ;
2. une valeur trop permissive peut causer un dommage que les autres mécanismes (LOAD CHANGE ASSESSMENT, retours, gouvernance douleur) ne rattrapent pas à temps.

Sinon, le candidat relève de la programmation (EXPERT_DESIGN_REVIEW ou PRODUCT_GUARDRAIL), même si sa valeur reste prudente.

## 2. Candidats

### 2.1 PAIN_STOP (`R-G1-PAIN-STOP`)

| Champ | Contenu |
|---|---|
| riskControlled | Poursuivre ou progresser malgré une douleur déclarée pendant ou après la course |
| Nature du risque | **Sécurité** (personne) |
| currentEvidence | Aucune source vérifiée ne fixe un palier de douleur ; le produit ne peut pas diagnostiquer |
| failureModeTooPermissive | Séances poursuivies et progression maintenue malgré un signal de lésion possible ; aggravation |
| failureModeTooConservative | Arrêts excessifs pour des gênes bénignes ; perte d’adhérence ; programme bloqué |
| Niveau de preuve | Aucun (comportement produit) |
| expertQuestion (falsifiable) | « Chez des coureurs loisirs qui déclarent une douleur **qui modifie la foulée** pendant une séance, l’action STOP_SESSION + PAUSE_PROGRESSION réduit-elle, par rapport à REDUCE, la proportion de ceux qui déclarent la même douleur à la séance suivante ? » ; « La formulation “douleur qui augmente pendant l’effort” est-elle comprise de façon homogène par les utilisateurs (accord entre répondants) ? » |
| Besoin réel d’une signature sécurité | **Oui** : la règle traite un signal de santé et fixe la frontière avec le médical |
| **recommendedGovernance** | **G1_SAFETY** |

### 2.2 RETURN_PROTOCOL (`R-G1-RETURN-PROTOCOL`)

| Champ | Contenu |
|---|---|
| riskControlled | Reprise à une charge trop élevée après une interruption (surtout longue ou de cause inconnue) |
| Nature du risque | **Sécurité** pour LONG_INTERRUPTION et UNKNOWN_RETURN_STATE ; **programmation** pour SHORT et MODERATE |
| currentEvidence | Mujika & Padilla 2000 (désentraînement) : justifie de dégrader la confiance, pas un protocole ; aucun protocole de reprise vérifié |
| failureModeTooPermissive | Retour immédiat au niveau antérieur malgré une tolérance réduite ; exposition brutale |
| failureModeTooConservative | Reprise interminable ; démotivation ; perte d’adhérence |
| Niveau de preuve | Faible (SEARCH_SUMMARY, indirect) |
| expertQuestion | « Après une interruption dont la durée dépasse la frontière LONG proposée, un plafond de reprise exprimé relativement à la charge antérieure réalisée produit-il moins d’arrêts pour douleur, dans les semaines de reprise, qu’une reprise au niveau antérieur ? » ; « Faut-il traiter UNKNOWN_RETURN_STATE comme LONG ou comme MODERATE, compte tenu de la proportion d’utilisateurs qui ne déclarent pas la raison ? » |
| Besoin réel d’une signature sécurité | **Oui** pour la partie LONG / UNKNOWN (frontière LONG, plafond de départ, archétypes interdits) ; SHORT / MODERATE en EXPERT_DESIGN_REVIEW |
| **recommendedGovernance** | **G1_SAFETY** (restreint à LONG / UNKNOWN) + EXPERT_DESIGN_REVIEW (SHORT / MODERATE) |

### 2.3 NOVICE_ENTRY (`R-G1-NOVICE-ENTRY`)

| Champ | Contenu |
|---|---|
| riskControlled | Exposition initiale d’une personne P-R0 dont la tolérance est inconnue |
| Nature du risque | **Mixte.** Sécurité : pas de test maximal d’emblée, conditions d’arrêt, questions d’éligibilité (hors périmètre). Programmation : volume et fréquence de départ, alternance course / marche. |
| currentEvidence | Buist 2008 : un programme gradué n’a pas réduit les blessures chez des débutants ; Nielsen 2014 : association des fortes hausses de distance chez des débutants. Aucune valeur d’entrée vérifiée. |
| failureModeTooPermissive | Test maximal ou volume élevé dès la première semaine chez une personne non préparée |
| failureModeTooConservative | Programme trop faible, abandon précoce par ennui ; aucune progression perçue |
| Niveau de preuve | Faible (SEARCH_SUMMARY) |
| expertQuestion | « Chez des débutants sans historique, l’absence de test maximal pendant la phase d’entrée change-t-elle le taux d’abandon précoce par rapport à un test en première semaine ? » ; « Le volume de départ proposé est-il réalisable sans douleur déclarée par la majorité des P-R0 lors des premières séances ? » |
| Besoin réel d’une signature sécurité | **Oui, mais restreint** au volet sécurité (pas de test maximal, conditions d’arrêt, questions d’éligibilité). Le volume de départ relève de l’expert. |
| **recommendedGovernance** | **G1_SAFETY** (volet sécurité) + EXPERT_DESIGN_REVIEW (dose d’entrée) |

### 2.4 OUT_OF_SCOPE (`R-G1-OUT-OF-SCOPE`)

| Champ | Contenu |
|---|---|
| riskControlled | Programmer pour une personne hors périmètre (grossesse, pathologie déclarée, mineur, symptômes non locomoteurs, suivi médical) |
| Nature du risque | **Sécurité** et responsabilité |
| currentEvidence | Sans objet (périmètre produit) |
| failureModeTooPermissive | Plan généré pour une situation médicale ; fausse assurance |
| failureModeTooConservative | Exclusion de personnes qui pourraient s’entraîner ; friction |
| Niveau de preuve | Sans objet |
| expertQuestion | « La liste des déclencheurs hors périmètre couvre-t-elle toutes les situations que le référent sécurité juge incompatibles avec un plan non supervisé, sans exclure les utilisateurs sans contre-indication déclarée ? » (vérifiable par revue de cas) |
| Besoin réel d’une signature sécurité | **Oui** |
| **recommendedGovernance** | **G1_SAFETY** |

### 2.5 LONGRUN_BOUND (`R-G1-LONGRUN-BOUND`)

| Champ | Contenu |
|---|---|
| riskControlled | Hausse excessive de la plus longue sortie |
| Nature du risque | Principalement **programmation** (dose, tolérance) ; la composante sécurité est déjà couverte par la LOAD CHANGE ASSESSMENT (dimension `longRunDuration`), les retours et PAIN_STOP |
| currentEvidence | Fredette 2022 : association entre distances plus longues et blessures, preuves contradictoires ; aucune part du volume soutenue |
| failureModeTooPermissive | Long run trop long trop tôt ; fatigue mécanique ; séance non terminée |
| failureModeTooConservative | Long run insuffisant pour un semi ou un marathon ; préparation spécifique incomplète |
| Niveau de preuve | Faible |
| expertQuestion | « Chez des coureurs P-R2 et P-R3 qui préparent un semi, une progression du long run exprimée relativement à **leur propre** plus longue sortie récente produit-elle un taux de sorties longues non terminées plus faible qu’une borne relative au volume hebdomadaire ? » |
| Besoin réel d’une signature sécurité | **Non** : un défaut produit surtout une séance inadaptée, rattrapée par les retours et par PAIN_STOP |
| **recommendedGovernance** | **EXPERT_DESIGN_REVIEW** (politique de progression du long run) ; en contexte RETURN ou NOVICE, la borne dépend des G1 correspondants |

### 2.6 HI_DENSITY (`R-G1-HI-DENSITY`)

| Champ | Contenu |
|---|---|
| riskControlled | Trop de séances à haute intensité par période ou trop rapprochées |
| Nature du risque | **Programmation** (fatigue, qualité, récupération) |
| currentEvidence | García-Pinillos 2017 : 2 à 3 séances HIIT combinées au continu, efficaces chez les loisirs (contexte d’étude, pas un maximum) ; aucune borne de sécurité vérifiée |
| failureModeTooPermissive | Fatigue accumulée, séances de qualité dégradées, retours HARDER |
| failureModeTooConservative | Stimulus sévère insuffisant pour un 5K ou un 10K avancé |
| Niveau de preuve | Faible |
| expertQuestion | « Chez des P-R2 et P-R3, au-delà de la densité proposée, la proportion de séances de qualité non terminées ou jugées MUCH_HARDER augmente-t-elle ? » |
| Besoin réel d’une signature sécurité | **Non** : conséquences de performance et de fatigue, observables par les retours |
| **recommendedGovernance** | **PRODUCT_GUARDRAIL** (borne) + **EXPERT_DESIGN_REVIEW** (valeur par niveau) |

### 2.7 LOAD_INCREASE_BOUND (`R-G1-LOAD-INCREASE-BOUND`)

| Champ | Contenu |
|---|---|
| riskControlled | Hausse de charge trop brutale sur une dimension |
| Nature du risque | **Mixte.** Chez les débutants, une association avec les blessures est rapportée (Nielsen 2014), mais sans seuil prescriptif, et la règle des 10 % n’est pas protectrice (Buist 2008). |
| currentEvidence | Damsted 2018, Buist 2008, Nielsen 2014, Fredette 2022, Impellizzeri 2020 : aucun seuil universel |
| failureModeTooPermissive | Hausses fortes acceptées, surtout sur la distance ou la fréquence |
| failureModeTooConservative | Progression bloquée ; programme inefficace ; frustration |
| Niveau de preuve | Faible et contradictoire |
| expertQuestion | « Pour des P-R2 et P-R3 hors reprise, la catégorie LARGE_INCREASE, définie par la borne proposée, isole-t-elle les semaines après lesquelles les retours HARDER ou les signaux de douleur sont plus fréquents que dans la catégorie MODERATE_INCREASE ? » |
| Besoin réel d’une signature sécurité | **Non, en général.** Les contextes à risque élevé (P-R0, reprise longue) sont déjà couverts par NOVICE_ENTRY et RETURN_PROTOCOL, qui restent G1. Signer une borne universelle suggérerait une valeur préventive que la preuve ne soutient pas. |
| **recommendedGovernance** | **PRODUCT_GUARDRAIL** + **EXPERT_DESIGN_REVIEW**, et G1 seulement via les contextes NOVICE_ENTRY / RETURN_PROTOCOL |

## 3. Décision finale

| Candidat | 5A | 5B |
|---|---|---|
| PAIN_STOP | G1 | **G1_SAFETY** |
| RETURN_PROTOCOL | G1 | **G1_SAFETY** (LONG / UNKNOWN) + EXPERT_DESIGN_REVIEW (SHORT / MODERATE) |
| NOVICE_ENTRY | G1 | **G1_SAFETY** (volet sécurité) + EXPERT_DESIGN_REVIEW (dose d’entrée) |
| OUT_OF_SCOPE | G1 | **G1_SAFETY** |
| LONGRUN_BOUND | G1 | **EXPERT_DESIGN_REVIEW** |
| HI_DENSITY | G1 | **PRODUCT_GUARDRAIL** + EXPERT_DESIGN_REVIEW |
| LOAD_INCREASE_BOUND | G1 | **PRODUCT_GUARDRAIL** + EXPERT_DESIGN_REVIEW (G1 hérité seulement en contexte NOVICE / RETURN) |

**Bilan** : 4 G1_SAFETY, dont 2 restreints à leur volet sécurité ; 3 reclassés. La conclusion suggérée par le contre-audit est confirmée par l’analyse, pas imposée : chaque reclassement repose sur le critère §1 (dommage non rattrapé par les autres mécanismes).

**Règle ajoutée par le reclassement** : un paramètre non G1 **ne peut pas** relâcher une contrainte G1. En contexte NOVICE ou RETURN, la borne effective est la plus stricte des deux.
