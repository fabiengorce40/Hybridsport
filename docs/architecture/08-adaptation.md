# 08 — K. Adaptation & replanification

## 1. Principe

Toute adaptation suit le même cycle :

```
Événement → Analyse d'impact → Stratégies candidates → Simulation sur l'horizon → Validation complète
          → Choix (perturbation minimale) → Proposition (diff + explication) → Confirmation si majeure → Révision
```

Une adaptation **ne modifie jamais le passé** (logs immuables) et **ne publie jamais un plan non validé**.

## 2. Événements

```ts
type AdaptationEvent =
  | { type: 'session_missed'; sessionId: UUID }
  | { type: 'session_moved'; sessionId: UUID; toDate: ISODate }
  | { type: 'time_reduced'; sessionId: UUID; availableMinutes: number }
  | { type: 'equipment_changed'; scope: 'session' | 'permanent'; equipmentProfileId: UUID }
  | { type: 'availability_changed'; availability: Availability }
  | { type: 'discipline_added' | 'discipline_removed'; discipline: Discipline }
  | { type: 'performance_logged'; sessionLogId: UUID }      // meilleure / moins bonne que prévu
  | { type: 'fatigue_reported'; level: 1 | 2 | 3; soreness?: Record<string, number> }
  | { type: 'test_completed'; sessionLogId: UUID }
  | { type: 'goal_changed'; goalId: UUID }
  | { type: 'engine_upgraded'; fromVersion: string };
```

## 3. Niveaux d'adaptation

| Niveau | Portée | Exemples | Où |
|--------|--------|----------|----|
| **L0 — Séance** | La séance seule | Raccourcir, substituer un exercice, changer de matériel aujourd'hui | Appareil (hors-ligne possible) |
| **L1 — Semaine** | Reste de la semaine | Séance manquée, déplacée, fatigue | Appareil (proposition) + serveur (confirmation) |
| **L2 — Phase** | Mésocycle en cours | Test périodique, performances répétées, disponibilités modifiées | Serveur |
| **L3 — Programme** | Tout le futur | Changement d'objectif, ajout/retrait discipline, nouvelle date d'événement | Serveur |

Le moteur choisit le **plus petit niveau** capable de restaurer un plan valide.

## 4. Analyse d'impact

Pour un événement, le moteur calcule :
- Séances **dépendantes** : ex. la séance de seuil de jeudi supposait le repos de mercredi ; la séance de tests suppose une semaine allégée.
- Contraintes qui deviennent violées (écart de récupération, budget de course, fatigue locale).
- Séances **clés** menacées (protégées en priorité).
- Effet sur la progression (ex. manquer 2 séances ancres ⇒ pas de progression de charge la semaine suivante).

## 5. Stratégies & règles de décision

| Situation | Règles par défaut |
|-----------|-------------------|
| Séance **clé** manquée | La replacer si un créneau valide existe dans la fenêtre (ex. ≤ 48 h) sans violer les contraintes ; sinon abandonner et ajuster la suivante (pas de « rattrapage » en doublant) |
| Séance **standard/optionnelle** manquée | Abandon par défaut ; volume non reporté |
| Plusieurs séances manquées (ex. ≥ 1 semaine d'absence) | Semaine de reprise allégée, capacités à confiance réduite, éventuel décalage de phase ; si événement daté : réévaluation de l'objectif avec l'utilisateur |
| Séance déplacée par l'utilisateur | Seuls les jours **valides** sont proposés ; les autres sont grisés avec la raison ; l'effet domino sur la semaine est montré |
| Temps réduit | Ajusteur de durée (doc 06) avec priorités de l'archétype ; si le temps est < minimum de l'archétype ⇒ proposition d'un autre archétype court ou report |
| Changement de matériel | Substitution par équivalences (même groupe, sinon même pattern), recalcul du dosage ; si impossible ⇒ autre archétype |
| Fatigue élevée | Alléger (volume −30 à −50 %, intensité plafonnée), ou récupération active, ou report ; séances clés déplacées plutôt que dégradées si possible |
| Meilleur que prévu | Mise à jour des capacités (doc 07) au prochain point de recalcul — jamais d'augmentation brutale en milieu de semaine |
| Moins bon que prévu | Voir doc 07 §8 |
| Disponibilités modifiées | Réordonnancement dès la semaine suivante (la semaine en cours est conservée si possible) |
| Ajout / retrait de discipline | Nouvel arbitrage des budgets ; transition progressive (pas d'ajout de 3 séances de course du jour au lendemain pour un non-coureur) |
| Changement d'objectif | L3 : nouvelle macro-planification ; les capacités et l'historique sont conservés |
| Mise à jour du moteur | Les séances futures non commencées peuvent être régénérées **aux frontières de semaine** uniquement, avec notification si changement visible |

## 6. Choix de la solution

Chaque stratégie candidate produit un plan simulé, validé en entier (doc 09). Parmi les plans valides, on minimise :

```
coût = w1·distance_au_plan_actuel     (nb de séances modifiées, déplacements)
     + w2·perte_séances_clés
     + w3·écart_aux_budgets
     + w4·pénalités_souples
```

Pourquoi « perturbation minimale » : l'utilisateur doit garder confiance dans son planning ; un plan qui change entièrement à chaque imprévu est perçu comme aléatoire.

## 7. Garanties

- **Idempotence** : rejouer le même événement ne produit pas une seconde modification.
- **Zone gelée** : la séance en cours et les séances terminées ne changent jamais ; par défaut les séances des prochaines 24 h ne changent pas sans action utilisateur.
- **Réversibilité** : chaque révision a un parent ; « annuler » restaure la révision précédente (si toujours valide).
- **Explicabilité** : chaque révision contient des explications courtes (« Ta séance de seuil passe à vendredi pour garder 48 h après tes squats lourds »).
- **Confirmation** : L0 appliqué directement (action explicite de l'utilisateur) ; L1+ présenté en aperçu avant application si des séances visibles changent.
