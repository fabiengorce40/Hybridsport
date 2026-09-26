# Hybridsport — Dossier d'architecture (Phase 1)

> Statut : **PROPOSITION — à valider**. Aucune ligne de code applicatif n'est écrite à ce stade.
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
| D9 | **Modules discipline indépendants + orchestrateur** parlant un langage commun : *demande de séance*, *empreinte de fatigue*, *budget de charge* | Chaque discipline garde son expertise ; la coordination est centralisée et testable | Un moteur unique « générique » (perd la spécificité course/HYROX) |
| D10 | **IA générative hors du chemin critique en v1** ; si utilisée plus tard, toujours derrière le validateur déterministe | Cohérence, reproductibilité, coûts, responsabilité | Génération de programmes par LLM (non déterministe, non vérifiable) |
| D11 | **Historique immuable + révisions de plan** (chaque adaptation = une révision avec diff et raison) | Traçabilité, annulation, analyse des conséquences, debug | Écraser le plan en place |
| D12 | **RevenueCat** (abonnements), **Sentry** (crash), **PostHog UE** (analytics produit / feature flags) | Standards du marché, conformité stores, restauration d'achats gérée | StoreKit/Play Billing en direct (beaucoup de cas limites), Firebase Analytics (hors UE) |

---

## Informations manquantes — à trancher avant la phase moteur

Je ne prends pas ces décisions à ta place. Elles influencent l'architecture ou le périmètre :

1. **Marché & langues** : lancement France uniquement ? i18n prévue dès v1 (FR/EN) ? *(Je recommande i18n dans le code dès le début, contenu FR d'abord.)*
2. **Modèle économique** : abonnement pur avec essai gratuit, ou freemium ? Prix mensuel/annuel ? Position du paywall (avant/après aperçu du programme) ?
3. **Suivi GPS de la course** : l'app enregistre-t-elle les sorties (GPS, montre) ou prescrit-elle uniquement + saisie manuelle / import Apple Santé / Health Connect / Strava / Garmin ? *(Impact très fort sur le périmètre. Je recommande : prescription + saisie + import santé en v1, pas de GPS maison.)*
4. **Validation sportive humaine** : as-tu accès à des coachs diplômés (course, force, cross-training, HYROX) pour relire les programmes générés ? *(C'est le risque n°1 du projet, voir doc 11.)*
5. **Contenu exercices** : qui produit les vidéos / illustrations des exercices (≈ 250–400 exercices) ? Budget ?
6. **Périmètre de lancement** : les 4 disciplines au lancement public, ou beta avec les 4 puis ouverture progressive ? *(Voir recommandation doc 12.)*
7. **Public** : âge minimum (je recommande 16+ ou 18+), niveau (débutant complet inclus ?), populations spécifiques exclues en v1 (grossesse, pathologies) ?
8. **Blessures / limitations** : jusqu'où aller ? *(Je recommande des « limitations déclarées » simples — ex. « éviter l'impact », « pas de charge au-dessus de la tête » — et **aucun diagnostic**, pour rester hors du champ « dispositif médical » et limiter les données de santé.)*
9. **Équipe & calendrier** : qui développe (toi seul + moi ?), date cible de beta / lancement ?
10. **Marques** : usage des noms « HYROX » et « CrossFit » (marques déposées) — voir doc 11.

---

## Journal des décisions

Toute décision validée sera consignée ici (puis en ADR détaillé dans `docs/adr/` si nécessaire).

| Date | Décision | Statut |
|------|----------|--------|
| 2026-09-26 | Dossier d'architecture Phase 1 proposé | En revue |
