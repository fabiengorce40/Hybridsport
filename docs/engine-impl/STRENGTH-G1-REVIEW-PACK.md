# STRENGTH-G1-REVIEW-PACK — dossier de validation sécurité (G1)

> Phase 4F. Ce dossier prépare la signature des **quatre paramètres G1** du StrengthEngine.
> - Sans signature formelle, `productionReadiness` les bloque (test F15) et `STRENGTH_SCIENTIFIC_LOCK_V1` ne peut pas dépasser `LOCKED_PROVISIONAL`.
> - Les valeurs ci-dessous sont celles du ruleset `0.4.0-strength-science-lock`, identiques en 0.2.0 et en 4E : aucune n’a été modifiée.

## Mode d’emploi pour l’expert

- Chaque question est **précise et falsifiable**. Aucune ne demande « le moteur est-il sûr ? ».
- Décision attendue par paramètre :
  - **APPROVE** : valeur acceptée telle quelle, pour la population et le contexte décrits ;
  - **ADJUST** : nouvelle valeur ou nouvelle portée, à indiquer avec sa justification ;
  - **REJECT** : le mécanisme lui-même est inadapté, et une alternative doit être proposée.
- **Enregistrement** : une décision APPROVE ou ADJUST est saisie dans le registre, via `signoffs` (rôle, nom, date, verdict, portée `safety`) et `approvals` du paramètre dans le ruleset.
  - Seule cette saisie lève le blocage `G1_SIGNOFF_MISSING`.
  - `promoteParameter` refuse toute promotion sans visa de sécurité.
- **Cliquet G1** (spec 09 §6) : une valeur ajustée dans le sens **moins prudent** exige une nouvelle référence approuvée.
- **Contexte commun** :
  - adultes en bonne santé, éligibles (déclarations du CORE acceptées), sans douleur active ;
  - séances de musculation proposées par le moteur puis validées par le CORE (couche A1 SAFETY) ;
  - le catalogue de test sert d’exemple ; le catalogue réel reste à relire (voir le rapport 4C).

---

## 1. `strength.selection.skillCeiling`

| Élément | Contenu |
|---|---|
| Rôle exact | Filtre éliminatoire **F7** : un exercice dont `skillLevel` (échelle du catalogue) **dépasse** le plafond du niveau de l’athlète n’est jamais candidat. |
| Valeur actuelle | `{ novice: 2, beginner: 3, intermediate: 4, advanced: 5 }` (G1, provisoire, source `internal_hypothesis`) |
| Endroits affectés | `packages/strength/src/candidates.ts:35` (F7, sélection et alternatives) ; indirectement, repli de besoin et substitution (mêmes filtres). |
| Quand il intervient | À chaque emplacement, avant tout classement. Exemple : pour un novice, le catalogue de test exclut `ex.pull_up` (compétence 3). Le catalogue compte 34 exercices de compétence 1, 13 de compétence 2 et 1 de compétence 3. |
| S1–S7 | Aucun rejet F7 dans les goldens (profils débutant, intermédiaire, avancé ; les exercices choisis restent sous les plafonds). |
| Raison du classement G1 | Sécurité technique : exposer un pratiquant à un exercice dont il ne maîtrise pas le schéma moteur. |
| Preuve disponible | Aucune source du registre ne porte sur un plafond de complexité par niveau. |
| Preuve manquante | Définition validée de l’échelle `skillLevel`. Correspondance entre niveau d’expérience et complexité maîtrisable. |
| Population concernée | Tous niveaux ; enjeu maximal pour le novice et le débutant. |
| Si trop permissif | Exercices complexes (arraché, épaulé, tractions lestées…) proposés trop tôt ; exécution dégradée ; blessure possible. |
| Si trop conservateur | Catalogue appauvri ; exercices utiles et sûrs exclus (ex. traction assistée pour un novice) ; progression technique freinée. |

**Questions à l’expert**

1. Pour un pratiquant **novice** en bonne santé, exclure tout exercice de compétence ≥ 3 est-il un garde-fou raisonnable ?
   - Cas typiques : traction stricte, squat barre arrière, épaulé.
2. Le plafond **débutant = 3** autorise-t-il un exercice que vous refuseriez à un débutant sans supervision ? Lequel ?
3. Un plafond par **niveau** suffit-il, ou faut-il un plafond par **exercice** (prérequis explicites : « squat gobelet maîtrisé avant squat barre ») ?
4. Faut-il distinguer compétence **technique** et risque **en cas d’échec**, par exemple développé couché sans pareur ?

| Décision | Justification | Nom / qualification | Date | Version approuvée | Signature |
|---|---|---|---|---|---|
| ☐ APPROVE ☐ ADJUST ☐ REJECT | | | | | |

---

## 2. `strength.novice.technicalUnderFatigue`

