# 12 — O. Ordre de construction recommandé

Principe : **le moteur d'abord, validé hors UI, puis le produit autour.** Chaque jalon a des critères de sortie ; un jalon validé devient un acquis protégé par des tests.

## Phase 0 — Cadrage (maintenant)

- Valider ce dossier, répondre aux questions ouvertes (README).
- Figer : dimensions de charge et leurs unités, taxonomie (patterns, muscles, matériel), liste des archétypes v1 par discipline, personas de test.
- Identifier les experts sportifs relecteurs ; mettre en place le format des fiches de règles (doc 04 §4.2).
- **Sortie** : décisions consignées dans le journal.

## Phase 1 — Fondations techniques du moteur

1. Monorepo (pnpm, Turborepo, TS strict, lint, frontières d'architecture), CI GitHub Actions.
2. `packages/domain` : types + schémas Zod.
3. `packages/engine/core` : contexte, PRNG à graine, trace, erreurs typées, registre de règles, framework de validation.
4. `packages/catalog` : format du catalogue + validateur de catalogue + premiers exercices.
- **Sortie** : pipeline vide exécutable de bout en bout, CI verte.

## Phase 2 — Briques transverses du moteur

1. **Calcul de durée** (doc 06) — fondation de tout le reste, facile à tester.
2. **Similarité & exposition** (doc 05).
3. **Modèle de fatigue** (empreintes, décroissance).
4. **Ordonnanceur hebdomadaire** générique (contraintes + score).
- **Sortie** : tests unitaires + propriétés verts.

## Phase 3 — Module Musculation

Pourquoi en premier : il construit la sélection d'exercices, les patterns, le dosage et la progression, réutilisés ensuite par Cross-Training et HYROX.
- Archétypes, sélection, dosage, progression, validation propre.
- `engine-cli` : rapport lisible d'un programme.
- **Sortie** : relecture experte force validée sur les personas concernés.

## Phase 4 — Module Course

Moteur indépendant (allures, zones, volume, séances types, tests, affûtage).
- **Sortie** : relecture experte course validée.

## Phase 5 — Orchestrateur multi-disciplines (2 disciplines)

Musculation + course : arbitrage, enveloppes par dimension de charge, interférences, registre de charge, contributions de course.
- **Sortie** : scénarios « concurrent training » validés sur 12 semaines simulées.

## Phase 6 — Modules Cross-Training puis HYROX

HYROX en dernier car il compose course + stations + éléments de cross-training.
- **Sortie** : 4 disciplines coordonnées, audit batch vert, relecture experte cross & HYROX.

## Phase 7 — Adaptation & progression complètes

Événements, niveaux L0–L3, analyse d'impact, révisions, tests périodiques.
- Simulations longitudinales 26 et 52 semaines et détecteurs de dérive.
- **Sortie** : simulateur avec comportements réalistes vert sur tous les personas, sur 12, 26 et 52 semaines, sans dérive détectée.

## Phase 8 — Design system & shell applicatif

(Peut démarrer en parallèle dès la phase 3 si une personne dédiée à l'UI est disponible.)
- Tokens, composants, Storybook, navigation, écrans statiques sur données fictives réalistes produites par le moteur.
- Fiche exercice fonctionnelle **sans** vidéo (état « contenu à venir »).

## Phase 9 — Backend, auth, persistance, sync

Supabase (dev/staging/prod), migrations, RLS + tests, `apps/api`, spike puis implémentation de la sync, SQLite local.

## Phase 10 — Boucle produit cœur

Onboarding → génération → Aujourd'hui → aperçu → **lecteur de séance** → résumé → progression → adaptation dans l'app.
- **Sortie** : E2E Maestro verts, fonctionnement mode avion.

## Phase 11 — Production readiness

EntitlementService + adaptateur RevenueCat + paywall (paliers définis à ce moment), Sentry, PostHog, notifications, RGPD (consentements, export, suppression), pages légales, conformité stores, accessibilité.

## Phase 12 — Bêta fermée

TestFlight / Play Internal Testing, 30–100 pratiquants ciblés. Calibration des durées, ajustement du ruleset, correction des retours experts.
- **Sortie** : critères de qualité atteints (validité 100 %, précision de durée ≥ 80 % dans ±15 %, rétention bêta, retours experts).

## Phase 13 — Lancement public

Soumission stores, monitoring renforcé, déploiement progressif des versions du ruleset via feature flags.

---

### Prochaine étape proposée

Après validation de ce dossier : **Phase 0 détaillée** — je te propose la taxonomie complète (patterns, muscles, matériel), la liste des archétypes v1 par discipline et les 12 personas de test, à faire relire par les spécialistes avant d'écrire la première ligne du moteur.
