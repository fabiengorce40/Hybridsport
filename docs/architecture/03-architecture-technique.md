# 03 — D. Architecture technique

## 1. Vue d'ensemble

```
                    ┌─────────────────────────── Appareil (iOS / Android) ──────────────────────────┐
                    │  apps/mobile (Expo / React Native, TypeScript)                                  │
                    │   ├─ UI (écrans)  ── packages/ui (design system)                                │
                    │   ├─ État : TanStack Query (serveur) + Zustand (UI éphémère) + SQLite (local)   │
                    │   ├─ packages/engine  ◄── micro-adaptations hors-ligne (même code que serveur)  │
                    │   ├─ Sync engine (SQLite ⇄ Postgres)                                            │
                    │   └─ SDK : RevenueCat · Sentry · PostHog · Notifications · HealthKit/HealthConnect │
                    └───────────────┬───────────────────────────────────────────┬─────────────────────┘
                                    │ HTTPS (JWT)                               │ sync
                    ┌───────────────▼──────────────┐              ┌─────────────▼──────────────┐
                    │ apps/api (Node, Fastify, TS)  │─────────────►│ Supabase (région UE)        │
                    │  - génération autoritaire     │   SQL / RLS  │  - Postgres (+ RLS)          │
                    │  - adaptation multi-semaines  │              │  - Auth (Apple/Google/email) │
                    │  - webhooks RevenueCat        │              │  - Storage (médias)          │
                    │  - suppression / export RGPD  │              └─────────────────────────────┘
                    │  - packages/engine            │
                    └───────────────┬──────────────┘
                                    │
             ┌──────────────────────┼─────────────────────────┐
             ▼                      ▼                         ▼
     RevenueCat (stores)     Sentry (erreurs)        PostHog UE (analytics, flags)
```

## 2. Choix du framework mobile

| Critère | React Native + Expo | Flutter | Natif (Swift + Kotlin) | Kotlin Multiplatform |
|--------|---------------------|---------|------------------------|----------------------|
| Code partagé iOS/Android | ~95 % | ~95 % | 0 % (UI + logique ×2) | Logique partagée, UI souvent ×2 |
| **Partage du moteur avec le backend** | ✅ TypeScript partout | ❌ Dart (sauf backend Dart, écosystème pauvre) | ❌ | ⚠️ possible via JVM backend |
| Qualité UI premium | ✅ (Reanimated, Skia, gestures) | ✅ excellent | ✅ meilleur | ✅ |
| Build & publication | ✅ EAS Build/Submit, OTA (EAS Update) | ⚠️ outillage à assembler | ⚠️ ×2 | ⚠️ |
| Recrutement / écosystème | ✅ très large | ✅ large | ✅ mais 2 profils | ⚠️ plus restreint |
| Accès HealthKit / Health Connect / IAP | ✅ modules matures | ✅ | ✅ | ✅ |

**Décision recommandée : React Native + Expo (Dev Client, nouvelle architecture), TypeScript strict.**
Pourquoi : le moteur est le cœur du produit ; pouvoir exécuter **exactement le même moteur** sur l'appareil (hors-ligne) et sur le serveur (autoritaire, batchs de validation) sans le réécrire est décisif. Flutter serait équivalent côté UI mais imposerait deux implémentations du moteur ou un backend Dart.

## 3. Organisation du code : monorepo

```
hybridsport/
├─ apps/
│  ├─ mobile/            Expo app (écrans, navigation, état, intégrations SDK)
│  ├─ api/               Service Node/Fastify (génération, adaptation, webhooks, RGPD)
│  └─ admin/             Back-office catalogue (plus tard ; peut démarrer en outil interne simple)
├─ packages/
│  ├─ domain/            Types, schémas Zod, invariants de domaine (aucune dépendance)
│  ├─ engine/            MOTEUR — fonctions pures, dépend uniquement de domain
│  ├─ catalog/           Données du catalogue versionnées (JSON) + validateur de catalogue
│  ├─ engine-cli/        Outil ligne de commande : générer un plan depuis un profil, rapport lisible pour les coachs
│  ├─ ui/                Design system (tokens, composants) + Storybook
│  ├─ data/              Accès données côté app (repositories SQLite, sync)
│  └─ config/            eslint, tsconfig, prettier partagés
├─ supabase/             Migrations SQL, politiques RLS, tests pgTAP
└─ docs/
```

