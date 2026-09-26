# 10 — Reason codes, versioning, observabilité, IA générative

## 1. Système de reason codes (explicabilité)

Chaque décision importante produit un **reason code structuré**, pas du texte libre. Le texte destiné à l'utilisateur est généré ensuite à partir de templates localisés.

```ts
interface ReasonCode {
  code: string;                         // 'PLAN.SESSION.SELECTED.THRESHOLD_EXPOSURE_REQUIRED'
  params: Record<string, string | number>;
  ruleRefs?: string[];                  // 'RUN.L1.RECOVERY@1.2.0'
  severity?: 'info' | 'notice' | 'warning';
  audience: 'internal' | 'user';        // certains codes ne sont jamais montrés à l'utilisateur
}

interface DecisionTrace {
  traceId: ID; engineVersion: string; rulesetVersion: string; catalogVersion: string; seed: string;
  entries: { step: PipelineStep; subject: EntityRef; decision: string; reasons: ReasonCode[]; rejected?: { candidate: string; reasons: ReasonCode[] }[] }[];
}
```

**Nomenclature** : `DOMAINE.SOUS_DOMAINE.EVENEMENT[.DETAIL]`

| Domaine | Exemples |
|---------|----------|
| `PLAN` | `PLAN.SESSION.SELECTED.THRESHOLD_EXPOSURE_REQUIRED`, `PLAN.SESSION.MOVED.ADJACENT_LOWER_BODY_LOAD`, `PLAN.QUOTA.USER_REQUEST_INFEASIBLE`, `PLAN.MACRO.COMPRESSED`, `PLAN.SOLVER.FALLBACK_USED` |
| `SELECT` | `SELECT.EXERCISE.CHOSEN`, `SELECT.FILTERED.EQUIPMENT`, `SELECT.PATTERN_FALLBACK`, `SELECT.SUBSTITUTION_LOW_FIDELITY` |
| `DOSE` | `DOSE.LOAD.FROM_E1RM`, `DOSE.LOAD.RPE_BASED_LOW_CONFIDENCE`, `DOSE.PACE.FROM_REFERENCE` |
| `DURATION` | `DURATION.ADJUSTED`, `DURATION.MAIN_VOLUME_REDUCED`, `DURATION.TARGET_BELOW_ARCHETYPE_MIN` |
| `RECOVERY` | `RECOVERY.MIN_GAP_VIOLATION`, `RECOVERY.READINESS_CAUTION` |
| `DUPLICATE` | `DUPLICATE.ACCIDENTAL`, `DUPLICATE.PLANNED_BUT_STAGNANT`, `DUPLICATE.RELAXED_EQUIPMENT_LIMITED` |
| `PROGRESSION` | `PROGRESSION.ADVANCED`, `PROGRESSION.HELD`, `PROGRESSION.REGRESSED`, `PROGRESSION.CAP_REACHED` |
| `ADAPT` | `ADAPT.MISSED.SKIPPED`, `ADAPT.MISSED.MOVED`, `ADAPT.TIME_REDUCED` |
| `SAFETY` | `SAFETY.PAIN.ZONE_RESTRICTED`, `SAFETY.MAX_EFFORT_NOT_ELIGIBLE` |
| `DATA` | `DATA.ASSUMED_AS_PRESCRIBED`, `DATA.READINESS_UNKNOWN`, `STATE.REFERENCE_CONFLICT` |
| `GOAL` | `GOAL.TARGET_AMBITIOUS`, `GOAL.DEADLINE_TOO_CLOSE` |

**Exemples (formes internes, puis texte utilisateur)** :

```
PLAN.SESSION.SELECTED.THRESHOLD_EXPOSURE_REQUIRED { weekThresholdExposures: 0, hoursBeforeLongRun: 52 }
  → « Séance au seuil : c'est la séance clé de la semaine pour ton 10 km, placée 2 jours avant ta sortie longue. »

SELECT.EXERCISE.CHOSEN { exercise: 'ex.db_bench_press', slot: 'push_horizontal', equipment: 'ok', lastExposureDays: 8 }
  → (interne ; montré seulement dans « Pourquoi cet exercice ? »)

PLAN.SESSION.MOVED.ADJACENT_LOWER_BODY_LOAD { from: 'wed', to: 'fri', conflictWith: 'run_vo2_intervals@tue' }
  → « Ta séance jambes passe à vendredi pour ne pas suivre tes intervalles de mardi. »
```

Tests : chaque code utilisé a un template dans chaque langue supportée (test de CI) ; aucun code n'est émis sans être enregistré dans le registre ; les codes sont **versionnés** (jamais réutilisés avec un autre sens).

## 2. Versioning

| Version | Contenu | Règle de montée de version |
|---------|---------|----------------------------|
| `engineVersion` (SemVer) | Code du moteur | MAJOR : change les sorties pour une même entrée de façon non rétrocompatible, ou modifie un contrat ; MINOR : nouvelle capacité ; PATCH : correction sans changement de sortie hors bug |
| `rulesetVersion` (SemVer) | Paramètres + statuts des règles | MAJOR : changement de logique de règle ; MINOR : paramètre modifié (dans la plage approuvée ou non) ; PATCH : métadonnées seules |
| `catalogVersion` (SemVer) | Exercices et taxonomie | MAJOR : retrait ou changement de sens ; MINOR : ajout ; PATCH : libellés |
| `schemaVersion` | Format sérialisé des plans | Migrations explicites et testées |

