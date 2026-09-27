# RUNNING-5E-EXPERT-DECISION-PACK — décisions expertes (arbitrage humain)

> **Phase 5E.** Claude **prépare** ; il ne décide pas et ne signe pas. **Aucune option n’est présélectionnée.**
>
> - **Vérif.** : SS = SEARCH_SUMMARY (Claude) ; EXT-A = vérifié par le contre-audit externe au niveau abstract ; EXT-F = texte intégral vérifié par le contre-audit.
> - Toute valeur numérique qu’une option exigerait encore est notée **DECISION_REQUIRED** : elle n’est pas proposée ici.
> - Formulaire à remplir : [`RUNNING-5E-HUMAN-DECISION-FORM.md`](RUNNING-5E-HUMAN-DECISION-FORM.md).

## 0. Consolidation

**16 décisions en 5D (E1–E16) → 14 décisions en 5E.**

| 5E | Reprend (5D) | Paramètres |
|---|---|---|
| E-PROG | E1 | V23 |
| E-QUALITY | E13 (partie V31) | V31 |
| E-LONG | E13 (partie V32) | V32, `longRun.boundPolicy` |
| E-RPE | E6 | V02 |
| E-PACE | E7 + E8 | V03, V04 |
| E-RECOVERY | E9 | V08 |
| E-DENSITY | E10 | V10, V11 |
| E-RECENCY | E11 | V12 |
| E-LOAD | (V22, hors liste en 5D) | V22 |
| E-TAPER | E12 + sélection R11 | V27 (application), V28 |
| E-FIRST | E14 | V35, V36, V37 |
| E-MODEL | E2 | V38 |
| E-VARIABILITY | E3 + E4 + E5 + E16 | V42, V43, règle de mise à jour, V15 |
| E-RECENTLOAD | E15 | V21 (RecentLoadContext) |

## 1. Décisions

### E-PROG — progression au-delà de la dose déjà tolérée (V23)

| Champ | Contenu |
|---|---|
| Question exacte | En V1, le moteur peut-il proposer une dose **supérieure** à la plus haute dose tolérée récemment (`bestToleratedExposure`), et si oui, selon quelle règle ? |
| Pourquoi | V23 est vide : aujourd’hui, seules la restauration et la baisse sont possibles |
| Preuve | Buist 2008 (EXT-A) : règle des 10 % non protectrice ; Damsted 2018 (SS) : 10 % ≈ 24 % ; Nielsen 2014 (SS) : association > 30 % sur 2 semaines chez des débutants |
| Ce que la science soutient | Aucune magnitude universelle ; l’ampleur d’une hausse est associée au risque chez des débutants (association) |
| Ce qu’elle ne soutient pas | Une valeur de progression, quelle que soit la variable ; une progression sûre |
| Candidate actuelle | Restauration + baisse seulement |
| **A** | Restauration vers `bestToleratedExposure` seulement ; toute nouvelle hausse reste bloquée en V1 |
| **B** | Plages expertes **propres à chaque variable**. DECISION_REQUIRED pour chacune : durée hebdomadaire, distance, fréquence, durée du long run, volume de fractionné, durée des répétitions, récupération / densité, intensité, spécificité |
| **C** | Pas adaptatif fondé sur la **plus petite unité de prescription significative** (par exemple une répétition de plus, une unité de temps de séance), conditionné à la tolérance, à l’adhérence et à l’historique. DECISION_REQUIRED : l’unité par variable, et le nombre de semaines tolérées avant un nouveau pas |
| KEEP BLOCKED | Même effet que A, mais V23 reste « non décidé » |
| Effet sur R1–R12 | A / KEEP : aucun changement (HOLD ou restauration). B / C : R2–R7 et R9–R12 peuvent progresser au-delà du démontré |
| Effet sur l’implémentation | A : implémentable tout de suite ; B / C : chaque valeur requise doit être décidée |
| Trop permissif | Hausses brutales, surtout chez les débutants |
| Trop conservateur | Stagnation au-delà du niveau démontré ; objectifs lointains inatteignables (marathon) |
| Gouvernance recommandée | EXPERT_DESIGN_REVIEW |
| Rôle signataire | Expert de programmation course |

