# KAIRO — Strength S2 : contrat de substitution directe

## 1. Problème et cause racine

En test réel, les « Alternatives prévues » étaient incohérentes sur presque tous les exercices. Exemple : Pec deck → élévations latérales machine, extension triceps poulie, élévations latérales poulie.

**Où la liste était calculée.** Dans le moteur Strength (`packages/strength/src/engine.ts`, assemblage de la séance), et nulle part ailleurs :

```ts
const alternatives = p.ranked.slice(1).map((r) => r.exercise.id).slice(0, 3);
```

C'est-à-dire les 2ᵉ à 4ᵉ CANDIDATS DE L'EMPLACEMENT : tout exercice qui satisfait le même **besoin** (`strength.needs`), trié par les critères de sélection. Le reste de la chaîne ne fait que transporter et afficher cette liste :
- CORE : `SessionItem.alternatives` ;
- app-core : `session_record` ;
- React : « Alternatives prévues ».

**Pourquoi c'est faux.** Un besoin dit ce que l'emplacement doit obtenir, pas ce qui remplace un exercice. Il est volontairement large :
- `isolation_upper` = pattern `isolation_upper`, soit pec deck, curls, extensions triceps et élévations latérales ensemble ;
- `isolation_lower` réunit leg curl, leg extension et mollets ;
- `trunk` (région `core`) réunit Pallof, planche et dead bug ;
- `hip_dominant` réunit soulevé de terre roumain et hip thrust.

La spec Strength 03 §17.2 le nomme d'ailleurs : « même besoin, autre famille » est le niveau F3, fidélité FAIBLE. C'est un exercice apparenté, pas un substitut.

**Hypothèse « structures de demande » : écartée.** Les 8 structures (`upper_push`, `lower_knee`…) n'entrent jamais dans le calcul des alternatives. Elles ne servent qu'au profil de demande / à l'interférence, et au filtre F9 qui peut seulement EXCLURE. La confusion réelle est **besoin d'emplacement ≠ substitution**, du même ordre que DemandProfile ≠ substitution : un regroupement fait pour programmer n'établit aucune équivalence de prescription.