Règles d'architecture imposées par l'outillage (`eslint-plugin-boundaries` / `dependency-cruiser`) :

- `engine` ne peut importer que `domain`. Interdit : React, fetch, SQLite, `Date.now()`, `Math.random()`.
- `ui` ne peut pas importer `engine` (l'UI affiche des données, elle ne décide pas).
- `apps/*` orchestrent ; ils n'implémentent aucune règle sportive.

Outils : pnpm workspaces, Turborepo (cache de build/test), TypeScript `strict`, Vitest (tests unitaires moteur), fast-check (tests par propriétés).

## 4. Backend

| Option | + | − |
|--------|---|---|
| **Supabase (Postgres managé UE) + API TS dédiée** | Postgres standard (portable), Auth prête (Apple/Google), RLS, Storage, région UE | Dépendance à un fournisseur pour Auth (migration possible mais non triviale) |
| Firebase | Très rapide à démarrer, offline natif Firestore | NoSQL inadapté aux relations programme→séance→série, requêtes analytiques pauvres, lock-in fort, hébergement hors UE par défaut |
| Backend maison (NestJS + Postgres sur AWS/GCP/Scaleway) | Contrôle total | Coût d'exploitation, auth à construire, lenteur initiale |

**Décision recommandée : Supabase (projet UE) + `apps/api` en Node/Fastify.**
Pourquoi : on obtient une base relationnelle solide et conforme RGPD tout de suite, sans enfermement (Postgres reste Postgres). La logique métier lourde (génération, adaptation) vit dans `apps/api` en TypeScript avec le package moteur, et non dans des fonctions SQL ou des edge functions dispersées. Hébergement de l'API : conteneur sur un PaaS UE (Fly.io région Paris/Amsterdam, Render EU ou Scaleway).

⚠️ Migration future : si l'on quitte Supabase, Postgres + données migrent facilement ; l'Auth demande une migration d'utilisateurs (faisable, documentée). Risque accepté et signalé.

## 5. Où tourne le moteur ? (décision D6)

| Option | + | − |
|--------|---|---|
| 100 % appareil | Offline total, zéro coût serveur | Anciennes versions de l'app génèrent avec d'anciennes règles ; correction d'un bug sportif = release store ; IP du moteur exposée |
| 100 % serveur | Contrôle total, une seule version active | Pas d'adaptation hors-ligne ; latence |
| **Hybride, même package** | Génération/replanification lourde côté serveur (autoritaire, versionnée) ; micro-adaptations (raccourcir, substituer, déplacer dans la semaine) côté appareil, **réconciliées** par le serveur | Nécessite une politique de compatibilité de versions (voir ci-dessous) |

**Décision recommandée : hybride.**
- Le plan est généré sur ~2 semaines glissantes d'avance (le reste du cycle existe à l'état de « squelette ») ⇒ l'app a toujours de quoi fonctionner hors-ligne.
- Chaque résultat porte `engineVersion`. Le serveur refuse une révision produite par une version du moteur trop ancienne (`minSupportedEngineVersion`) et la recalcule ; l'app peut forcer une mise à jour si nécessaire.

## 6. Données locales & synchronisation

- **SQLite local** (expo-sqlite) = base de travail de l'app. L'UI lit localement ⇒ instantané, fonctionne en salle sans réseau.
- Synchronisation :