### E-QUALITY — dose de travail d’une séance de qualité (V31)

| Champ | Contenu |
|---|---|
| Question exacte | V1 exige-t-il une dose de travail minimale avant d’**étiqueter** une séance THRESHOLD, SEVERE, SHORT_INTERVAL, HILLS ou RACE_PACE (et donc de la compter HIGH_DEMAND) ? |
| Pourquoi | V31 est vide : défaut conservateur (toute dose compte comme HD) |
| Preuve | Bacon 2013 (SS) : critère d’inclusion ≥ 10 min de travail intense, **pas un minimum** ; méta-régression HIIT (attribution PARTIAL) |
| Soutenu | L’existence de gains avec des doses variées |
| Non soutenu | Un minimum par stimulus |
| Candidate | Aucun minimum ; défaut conservateur tracé |
| **A** | Aucun minimum dur ; défaut conservateur conservé |
| **B** | Minimum **par stimulus** (DECISION_REQUIRED × 5 : THRESHOLD, SEVERE, SHORT, HILLS, RACE_PACE) |
| **C** | Minimum seulement pour la **première exposition** (lié à E-FIRST) |
| KEEP BLOCKED | Même effet que A |
| Effet sur R1–R12 | A : aucun ; B : peut changer l’étiquette HD de séances très courtes (A15) |
| Effet sur l’implémentation | A : aucun blocage |
| Trop permissif | Séances quasi vides étiquetées « qualité » |
| Trop conservateur | Densité HD consommée par de petites doses |
| Gouvernance | EXPERT_DESIGN_REVIEW |
| Signataire | Expert course |

### E-LONG — programmation du long run (V32)

| Champ | Contenu |
|---|---|
| Question exacte | (1) Le mécanisme « prochaine dose de long run = f(long run récent toléré, objectif, phase, contexte hebdomadaire, temps restant, charge concurrente, niveau) » est-il accepté ? (2) V1 a-t-il besoin d’un **maximum produit** distinct ? |
| Pourquoi | V32 et `boundPolicy` sont vides ; tout LONG_RUN désigné est HD par défaut |
| Preuve | Méta-analyse des déterminants du marathon (SS, associations : plus longue sortie, sorties ≥ 32 km) ; Fredette 2022 (SS) |
| Soutenu | L’historique du long run compte pour le marathon (association) |
| Non soutenu | Une part du volume ; une borne absolue |
| Candidate | Mécanisme adaptatif ; restauration ou HOLD (E-PROG) ; pas de maximum produit |
| **A** | Mécanisme accepté, sans maximum produit (les bornes viennent de RecentLoadContext et d’E-PROG) |
| **B** | Mécanisme accepté + maximum produit (DECISION_REQUIRED : forme absolue ou relative à l’historique, et valeur) |
| KEEP BLOCKED | Long run en HOLD ou restauration seulement ; marathon hors périmètre minimal |
| Effet sur R1–R12 | R4 et R6 (progression du long run) ; R2 (désignation HD via V32) |
| Effet sur l’implémentation | Faible si A (HOLD ou restauration) ; les distinctions programmation / produit / G1 sont explicites |
| Trop permissif | Sorties trop longues trop tôt |
| Trop conservateur | Préparation marathon impossible |
| Gouvernance | EXPERT_DESIGN_REVIEW (garde-fou produit si B) |
| Signataire | Expert course (+ produit si B) |

### E-RPE — bandes RPE opérationnelles (V02)

