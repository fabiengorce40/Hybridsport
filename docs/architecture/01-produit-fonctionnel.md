# 01 — Produit & architecture fonctionnelle

## 1. Promesse produit

> « Dis-moi ce que tu veux accomplir et quand tu peux t'entraîner. Chaque jour, je te dis quoi faire, exactement, et j'ajuste quand la vie s'en mêle. »

Principe directeur : **complexité maximale derrière l'écran, simplicité maximale devant**.
L'utilisateur ne manipule jamais « cycles », « mésocycles » ou « empreintes de fatigue ». Il voit : *Aujourd'hui → séance → durée → objectif → Démarrer*.

## 2. A — Architecture fonctionnelle (contextes métier)

Découpage en **contextes délimités** (bounded contexts). Chaque contexte a un propriétaire unique de ses données et de ses règles : c'est ce qui empêche la duplication de logique métier.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                               APPLICATION                                 │
│                                                                           │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────────────────────┐   │
│  │ 1. Identité & │  │ 2. Profil      │  │ 3. Catalogue d'exercices   │   │
│  │    compte     │  │    athlète     │  │    (contenu, taxonomie)    │   │
│  └───────┬───────┘  └───────┬────────┘  └─────────────┬──────────────┘   │
│          │                  │ snapshot                 │ référentiel      │
│          │                  ▼                          ▼                  │
│          │        ┌──────────────────────────────────────────────┐       │
│          │        │ 4. MOTEUR D'ENTRAÎNEMENT (pur, sans I/O)       │       │
│          │        │  planification · génération · dosage · durée  │       │
│          │        │  validation · adaptation · progression        │       │
│          │        └───────────────┬──────────────────────────────┘       │
│          │                        │ plan + trace                          │
│          │                        ▼                                       │
│          │        ┌──────────────────────────────┐                        │
│          │        │ 5. Gestion du plan            │◄──── événements ───┐  │
│          │        │  (stockage, révisions, diff)  │                     │  │
│          │        └───────────────┬──────────────┘                     │  │
│          │                        ▼                                      │  │
│          │        ┌──────────────────────────────┐   ┌─────────────────┴┐ │
│          │        │ 6. Exécution & journal        │──►│ 7. Progrès &     │ │
│          │        │  (lecteur de séance, logs)    │   │  performances    │ │
│          │        └──────────────────────────────┘   └──────────────────┘ │
│          │                                                                │
│  ┌───────┴────────┐  ┌───────────────┐  ┌──────────────┐ ┌─────────────┐ │
│  │ 8. Abonnements │  │ 9. Notif.     │  │ 10. Analytics│ │ 11. Admin / │ │
│  │  & droits      │  │  & rappels    │  │  & crash     │ │  back-office│ │
│  └────────────────┘  └───────────────┘  └──────────────┘ └─────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

| # | Contexte | Responsabilités | Propriétaire de |
|---|----------|-----------------|-----------------|
| 1 | Identité & compte | Inscription, connexion (Apple, Google, e-mail), session, suppression de compte, export RGPD, consentements | `User`, `Consent` |
| 2 | Profil athlète | Disciplines, objectifs, niveau, disponibilités, matériel, limitations, performances de référence, date d'événement | `AthleteProfile`, `Goal`, `Availability`, `EquipmentProfile`, `ReferencePerformance` |
| 3 | Catalogue d'exercices | Exercices, patterns moteurs, muscles, matériel, équivalences, progressions/régressions, médias, formats de WOD de référence | `Exercise`, `MovementPattern`, `EquivalenceGroup`, `BenchmarkWorkout` |
| 4 | **Moteur** | Toute décision sportive. Ne stocke rien, ne lit rien : reçoit un *snapshot*, renvoie un *résultat* + *trace* | Aucune donnée persistante — uniquement de la logique |
| 5 | Gestion du plan | Persister le programme, appliquer les révisions, conserver l'historique, verrouiller le passé | `Program`, `PlanRevision`, `PlannedSession`… |
| 6 | Exécution & journal | Lecteur de séance, saisie séries/intervalles, chrono, fin de séance, ressenti | `SessionLog`, `SetLog`, `IntervalLog` |
| 7 | Progrès | Records, e1RM, allures, benchmarks, volumes, tendances — **calculs délégués au moteur** (fonctions pures) | Vues dérivées (pas de source de vérité propre) |
| 8 | Abonnements | Droits d'accès (entitlements), essai, restauration, webhooks stores | `Entitlement`, `SubscriptionEvent` |
| 9 | Notifications | Rappels de séance, rappel test périodique, relance après séance manquée | Préférences de notification |
| 10 | Analytics & crash | Événements produit (anonymisés), crash reporting, performance | — (tiers) |
| 11 | Admin / back-office | Édition du catalogue, versioning du catalogue et des paramètres du moteur, support utilisateur | Versions de catalogue / ruleset |

**Règle d'or** : le contexte 4 (moteur) est le **seul** endroit où une règle sportive est écrite. L'UI, l'API et le back-office l'appellent ; ils ne réimplémentent jamais une règle.

## 3. Parcours principaux