**Chaque programme, semaine et séance** stocke les trois versions + la graine + le `traceId`.

**Pourquoi et comment on explique un ancien programme** :
- les rulesets et catalogues de chaque version sont **archivés** (immuables) ;
- la **trace** stockée explique les décisions sans avoir besoin de réexécuter l'ancien code ;
- la réexécution exacte d'une ancienne version (débogage) est possible en installant la version du package concernée. Coût accepté pour le support, pas utilisé en production.

**Politique de montée de version pour les plans en cours** : pas de régénération rétroactive des séances passées ; séances futures non commencées régénérées **aux frontières de semaine** seulement si la nouvelle version l'exige (correctif de sécurité : immédiat ; amélioration : à la prochaine semaine ou au prochain mésocycle) ; `minSupportedEngineVersion` côté serveur (phase 1 D6).

## 3. Observabilité

Métriques **agrégées et pseudonymisées**, sans donnée de santé (pas de zone douloureuse, pas de poids) dans les outils d'analytique. Les détails restent dans la base, soumis aux règles de confidentialité.

| Catégorie | Métrique | Signal recherché |
|-----------|----------|------------------|
| Génération | % séances `INVALID` avant réparation (par archétype, par règle) | Générateur à corriger |
| Génération | Nombre moyen de tentatives de réparation ; % `REPAIR_EXHAUSTED` | Règles ou catalogue trop contraignants |
| Génération | % `NO_VALID_SOLUTION` par code de raison | Profils non couverts, catalogue |
| Génération | % replis du solveur, temps de génération p50 / p95 | Performance |
| Durée | Écart durée réelle / p50 par archétype ; % de séances réelles > temps disponible | Calibration |
| Exécution | Taux de séances terminées, partielles, abandonnées (par archétype et par position dans le cycle) | Séances mal conçues |
| Exécution | Fréquence des substitutions manuelles par exercice | Catalogue, matériel, préférences |
| Exécution | Blocs le plus souvent sautés | Séances trop longues, accessoires inutiles |
| Variété | Répétitions accidentelles détectées ; `PLANNED_BUT_STAGNANT` | Anti-doublon, progression |
| Adaptation | Nombre de révisions par utilisateur et par semaine ; taux d'acceptation des propositions | Stabilité, pertinence |
| Progression | % d'exercices ancres qui progressent sur un mésocycle ; plafonds atteints | Stagnation ou progression irréaliste |
| Sécurité | Signalements de douleur par archétype et par exercice (agrégés, sans identification) | Exercices ou dosages à revoir (revue G1) |
| Moteur | Erreurs par code, par version | Régressions |

Tableau de bord par **version du moteur et du ruleset**, pour comparer avant et après une release (déploiement progressif par feature flag, phase 1).

## 4. IA générative (LLM)

Principe : **le moteur déterministe reste l'autorité finale.** Aucune sortie de LLM n'atteint l'utilisateur comme programme sans passer par le moteur et le validateur.

| Usage | Valeur | Risque | Décision proposée |
|-------|--------|--------|-------------------|
| Générer des programmes ou séances | Faible (le moteur le fait mieux et de façon vérifiable) | Élevé | **Interdit** |
| Reformuler les explications à partir des reason codes | Moyenne (ton plus naturel) | Faible si la sortie est contrainte | V1 : **templates** (suffisants, gratuits, déterministes). Plus tard : LLM optionnel, avec repli sur les templates |
| Comprendre une demande en langage naturel (« je pars 10 jours sans salle ») | Élevée pour l'UX | Moyen (mauvaise interprétation) | **Post-V1** : le LLM produit un **événement structuré** (`blackoutDates`, `equipment_changed`), **confirmé par l'utilisateur**, puis traité par l'AdaptationEngine |
| Proposer des alternatives d'exercice | Faible (le catalogue a déjà les substitutions) | Moyen | Non ; éventuellement pour enrichir le catalogue **hors ligne**, avec relecture experte (G5) |
| Répondre à « pourquoi ? » dans un chat coach | Moyenne | Moyen (hallucination) | Post-V1, ancré sur la trace et les fiches de règles ; aucun pouvoir de modification directe |
| Rédaction assistée des consignes et contenus pédagogiques | Moyenne | Faible (relu) | Outil interne, contenu relu (C4) |

Garde-fous : le LLM n'a accès qu'aux **actions structurées** de l'API du moteur ; il ne peut contourner ni les contraintes HARD, ni le matériel, ni la sécurité, ni la validation. Toute sortie structurée est validée (schéma, puis moteur, puis validateur). Aucune donnée de santé n'est envoyée à un LLM sans consentement explicite et base légale (phase 1, RGPD). **Aucune dépendance obligatoire** (C10) : l'application fonctionne entièrement sans LLM.