| Champ | Contenu |
|---|---|
| Question exacte | Les bandes chevauchantes CR-10 (easy ≤ 3 ; STEADY 3–5 ; seuil 5–7 ; sévère 7–9 ; test 9–10), combinées au contexte et aux autres signaux, sont-elles acceptées pour V1 ? |
| Pourquoi | Toute séance utilise le RPE (NO_WEARABLE) |
| Preuve | Foster 2001 (SS) ; talk test (surtout cardiaque) ; ancres fixes (IDENTITY_ONLY) |
| Soutenu | Validité de la sRPE comme charge interne |
| Non soutenu | Une correspondance exacte entre RPE et domaine |
| **A** | Bandes candidates acceptées |
| **B** | Descripteurs verbaux seulement (sans nombres) |
| KEEP BLOCKED | V1 sans cible RPE : **incompatible** avec NO_WEARABLE ⇒ bloque l’implémentation |
| Effet sur R1–R12 | Tous (cibles) |
| Trop permissif | Easy qui dérive vers HEAVY |
| Trop conservateur | Qualité sous-dosée |
| Gouvernance | EXPERT_DESIGN_REVIEW |
| Signataire | Expert course |

### E-PACE — incertitude des cibles d’allure (V03 + V04)

| Champ | Contenu |
|---|---|
| Question exacte | Accepter HIGH ±3 %, MEDIUM ±6 % (V03) et une marge du seuil de 0–5 % sous la frontière 2 (V04) ? |
| Preuve | Hopkins 2001 (EXT-A) : CV entre courses 1,2–4,2 % selon la distance et le niveau |
| Soutenu | L’ordre de grandeur de la variabilité de performance |
| Non soutenu | Les valeurs exactes des plages et de la marge |
| **A** | Valeurs candidates acceptées |
| **B** | Plages dérivées de RunningPerformanceVariabilityEstimate (E-VARIABILITY) au lieu de valeurs fixes |
| KEEP BLOCKED | Pas de cible d’allure : RPE seul partout (dégradation sûre) |
| Effet sur R1–R12 | R3, R4, R5, R7, R9, R11 : largeur de cible ; aucune éligibilité |
| Trop permissif | Cibles sans contenu |
| Trop conservateur | Fausse précision, échecs |
| Gouvernance | EXPERT_DESIGN_REVIEW |
| Signataire | Expert course |

### E-RECOVERY — récupérations en fractionné (V08)

| Champ | Contenu |
|---|---|
| Question exacte | Accepter les plages de récupération / travail par type de séance (seuil 0,20–0,35 ; sévère 0,5–1,0 ; court 0,5–1,0) pour les **premières expositions et le taper** (le reste suit l’historique) ? |
| Preuve | Méta-régression (PARTIAL) ; courtes contre longues (SS, étude unique) |
| Soutenu | La récupération module le temps passé près du VO2max |
| Non soutenu | Un ratio universel |
| **A** | Plages acceptées |
| **B** | Récupérations fixées en durée par type de séance (DECISION_REQUIRED) |
| KEEP BLOCKED | Récupérations seulement depuis l’historique ; premières expositions impossibles (déjà bloquées par E-FIRST) |
| Effet sur R1–R12 | R11 (taper) ; futures premières expositions |
| Gouvernance | EXPERT_DESIGN_REVIEW |
| Signataire | Expert course |

### E-DENSITY — séances exigeantes (V10, V11)

| Champ | Contenu |
|---|---|
| Question exacte | Accepter un maximum HD par 7 jours (P-R1 1, P-R2 2, P-R3 2, P-R4 3) **et** la séparation forte par défaut, avec exception seulement sur demande du planificateur (P-R3+) ? |
| Preuve | García-Pinillos 2017 (SS, contexte) |
| **A** | Accepté tel quel |
| **B** | Maximum seulement (sans séparation) |
| **C** | Séparation seulement (sans maximum) |
| KEEP BLOCKED | La composition hebdomadaire ne peut pas être produite ⇒ **bloque l’implémentation** |
| Effet sur R1–R12 | R2, R3, R5, R7, R10 |
| Trop permissif | Fatigue accumulée |
| Trop conservateur | Stimulus insuffisant au niveau avancé |
| Gouvernance | PRODUCT_GUARDRAIL + EXPERT_DESIGN_REVIEW |
| Signataire | Expert course + produit |