1. **Onboarding → premier programme** (objectif : < 4 min, programme visible avant tout effort de saisie superflu).
2. **Boucle quotidienne** : Aujourd'hui → aperçu → lecteur de séance → résumé → progression mise à jour.
3. **Imprévu** : « Je n'ai que 30 min », « Déplacer », « Je suis fatigué », « Pas ce matériel aujourd'hui » → proposition d'adaptation → confirmation.
4. **Test périodique** : test planifié (ex. 5 km, 3RM, benchmark WOD, simulation HYROX partielle) → recalibrage des allures / charges.
5. **Changement de vie** : nouveaux jours, nouvelle discipline, nouvel objectif → replanification avec aperçu des conséquences.

## 4. B — Écrans principaux

Navigation : **4 onglets maximum** — `Aujourd'hui` · `Programme` · `Progrès` · `Profil`.
Le lecteur de séance est un écran plein écran modal (hors tab bar).

### 4.1 Onboarding (séquence courte, une question par écran)

| Écran | Contenu | Remarques |
|-------|---------|-----------|
| O1 Bienvenue | Promesse, connexion Apple/Google/e-mail | Compte créé tôt pour sauvegarde, mais possible en fin d'onboarding (à décider) |
| O2 Disciplines | Multi-sélection des 4 disciplines | Ordre de priorité si > 1 (glisser) |
| O3 Objectif(s) | Par discipline : ex. HYROX « terminer / battre un temps » + date ; course « 10 km en 50 min » ; muscu « force / hypertrophie / condition générale » ; cross « capacité générale / skills » | Objectif principal unique + secondaires |
| O4 Expérience | Ancienneté, niveau auto-estimé par discipline, questions factuelles (ex. « sais-tu faire une traction stricte ? ») | Questions factuelles > auto-évaluation |
| O5 Références | Performances connues (5 km, 10 km, 1RM/5RM, temps HYROX, benchmark WOD) — **« Je ne sais pas » toujours possible** | Si inconnu ⇒ test planifié en semaine 1, jamais de valeur inventée |
| O6 Disponibilités | Jours cochés, durée par jour (peut varier), nombre de séances/semaine, 2 séances/jour autorisées ? | |
| O7 Matériel | Presets (salle commerciale, box cross-training, salle HYROX, maison équipée, poids du corps) + ajustements | |
| O8 Limitations | Liste simple de restrictions (sans diagnostic) + questionnaire d'aptitude (type PAR-Q) | Si drapeau rouge ⇒ recommandation médicale avant de continuer |
| O9 Résumé & génération | Récap + « Voici ta semaine 1 » | Aperçu du programme ; paywall à positionner (question ouverte) |

### 4.2 Écrans cœur

| Écran | Rôle | Éléments clés |
|-------|------|---------------|
| **Aujourd'hui** | Écran d'accueil. Une seule action évidente | Séance du jour (titre, discipline, durée réelle estimée, objectif en 1 phrase), bouton **Démarrer**, actions secondaires (déplacer, raccourcir). Jour de repos : message + mobilité optionnelle. Aperçu discret de demain |
| **Programme** | Semaine en cours et à venir | Vue semaine (liste verticale des jours), phase du cycle (« Semaine 3/6 — Développement »), séances passées (réalisée/manquée), glisser-déposer contrôlé par le moteur |
| **Aperçu de séance** | Avant de démarrer | Blocs, durée par bloc, matériel nécessaire, objectifs, alternatives |
| **Lecteur de séance** | Exécution | Bloc courant, exercice courant, cible (ex. `5 × 5 @ 80 kg · RIR 2`), cases à cocher par série, saisie rapide (kg/reps/RPE préremplis avec la cible), chrono de récupération automatique, minuteur intervalles/EMOM/AMRAP, « suivant », remplacer un exercice, verrouillage écran optionnel, fonctionnement 100 % hors-ligne |
| **Résumé de séance** | Après | Durée réelle, RPE de séance, ressenti, records, commentaire ; déclenche l'analyse de progression |
| **Progrès** | Motivation + preuves | Performances de référence et leur évolution, e1RM principaux, allures course, benchmarks, régularité ; pas de dashboard surchargé |
| **Test périodique** | Tests planifiés | Protocole guidé, saisie résultat, impact expliqué (« tes allures seuil passent de 4:45 à 4:38/km ») |
| **Fiche exercice** | Référence | Vidéo/illustration, consignes clés (3 max), erreurs fréquentes, alternatives, historique perso |
| **Profil & réglages** | Paramètres | Disciplines, objectifs, disponibilités, matériel, limitations, unités, notifications, abonnement (gérer / restaurer), confidentialité, export des données, **suppression du compte** |

### 4.3 Flux d'adaptation (feuilles modales)

- « Je n'ai que **X** minutes aujourd'hui » → séance recalculée, écarts affichés.
- « **Déplacer** cette séance » → jours compatibles proposés par le moteur (les autres grisés, avec raison).
- « Je suis **fatigué** / courbatures » → options : alléger, remplacer par récupération active, reporter.
- « Pas ce **matériel** aujourd'hui » → substitutions équivalentes.
- **Séance manquée** détectée → proposition (reprogrammer / abandonner) avec conséquences.
- **Modification du profil** (jours, discipline, objectif) → **aperçu des conséquences** avant validation.

### 4.4 Écrans système

Paywall, gestion d'abonnement, états vides, états d'erreur, mode hors-ligne (bandeau discret), mise à jour obligatoire (si version du moteur incompatible), maintenance.
