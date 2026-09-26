# 10 — M. Stratégie de tests

## 1. Principe

Le moteur est le produit : c'est là que l'effort de test est le plus élevé. Une fonctionnalité n'est « terminée » que lorsque ses tests existent, passent en CI et qu'aucun acquis n'a régressé.

## 2. Pyramide

| Niveau | Cible | Outils | Exemples |
|--------|-------|--------|----------|
| **Unitaires** | Chaque règle, formule, fonction de similarité, calcul de durée, modèle de progression | Vitest | `RUN.VOLUME.WEEKLY_INCREASE_MAX` : nominal, borne exacte, dépassement, historique vide |
| **Propriétés** (property-based) | Invariants valables pour **tout** profil | fast-check | « Aucune séance n'est planifiée un jour indisponible », « p90 ≤ disponibilité », « aucun exercice sans matériel », « déterminisme : même entrée ⇒ même sortie » |
| **Intégration** | Pipeline complet, modules + orchestrateur, moteur ⇄ persistance, sync | Vitest, Supabase local | Génération → validation → persistance → relecture identique |
| **Scénarios** | Utilisateurs réalistes sur plusieurs semaines | Simulateur maison | « Hyrox dans 12 semaines, court 3×, muscu 2×, manque 20 % des séances » |
| **Régression** | Chaque bug corrigé = un test ; golden set expert | Snapshots approuvés | Profil fixture + graine ⇒ plan identique au plan approuvé |
| **Cas limites** | Situations inhabituelles | Unitaires + scénarios | Voir §4 |
| **Mutation** | Qualité des tests des règles | Stryker | Score de mutation minimal sur `validation/` et `disciplines/` |
| **Backend** | RLS, migrations, webhooks | pgTAP, tests API | Un utilisateur ne peut jamais lire les données d'un autre |
| **UI** | Composants, écrans | React Native Testing Library, Storybook | Lecteur de séance : cocher, saisir, chrono |
| **E2E** | Parcours critiques sur appareil | Maestro | Onboarding → séance → résumé ; mode avion pendant la séance ; achat/restauration (sandbox) |

## 3. Simulateur de scénarios (outil central)

```ts
simulate({
  persona: 'hyrox_intermediate_3run_2strength',
  weeks: 12,
  behavior: { missRate: 0.2, performanceBias: +0.05, fatigueEvents: [{ week: 5, level: 3 }], availabilityChange: { week: 7 } },
  seed: 'fixed',
}) → { weeklyPlans, revisions, validationReports, metrics }
```

Assertions à chaque semaine simulée : plan valide, budgets respectés, progression cohérente, pas de doublon interdit, séances clés protégées, durées dans la tolérance.

**Personas initiaux** (à compléter avec les experts) :
1. Débutant complet, muscu 3×/sem, poids du corps + haltères à la maison.
2. Coureur 10 km objectif sub-50, 4×/sem, pas de salle.
3. Semi-marathon + muscu 2× (concurrent training).
4. HYROX Open dans 12 semaines, salle commerciale sans sled.
5. HYROX Pro, box complète, 6 séances/sem dont doubles.
6. Cross-training intermédiaire 5×/sem, box.
7. Hybride 4 disciplines, 5 séances, 45 min max.
8. Parent pressé : 3 × 30 min, disponibilités irrégulières.
9. Reprise après 3 semaines d'arrêt.
10. Limitation « pas d'impact » + objectif course (doit être détecté comme conflit et expliqué).
11. Avancé en force (e1RM élevés, progression lente).
12. Utilisateur sans aucune performance de référence.

## 4. Cas limites à couvrir

- Aucun jour disponible / un seul jour / 7 jours.
- Durée disponible < minimum de tout archétype (ex. 10 min).
- Objectifs incompatibles (marathon dans 3 semaines pour un débutant).
- Événement dans le passé ou dans 3 jours ; événement dans 1 an.
- Matériel nul ; matériel exotique uniquement.
- Aucune référence ; références incohérentes (5 km plus lent que 10 km au prorata).
- Historique vide ; historique énorme (5 ans).
- Semaine avec changement d'heure (DST), fuseaux horaires, voyage.
- Séance commencée non terminée ; app tuée en pleine séance ; séance faite hors-ligne synchronisée 10 jours plus tard.
- Deux appareils modifiant le profil simultanément.
- Toutes les séances manquées pendant 4 semaines.
- Changement de version du moteur au milieu d'une semaine.
- Unités impériales ; arrondis de charges (disques 1,25 kg absents).

## 5. Barrières CI (bloquantes)

- Lint, typecheck strict, frontières d'architecture.
- 100 % des tests moteur verts ; couverture branches ≥ 90 % sur `engine/validation`, `engine/disciplines`, `engine/duration`.
- Tests de propriétés (nombre d'exécutions élevé en nightly).
- Golden set : aucune différence non approuvée.
- Audit qualité batch : aucune métrique en régression au-delà du seuil.
- Tests RLS verts.

## 6. Tests en production

- Feature flags pour déployer une nouvelle version du ruleset à un pourcentage d'utilisateurs.
- Surveillance : taux d'erreurs moteur, précision des durées, taux d'adaptations, abandon de séances par archétype (signal de mauvaise séance).