| Élément | Contenu |
|---|---|
| Rôle exact | Pour les niveaux listés, limite les exercices **techniques** (`cost.technical ≥ minTechnical`) : au plus `maxPerSession` par séance, et seulement dans les rôles admis (principal). |
| Valeur actuelle | `{ levels: [novice, beginner], minTechnical: 2, maxPerSession: 1, allowedRoles: [primary] }` |
| Endroits affectés | Filtre **F7b** (`src/candidates.ts:36`), avec compteur dans `src/engine.ts:231`. Contrôle SAFETY du CORE `strength.v5` (`src/checks.ts:107`), qui refuse une séance non conforme. |
| Quand il intervient | Dès qu’un deuxième exercice technique est envisagé, ou qu’un exercice technique est placé hors du principal, chez un novice ou un débutant. Exercices techniques du catalogue de test : squat barre arrière, soulevé de terre roumain, kettlebell swing, traction, développé militaire barre. |
| S1–S7 | S1 (débutant, haltères) : aucun exercice technique choisi, donc la règle ne se déclenche pas. Les autres goldens ne concernent ni novice ni débutant. |
| Raison du classement G1 | Sécurité : la qualité technique se dégrade avec la fatigue, surtout chez les pratiquants peu expérimentés. |
| Preuve disponible | Aucune source du registre ne quantifie ce risque. |
| Preuve manquante | Relation fatigue / dégradation technique selon l’expérience. Définition validée de `cost.technical`. |
| Population concernée | Novice et débutant. |
| Si trop permissif | Deux mouvements techniques lourds dans la même séance, le second sous fatigue (ex. RDL après squat). |
| Si trop conservateur | Pas d’apprentissage d’un second schéma technique ; séances monotones ; progression technique retardée. |

**Questions à l’expert**

1. Pour un **débutant** (quelques mois de pratique), limiter à **un** exercice technique par séance, placé en principal, est-il un garde-fou raisonnable ? Ou ne faut-il l’appliquer qu’au novice ?
2. Le seuil `minTechnical = 2` classe le RDL et le développé militaire comme techniques : est-ce pertinent pour un débutant qui les pratique déjà en charge légère ?
3. Un exercice technique en **secondaire**, à charge légère (RIR ≥ 3), reste-t-il inacceptable sous fatigue, ou acceptable sous condition ?
4. Faut-il prévoir une sortie de la règle par exercice (technique validée par un coach), plutôt que par niveau ?

| Décision | Justification | Nom / qualification | Date | Version approuvée | Signature |
|---|---|---|---|---|---|
| ☐ APPROVE ☐ ADJUST ☐ REJECT | | | | | |

---

## 3. `strength.volume.sessionCap`

| Élément | Contenu |
|---|---|
| Rôle exact | Plafond de séries difficiles **par groupe musculaire et par séance**, compté en E1 (primaire = 1 ; secondaire = 0,5). |
| Valeur actuelle | `{ novice: 10, beginner: 12, intermediate: 14, advanced: 16 }` (également classé `PRODUCT_GUARDRAIL`) |
| Endroits affectés | Moteur : réduction des séries des rôles les moins prioritaires, trace `DOSE.SESSION_CAP_APPLIED` (`src/engine.ts:319`). CORE : contrôle SAFETY `strength.v2` (`src/checks.ts:34`), qui refuse toute séance au-delà. |
| Quand il intervient | Séance très concentrée sur un groupe (ex. séance bas du corps avec beaucoup de fessiers). |
| S1–S7 | Jamais atteint. Maximum E1 par séance / plafond : S1 fessiers 5 / 12 · S2 épaules 10 / 14 · S3 dos 5 / 14 · S4 fessiers 4 / 14 · S5 fessiers 8 / 16 · S6 3 / 14 · S7 bras 10,5 / 14. |
| Raison du classement G1 | Garde-fou de charge aiguë par séance (dommages musculaires, récupération), indépendant de la cible hebdomadaire (SOFT). |
| Preuve disponible | Dose–réponse hebdomadaire à rendements décroissants (Pelland 2026, niveau `SEARCH_SUMMARY`). Rien sur un plafond **par séance**. |
| Preuve manquante | Volume par séance et par groupe au-delà duquel le bénéfice cesse ou le risque augmente, selon le niveau. |
| Population concernée | Tous niveaux. |
| Si trop permissif | Séances très longues sur un groupe ; courbatures sévères ; récupération compromise pour les séances suivantes (dont l’endurance). |
| Si trop conservateur | Impossible de concentrer le volume sur une séance spécialisée pour un avancé ; volume hebdomadaire plus difficile à atteindre avec peu de séances. |

**Questions à l’expert**