### E-RECENCY — récence des références (V12)

| Champ | Contenu |
|---|---|
| Question exacte | Accepter RECENT ≤ 8 semaines, AGING 9–16, STALE > 16 (sous condition de continuité) ? |
| Preuve | Mujika 2000 (SS, qualitatif) |
| **A** | Accepté |
| **B** | Bornes différentes (DECISION_REQUIRED) |
| KEEP BLOCKED | Les références ne peuvent pas vieillir ⇒ **bloque l’implémentation** (sauf à tout traiter comme STALE, ce qui dégrade tout) |
| Effet sur R1–R12 | R4, R9 ; C7 |
| Gouvernance | PROGRAMMING_HEURISTIC |
| Signataire | Expert course |

### E-LOAD — garde-fou de saut de programme (V22)

| Champ | Contenu |
|---|---|
| Question exacte | Pour P-R0 et P-R1, accepter qu’une semaine prévue au-dessus de 130 % de celle d’il y a 2 semaines soit plafonnée (garde-fou produit contre un saut de programme ou une erreur de donnée, **pas un seuil de sécurité**) ? |
| Preuve | Nielsen 2014 (SS, association) |
| **A** | Accepté |
| **B** | Autre valeur (DECISION_REQUIRED) |
| KEEP BLOCKED | P-R1 limité au HOLD ou à la restauration sans garde-fou de saut ⇒ P-R1 hors périmètre minimal |
| Effet sur R1–R12 | R2 (aucun changement aujourd’hui) |
| Gouvernance | PRODUCT_GUARDRAIL |
| Signataire | Produit + expert |

### E-TAPER — ampleur et durée du taper (V27, V28)

| Champ | Contenu |
|---|---|
| Question exacte | (1) Comment choisir la valeur **dans** l’intervalle de réduction 41–60 % selon l’épreuve et le niveau (R11 : 96,0–141,6 min) ? (2) Quelle durée pour le marathon (2–3 semaines candidates) et pour les autres épreuves (vides) ? |
| Preuve | Wang 2023 (EXT-A), Bosquet 2007 (SS) : principe et plage ; Smyth 2021 (EXT-F, **observationnel**) : marathon, taper strict jusqu’à 3 semaines associé à de meilleures performances |
| Soutenu | Le principe ; la plage ; pour le marathon, une durée plus longue et stricte associée à la performance |
| Non soutenu | Une valeur unique ; une durée pour 5K, 10K et semi ; une causalité (observationnel) |
| **A** | Réduction : milieu de plage par défaut, ajusté par l’expert ; marathon 2–3 semaines ; autres épreuves : dernière semaine seulement |
| **B** | Réduction : borne prudente propre à chaque épreuve (DECISION_REQUIRED pour chacune) ; durées par épreuve (DECISION_REQUIRED) |
| KEEP BLOCKED | Taper limité à « dernière semaine, volume dans l’intervalle, sélection par l’utilisateur ou le planificateur » ; marathon hors périmètre minimal |
| Effet sur R1–R12 | R11 (sélection) ; R6 (futur taper) |
| Gouvernance | CONTEXT_DEPENDENT / EXPERT_DESIGN_REVIEW |
| Signataire | Expert course |

### E-FIRST — premières expositions (V35–V37)

| Champ | Contenu |
|---|---|
| Question exacte | V1 prescrit-il une **première** séance de seuil, sévère ou de côtes à un athlète qui n’en a pas l’historique, et avec quelle dose ? |
| Preuve | Aucune |
| **A** | Oui, avec une dose d’initiation par type de séance et par niveau (DECISION_REQUIRED × 3) |
| **B** | Uniquement après un test ou une calibration (TEST_SESSION), sans dose d’initiation |
| KEEP BLOCKED | Pas de première exposition en V1 (dégradation : EASY, STRIDES, TEST seulement) |
| Effet sur R1–R12 | R9 (VO2), R12 (seuil) |
| Gouvernance | EXPERT_DESIGN_REVIEW |
| Signataire | Expert course |