| Option | + | − |
|--------|---|---|
| PowerSync (Postgres ⇄ SQLite) | Sync incrémentale robuste, compatible Supabase, règles de partitionnement par utilisateur | Service tiers payant |
| WatermelonDB + endpoints maison | Mature en RN | Protocole de sync à écrire et maintenir |
| Outbox maison (file d'opérations + pull incrémental) | Contrôle total, simple car données majoritairement mono-utilisateur | À tester très sérieusement |

  **Recommandation** : décider après un spike technique de 2–3 jours ; préférence pour **PowerSync** (moins de code critique maison). Dans tous les cas : écritures locales via une **file d'opérations idempotentes**, résolution de conflits définie par table :
  - Logs d'exécution : *append-only* ⇒ pas de conflit.
  - Plan : le serveur est autoritaire ; une micro-adaptation locale est une *proposition de révision* rejouée côté serveur.
  - Profil : dernier écrit gagne par champ, avec horodatage.

## 7. État côté app

- **TanStack Query** : données distantes ponctuelles (abonnement, contenu).
- **SQLite + requêtes réactives** : données métier locales.
- **Zustand** : état éphémère d'UI (ex. lecteur de séance : minuteur, index courant) — persisté pour survivre à un kill de l'app en pleine séance.
- Navigation : Expo Router.

## 8. Authentification & sécurité

- Supabase Auth : **Sign in with Apple** (obligatoire si login social proposé sur iOS), Google, e-mail (lien magique / OTP).
- JWT court + refresh ; stockage dans `expo-secure-store`.
- **RLS partout** : chaque table utilisateur filtrée par `user_id = auth.uid()` ; testée automatiquement (pgTAP).
- L'API vérifie le JWT et utilise un rôle restreint ; clé `service_role` jamais dans l'app.
- Webhooks (RevenueCat) authentifiés et idempotents.
- Secrets via variables d'environnement du PaaS / EAS Secrets. Jamais en dépôt.
- Chiffrement en transit (TLS) et au repos (fournisseur).

## 9. Abonnements

| Option | + | − |
|--------|---|---|
| **RevenueCat** | Gère StoreKit 2 + Play Billing, restauration, essais, webhooks, paywalls A/B, validation des reçus | Commission au-delà d'un seuil de revenus |
| Implémentation directe | Pas de tiers | Nombreux cas limites (renouvellement, période de grâce, remboursement, changement de plan, famille) — risque financier |

**Décision : RevenueCat.** L'API reçoit les webhooks et maintient `Entitlement` ; l'app lit le droit via le SDK (source rapide) et le serveur (source autoritaire pour les appels API premium).

## 10. Observabilité

- **Sentry** (app + API) : crashs, erreurs, performance, source maps, releases liées aux versions EAS.
- **PostHog (instance UE)** : analytics produit anonymisés/pseudonymisés, funnels onboarding, feature flags, expériences. Consentement requis selon le type de traceur.
- Logs structurés côté API (JSON) avec `requestId`, jamais de données de santé.
- Métriques moteur : taux d'échec de validation, taux de réparation, écarts durée estimée/réelle (calibration).

## 11. Environnements & livraison

| Env | Supabase | API | App |
|-----|----------|-----|-----|
| `dev` | projet dev (ou local via CLI Supabase) | local | Dev Client |
| `staging` | projet staging (données synthétiques) | staging | build interne / TestFlight / Play Internal |
| `production` | projet prod UE | prod | Stores |

- **CI (GitHub Actions)** : lint, typecheck, tests unitaires/propriétés/scénarios moteur, tests RLS, build ; seuils bloquants.
- **EAS Build / Submit** : builds signés, soumission stores. **EAS Update** pour correctifs JS (dans les limites des règles Apple/Google : pas de changement de nature de l'app).
- Versioning : SemVer app ; `engineVersion`, `rulesetVersion`, `catalogVersion` indépendants.
- Migrations DB appliquées en CI : staging → vérification → production.

## 12. Exigences stores & légales (anticipées dès maintenant)

- Suppression de compte **dans l'app** (exigence Apple 5.1.1(v), Google).
- Restauration des achats visible.
- Politique de confidentialité, CGU/CGV, mentions « ne remplace pas un avis médical ».
- App Privacy (Apple) / Data Safety (Google) cohérents avec les SDK réellement embarqués.
- Déclaration HealthKit : usage justifié, données santé jamais utilisées pour la publicité.

## 13. Performance

- Génération d'une semaine sur appareil : cible < 300 ms sur un Android milieu de gamme ; génération d'un cycle complet côté serveur : < 2 s.
- Lecteur de séance : 60 fps, minuteurs basés sur timestamps (pas sur des `setInterval` cumulés) pour rester justes en arrière-plan, notifications locales pour la fin de récupération.
