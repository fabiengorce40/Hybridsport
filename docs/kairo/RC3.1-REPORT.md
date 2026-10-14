# KAIRO RC3.1 — Fiabilité des séances : corrections A2, A8, A1

Branche : `claude/kairo-rc3-dev`, à partir de `d9b7437` (audit RC3).

Chaque correction fait l'objet d'un commit indépendant :

| correction | commit |
|---|---|
| A2 | `a3d9007` |
| A8 | `9956a89` |
| A1 | `c40283b` |

Aucune règle sportive n'a été modifiée. Le planificateur global, les moteurs, RC1 TEST et la production ne sont pas
touchés. Rien n'a été fusionné ni déployé.

## 0. Vérification préalable

- **Point de départ.** HEAD `d9b7437`, identique à `origin/claude/kairo-rc3-dev`. Aucune modification depuis l'audit :
  A2, A8 et A1 n'avaient pas été traités.
- **Tests de départ.** `pnpm check` n'a pas été relancé seul sur `d9b7437`. Le banc de comparaison, lui, y a été
  exécuté avec succès (section 1). La suite complète est verte après chaque correction.
- **RC1 TEST.** `claude/kairo-rc1-test-env` (`efc5f2f`) n'est pas modifiée.
- **Production.** `claude/crosstraining-c1-c2-spike-vbg8dv` (`f9f7e2e`) n'est pas modifiée.
- **Déploiement.** Sur cette branche, le seul workflow (`kairo-pages.yml`) ne se déclenche que depuis la branche de
  production. Pousser `claude/kairo-rc3-dev` ne déploie rien.

## 1. Comparaison avant / après (résultats réels)

Le même banc a été exécuté à l'identique sur `d9b7437` (avant) et sur RC3.1 (après), dans un arbre de travail
temporaire. Seules les lignes ciblées changent ; tout le reste est identique.

### A2 — Test chronométré demandé sans distance

Cas testé : dernière course déclarée sans distance, case « programmer un test chronométré » cochée.

| profil | avant | après |
|---|---|---|
| P_R1 · générale · 2 | facile ✓ · **TEST non planifié (séance perdue)** | facile ✓ · facile ✓ |
| P_R2 · 5 km · 2 | facile ✓ · **TEST non planifié** | facile ✓ · facile ✓ |
| P_R2 · 10 km · 2 | facile ✓ · **TEST non planifié** | facile ✓ · facile ✓ |
| P_R3 · semi · 3 | 2 faciles ✓ · **TEST non planifié** | 3 faciles ✓ |

**Cause.** Le moteur Running refuse le TEST (`OBSERVED_PACE_UNAVAILABLE`) : sans distance, aucune allure n'est
observable. L'évaluation demandée imposait pourtant l'intention TEST au créneau, donc la séance disparaissait.

**Correction (app-core).**
- Quand une planification fait passer une évaluation Running demandée à « non planifiée » à cause de ce refus, la
  semaine est replanifiée une fois. L'évaluation n'est plus imposée, et le moteur compose sa séance habituelle :
  prescriptions identiques, octet pour octet, à la semaine sans demande de test.
- Le repli est tracé dans l'audit (`KAIRO.RUNNING_TEST_FALLBACK`, avec la cause du moteur).
- Il est expliqué à l'accueil et dans le planning : « Test chronométré non programmé cette semaine : aucune course
  récente avec sa distance… course facile, sans allure imposée. Notez la distance… puis redemandez le test depuis le
  profil Course. »
- L'onboarding prévient dès que la case est cochée sans distance.
- Aucune allure n'est inventée.

**Non-régression.**
- Avec distance, le TEST est programmé comme avant.
- La demande faite plus tard depuis le profil se replie de la même façon.
- Chemin de sortie vérifié : une course réalisée avec distance permet de programmer le TEST la semaine suivante.

### A8 — Motif d'une séance non planifiée

Format de chaque ligne : catégorie affichée | cause retenue.