1. Pour un **intermédiaire** en bonne santé, un plafond de **14 séries difficiles** (secondaires comptées à 0,5) pour un même groupe dans **une** séance est-il un garde-fou raisonnable ?
2. Le plafond doit-il dépendre du **groupe** (ex. mollets et abdominaux vs quadriceps et ischios) plutôt que d’un nombre unique ?
3. Le décompte à 0,5 des séries indirectes doit-il s’appliquer au **plafond** comme à la cible hebdomadaire ?
4. Pour un **novice**, 10 séries par groupe et par séance est-il trop élevé, trop bas, ou adapté ?

| Décision | Justification | Nom / qualification | Date | Version approuvée | Signature |
|---|---|---|---|---|---|
| ☐ APPROVE ☐ ADJUST ☐ REJECT | | | | | |

---

## 4. `strength.maxEffort.threshold`

| Élément | Contenu |
|---|---|
| Rôle exact | Intensité relative (fraction d’e1RM) **à partir de laquelle** une série est traitée comme un effort maximal. Une telle série (ou toute série lourde `top_set`) n’est admise que sur un exercice **éligible** (`maxEffortEligibility.minLevel`) pour le niveau de l’athlète. |
| Valeur actuelle | `0.9`. Cliquet G1 : sens prudent `decrease` (seuil plus bas = plus de séries contrôlées), référence approuvée provisoire 0,9. |
| Endroits affectés | Contrôle SAFETY du CORE `strength.v7` (`src/checks.ts:120`). Le moteur ne propose une série lourde que sur un exercice éligible (`maxEffortEligible`, `src/engine.ts:185`). |
| Quand il intervient | Prescription en % d’e1RM ≥ 0,9, ou série `top_set`. |
| S1–S7 | S5 (avancé) : série lourde au squat à 0,87 de l’e1RM (142,5 kg). Le seuil n’est pas atteint, mais `top_set` déclenche le contrôle d’éligibilité (squat éligible dès intermédiaire) : validé. Aucun autre golden ne prescrit ≥ 0,9. |
| Raison du classement G1 | Sécurité : effort quasi maximal sur un exercice ou un niveau non préparé. |
| Preuve disponible | Aucune source ne fixe un seuil d’« effort maximal ». Le registre classe la valeur `INSUFFICIENT_EVIDENCE` : aucune fausse précision n’est revendiquée. |
| Preuve manquante | Définition opérationnelle de l’effort maximal (en % 1RM, en RIR, ou les deux). Liste d’éligibilité par exercice et par niveau. |
| Population concernée | Surtout intermédiaire et avancé (les novices et débutants n’ont pas de série lourde). |
| Si trop permissif (seuil trop haut) | Séries à 0,88–0,9 de l’e1RM sur des exercices non éligibles, sans contrôle. |
| Si trop conservateur (seuil trop bas) | Travail lourd habituel (5 répétitions à RIR 2 ≈ 0,87) refusé sur des exercices non éligibles ; programmes de force appauvris. |

**Questions à l’expert**

1. Pour un pratiquant **intermédiaire** en bonne santé, considérer comme « effort maximal » toute série ≥ **90 %** de l’e1RM estimé est-il un seuil raisonnable ?
   - Ou le critère devrait-il combiner intensité **et** RIR (ex. ≤ 1 RIR au-delà de 85 %) ?
2. L’e1RM étant **estimé** (erreur possible de plusieurs pour cent), faut-il une marge de sécurité, c’est-à-dire un seuil plus bas quand la confiance de la référence n’est pas HIGH ?
3. Les exercices éligibles du catalogue de test (squat barre, développé couché, hack squat, développé militaire barre, dès intermédiaire) sont-ils les bons ? Lesquels ajouter ou retirer ?
4. Une série `top_set` doit-elle toujours déclencher le contrôle d’éligibilité, même sous le seuil ? C’est le comportement actuel.

| Décision | Justification | Nom / qualification | Date | Version approuvée | Signature |
|---|---|---|---|---|---|
| ☐ APPROVE ☐ ADJUST ☐ REJECT | | | | | |

---

## État de validation (2026-09-28)

| Paramètre | Statut registre | Visa de sécurité | Effet |
|---|---|---|---|
| `strength.selection.skillCeiling` | SAFETY_SIGNOFF_REQUIRED | **absent** | bloque PRODUCTION |
| `strength.novice.technicalUnderFatigue` | SAFETY_SIGNOFF_REQUIRED | **absent** | bloque PRODUCTION |
| `strength.volume.sessionCap` | SAFETY_SIGNOFF_REQUIRED (+ PRODUCT_GUARDRAIL) | **absent** | bloque PRODUCTION |
| `strength.maxEffort.threshold` | SAFETY_SIGNOFF_REQUIRED (valeur INSUFFICIENT_EVIDENCE) | **absent** | bloque PRODUCTION |
