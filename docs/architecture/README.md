# Hybridsport — Dossier d'architecture (Phase 1)

> Statut : **VALIDÉ comme fondation (2026-09-26)**, avec les ajustements listés ci-dessous. Aucune ligne de code applicatif n'est écrite à ce stade.
> Une fois une section validée, elle devient un **acquis** : toute modification ultérieure devra être justifiée (voir « Journal des décisions »).

## Sommaire

| # | Document | Contenu (lettres du cahier des charges) |
|---|----------|------------------------------------------|
| 01 | [Produit & architecture fonctionnelle](01-produit-fonctionnel.md) | A — contextes fonctionnels · B — écrans |
| 02 | [Modèle de données](02-modele-donnees.md) | C |
| 03 | [Architecture technique](03-architecture-technique.md) | D — stack iOS/Android, backend, production |
| 04 | [Moteur d'entraînement](04-moteur-entrainement.md) | E — pipeline · F — moteurs par discipline & coordination · G — règles & contraintes |
| 05 | [Variété & anti-doublon](05-anti-doublon.md) | H |
| 06 | [Calcul de durée](06-calcul-duree.md) | I |
| 07 | [Progression](07-progression.md) | J |
| 08 | [Adaptation & replanification](08-adaptation.md) | K |
| 09 | [Validation automatique](09-validation.md) | L |
| 10 | [Stratégie de tests](10-strategie-tests.md) | M |
| 11 | [Risques majeurs](11-risques.md) | N |
| 12 | [Ordre de construction](12-roadmap.md) | O |
| 13 | [Design system (fondations)](13-design-system.md) | Principes, tokens, composants sportifs |

---

## Synthèse en 12 décisions

| # | Décision proposée | Pourquoi (résumé) | Alternatives écartées |
|---|-------------------|-------------------|------------------------|
| D1 | **Moteur d'entraînement = bibliothèque TypeScript pure** (`packages/engine`), sans I/O, sans horloge implicite, sans dépendance UI | Testable isolément, déterministe, exécutable à l'identique sur mobile ET serveur | Moteur dans le backend uniquement (pas d'offline) ; moteur dans l'app (pas de contrôle serveur) |
| D2 | **Monorepo TypeScript** (pnpm + Turborepo) : `engine`, `domain`, `catalog`, `ui`, `mobile`, `api` | Un seul langage pour moteur, app et serveur ⇒ zéro duplication de logique métier | Flutter (Dart) : moteur non partageable avec un backend Node ; natif ×2 : double coût |
| D3 | **React Native + Expo (EAS)** pour iOS/Android | Mûr, performant (nouvelle architecture), OTA updates, build/soumission stores industrialisés | Flutter (bon, mais casse D2) ; natif Swift/Kotlin (2 équipes) ; KMP (UI encore coûteuse) |
| D4 | **PostgreSQL managé (Supabase, région UE)** : Auth + DB + RLS + Storage, + **service API TypeScript** dédié pour les opérations moteur/webhooks | Relationnel adapté au domaine, RGPD (UE), portable (c'est du Postgres standard, pas de lock-in fort) | Firebase (NoSQL inadapté aux relations programme/séance, lock-in) ; backend 100 % maison (coût d'exploitation) |
| D5 | **Offline-first** : SQLite local + synchronisation (PowerSync ou outbox maison — à trancher en phase technique) | Une salle de sport = réseau dégradé. L'exécution d'une séance ne doit JAMAIS dépendre du réseau | Online-only (inacceptable en salle) |
| D6 | **Génération autoritaire côté serveur, micro-adaptations côté appareil**, avec le **même** package moteur versionné | Contrôle des versions du moteur, correction sans release store, mais « j'ai 20 min de moins » fonctionne hors-ligne | Tout sur l'appareil (dérive de versions) ; tout serveur (pas d'offline) |
| D7 | **Règles sportives en code typé + paramètres en données versionnées** | Logique testée unitairement ; seuils ajustables sans réécrire le code | DSL/JSON de règles « générique » : fragile, peu testable, faux sentiment de flexibilité |
| D8 | **Pipeline explicite** : Données → Évaluation → Arbitrage → Macro → Semaine → Séance → Dosage → Durée → Validation → Trace | Chaque étape testable et explicable ; une erreur est localisable | Génération monolithique « de bout en bout » |
| D9 | **Modules discipline indépendants + orchestrateur** parlant un langage commun : *demande de séance* et *profil de charge multidimensionnel* (pas de budget numérique unique) | Chaque discipline garde son expertise ; la coordination est centralisée et testable | Un moteur unique « générique » (perd la spécificité course/HYROX) ; un score de charge unique comme vérité physiologique |
| D10 | **IA générative hors du chemin critique en v1** ; si utilisée plus tard, toujours derrière le validateur déterministe | Cohérence, reproductibilité, coûts, responsabilité | Génération de programmes par LLM (non déterministe, non vérifiable) |
| D11 | **Historique immuable + révisions de plan** (chaque adaptation = une révision avec diff et raison) | Traçabilité, annulation, analyse des conséquences, debug | Écraser le plan en place |
| D12 | **RevenueCat derrière un `EntitlementService`** (abonnements), **Sentry** (crash), **PostHog UE** (analytics produit / feature flags) | Standards du marché ; le moteur ne connaît ni RevenueCat ni les paliers | StoreKit/Play Billing en direct (beaucoup de cas limites), Firebase Analytics (hors UE) |

---

## Contraintes validées pour le cadrage détaillé du moteur (2026-09-26)

| # | Décision | Où c'est appliqué |
|---|----------|-------------------|
| C1 | **Pas de tracking GPS natif en V1** : prescription, exécution, saisie, historique, import santé ultérieur. Entité `RunActivity` multi-sources pour ajouter le GPS plus tard sans refonte du domaine Running | [02 §4](02-modele-donnees.md), [03 §14](03-architecture-technique.md), [04 §3.5](04-moteur-entrainement.md), [01](01-produit-fonctionnel.md) |
| C2 | **Modèle économique découplé** : gratuit / premium, mensuel / annuel, essais, restauration, entitlements. Paliers définis plus tard. Moteur non couplé à RevenueCat | [03 §9](03-architecture-technique.md), [02 §6](02-modele-donnees.md) |
| C3 | **Règles auditables** : identifiant, description, catégorie, justification, références, niveau de confiance, version, date de modification, statut de relecture. Relecture par des professionnels qualifiés avant commercialisation | [04 §4.2](04-moteur-entrainement.md) |
| C4 | **Contenu pédagogique optionnel** (vidéo, miniature, instructions, erreurs fréquentes, conseils) dans une entité séparée ; le catalogue ne dépend pas de sa disponibilité | [02 §1](02-modele-donnees.md), [03 §14](03-architecture-technique.md) |
| C5 | **Quatre disciplines en V1**. Identifiant interne neutre `hybrid_race` pour HYROX / entraînement fonctionnel spécifique ; libellé affiché configurable après vérification de marque | [02](02-modele-donnees.md), [04 §3.5](04-moteur-entrainement.md) |
| C6 | **Charge multidimensionnelle** : stress musculaire local, patterns, volume, intensité, impact / locomoteur, cardiovasculaire, exposition récente, récupération disponible. Un score synthétique éventuel reste une heuristique interne | [04 §3.2–3.3](04-moteur-entrainement.md), [02 §5](02-modele-donnees.md) |
| C7 | **Kilomètres hybrides** enregistrés avec leur contexte (frais, compromis, intervalles, intensité, durée, récupération, séance d'origine) ; contribution au volume et à la charge **calculée par le moteur Running**, pas d'équivalence 1 km = 1 km | [04 §3.4 bis](04-moteur-entrainement.md), [02 §4](02-modele-donnees.md) |
| C8 | **Durée** : ±10 % (min ±5 min) = hypothèse de départ seulement ; tolérances par type de séance à définir par le DurationEngine ; garantie dure : séance réalisable dans le temps réellement disponible | [06 §4](06-calcul-duree.md) |
| C9 | **Tests longitudinaux** 12, 26 et 52 semaines + détecteurs de dérive | [10 §3.1](10-strategie-tests.md), [09 §5](09-validation.md) |
| C10 | **Moteur** indépendant de l'UI et de la base, déterministe, testable isolément, versionné, explicable, sans dépendance obligatoire à un LLM | [04 §1](04-moteur-entrainement.md) |

## Questions ouvertes restantes

1. **Marché & langues** : lancement France uniquement ? *(Recommandation : i18n dans le code dès le début, contenu FR d'abord.)*
2. **Paliers gratuit / premium, prix, position du paywall** — reporté (architecture prête, C2).
3. **Experts sportifs relecteurs** (course, force, cross-training, HYROX) — nécessaires pour faire passer les règles au statut `expert_approved` (C3).
4. **Production des vidéos** — reportée (architecture prête, C4).
5. **Public** : âge minimum, débutants complets inclus, populations exclues en V1.
6. **Limitations** : périmètre des « limitations déclarées » (recommandation : pas de diagnostic).
7. **Équipe & calendrier**.
8. **Marques** : vérification juridique « HYROX » / « CrossFit » avant commercialisation (C5).

## Tranchées

- ~~Suivi GPS~~ → C1. ~~Périmètre de lancement~~ → C5 (4 disciplines).

## Journal des décisions

Toute décision validée sera consignée ici (puis en ADR détaillé dans `docs/adr/` si nécessaire).

| Date | Décision | Statut |
|------|----------|--------|
| 2026-09-26 | Dossier d'architecture Phase 1 proposé | Validé comme fondation |
| 2026-09-26 | Phase 2 : [TRAINING ENGINE SPECIFICATION V1](../engine-spec/README.md) proposée (remise en question de C3 et C6) | En revue |
| 2026-09-26 | TRAINING ENGINE SPECIFICATION **V1.1** : arbitrages de la revue contradictoire appliqués ([changelog](../engine-spec/CHANGELOG.md)) | Architecture validée, implémentation non autorisée |
| 2026-09-26 | TRAINING ENGINE SPECIFICATION **V1.2** : 7 dernières décisions arbitrées ; `TRAINING_ENGINE_SPEC_V1_2_ARCHITECTURE_GATE = PASS` (architecture seulement) | Validé |
| 2026-09-26 | Contraintes C1 à C10 appliquées (GPS, économie, audit des règles, contenus, disciplines, charge multidimensionnelle, km hybrides, durée, tests longitudinaux, principes moteur) | Validé |
