# Reprise RC5 — lot 4.6 : stabilisation de la progression

Branche : `claude/rekka-lot46-progression-stabilization`, partie du commit BÊTA validé `5efd3c2` (BÊTA publiée `097bacb`).
**Statut : commit local uniquement. Aucun push, aucune fusion, aucun déploiement, aucune activation.**

## 1. Périmètre et garanties

- Le moteur actif (environnement Beta 0) est **inchangé** :
  - les nouvelles options de lecture de la progression sont des options de SIMULATION ;
  - `beta0Environment().progressionReading` reste `undefined` ;
  - un test vérifie qu'aucune des nouvelles causes de maintien n'apparaît dans l'environnement Beta 0.
- Identité vérifiée : la variante A (moteur actif) donne, sur les 20 profils et 12 semaines, des volumes, charges, séances et refus **identiques** au banc du lot 4.5 (`lot45-validation.json`).
- Aucun schéma, aucune migration, aucune donnée utilisateur, aucune séance historique n'est touché.
- Aucun contenu candidat n'entre dans le registre des utilisateurs : la chaîne de lecture des candidats est explicite (`candidates: true`) et n'est appelée par aucun code produit.

## 2. Modifications

| Fichier | Nature |
|---|---|
| `packages/app-core/src/progression.ts` | Options de simulation `outOfRange: 'clamp' \| 'bound'`, `hysteresis`, `deferLargeStep` dans `ProgressionReadingOption` ; `outOfRangeBound` (borne inférieure d'estimation) ; `stabilize` (maintien tracé `PROGRESSION.HELD` avec cause `hysteresis` ou `large_step_deferred`). Inactif sans option. |
| `packages/app-core/src/provisional-content.ts` | `STRENGTH_CANDIDATES`, `strengthCandidateRegistry()`, `strengthContentFor(rv, cv, { candidates: true })` : relecture de la provenance d'une séance générée avec un ruleset candidat, sur demande explicite seulement. |
| `tests/rc5/lot46-bench.ts`, `lot46-report.ts`, `rc5-lot46-bench.test.ts` | Banc reproductible 12 et 24 semaines, découpé en lots (`LOT46_SCOPE`, `LOT46_SHARD`, `SIM_WEEKS`), puis fusion (`LOT46_MERGE=1`). |
| `tests/rc5/rc5-lot46-stabilization.test.ts` | 5 tests : hystérésis, report des grands sauts, Beta 0 sans nouvelle cause, registre sans candidat, provenance candidate relue par la chaîne explicite. |
| `tests/rc5/lot4-profiles.ts`, `lot44-bench.ts` | Durée paramétrable (`SIM_WEEKS`, défaut 12) ; collecte des séquences de charges (premier set par exercice et emplacement). |

Rapport complet : `packages/app-core/tests/rc5/__reports__/lot46-stabilisation.md` (+ `.json` et lots bruts).

## 3. Simulations

- 14 scénarios d'athlète (progression, stagnation, difficulté, fatigue temporaire, fatigue persistante, HYROX, course, course + stagnation, séances manquées, retour, A/B, Full Body 2 A/B, bruit, changement d'exercice).
- 20 profils du lot 4.5.
- 12 semaines et 24 semaines.
- 22 couples variante × durée.
- Contrôles transverses : **0 erreur, 0 récupération sous 36 h, 0 dépassement de durée, 0 violation de contrainte**, pour toutes les variantes.

## 4. Chantier A — estimation hors plage

| Variante | Effet (24 semaines, 14 scénarios) |
|---|---|
| A — actuelle | Référence : 331 changements de sens, 273 allers-retours, 233 « en dessous juste après une hausse ». |
| B-CLAMP — lecture au plafond de la plage | 185 changements de sens (−44 %), 128 allers-retours (−53 %), 142 « en dessous après hausse » (−39 %). Somme des charges finales −1,1 %. |
| P-BOUND — borne inférieure | **Aucun effet mesurable** (identique à A à ±0,1 %) : l'estimation hors plage n'est presque jamais inférieure à l'estimation déjà présente. |
| B-SUSP — suspension | Effet marginal (−2 %), 44 décisions suspendues. |

La plage de répétitions n'a pas été modifiée.

## 5. Chantier B — oscillations

Distinction observée dans les scénarios (24 semaines, squat · RDL · développé couché) :

| Situation | A | P-CLSTAB | Lecture |
|---|---|---|---|
| Fatigue temporaire (E-FTEMP) | 100 → 100 · 90 → 90 | 100 → 107,5 · 90 → 92,5 | La baisse est suivie d'une reprise plus franche, sans nouvelle oscillation. |
| Fatigue persistante (E-FPERS) | 100 → 75 (4 baisses) | 100 → 80 (3 baisses) | La difficulté reste détectée et les baisses ont toujours lieu. |
| Difficulté réelle (E-DIFF) | 100 → 85 | 100 → 85 | Identique : aucune baisse n'est empêchée. |
| Progression réelle (E-PROG) | 100 → 110 | 100 → 110 | Identique, 22 → 10 changements de sens. |
| Variation normale (E-NOISY) | 24 changements de sens | 8 | Le bruit n'est plus converti en allers-retours. |
| Stagnation (E-STAG) | 53 | 29 | Moins d'essais avortés. |

- **Hystérésis seule** (P-HYST, aucune hausse dans les 3 expositions suivant une baisse) : −11 % de changements de sens. Elle est utile mais insuffisante seule.
- **Origine principale des oscillations : la sur-estimation hors plage, et non le RIR de référence.** Le RIR de référence a été corrigé au lot 4.5 et ses traces sont présentes. Corriger l'estimation (B-CLAMP) supprime à elle seule près de la moitié des oscillations.