### E-MODEL — extrapolation entre distances (V38)

| Champ | Contenu |
|---|---|
| Question exacte | Riegel est-il adopté pour une cible ≤ semi, avec (a) quel exposant (provenance vérifiée), (b) quelle largeur de plage de prédiction ? |
| Preuve | Vickers 2016 (SS) : calibré jusqu’au semi, biaisé au marathon |
| Soutenu | Usage ≤ semi ; exclusion du marathon |
| Non soutenu | Un exposant vérifié en 5E ; une largeur de prédiction |
| **A** | Riegel ≤ semi, exposant publié **après vérification** de sa provenance, largeur de prédiction DECISION_REQUIRED (distincte de V03 et de V43) |
| **B** | Aucune extrapolation : calibration demandée (contre-la-montre ou course à la distance visée) |
| KEEP BLOCKED | Même effet que B |
| Effet sur R1–R12 | R4 (allure semi) ; R6 inchangé (marathon exclu) |
| Gouvernance | EXPERT_DESIGN_REVIEW |
| Signataire | Expert course (+ vérification documentaire) |

### E-VARIABILITY — variabilité, conflits, mises à jour (V42, V43, V15)

| Champ | Contenu |
|---|---|
| Question exacte | (1) RunningPerformanceVariabilityEstimate : nombre minimal de performances personnelles comparables (DECISION_REQUIRED) ; a priori par distance et par niveau (Hopkins) ; usage de l’âge (oui / non) ; repli produit (valeurs 2 / 3 / 4 % ou aucun). (2) Multiples de gravité (1× / 2×). (3) V15 : 3 observations / 2 semaines. |
| Preuve | Hopkins 2001 (EXT-A) |
| Soutenu | La variabilité dépend de la distance et du niveau ; les coureurs plus lents sont plus variables ; les jeunes adultes plus variables que les plus âgés |
| Non soutenu | Un effet de sexe ; des valeurs pour le loisir moderne ; les multiples 1× / 2× ; le 3 / 2 |
| **A** | Estimation personnelle + a priori Hopkins + repli produit 2 / 3 / 4 % (signalé) ; multiples 1× / 2× ; V15 = 3 / 2 |
| **B** | Estimation personnelle + a priori, **sans** repli : sans estimation, confiance réduite et conflit traité comme MAJOR (prudent) |
| KEEP BLOCKED | Mises à jour seulement sur performance ou test ; conflits toujours MAJOR (dégradation prudente) |
| Effet sur R1–R12 | R9 (MAJOR dans tous les cas) ; mises à jour sur observations |
| Gouvernance | PROGRAMMING_HEURISTIC / EXPERT_DESIGN_REVIEW |
| Signataire | Expert course |

### E-RECENTLOAD — agrégation du contexte de charge (V21)

| Champ | Contenu |
|---|---|
| Question exacte | Accepter RecentLoadContext (4 semaines, médiane, `bestToleratedExposure`, réponse négative définie par les données du produit) ? |
| Preuve | Aucune validation ; mise en garde contre les ratios (Impellizzeri 2020, SS) |
| **A** | Accepté tel quel |
| **B** | Fenêtre différente (DECISION_REQUIRED : 3 ou 6 semaines) |
| KEEP BLOCKED | Pas de LCA ⇒ **bloque l’implémentation** |
| Effet sur R1–R12 | R2, R4 (restauration), tous (LCA) |
| Gouvernance | PROGRAMMING_HEURISTIC |
| Signataire | Expert course |

**Aucune approbation automatique.** Toutes les décisions sont `PENDING`.
