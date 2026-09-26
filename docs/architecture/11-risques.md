# 11 — N. Risques majeurs

Classés par criticité (probabilité × impact).

| # | Risque | Impact | Mitigation |
|---|--------|--------|------------|
| R1 | **Qualité sportive insuffisante** : programmes techniquement valides mais jugés médiocres par des pratiquants | Critique (c'est la promesse du produit) | Relecture par coachs diplômés dès le premier module ; archétypes bornés ; golden set expert ; bêta fermée avec pratiquants exigeants ; métriques d'abandon par archétype |
| R2 | **Explosion de complexité** de la coordination 4 disciplines | Élevé | Construire discipline par discipline, orchestrateur conçu dès le début mais testé à 1, puis 2, puis 4 modules ; langage commun (empreintes, budgets) figé tôt |
| R3 | **Périmètre trop large pour un lancement** | Élevé (retard, qualité diluée) | Découpage en jalons ; possibilité de lancer publiquement avec 2–3 disciplines « premium » et les autres en bêta (décision à prendre) |
| R4 | **Précision des durées** (For Time, récupérations réelles, transitions en salle bondée) | Moyen-élevé (confiance) | Estimation probabiliste, tolérance mesurée, calibration personnelle, métriques en production |
| R5 | **Synchronisation hors-ligne** : conflits, pertes de logs | Élevé (perte de données = désinstallation) | Logs append-only, file d'opérations idempotentes, spike technique, tests E2E mode avion |
| R6 | **Versioning du moteur** sur des plans en cours | Moyen | `engineVersion` sur tout artefact, régénération aux frontières de semaine, `minSupportedEngineVersion`, migrations testées |
| R7 | **Responsabilité / santé** : blessure attribuée à l'app | Élevé | Questionnaire d'aptitude, avertissements, règles `safety`, pas de diagnostic, pas de promesse médicale, CGU revues par un juriste, assurance RC pro |
| R8 | **RGPD & données de santé** | Élevé (sanctions, rejet store) | Hébergement UE, consentement explicite dédié, minimisation, DPA avec sous-traitants, registre des traitements, AIPD probable, suppression/export fonctionnels |
| R9 | **Marques déposées** : « HYROX » et « CrossFit » | Moyen-élevé (retrait store, mise en demeure) | Utiliser « Cross-Training » (jamais « CrossFit ») ; usage de « HYROX » uniquement descriptif, sans logo, validé par un juriste — ou partenariat ; ne pas nommer l'app avec ces marques |
| R10 | **Production de contenu** (vidéos/illustrations de centaines d'exercices) | Élevé (coût, délai) | Catalogue initial restreint mais complet pour les archétypes v1 ; production planifiée tôt ; format homogène |
| R11 | **Revue des stores** (abonnements, suppression de compte, HealthKit) | Moyen | Checklists conformité intégrées au plan ; RevenueCat ; tests sandbox ; textes de paywall conformes |
| R12 | **Performance du moteur sur appareils modestes** | Moyen | Micro-adaptations seulement côté appareil ; budget de performance testé en CI (benchmarks) |
| R13 | **Tentation d'utiliser l'IA générative comme moteur** | Moyen (incohérence) | Décision D10 : IA hors du chemin critique ; tout passe par le validateur |
| R14 | **Dépendance fournisseurs** (Supabase, RevenueCat, PowerSync) | Faible-moyen | Postgres standard, abstraction des repositories, pas de logique métier dans les services tiers |
| R15 | **Dérive du design** au fil des fonctionnalités | Moyen | Design system tokenisé, composants obligatoires, revue visuelle, Storybook |

## Le risque n°1 en une phrase

> La technique est maîtrisable ; ce qui fera ou défera le produit, c'est la **crédibilité sportive** des programmes. Elle doit être validée par des humains experts, en continu, avant toute UI.