## 6. Chantier C — incréments par équipement

- Les sauts relatifs maximaux observés sont de 16,7 % (15 → 17,5 kg sur une petite charge à la barre) et de 14,3 % avec lecture au plafond. Ce sont des **paliers physiques réels** (2,5 kg à la barre). Aucun palier plus fin n'a été inventé.
- Paliers du ruleset : barre 2,5 ; haltères 2 ; machine à plaques empilées 5 ; machine à disques 5 ; kettlebell 4.
- Ces paliers **ne sont pas raccordés à l'équipement déclaré par l'utilisateur** : `equipmentIncrements` n'est jamais fourni par app-core et `declaredStepKg` est toujours indéfini. Ce câblage relève d'un lot produit (saisie de l'équipement), pas de ce lot.
- Pour un saut relatif trop grand, deux réponses existent sans inventer de palier :
  - progresser d'abord en répétitions dans la plage (déjà le cas pour le modèle à double progression) ;
  - **reporter la hausse** pour exiger une preuve supplémentaire (P-DEFER : sauts > 10 % 138 → 105 ; combinée à la lecture au plafond : 47).

## 7. Chantier D — B1 et réévaluation des isolations sur 24 semaines

- **B1ISO** est stable : au plus 3 changements d'isolation et 1 aller-retour par profil sur 24 semaines. La protection anti-oscillation du lot 4.5 tient dans la durée.
- Le déficit diminue : de 9,3 à 3,3 pour L41-H3 ; de 1,5 à 0,6 pour L41-FORME ; de 3 à 0 ou 0,5 pour L4-1, L4-4 et L41-H4P.
- **À examiner :** sur L41-FORME, les exercices principaux changent 140 fois avec B1ISO, contre 108 avec A et B1. À l'inverse, sur L41-H3, B1 et B1ISO les ramènent de 140 à 110. L'origine (rotation des emplacements après remplacement d'une isolation) doit être comprise avant toute activation.
- **B1 reste inactif.**

## 8. Chantier E — redistribution hybride sur 24 semaines

| Profil | A | RED-GUARD | RED-DEF-GUARD | SW-ALT + RED-GUARD |
|---|---|---|---|---|
| L4-2 (déficit) | 13,8 | 8,9 | 10,0 | 12,2 |
| L43-HYX3 (HYROX) | 17,7 | 14,5 | 15,5 | **10,0** |
| L42-SHORT (petits groupes) | 3,8 | 3,8 | 3,6 | 3,3 |
| L41-RUN, L42-RUN3 (course) | inchangé | inchangé | inchangé | inchangé |

- Mollets : aucune perte sur 24 semaines (3,7 à 3,8 pour L42-SHORT).
- Durée maximale toujours sous la limite (51 min au plus, pour 60).
- Squat identique dans toutes les variantes.
- **CAND-RED-DEF-GUARD**, construit comme un contenu candidat versionné, donne exactement les mêmes résultats que l'option de simulation RED-DEF-GUARD. Le ruleset candidat reproduit donc bien la politique simulée.
- **Chaîne de lecture complète prête et testée :**
  - une séance générée avec un ruleset candidat porte sa provenance ;
  - la lecture ordinaire ne la retrouve pas ;
  - seule la lecture explicite la retrouve.
- Avant toute activation, il faudra :
  - inscrire le candidat retenu dans le registre ;
  - définir l'ordre de compatibilité des versions.
- **Rien n'est activé.**

## 9. Régressions

- **Aucune régression du moteur actif.** Identité avec le lot 4.5, tests existants verts.
- **Coûts observés des variantes candidates :**
  - P-CLSTAB : somme des charges finales −1,6 % sur 24 semaines. Une partie vient de E-FTEMP, RDL 92,5 contre 97,5 pour B-CLAMP, effet du report d'un saut.
  - P-STAB, 20 profils : L41-H3 gagne 2 changements de sens (de 3 à 5) à 12 semaines.

## 10. Décisions et recommandations

1. **Candidate n° 1 à proposer pour validation : P-CLSTAB.** Elle combine :
   - la lecture au plafond de la plage ;
   - une hystérésis de 3 expositions ;
   - le report unique des hausses de plus de 10 %.

   Effets sur 24 semaines :
   - changements de sens divisés par 2,3 (331 → 146) ;
   - allers-retours divisés par 2,8 (273 → 96) ;
   - décisions démenties juste après coup presque divisées par 2 ;
   - charges principales égales ou supérieures dans tous les scénarios ;
   - difficulté et fatigue persistante toujours détectées.

   Alternative plus simple : B-CLAMP seule, qui apporte environ 75 % du gain.
2. P-BOUND est écartée (aucun effet). B-SUSP et P-HYST ne sont pas retenues seules.
3. Les incréments ne sont pas raccordés à l'équipement : ce câblage est à prévoir dans un lot produit, sans palier inventé.
4. B1ISO est prometteur mais reste bloqué tant que les changements d'exercices principaux de L41-FORME ne sont pas expliqués.
5. Redistribution : choix ouvert entre RED-GUARD (meilleur sur les profils déficitaires) et SW-ALT + RED-GUARD (meilleur sur HYROX). Les deux sont neutres pour la course. La chaîne de lecture versionnée est prête.

**Lot suivant proposé (4.7) :** préparer l'activation contrôlée de P-CLSTAB (ou de B-CLAMP), sous réserve de validation explicite :
- ruleset de progression versionné ;
- trace visible dans l'application ;
- E2E dédié ;
- analyse de L41-FORME pour B1ISO.
