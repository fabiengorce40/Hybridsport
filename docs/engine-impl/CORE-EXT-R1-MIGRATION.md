# CORE-EXT-R1 — versionnement et migration (`session_record` v3 → v4)

## 1. Versions

| Version | Phase | Contenu |
|---|---|---|
| v1 | 3 | séance + provenance |
| v2 | 3.5 | + empreinte (indisponible si migrée depuis v1) |
| v3 | 4B | champs facultatifs CORE-EXT-1 (identité) |
| **v4** | **6A** | variante `run_structure` (CORE-EXT-R1) + `durationEstimate` obligatoire |

`CURRENT_SCHEMA.session_record = { version: 4, schema: zSessionRecordV4 }`.

## 2. Schéma v4

```
{ session, provenance, fingerprint,
  durationEstimate: { availability: 'AVAILABLE', method: 'core.duration_engine', unit: 's', p10, p50, p90 }   // p10 ≤ p50 ≤ p90
                  | { availability: 'UNAVAILABLE_LEGACY' } }
```

## 3. Migration v3 → v4

| Entrée v3 | Résultat |
|---|---|
| Séance sans `run_structure`, sans `durationEstimate` | Séance **inchangée** (contrôle du contenu sportif) ; `durationEstimate = { availability: 'UNAVAILABLE_LEGACY' }` |
| Donnée déclarée v3 contenant une `run_structure` | **Refus** `TECHNICAL.MIGRATION_FAILED` (combinaison de versions malformée) |
| Donnée déclarée v3 contenant déjà `durationEstimate` | **Refus** `TECHNICAL.MIGRATION_FAILED` (combinaison de versions malformée) |
| Donnée non objet | **Refus** `TECHNICAL.MIGRATION_FAILED` |

Les chaînes v1 → v4 et v2 → v4 passent par la même étape. L’estimation n’est **jamais** reconstituée à la migration : une estimation recalculée aujourd’hui ne serait pas celle de l’époque (autre moteur, autre ruleset possible). Même doctrine que l’empreinte en v2.

## 4. Lecture (`migrateToCurrent`)

1. Enveloppe `{kind, schemaVersion, data}` ;
2. version future ⇒ `TECHNICAL.SCHEMA_VERSION_UNSUPPORTED` (**un lecteur v3 refuse une donnée v4**, il n’ignore jamais la variante) ;
3. migrations pas à pas, contenu sportif préservé ;
4. schéma courant : anomalies structurelles ⇒ `TECHNICAL.STRUCTURE.*`, autres ⇒ `TECHNICAL.SCHEMA_INVALID` ;
5. **contrôles après lecture** : les estimations des `run_structure` sont recalculées ; écart ⇒ `DURATION.ESTIMATE_MISMATCH`. Aucune réparation silencieuse.

Une donnée v4 avec la forme v3 (sans `durationEstimate`) est refusée (`TECHNICAL.SCHEMA_INVALID`).

## 5. Vérification de l’estimation de séance

`verifyRecordedDuration(record, { catalog, ruleset, engineVersion, timing? })` :
- `UNAVAILABLE_LEGACY` ⇒ `unavailable` + `DURATION.ESTIMATE_UNAVAILABLE_LEGACY` ;
- versions moteur / ruleset / catalogue différentes de la provenance ⇒ `rejected` + `DURATION.ESTIMATE_UNVERIFIABLE` ;
- recalcul différent (égalité stricte de p10, p50, p90) ⇒ `rejected` + `DURATION.ESTIMATE_MISMATCH` ;
- sinon `verified`.

## 6. Écriture

`toEnvelope('session_record', record)` écrit en v4 ; le record porte `durationEstimate = toRecordedDurationEstimate(estimate)` produit par le DurationEngine, et chaque `run_structure` porte son `estimate` (`withDerivedEstimate`).

## 7. Retour arrière

La variante est additive : la retirer revient à ne plus l’émettre. Les données v4 restent lisibles par un lecteur v4. **Aucune migration descendante** (v4 → v3) : les données v4 sont conservées telles quelles.

## 8. Tests

`migration.test.ts` (registre complet 1→2→3→4, v1 et v2 migrées avec `UNAVAILABLE_LEGACY`, version future 5 refusée, lecteur v2 refusant v3) ; `core-ext-r1.test.ts` cas 15–17 (écart refusé à la lecture, legacy, combinaisons malformées, lecteur v3 refusant v4, aller-retour et vérification) ; propriétés (provenance invalide jamais rendue valide par sérialisation, enveloppe falsifiée refusée).