| configuration | avant | après |
|---|---|---|
| Course, aucune course enregistrée | **« règles indisponibles »** \| `RULE.RUNNING.CANDIDATE_VALUE_USED` (simple avertissement) | **« information manquante »** \| `DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE` → « Enregistrez une course réalisée… » |
| Masse 4×, journées courtes | `DATA.SCIENCE_REGISTRY` (info) ; `PLAN.WEEK_PRESCRIPTION` (info) | `DURATION.TARGET_BELOW_ARCHETYPE_MIN` ; `PLAN.PLANNER.NOT_ENOUGH_DAYS` |
| HYROX sans matériel | `DATA.HYROX.CANDIDATE_VALUE_USED` (avertissement) | `PLAN.HYROX.H2_NO_STRUCTURE` → « …avec le matériel déclaré » |
| HYROX, journées de 20 min | `DATA.HYROX.CANDIDATE_VALUE_USED` | `PLAN.HYROX.H2_NO_STRUCTURE` → « …dans le temps disponible ce jour-là » |

**Cause.** Deux défauts se cumulaient :
- le motif affiché était le premier code hors `PLAN.PLANNER.*`, souvent un avertissement de valeur candidate ;
- le planificateur (`classifyRefusal`) classe « gouvernance » tout refus portant un code `RULE.*`, avertissement
  compris.

**Correction (app-core et affichage ; planificateur inchangé).**
- La cause décisive est persistée à la planification, seul moment où la sévérité des codes est connue pour les quatre
  sports. C'est la première raison de sévérité « error » d'un moteur, à défaut celle du planificateur. Le champ est
  additif : +6 Ko sur 52 semaines (+0,2 %).
- La catégorie affichée est déduite de cette cause. La catégorie du planificateur reste tracée telle quelle.
- Pour les semaines antérieures, l'application se rabat sur la sévérité des registres accessibles, et n'affiche jamais
  une valeur candidate comme cause.

Les 8 configurations testées sont couvertes ; l'invariant « jamais un avertissement ou une information comme cause »
est vérifié.

### A1 — Fatigue / récupération en Musculation

Scénario : 4 semaines, profil de consolidation, fatigue élevée déclarée à chaque séance.

