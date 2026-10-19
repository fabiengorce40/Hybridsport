# REKKA — Lot C : avertissement musculaire et maintien volontaire — étude de migration et de repli

| | |
|---|---|
| **Statut** | **Étude documentaire seulement** (RC4.5). Aucun code écrit. L'implémentation attend votre validation séparée. |
| **Décisions d'origine** | D4 (avertissements fondés sur les signaux existants du moteur Musculation), D5 (interférence non bloquante ⇒ avertissement avec maintien volontaire ; sécurité toujours bloquante), D7 (migration et repli présentés avant toute persistance) |
| **Base de l'étude** | `claude/kairo-rc4-dev` (RC4.5) ; repli RC1 TEST `0cf2ceb` ; TEST `a7c1e51` |

---

## 1. Comportement actuel (lu dans le code)

**Démarrage manuel** (« Faire maintenant ») d'une séance composée mais non placée : `startAssessment`, dans `packages/app-core/src/beta0-app.ts`.

**Refus bloquants, dans l'ordre :**
1. qualité `BLOCKED` ;
2. pause douleur active ;
3. hors semaine ;
4. **interférence** : `manualPlacementConflicts` (règles M3 du planificateur) ⇒ `MANUAL_START_INTERFERENCE`, message « Pas aujourd'hui : cette séance serait trop proche d'une autre séance qui sollicite les mêmes zones du corps. »

Le refus d'interférence est aujourd'hui **aussi bloquant** que la sécurité. C'est ce que D5 remet en cause.

**Contrôle avant séance** (`CheckIn`, `packages/app-core/src/checkin.ts`), enregistré à chaque démarrage :
- une décision (`unchanged | adapted | postponed | paused`) ;
- une liste de **raisons** `{ code, params }` (code libre).

---

## 2. Ce que le lot C ferait

| Situation | Aujourd'hui | Lot C |
|---|---|---|
| Interférence musculaire au démarrage manuel (règle M3) | Refus | **Avertissement** : zones concernées et séance voisine, puis choix explicite « Maintenir quand même » ou « Choisir un autre jour » |
| Douleur, pause douleur, signal général | Refus ou pause | **Inchangé** (bloquant) |
| Refus du moteur, qualité `BLOCKED` | Refus | **Inchangé** (bloquant) |
| Hors semaine | Refus | Inchangé |
| Séance planifiée, interférence connue du Strength (`strength.interference.assessment`, actions `full` / `full_and_signal`) | Allègement silencieux ou signal interne | Avertissement **affiché** avant démarrage (lecture des raisons persistées, D4) ; aucun choix requis |

**À persister** : le choix « Maintenir quand même ». Il sert à tracer la décision de l'athlète, l'interférence acceptée et la date. Il n'est jamais relu pour une règle : une séance commencée est reprise telle quelle (code actuel).

---

## 3. Options de persistance

### Option A (recommandée) — aucun nouveau champ : une raison dans le contrôle avant séance

- Le choix est enregistré comme une **raison** du `CheckIn` créé au démarrage :
  - code `KAIRO.MANUAL_START_INTERFERENCE_ACCEPTED` ;
  - paramètres : `requestId`, conflits (`withSport`, `withDate`, `structure`, `rule`), `acceptedAt`.
- La **décision** reste une valeur existante (`unchanged`). Aucune nouvelle valeur d'énumération.
- **Compatibilité :** même contrat `reasons: z.array({ code: string, params })` sur les trois branches.

  | Branche | Contrat |
  |---|---|
  | dev RC4.5 | ✅ |
  | TEST `a7c1e51` | ✅ |
  | Repli RC1 `0cf2ceb` | ✅ |

- **Repli :** l'état reste lisible tel quel. Le code inconnu est ignoré à l'affichage : `checkInReasonsText` renvoie une liste vide pour un code inconnu, vérifié dans le code de dev et de `0cf2ceb`. Aucune entrée dans la liste fermée des champs retirés, aucune copie `kairo.rc3-original`.
- **Perte au repli :** aucune donnée de séance. Seule la phrase « maintenue malgré l'interférence » disparaît de l'historique affiché par RC1.
- **Migration :** aucune (aucun schéma modifié). Version de stockage inchangée.

### Option B — nouveau champ `programmeLogs.*.interferenceOverride`

- Champ facultatif `{ at, conflicts[] }` dans le journal de la séance.
- **Repli :** le champ rejoint la liste fermée de `0cf2ceb`, comme `running.freeRunMeta` en RC4.3. Il est retiré à la lecture, et le texte d'origine est gardé sous `kairo.rc3-original`. Cela demande une mise à jour séparée de la branche de repli, avec un test sur un état réel.
- **TEST `a7c1e51` :** l'état serait refusé (schéma strict, copie illisible gardée). Le retour prévu reste la branche de repli.
- **Intérêt :** aucun, par rapport à A. Le choix n'est relu par aucune règle.

### Option C — aucune persistance

- Le choix vaut pour le démarrage en cours seulement.
- **Traçabilité perdue :** l'historique ne montre pas qu'une interférence a été acceptée. Contraire à l'objectif de traçabilité.

---

## 4. Plan d'implémentation proposé (si l'option A est validée)

1. **app-core** : `startAssessment` renvoie `INTERFERENCE` comme **avertissement** (`warning`, avec les conflits), et non plus comme refus. `startProgrammeSession` accepte un paramètre explicite `acceptInterference: true`, sans lequel le démarrage reste refusé. Ainsi, aucun chemin existant ne change par défaut.
2. **Trace :** raison `KAIRO.MANUAL_START_INTERFERENCE_ACCEPTED` ajoutée au `CheckIn` du démarrage.
3. **Interface :** feuille d'avertissement avec deux boutons, « Maintenir quand même » et « Choisir un autre jour ». Elle indique les zones (libellés existants `STRUCTURE_LABELS`) et la séance voisine.
4. **D4 :** bandeau d'avertissement sur la carte d'une séance planifiée allégée par une voisine (raisons Strength persistées, lecture seule).
5. **Ce qui ne change pas :** douleur, pause, signal général, refus du moteur et qualité `BLOCKED` restent bloquants. Tests adverses prévus : aucun chemin de sécurité ne devient contournable par `acceptInterference`.

**Tests de compatibilité prévus :**
- un état produit par le code lot C (avec la raison) est relu par le code de la branche de repli `0cf2ceb` dans une copie jetable, comme en RC4.3 : sans perte, sans copie illisible ;
- même vérification avec TEST `a7c1e51` ;
- les fixtures RC1 sont relues sans changement.

---

## 5. Décision demandée

| # | Question | Recommandation |
|---|---|---|
| C-1 | Option de persistance | **A** (raison dans le contrôle avant séance, aucun champ) |
| C-2 | Périmètre de l'avertissement avec maintien | Démarrage manuel d'une séance non placée (règle M3) seulement ; les séances planifiées gardent l'allègement du moteur, avec un avertissement affiché |
| C-3 | Branche de repli | Aucune mise à jour nécessaire avec A ; avec B, mise à jour séparée et validée de `claude/kairo-rc1-test-rollback` |

Aucune implémentation avant votre validation.
