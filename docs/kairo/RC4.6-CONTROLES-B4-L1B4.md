# RC4.6 — Contrôles B4 et L1b-4

**Statut :** contrôles ajoutés en tests ; **aucune règle sportive, aucun seuil, aucun catalogue modifié**.

## 1. B4 : adaptations au démarrage

Test : `packages/app-core/tests/rc46/b4-start-adaptations.test.ts` (15 tests).

**États contrôlés :** semaine 2 de deux profils.
- Consolidation : Musculation 3× et Cross-training force 1×.
- P5 : quatre sports, avec des emplacements omis pour interférence.

**Cas contrôlés :**
- inconnu ;
- fatigue élevée ;
- douleur genou P2 ;
- douleur épaule P1 ;
- douleur épaule P2.

| Contrôle | Résultat |
|---|---|
| Régénération | Les 6 séances de Musculation relisent les entrées croisées persistées (`crossSource: persisted`). Aucun repli (`READINESS_PERSISTED`, `PERSISTED_ADAPTED`, `SESSION_RECOMPOSED` absents). |
| **Programme planifié identique** | Après chaque démarrage, toutes les semaines, enregistrements, raisons et entrées croisées sont inchangés. |
| Explicable : fatigue | Décision « adaptée ». Raison `CHECKIN_SESSION_ADAPTED`. Seuls changements : RIR + 1 par exercice. |
| Explicable : douleur | Chaque exercice retiré est sensible pour la zone déclarée. Aucun exercice ajouté ni restant ne l'est. Épaule P1 : séance inchangée, raisons `ZONE_RESTRICTED`. Épaule P2 : séance reportée, avec ses besoins bloquants (`SELECT.BLOCKING_NEED`) et sans journal ouvert. |
| Conflit musculaire (P5) | Les emplacements omis pour interférence au planning ne sont jamais réintroduits par l'adaptation. |
| Modification (« Modifier ») | Semaine replanifiée identique ; mêmes adaptations pour les 5 cas. |
| Reprise | Séance adaptée commencée, enregistrée puis relue : journal identique. La reprise ne déclenche aucun nouveau contrôle, même avec une douleur déclarée. Le programme reste intact. |
| Reproductible | Même résultat deux fois, puis après enregistrement et relecture de l'état. |

**Hors périmètre :** dans ces profils, les séances de Musculation sont toutes placées. Le maintien volontaire d'interférence (lot C) ne concerne que les séances non placées ; il reste couvert par `rc45/lotc-interference-maintain.test.ts`.

## 2. L1b-4 : mesure indépendante des bras et régression sportive

Test : `packages/app-core/tests/rc46/l1b4-control.test.ts` (5 tests).

**Référence figée :** séances du banc qualité produites par le code d'avant L1b-4 (`0334c46`) : 8 profils, 6 semaines (`fixtures/pre-l1b4-bench-sessions.json`).

### Régression constatée (non masquée par les tests ajustés)

Hors tirage complémentaire, **5 séances changent**. Le tirage horizontal principal (`fb.pull_h`, tirage poulie assis) y passe de **4 à 3 séries** :

| Profil | Séances | Tirage principal sur 6 semaines | Tirage complémentaire ajouté |
|---|---|---|---|
| P2 | 2026-11-02 (séance 1) | 26 → 25 séries | + 8 séries |
| P3 | 2026-11-02 (séance 1) | 26 → 25 | + 6 |
| P5 | 2026-10-12, 2026-10-26, 2026-11-09 (séance 1) | 30 → 27 | + 12 |
| P1, P1b, P4, S3, S4 | — | inchangé | 0 à + 8 |

**Cause (instrumentation du moteur, P2, séance du 2026-11-02) :**
- La fenêtre glissante de 7 jours (`hardSets.d7`) compte les séries du tirage complémentaire faites en fin de semaine précédente : dos 8 au lieu de 6.
- Le besoin restant du dos (`remainingShare`) passe de 4 à 2.
- La dose du tirage principal descend au plancher de sa cellule : 3 séries.
- Ce n'est **pas** le plafond par séance : vérifié, il n'est jamais appliqué avec un emplacement résiduel.

**Effet sportif :** le volume total de dos augmente (+0,7 à +1,5 série par semaine), mais un peu de volume passe de l'exercice principal (polyarticulaire, suivi) à l'accessoire. Sur 6 semaines, le tirage principal perd 1 à 3 séries sur 25 à 30.

**Ce que le test fige :** exactement ces 5 écarts. Tout autre changement d'un élément ordinaire, et toute nouvelle séance touchée, fait échouer le test.

### Bras (mesure indépendante, sans marge)

La mesure est calculée depuis les seules attributions du catalogue :
- muscle principal = volume direct ;
- muscle secondaire = volume indirect × `secondaryWeight`.

| Contrôle | Résultat |
|---|---|
| Bras direct, semaine par semaine | **Inchangé** dans les 8 profils |
| Bras indirect | Écart exactement égal à « tirage complémentaire − séries retirées au tirage principal » : + 0,3 à + 0,75 série par semaine en moyenne |
| Semaines au-dessus de la borne haute des bras | Pas plus qu'avant L1b-4 |
| Marge `ARMS_INDIRECT_L1B4 = 1.5` (`r1-r2-comparison`) | Couvre seulement cet indirect, qui vient du biceps secondaire des tirages ; aucune autre variation n'est masquée |

### Correction possible (non appliquée, décision attendue)

| Option | Effet | Coût |
|---|---|---|
| A. Accepter et documenter | Effet borné, volume de dos en hausse | Aucun |
| B. Exclure les séries des emplacements résiduels du besoin restant des emplacements ordinaires (moteur Strength) | Tirage principal restauré à l'identique d'avant L1b-4 | Changement moteur, activé par un attribut gouverné de l'emplacement résiduel (nouvelle version de contenu) : sans effet sur L1-V3, F6 et le verrou, à prouver octet pour octet |
| C. Tirage complémentaire seulement en dernière séance de Full Body de la semaine (surcouche de contenu) | Réduit l'effet de bord sans le supprimer | Moins de tirage complémentaire |

**Recommandation : B**, en nouvelle version de contenu, avec preuve de non-régression des versions antérieures. Elle n'est pas appliquée sans votre accord.