**Ce qui existait déjà et n'était pas utilisé.** Le catalogue porte des substitutions DÉCLARÉES, avec fidélité (`high` / `medium` / `low`) et contexte. C'est une donnée gouvernée, validée par le chargeur (fidélité `high` ⇒ même classe d'équivalence), et utilisée par le CORE pour la réparation. Les alternatives affichées l'ignoraient.

## 2. Métadonnées du catalogue

**Disponibles et suffisantes pour le contrat minimal :**
- pattern principal : encode push / pull, horizontal / vertical, genou / hanche, isolation haut / bas, gainage ;
- muscles primaires et secondaires ;
- `compound` (poly / mono-articulaire) ;
- `movementType` ;
- `laterality` ;
- `defaultPrescriptionType` ;
- `loadable` / `loadModel` ;
- matériel ;
- `contraindicationTags`, `painSensitiveAreas`, `movementTags` ;
- famille, classe d'équivalence ;
- substitutions déclarées.

**Non nécessaires (non créées) :** une nouvelle taxonomie de « fonction » ; le pattern et les muscles primaires suffisent à séparer pec deck / élévation latérale / triceps / curl.

## 3. Contrat de substitution directe (`strength-substitution-1.0.0`)

Le contrat est implémenté dans `packages/strength/src/substitution.ts`.

1. **Source unique.** Les substitutions DÉCLARÉES par le catalogue. Le moteur ne déduit aucune équivalence. Pas de déclaration ⇒ aucune alternative (fail-closed).
2. **Fidélité.** `high` ou `medium`. `low` = repli signalé (spec catalogue), jamais proposé comme alternative.
3. **Invariants démontrés par les métadonnées** (spec 03 §17.1 : pattern, muscles primaires, stimulus / prescription). Chacun refuse si différent :
   - même pattern principal ;
   - mêmes muscles primaires ;
   - même `compound` ;
   - même `movementType` ;
   - même `laterality` : une répétition unilatérale n'est pas une répétition bilatérale, et aucune règle ne convertit ;
   - même type de prescription ;
   - même caractère chargeable : une prescription en charge ne se réalise pas sans charge.
4. **Contexte de la séance.** L'alternative doit passer les filtres éliminatoires de l'emplacement :
   - matériel, restrictions, exclusions utilisateur ;
   - niveau / technique ;
   - contexte multisport, charge du principal.

   **Douleur :** toute zone sensible concernée par une restriction de douleur, y compris `reduce`, retire l'alternative. Aucune compatibilité médicale n'est déduite de la mécanique.
5. **Charge et prescription.** L'alternative est un identifiant d'exercice. Aucune charge, aucune répétition, aucune intensité n'est transportée. La frontière du CORE (`REPAIR.LOAD_TRANSFER_REFUSED`, `REPAIR.PACE_TRANSFER_REFUSED`) est inchangée.

**Interface.** React affiche seulement ce que le moteur valide :
- aucune ⇒ rien ;
- une ⇒ « Alternative prévue : … » ;
- plusieurs ⇒ « Alternatives prévues (compatibles) : … ».

## 4. Audit du catalogue complet (catalogue 0.2.0-strength-test)

Rapport complet par exercice : `packages/strength/tests/architecture/__reports__/substitution-audit.md` (généré et contrôlé par la garde).

| Mesure | Valeur |
|---|---|
| Exercices Strength actifs | 48 |
| Couples AVANT (même besoin d'emplacement) | 174 |
| Couples APRÈS (substituts directs) | 8 |
| Couples supprimés | 166 |
| Substitutions déclarées / refusées par le contrat | 30 / 22 |
| Exercices sans substitut direct | 42 |
| Couples compatibles par métadonnées mais non déclarés | 38 |

Substituts directs retenus (8 couples) :
- squat barre → goblet squat, presse à cuisses ;
- presse à cuisses → goblet squat ;
- développé couché → développé haltères, chest press machine ;
- chest press machine → développé haltères ;
- pompes inclinées → pompes ;
- rowing machine → rowing poulie.

## 5. Séance réelle Beta 0 (Haut du corps, hypertrophie, lundi)

| Exercice | Avant | Après | Pourquoi |
|---|---|---|---|
| Développé couché | chest press machine, développé haltères, pompes inclinées | développé haltères, chest press machine | déclarés `medium`, tous invariants tenus ; pompes inclinées : apparentées (même besoin), non déclarées, non chargeables |
| Traction | tirage vertical, traction assistée | — | déclarées, mais refusées : tirage vertical = `movementType` différent (gymnastique / musculation) ; traction assistée = chargeable différent |
| Rowing machine | rowing poulie, rowing haltère | rowing poulie | rowing poulie déclaré et conforme ; rowing haltère : non déclaré depuis la machine (et unilatéral) |
| Développé épaules machine | développé haltères, développé barre | — | aucune substitution déclarée (compatibles par métadonnées : donnée manquante) |
| Pec deck | élévations latérales machine, extension triceps poulie, élévations latérales poulie | — | aucune déclaration ; les trois avaient des muscles primaires différents (seul l'écarté poulie serait compatible : non déclaré) |

Bas du corps (vendredi) :

| Exercice | Avant | Après | Pourquoi |
|---|---|---|---|
| Squat barre | hack squat, presse, goblet | goblet, presse | déclarés et conformes ; hack squat non déclaré |
| Soulevé de terre roumain | SDT roumain unilatéral, SDT roumain haltères, hip thrust machine | — | unilatéral : latéralité ; haltères : non déclaré ; hip thrust : muscles différents |
| Leg curl | leg extension, mollets machine, mollets haltères | — | muscles différents ; repli déclaré `low` |
| Fente bulgare | fente marchée haltères, fente sac lesté, fente arrière | — | latéralités différentes ou non déclarées |
| Mollets machine | leg extension, mollets haltères | — | leg extension : muscles différents ; mollets haltères : non déclaré |

Full body : Pallof → (planche, dead bug) devient « — » (patterns différents) ; extension triceps → (élévations, pec deck, curl) devient « — ».

## 6. Données manquantes (à sourcer / gouverner — rien n'est déduit)

1. **Déclarations de substitution absentes** pour les 22 exercices ajoutés au catalogue de test (pec deck, curls, élévations, triceps, mollets, hip thrust, développés épaules, hack squat, leg extension, RDL haltères, fente marchée, Pallof, dead bug). Les 38 couples compatibles par métadonnées sont listés dans le rapport comme CANDIDATS. Ils doivent être revus puis déclarés avec leur fidélité (`reviewStatus`), jamais admis automatiquement.
2. **Latéralité.** Aucune règle ne dit comment une prescription bilatérale se transpose en unilatéral (répétitions par côté, charge). Tant qu'elle manque, RDL → RDL unilatéral et rowing poulie → rowing haltère sont refusés.
3. **`movementType` traction / tirage.** La traction est classée `gymnastic`, le tirage vertical `strength`. À arbitrer : soit la métadonnée, soit l'admission explicite d'un couple gymnastique / musculation.
4. **Sémantique de la fidélité.** Elle diverge entre la spec Strength 03 §17.2 (`medium` = même famille) et les déclarations du catalogue (`medium` entre familles différentes : squat barre → presse). À harmoniser.
5. **Conversion de charge entre substituts.** Aucune règle gouvernée (et aucune créée) : une alternative démarre sans charge transférée.
6. **Compatibilité douleur.** Seules les zones sensibles existent ; aucune donnée ne permet de dire qu'une alternative est sûre pour une douleur donnée. D'où le fail-closed, y compris en `reduce`.

## 7. Ce qui reste hors contrat (inchangé, documenté)

- **Réparation du CORE** (`admissibleSubstitutes`, toutes disciplines). Elle utilise encore les substitutions déclarées de toute fidélité, sans les invariants. Elle ne touche que les items SANS charge ni allure (transferts refusés), car le moteur filtre déjà en amont, et elle n'alimente pas les « Alternatives prévues ». L'aligner sur le contrat est un changement CORE générique, multi-disciplines, à décider séparément.
- **Substitution d'ancre interne au moteur** (spec 03 §17, F1–F3). Elle sert quand l'exercice ancré d'une track est impossible : choix interne, tracé `SELECT.SUBSTITUTION(_LOW_FIDELITY)`, sans transfert de charge. Ce n'est pas une alternative proposée.
- **Propositions alternatives du moteur** (une séance où un accessoire change). Le CORE départage : ce ne sont pas des substitutions proposées à l'utilisateur.

## 8. Tests et garde permanente

**`packages/strength/tests/unit/substitution-contract.test.ts` (23 tests) :**
- catalogue complet : chaque substitut direct est déclaré (`high` / `medium`), différent de la source, actif, Strength, avec tous les invariants tenus, et chargeable identique ;
- invariants symétriques, déclarations asymétriques ;
- chaque refus expliqué ;
- adversariaux (refusés même si le catalogue les déclarait) :
  - pec deck → élévation latérale / triceps ;
  - rowing → élévation latérale ;
  - curl → triceps ;
  - leg curl → leg extension ;
  - squat → SDT roumain / leg extension ;
  - Pallof → planche ;
  - développé couché → pec deck ;
- source → elle-même ;
- nouvel exercice sans déclaration ⇒ aucune alternative ; déclaration incohérente ⇒ refusée ;
- fidélité `low` ⇒ jamais ;
- goldens S1–S7 : alternatives ⊆ substituts directs ;
- matériel indisponible, exclusion, douleur `reduce` ;
- expositions prévues sans effet ;
- déterminisme ;
- identifiants seuls (aucune charge transportée) ;
- rapport d'audit contrôlé par snapshot.

**Autres tests :**
- `packages/app-core/tests/strength-substitution.test.ts` : vraie semaine Beta 0, alternatives persistées ⊆ substituts directs ;
- `apps/kairo/tests/substitution-dom.test.tsx` : séance réelle jusqu'au DOM (pec deck sans mention, singulier, « compatibles »).

**Goldens Strength :** 21 fichiers régénérés. Diff sémantique vérifié : seuls 77 champs `alternatives` changent ; exercices, séries, charges, RIR et durées sont identiques.
