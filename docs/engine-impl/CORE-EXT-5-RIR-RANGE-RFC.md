# CORE-EXT-5 — plages de RIR (mini-RFC)

> Statut : **PROPOSITION, NON IMPLÉMENTÉE** (phase 4F). Aucune ligne du CORE n’est modifiée. Décision soumise à validation humaine.

## 1. Problème

- **Principe P4** (registre scientifique) : le RIR est central mais inexact.
  - La prédiction des répétitions jusqu’à l’échec sous-estime d’environ une répétition, avec une hétérogénéité importante (Halperin 2022, niveau `SEARCH_SUMMARY`).
  - Une **cible ponctuelle** (« RIR 2 ») affiche donc une précision que la mesure ne permet pas.
- **État actuel** du schéma de séance (`packages/domain/src/session.ts`) :
  - `zEffort = { rir: number } | { rpe: number }` : une valeur unique ;
  - forme historique `SetPrescription.rir?: number`, exclusive de `intensity` ;
  - consommateurs du RIR :
    - validateur STR-V3 : `pctByRepsToFailure[reps + rir]` (`strength/src/checks.ts:60`) ;
    - ProgressionEngine : `classifyExposure` compare le RIR réalisé au RIR cible ± marges (`strength/src/progression.ts:37-56`) ;
    - rendu et traces.
  - **Non consommateurs** : l’estimation de durée du CORE (répétitions, repos, montée) et l’empreinte anti-doublon (marqueurs séries / reps / charge).

## 2. Options

### Option A — `rir: number | { min: number; max: number }`

- **Sérialisation** : union dans `zEffort` ; une valeur scalaire reste valide. Les JSON existants restent lisibles tels quels.
- **session_record** : une v3 lue par un lecteur v4 est valide sans transformation. Mais un lecteur v3 recevant une plage échouerait : c’est donc bien une version v4.
- **Validateur** : chaque consommateur doit gérer deux formes. Risque d’oubli : un `typeof` manquant = comportement silencieux.
- **Progression et comparaison** : le « RIR cible » est ambigu (borne basse ? milieu ?) ; il faut une convention implicite par consommateur.
- **Compatibilité ascendante** : excellente en lecture ; ambiguïté sémantique en aval.

### Option B — `targetRir: { min: number; max: number; preferred?: number }`

- **Sérialisation** : objet unique, toujours de la même forme ; un scalaire historique `r` devient `{ min: r, max: r }`.
- **session_record** : migration v3 → v4 **explicite** et identitaire en sens : `rir: r` ⇒ `{ min: r, max: r }` ; un lecteur v3 refuse la v4 (comme v2 → v3).
- **Validateur** (STR-V3) : utilise `min`, la borne **la plus proche de l’échec**, donc l’intensité la plus élevée : la règle la plus prudente, une seule façon de faire.
- **Durée** : aucun impact (le RIR n’entre pas dans l’estimation de durée).
- **UI** : « RIR 1–3 (viser 2) » ; `preferred` sert de repère affiché sans fausse précision ; si `min = max`, affichage identique à l’existant.
- **Historique** : les séances passées gardent leur sens après migration (plage dégénérée).
- **Progression** :
  - réalisé < `min` − marge ⇒ en deçà ;
  - réalisé > `max` + marge ⇒ au-delà ;
  - entre les deux ⇒ conforme.
  - Plus juste qu’un point. Les marges existantes (`aboveRirMargin`, `belowRirMargin`) restent des heuristiques G2.
- **Comparaison de prescriptions** (diff, anti-doublon) : égalité structurelle sur (`min`, `max`, `preferred`), sans ambiguïté scalaire / plage.
- **Reason codes** : `DOSE.MODIFIED` porte déjà `rirDelta` : on décale les deux bornes, avec une trace inchangée. Un code informatif optionnel peut signaler une plage élargie pour cause d’incertitude.
- **API** : forme unique ; les clients n’ont qu’un cas à traiter.

### Option C — RIR ponctuel + incertitude séparée : `{ rir: number; uncertainty?: number }`

- Conserve la cible ponctuelle et ajoute une incertitude (± répétitions).
- **Avantages** : diff minimal ; l’incertitude peut provenir de la PrescriptionConfidence.
- **Inconvénients** :
  - la cible reste affichée comme un point ;
  - le validateur et la progression continueraient d’utiliser le point ;
  - l’incertitude serait une donnée décorative, facile à ignorer, alors que le principe P4 demande de ne pas afficher de fausse précision.

## 3. Analyse transversale

| Critère | A | B | C |
|---|---|---|---|
| Sérialisation / forme unique | ✗ (2 formes) | ✓ | ✓ |
| Migration `session_record` v3 → v4 explicite | implicite | ✓ explicite | ✓ explicite |
| Validateur (une règle prudente) | ambigu | ✓ borne basse | point (inchangé) |
| Estimation de durée | sans impact | sans impact | sans impact |
| UI sans fausse précision | ✓ | ✓ (+ repère `preferred`) | ✗ (point affiché) |
| Historique | ✓ | ✓ (plage dégénérée) | ✓ |
| Progression | ambigu | ✓ conforme / en deçà / au-delà | point |
| Comparaison de prescriptions | ambigu | ✓ structurelle | ✓ |
| Compatibilité ascendante (lecture) | ✓ sans migration | ✓ par migration | ✓ par migration |
| Coût d’implémentation | faible | moyen | faible |

## 4. Recommandation (à valider)

**Option B**, avec :

- `zEffort` → `{ rir: { min, max, preferred? } } | { rpe: … }` ; le champ historique `SetPrescription.rir` est migré de la même façon ;
- migration `session_record` v3 → v4 : `r` ⇒ `{ min: r, max: r }`. Le lecteur v3 refuse la v4, avec un test de migration aller-retour ;
- STR-V3 : utilise `min` ; la progression utilise les bornes ; le rendu affiche la plage et le repère ;
- ruleset : `strength.dose.base` peut alors porter des plages de RIR. Ces valeurs restent des heuristiques G2, elles ne sont pas choisies par le RFC ;
- plages de RIR : resteront `PROGRAMMING_HEURISTIC` dans le registre.

L’option B n’est pas retenue parce qu’elle coûte le moins, ce n’est pas le cas, mais parce qu’elle :

- supprime l’ambiguïté sémantique chez chaque consommateur ;
- rend la migration explicite et testable ;
- donne au validateur une règle prudente unique.

## 5. Hors périmètre

- Aucune implémentation en 4F.
- Aucune plage de RIR choisie.
- Aucun changement du CORE.
- Les goldens et le ruleset restent inchangés tant que le RFC n’est pas validé.