| séance | avant | après |
|---|---|---|
| S1 lun · mar · ven | **inchangée — « effort non ajusté »** (×3) | adaptée : RIR seulement (7, 4 et 2 exercices) |
| S2 lun | **inchangée — « effort non ajusté »** | adaptée : RIR sur 2 exercices ; 2 exercices refusés explicitement (charge calculée à partir de l'effort) |
| 8 autres séances | adaptées (régénération reproductible) | identiques |

Sur le banc existant multi-configurations, configuration E (récupération dégradée à chaque séance) :
- séances adaptées : 7 → 10 ;
- séances « non appliquées » : 5 → 2.

Les 2 restantes sont refusées avec leur raison exacte : leurs charges sont calculées à partir de l'effort.

**Diagnostic des séances non reproductibles.** La séance du lundi dépend du bloc de force de la séance Cross-training
de la même semaine. Ce bloc est recomposé **après** elle dans la passe de planification, si bien que la séance
persistée a vu une version du bloc qui n'est pas conservée. Six variantes de régénération ont été testées : contexte
voisin, séances de la semaine, autres sports. Aucune ne redonne la séance planifiée. Ce n'est donc pas réparable par
une meilleure régénération.

**Correction (app-core, jamais de régénération).** La règle d'état du moteur Strength
(`strength.dose.modifiers.readiness`, politique de conflit du ruleset) est appliquée au seul RIR des séries de travail
de la séance persistée, selon la formule de dosage du moteur :
- les modificateurs déjà appliqués ne sont pas persistés ; leur delta est retrouvé à partir du RIR de base lu dans le
  ruleset (profil de dose × rôle du créneau × classe d'exercice) ;
- les séries de calibration suivent la formule `strength.calibration`.

**Preuve d'équivalence.** Sur les séances strictement reproductibles, chaque exercice ajusté est identique à la
prescription du moteur régénérée avec le même état : effort et charge.

**Refus explicites (invariants), exercice par exercice :**
- Charge calculée à partir de l'effort (observation spécifique, % d'e1RM, historique, fourchette indicative). Le
  moteur changerait aussi la charge, ce qui n'est jamais fait ici.
- Trace ou calibration incohérente, ou profil de dose illisible.
- La part « séries » de la règle (« réduire » : −1 série) n'est jamais appliquée à une séance déjà prévue. C'est tracé
  et affiché.

**Douleur.** La réparation de douleur du CORE passe d'abord, l'effort ensuite. Les tests de la correction ont
révélé un défaut de mon intégration : une zone exclue pouvait rester dans la séance quand la réparation était
impossible. Il a été corrigé avant le commit : une zone exclue n'est jamais laissée ; la séance est recomposée
(signalé) ou reportée.

**Tests existants modifiés : 2 (RP-2, DP-3).** Ils verrouillaient l'ancien comportement « effort non ajusté ». Ils
vérifient désormais :
- mêmes exercices ;
- changements d'effort seulement ;
- aucune recomposition.

## 2. Validation finale

| contrôle | résultat |
|---|---|
| `pnpm check` (lint, typecheck, tests) | ✅ 2 689 réussis, 1 ignoré (2 690) |
| Tests ciblés RC3.1 | ✅ A2 : 11 (app-core) + 1 DOM ; A8 : 4 + 1 (affichage) ; A1 : 7 + 1 (affichage) |
| Build production (`pnpm kairo:build`) | ✅ |
| E2E complet (`scripts/e2e.mjs`, build production locale) | ✅ 221 contrôles, « E2E OK » |
| Simulation 4 semaines (consolidation, multi-configurations, banc avant / après ci-dessus) | ✅ seuls les écarts ciblés changent |
| Taille d'état | +6 Ko sur 52 semaines (+0,2 %), rapport `state-size.md` mis à jour |

Les tests verts ne prouvent pas la qualité sportive. Ces corrections garantissent seulement :
- qu'aucune séance n'est perdue ;
- qu'aucun motif n'est trompeur ;
- que l'état du jour n'est plus ignoré en silence.

## 3. Limites connues, non traitées (hors périmètre)

1. **Charges calculées à partir de l'effort (A1).** Pour ces exercices (en pratique, de la semaine 2 à la semaine 4),
   l'état du jour reste non appliqué, avec un refus explicite. L'appliquer fidèlement exigerait de recalculer la charge
   selon le moteur, ce qui est **interdit dans RC3.1** (« ne pas modifier les charges »). C'est une décision à prendre.
2. **Reproductibilité « large ».** Le contrôle avant séance juge une séance reproductible sur ses exercices, ses
   séries et son premier effort, sans comparer les charges. Ce comportement existait déjà ; il est documenté par le
   banc A1, qui distingue les séances « reproductibles » des « strictement reproductibles ».
3. **Planificateur.** `classifyRefusal` compte un avertissement `RULE.*` comme une cause de gouvernance. L'affichage
   est corrigé côté app-core ; le classement interne reste inchangé, car le planificateur n'est pas touché.
4. **Hors Musculation.** La fatigue déclarée reste sans effet en Course, CT et HYROX (décision D8).

## 4. Proposition RC3.2 (non commencée)

**A3 — intention Cross-training selon la faisabilité réelle du moteur.** C'est le point suivant de la feuille de
route RC3 et un blocage fonctionnel : « force + conditionnement » avec haltères seulement ne donne aucune séance.

- **Contenu.** Matrice matériel × intention, interrogée auprès du moteur. Pas d'intention proposée sans avertissement
  si elle aboutit à `C3_NO_FORMAT`. Message clair à l'onboarding.
- **À inclure dans la même étape, car c'est le même écran.** Le bouton « Continuer » grisé n'indique pas ce qui
  manque, comme sur l'écran Objectifs avec HYROX non complété.
- **Critères d'acceptation.** Aucune intention proposée sans séance réalisable. Parcours DOM. Aucune règle sportive
  modifiée.

À décider de votre côté, indépendamment de RC3.2 :
- la limite 1 (charges et effort) ;
- D8 (fatigue hors Musculation) ;
- l'éventuel report de RC3.1 sur RC1 TEST pour essai terrain. Cela demande une fusion vers
  `claude/kairo-rc1-test-env`, qui redéploie uniquement l'environnement de test.
