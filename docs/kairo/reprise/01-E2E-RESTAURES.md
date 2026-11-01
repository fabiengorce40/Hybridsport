# Reprise 1 — Tests E2E historiques restaurés sur la V2.2

- **Branche :** `claude/rekka-reprise-20261031`, issue de `fe708a2`. Locale, jamais poussée.
- **Constat de départ :** depuis la V2.1, l'onboarding impose sept étapes de personnalisation Musculation.
  - Les parcours historiques (`e2e.mjs`, `e2e-beta.mjs`, `e2e-beta-update.mjs`, `e2e-session-mobile.mjs`) restaient bloqués sur « Continuer » désactivé.
  - Seuls les scripts propres à la V2.1/V2.2 tournaient en QA.

## Aide partagée

`apps/kairo/scripts/lib/strength-onboarding.mjs`, fonction `completeStrengthPersonalization(page, options)`, plus les équivalences d'expérience `EXPERIENCE`.

### Fonctionnement
- Elle complète les sept étapes avec des choix **explicites**.
- Sans assistant affiché (aucune Musculation choisie), elle ne fait rien et renvoie `false`.
- Un parcours Musculation qui l'oublierait reste bloqué : l'oubli échoue visiblement.

### Valeurs par défaut

Elles reprennent les équivalents de l'ancien profil par défaut, pour comparer à résultat constant :

| Réglage | Valeur | Équivalent historique |
|---|---|---|
| Objectif | « Me tonifier et me remettre en forme » (`fitness`) | Objectif `general` |
| Expérience | 6 mois, 2 séances régulières, mouvements maîtrisés | Niveau `beginner` |

L'équivalent du niveau `intermediate` est : 24 mois, 3 séances, mouvements maîtrisés (seuils de `packages/strength/content/personalization-v1.ts`).

### Options
- `sessionsPerWeek`, `strengthDays`, `equipmentPreset`, `outcome`, `experience` ;
- `onStage(stage, wizard, next)` : point d'inspection où le parcours fait ses assertions **avant** les choix de l'aide.

## Assertions adaptées (aucune supprimée)

| Parcours | Avant (V2.0) | Après (V2.1/V2.2) | Raison |
|---|---|---|---|
| `[MUSCULATION]` fréquences | 5 et 6 séances affichées désactivées, « pas encore pris en charge » | L'assistant ne propose que 1 à 4 : 5 et 6 impossibles à choisir | La liste de l'assistant ne contient que les fréquences prises en charge |
| `[MUSCULATION]` matériel | « Créer mon programme » désactivé tant que le lieu manque | « Suivant · Musculation » désactivé à l'étape 5 avec « aucun matériel n'est supposé » ; le lieu choisi est repris au récapitulatif | Le matériel se choisit désormais dans l'assistant |
| `[MUSCULATION]` séances | 3 Full Body placées (lundi, mardi, vendredi) | 2 Full Body placées, variantes distinctes. La 3e reste **visible et motivée** (`PLAN.PERSONALIZATION_BLOCKED`, `strength_recovery_window`). | Fenêtre de récupération de la politique V2.1 autorisée le 29/10 : deux Full Body consécutives ne sont plus placées |
| Parcours avec Musculation | Objectif et fréquence sur la carte Musculation | Mêmes choix dans l'assistant (objectif, fréquence, expérience, jours) | Carte remplacée par l'assistant |
| `e2e-beta-update.mjs` | Bouton « Réglages » | « Réglages » ou « Profil » | Libellé du visuel BÊTA V2 (déjà géré par `e2e-beta.mjs`) |

Le test unitaire « chronomètre global Musculation » reçoit un délai explicite de 20 s.
- Il dure environ 1,8 s seul, mais plus de 5 s sous exécution parallèle (constaté le 31/10).
- Ses assertions sont inchangées.

## Défaut V2.1 révélé : jours Musculation figés avant l'étape Disponibilités

> **Corrigé par la reprise 3A** (`03-JOURS-MUSCULATION.md`). L'option `strengthDays` de l'aide E2E est supprimée : la proposition initiale (tous les jours disponibles) donne d'elle-même les bons jours.

### Mécanisme
1. Les « Jours possibles pour la musculation » (`personalization.days`) sont initialisés à l'étape **Objectifs**, à partir des disponibilités **par défaut** (lundi, mercredi, vendredi, samedi).
2. L'étape **Disponibilités** vient ensuite et ne les resynchronise pas.
3. Le planificateur interdit la Musculation hors de ces jours (`packages/app-core/src/planning.ts:144`, `availableMinutesFor`).

### Reproduction
Parcours FIELD TEST DAY : disponibilités du lundi au vendredi.
- La BÊTA place Musculation lundi et jeudi.
- La V2.2 laisse la 2e Musculation non placée, car le jeudi n'est pas un « jour Musculation ».

C'est une cause possible de l'anomalie « quatre Musculation demandées, deux placées ».

### Traitement
- Dans les tests, les parcours concernés choisissent explicitement les mêmes jours que leurs disponibilités (`strengthDays`), comme un utilisateur averti.
- La correction (resynchronisation, ou choix des jours après les disponibilités) est une décision de parcours : **non faite**, en attente de validation.

## Résultats sur la branche de reprise

| Vérification | Résultat |
|---|---|
| `e2e-beta.mjs`, puis `e2e.mjs` complet (build BÊTA, `E2E_REKKA_V2=1`) | **341 vérifications, « E2E OK » et « E2E REKKA BÊTA OK »** (la BÊTA de référence en compte 334) |
| `e2e-beta-update.mjs` : build A → build B, serveur relisant le disque | OK, données BÊTA identiques octet pour octet |
| `e2e-session-mobile.mjs` 360/390 | OK |
| `e2e-reps-mobile.mjs` 360/390 | OK |
| `e2e-offline-smoke.mjs` | OK |
| `e2e-global-clock-storage.mjs` (serveur de développement) | OK |

Les migrations, la personnalisation et les icônes (scripts V2.2) sont rejouées après la correction de sécurité des données.

Le navigateur préinstallé diffère de la version Playwright du dépôt. Un module chargé au démarrage, hors du dépôt, fournit le chemin du chrome-headless-shell, comme en CI. Aucun script n'en dépend.
