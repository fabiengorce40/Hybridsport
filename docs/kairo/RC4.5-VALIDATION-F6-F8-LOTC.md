# REKKA — RC4.5 : validation du lot C, versionnement F6, conception corrigée F8

| | |
|---|---|
| **Base** | `ac74200` → lot C `49f7479`, branche `claude/kairo-rc4-dev` |
| **Livré** | **Lot C** (implémenté, commit séparé). |
| **Non implémenté** | **F6** : arrêté, car il exige un versionnement du contenu (solution au §2, à valider avant tout code). **F8** : conception corrigée et faisabilité seulement (§3). |
| **Méthode** | Expériences F6 et F8 en copie jetable (fichiers restaurés, rien commité). Relectures par le repli `0cf2ceb` et par TEST `a7c1e51` dans des copies de travail jetables de ces commits ; aucune branche modifiée. |
| **Inchangé** | Running (aucun fichier) ; branches TEST, production et repli ; aucune fusion, aucun déploiement. |

---

## 1. Lot C — maintien volontaire d'une interférence non bloquante (livré, `49f7479`)

### 1.1 Ce qui change

**App-core** (`packages/app-core/src/beta0-app.ts`) :
- `startAssessment` renvoie `maintainable: true` **seulement** pour une interférence M3 dont les conflits sont identifiés. Les autres refus ne sont jamais maintenables : qualité `BLOCKED`, pause douleur, hors semaine, et le refus de précaution par défaut (profil ou programme absent).
- L'ordre d'évaluation est inchangé : qualité, puis pause douleur, puis semaine, puis interférence. Une cause de sécurité masque donc toujours l'interférence.
- `startProgrammeSession(…, options)` : sans `acceptInterference: true`, le refus `MANUAL_START_INTERFERENCE` est **inchangé**. Avec cette option, seul ce refus est levé ; le contrôle avant séance s'applique ensuite normalement (G1, pause, report, adaptation).
- **Trace** : raison existante `KAIRO.MANUAL_START_INTERFERENCE_ACCEPTED` du contrôle avant séance, avec `requestId`, `acceptedAt` et les conflits (sport, date, structure, règle).
  - Écrite **uniquement si la séance démarre**.
  - Décision du contrôle : une valeur existante (`unchanged` ou `adapted`).
  - **Aucun champ nouveau, aucune valeur d'énumération nouvelle.**
- Sélecteur `maintainedInterference` (lecture seule) pour l'affichage.

**Interface :**
- Carte d'une séance non placée et écran de séance : avertissement lisible, avec la séance voisine, sa date et les zones concernées. Exemple : « Cette séance serait proche de votre séance de musculation du lundi 5 octobre, qui sollicite aussi : effort intense (charge générale), hanches / chaîne postérieure, genoux / cuisses. Vous pouvez la maintenir quand même (votre choix sera noté) ou choisir un autre jour. »
- « Faire maintenant » ouvre une feuille de confirmation avec deux boutons : « Maintenir quand même » et « Choisir un autre jour ».
  - « Maintenir quand même » ouvre ensuite le contrôle avant séance habituel.
  - « Choisir un autre jour » ferme la feuille sans rien écrire.
- Séance maintenue (écran de séance, historique, journal Beta) : « Maintenue à votre demande malgré une interférence musculaire (zones). **Ce n'est pas un ressenti** : seul votre retour de fin de séance indique si elle a été bien tolérée. »
- Refus de sécurité : texte de refus, **aucun** bouton de maintien.

**Hors périmètre, inchangé :**
- Séances planifiées : la règle a déjà été appliquée au placement ; l'option n'a aucun effet (test).
- Fin directe sans démarrage (`startWithoutCheck`) : refus inchangé.
- L'avertissement D4 sur les séances planifiées allégées n'a pas été ajouté (non demandé dans cette autorisation).

### 1.2 Tests C-1 à C-10

Tests app-core dans `packages/app-core/tests/rc45/lotc-interference-maintain.test.ts` (16 tests). Test d'interface dans `apps/kairo/tests/rc45-interference-maintain-dom.test.tsx` (3 tests). Parcours E2E « LOT C » ajouté à `apps/kairo/scripts/e2e.mjs`.

| # | Vérification | Résultat |
|---|---|---|
| C-1 | **Format.** Le contrôle avec la raison valide le schéma strict `zCheckIn` et porte les mêmes clés qu'un contrôle ordinaire. Après rechargement, l'état réécrit est identique octet pour octet. | ✅ |
| C-2 | **Maintien.** L'interférence au jour réel est `maintainable`. Sans confirmation : refus `MANUAL_START_INTERFERENCE`, état intact. Avec confirmation : séance démarrée, raison tracée (conflits, date), décision `unchanged`. Confirmation un jour sans interférence ou sur une séance planifiée : état **identique** au démarrage sans option. | ✅ |
| C-3 | **Sécurité non contournable avec `acceptInterference: true`.** Qualité `BLOCKED`, pause douleur, hors semaine et refus de précaution : refusés. Signal général P4 au contrôle : pause, séance non démarrée, maintien non tracé. Douleur déclarée : **même décision** qu'un jour sans interférence, pour les quatre décisions existantes (adaptée, reportée faute d'adaptation possible, pause, inchangée). | ✅ |
| C-4 | **Cumul interférence et sécurité.** Avec qualité `BLOCKED` ou pause douleur : cause de sécurité, `maintainable: false`. | ✅ |
| C-5 | **Maintenue ≠ bien tolérée.** La fin de séance, le résultat et la semaine suivante planifiée sont **identiques octet pour octet** avec ou sans la raison : aucune règle ne la lit. Le maintien n'écrit aucun champ de tolérance, de ressenti ou de difficulté. Historique et journal : ressenti absent, mention de maintien distincte. | ✅ |
| C-6 | **Retour après maintien.** Une douleur déclarée en fin de séance active la pause douleur. Le ressenti « très difficile » est enregistré tel quel. | ✅ |
| C-7 | **Reprise.** Séance maintenue puis rechargée : reprise directe, sans nouvel avertissement ni nouveau contrôle. | ✅ |
| C-8 | **Interface.** Avertissement sans code interne. Deux boutons, dans l'ordre. « Choisir un autre jour » n'écrit rien. Maintien suivi du contrôle, puis démarrage tracé. Historique annoté. Pause douleur : ni « Faire maintenant » ni maintien. | ✅ |
| C-9 | **E2E (Chromium, build de production).** 8 vérifications « LOT C », dont : avertissement, deux choix, rien d'écrit, maintien tracé (`unchanged`), mention distincte, rechargement sans avertissement, pause douleur sans maintien, aucune erreur de page. | ✅ |
| C-10 | **Repli et TEST** (§1.3). | ✅ repli ; TEST : refus préexistant |

**Comportement existant modifié, attendu.** Deux contrôles anciens attendaient un **refus** d'interférence au démarrage manuel ; ils attendent désormais l'avertissement maintenable :
- E2E « FIELD TEST DAY », étape P0 ;
- `P0-M4` : forme de l'objet, avec le champ `maintainable: false` en plus.

Les autres contrôles P0 sont inchangés : le démarrage sans confirmation reste refusé.

### 1.3 Compatibilité (C-1, C-10)

**Repli `0cf2ceb` :** l'état réel écrit par le lot C (fixture `lotc-maintained-state.json`, séance maintenue terminée) a été relu dans une copie jetable de ce commit.
- **Lisible**, et la raison est conservée telle quelle.
- Le code de repli ignore le code de raison inconnu à l'affichage (`checkInReasonsText` : `default: return []`).
- **Relecture strictement équivalente avec ou sans la raison :**
  - l'état réécrit est identique, à la raison près ;
  - résultats et journaux identiques ;
  - second passage stable.
- La copie `kairo.rc3-original` est créée **dans les deux cas**, avec ou sans la raison. Elle est donc due aux champs ajoutés par RC4.4 et RC4.5 avant le lot C, pas au lot C.

**TEST `a7c1e51` :** l'état est refusé (« illisible »), **avec comme sans la raison**.
- Ce refus est préexistant : TEST ne connaît pas les champs ajoutés depuis RC4.3, comme le signalait déjà le rapport RC4.3.
- Le lot C n'y ajoute rien. Le retour prévu reste la branche de repli.

**Aucune mise à jour** de la branche de repli n'est nécessaire.

### 1.4 Banc RC4 et performances

| Contrôle | Résultat |
|---|---|
| Banc 6 profils × 6 semaines | **Strictement identique** à G5-a (`65611c0`) : séances, exercices, séries et charges prescrits, durées, volumes, erreurs |
| Matrice RC4 (`pnpm check`) | Identique |
| Durées | Aucune séance au-delà du temps disponible. Durée estimée maximale : 62 min (P1, P2, P3), 60 min (P1b), 72 min (P5) |
| Coût de calcul (Node) | Inchangé, au bruit près : P2 5,1–5,2 s, P1 3,2–3,3 s |
| Coût mobile | Inchangé : le lot C n'intervient pas dans la planification |

Volumes moyens par semaine, identiques avant et après le lot C (séries) :

| Profil | Quadriceps | Ischio-jambiers | Fessiers | Mollets | Pectoraux | Dos | Épaules | Bras | Tronc | Couples (semaine, groupe) sous la cible | Au-dessus de la borne haute |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | 7,2 | 8,5 | 11,5 | 0 | 14,3 | 9,2 | 15,4 | 16,8 | 7,8 | 19 | 9 |
| P1b | 9,2 | 8,2 | 12,3 | 0 | 12,3 | 10,2 | 15,2 | 18,2 | 9,3 | 8 | 8 |
| P2 | 10,8 | 11,2 | 14,8 | 0 | 14,3 | 9,3 | 15,5 | 16,3 | 7,6 | 13 | 13 |
| P3 | 9,3 | 9,3 | 12,5 | 0 | 13,8 | 9,0 | 15,4 | 16,5 | 7,8 | 17 | 8 |
| P5 | 4,3 | 4,3 | 7,5 | 0 | 9,8 | 9,3 | 16,6 | 16,0 | 9,1 | 23 | 9 |

**Progressions :** identiques, puisque les charges et les séries prescrites par semaine le sont.

### 1.5 Validation

- `pnpm check` : **2 897 tests, 0 échec** (2 ignorés).
- Build ✅.
- E2E ✅ : **229 vérifications**, dont 8 pour le lot C.

---

## 2. F6 — reproductibilité : versionnement nécessaire (solution à valider, aucun code)

### 2.1 Constat (mesuré)

Au démarrage, une séance planifiée est **régénérée** avec le contenu **courant** (`start-check.ts`). Elle est déclarée reproductible si la régénération à état inconnu redonne exactement la séance persistée.

**Expérience jetable :**
1. États planifiés avec le contenu actuel (5 profils, semaine 1).
2. Application de la composition F6-a validée : schéma `calf_raise` et emplacements `fb.calves` / `lo.calves`, retirés sous interférence.
3. Démarrage de chaque séance de musculation avec trois contrôles : inconnu, fatigue, douleur genou P2.
4. Comparaison avec le démarrage avant F6, à l'identifiant de trace près.

| | Démarrages | Identiques à l'avant-F6 | Différents | Dont chemin « non reproductible » |
|---|---|---|---|---|
| Contenu F6 courant (sans versionnement) | 48 | 26 | **22** | 16 |
| Contenu de la version persistée (versionnement) | 48 | **48** | 0 | 0 |

**Effets rétroactifs observés sans versionnement :**
- **Mollets ajoutés à des séances planifiées avant F6** par l'adaptation à la douleur (genou P2) : 9 séances sur 5 profils. Exemple : P2, séance 1, `machine_calf_raise` ajouté.
- Chemin « recomposition signalée » (`CHECKIN_SESSION_RECOMPOSED`) avec le nouveau contenu : 5 démarrages (P1b et P5).
- État du jour appliqué à la séance persistée au lieu de la régénération (`CHECKIN_READINESS_PERSISTED`) : 8 démarrages.
- Les semaines planifiées elles-mêmes ne sont jamais réécrites (vérifié : semaine 1 identique après la planification de la semaine 2).

**Conclusion :** sans versionnement, F6 ne satisfait pas votre condition. Le nouveau catalogue s'appliquerait aux séances antérieures dès qu'une adaptation au démarrage est nécessaire.

Conformément à votre consigne, **F6 n'est pas implémenté**.

### 2.2 Solution proposée : contenu versionné, choisi par la provenance persistée

Chaque séance persistée porte déjà sa provenance : `rulesetVersion`, `catalogVersion` et `engineVersion`. Exemple actuel : `0.4.0-strength-science-lock` et `0.2.0-strength-test`. **Aucune donnée nouvelle n'est donc à persister.**

| Élément | Proposition |
|---|---|
| Versions | F6 = nouvelles versions du ruleset Strength (`0.5.0-…-f6`) et du catalogue (`0.3.0-…`). Le registre scientifique (`strength/src/science`, G4) reçoit la nouvelle version du ruleset : `validate.ts` exige leur concordance. |
| Registre de contenu | `provisional-content.ts` : la fonction actuelle `strengthContent()` reste la version **courante**. Une nouvelle fonction `strengthContentFor(rulesetVersion, catalogVersion)` renvoie la version **antérieure** conservée, ou `undefined` si la version est inconnue. Le contenu avant F6 est **le document actuel inchangé**, et F6 un ajout déclaratif par-dessus : l'ancien contenu reste ainsi dans le code sans duplication. |
| Planification d'une nouvelle semaine | Contenu courant (F6), sans changement. |
| Régénération d'une séance existante | Contenu de **sa** provenance, sur les quatre chemins : régénération au démarrage (`regenerateSession`), récupération après course libre, adaptation de la séance persistée (`adaptPersistedSession`), état du jour persisté (`readiness-persisted`). Chacun lit la provenance de l'enregistrement persisté, puis construit l'environnement Strength avec ce contenu. |
| Version inconnue (contenu retiré du code un jour) | Chemin existant « non reproductible » : séance persistée gardée et adaptée seulement par le CORE. Ce chemin est sûr et déjà testé. |
| Progressions | Non concernées : les progressions ne référencent pas la version du ruleset. Celles du leg curl et des exercices prioritaires sont intactes. |
| Bilan de volume F5 et affichages | Lus sur les séances persistées : inchangés. |
| « Modifier » une semaine non commencée | Replanification complète : nouvelle planification, donc contenu courant (F6). Ce n'est pas un effet rétroactif, puisque l'athlète recrée la semaine. **À confirmer (F6-5).** |
| Repli `0cf2ceb` et TEST | Aucun champ nouveau. Le schéma `calf_raise` n'apparaît que dans des séances nouvelles. **À vérifier par le test de relecture** (une séance avec `ex.machine_calf_raise` est lisible : l'identifiant d'exercice existe déjà dans leur catalogue). |
| Gouvernance | Lot fermé « Strength RC4.5 F6 » : `ruleset.ts`, `catalog.ts`, `params.ts`, `engine.ts`, `codes.ts`, registre scientifique. `provisional-content.ts` et les quatre chemins de régénération dans app-core. |

**Points d'appui mesurés :** le chemin de démarrage accepte déjà un environnement explicite, et la provenance est lue sur l'enregistrement persisté. Avec l'environnement de la version persistée, l'expérience donne **48 démarrages sur 48 identiques** (§2.1).

**Coûts et risques :**
- Deux contenus Strength chargés en mémoire au lieu d'un.
- Un point de lecture direct du contenu courant contourne l'environnement (`planning.ts`, lecture de l'archétype pour la règle de démarrage). Il doit passer par le registre.
- Tests à ajouter : les quatre chemins, avec un état planifié avant F6 (fixture réelle écrite par le code actuel), régénéré à l'identique après F6. Plus une version inconnue, et une semaine planifiée après F6 contenant les mollets.

### 2.3 Rappels F6 (validés, inchangés)

- R1 (temps résiduel), R2 (cible hebdomadaire) et R3 (garde G5).
- Aucun remplacement du leg curl ni d'un exercice prioritaire.
- Version au poids du corps : possibilité conservée (F6-3), non ajoutée.
- **Critère d'acceptation :** banc identique hors lignes de mollets, aucune baisse des autres groupes musculaires.

---

## 3. F8 — conception corrigée : identité de variante persistante

### 3.1 Ce qui est refusé, et pourquoi la conception précédente l'impliquait

La conception précédente reprenait le rang de la séance dans la semaine **par date**, comme la graine Strength actuelle (`strength:{archétype}:{stimulus}:{rang}`). Déplacer Haut A après Haut B aurait échangé les variantes. **Ce choix est abandonné.**

### 3.2 Identité proposée

**Clé :** `(archétype, variante)`, variante ∈ {A, B, C}.

**Attribution :**
- Une seule fois, à la composition de la semaine par le planificateur.
- Selon l'**index de la demande** (`semaine.strength.k`), fixé par le programme **avant tout placement** et indépendant du jour.
- Parmi les séances d'un même archétype, l'index `k` le plus petit reçoit A, le suivant B, puis C.

**Persistance :** la variante est écrite dans la séance persistée, puis **relue, jamais recalculée** :
- régénération au démarrage ;
- affichage « Haut B » ;
- exécution et progression.

**Encodage, sans changement de schéma :** suffixe des identifiants d'emplacement de la séance, des progressions et des expositions.
- Variante A : aucun suffixe. Les progressions existantes deviennent donc celles de A, sans migration.
- Variantes B et C : `.vB` et `.vC`, par exemple `up.iso_upper.vB`.

**Correction de la conception précédente :** le suffixe `#2` est **invalide**. Le schéma d'identifiant du domaine (`^[A-Za-z0-9][A-Za-z0-9._:-]*$`, présent aussi sur le repli) refuserait les séances persistées. `.vB` est conforme.

### 3.3 Démonstration de faisabilité (mesures)

**Stabilité de l'identité sur le banc RC4** (6 profils × 6 semaines, placement global G5 actif comparé à V0 sans G5) :

| Profil | Couples (semaine, archétype) à plusieurs séances | Ordre des dates ≠ ordre `k` | Ensemble `k` de l'archétype changé par G5 | Ensembles `k` par archétype sur 6 semaines |
|---|---|---|---|---|
| P1 | 6 | 0 | 0 | Full Body {1,2,3} |
| P1b | 12 | 0 | 0 | Haut {1,2} ou {1,3} ; Bas {2,4} ou {3,4} |
| P2 | 6 | **6** | 0 | Full Body {1,2,3} |
| P3 | 6 | **5** | 0 | Full Body {1,2,3} |
| P5 | 6 | 0 | 0 | Full Body {1,2,3} |

- **Identité fondée sur la date :** elle aurait échangé les variantes dans **11 couples (semaine, archétype) sur 36**. Exemple : P2 semaine 1, séances `k` 1, 2, 3 placées les 5, 8 et 7 octobre. Autre exemple : P1 semaine 2, où G5 réordonne les dates (`2@15 3@14` devient `2@16 3@18`).
- **Identité fondée sur `k` :** stable dans **36 couples sur 36**. G5 ne change jamais l'ensemble `k` d'un archétype.

**Relecture d'un état F8.** Un état réel P2 de 2 semaines a été fabriqué : 9 progressions de variante B (`.vB`), des expositions B, et une séance persistée B. Il a été relu par des copies jetables :

| Code | Lecture | Progressions B après une semaine planifiée par ce code | Progressions A | Copie `kairo.rc3-original` |
|---|---|---|---|---|
| Repli `0cf2ceb` | ✅ | 9 sur 9, **intactes** (ni closes, ni modifiées, ni utilisées) | 9 actives | Non |
| TEST `a7c1e51` | ✅ | 9 sur 9, intactes | 9 actives | Non |

Le code de repli ne clôt une progression que pour inadmissibilité, stagnation ou horizon, jamais pour un emplacement inconnu. Pendant un repli, les deux séances utilisent les progressions A (comportement RC1) : la variante B est gelée, puis reprise au retour sans perte.

### 3.4 Garanties par situation

| Situation | Comportement | Garantie |
|---|---|---|
| Déplacement G5 ou M3 | Ils n'existent que pendant la planification. L'identité suit `k`, pas le jour. | Mesurée : 36 sur 36 |
| Séance planifiée puis démarrée un autre jour, ou adaptée au démarrage | La variante est lue dans la séance persistée. | Par construction (à tester) |
| Haut A placé après Haut B dans la semaine | Reste Haut A : exercices, charges et progressions A. | Par construction |
| « Modifier » (semaine non commencée, replanification complète) | Même règle `k` : mêmes variantes pour les mêmes index. | Mesure à faire à l'implémentation |
| Fréquence 2 → 3 | `k` = 3 donne C, une nouvelle variante sans historique. Charges issues des expositions, sinon calibration. | — |
| Fréquence 3 → 2 | Progressions C suspendues (ni closes, ni supprimées), reprises si la fréquence revient. | — |
| Composition modifiée (Full Body ↔ Haut / Bas) | Progressions par archétype, déjà en place. | — |
| Sauvegarde et rechargement | Variante dans la séance persistée. | Par construction |
| Repli, puis retour | Lecture sans erreur. B gelée, puis reprise. | Mesurée (§3.3) |

### 3.5 Points ouverts, à trancher avant l'implémentation

1. **La graine Strength** passe du rang par date à la variante persistée. Dans les semaines où l'ordre des dates diffère de l'ordre `k` (P2, P3), les séances générées changent. Les différences du banc seront attribuées.
2. **Haut / Bas (P1b) :** l'archétype de chaque `k` est attribué par la composition, dans l'ordre des dates. La variante reste stable, puisque l'ordre `k` est conservé parmi les séances de l'archétype. En revanche, le jour où tombe Haut A peut varier d'une semaine à l'autre.
3. **Mouvements structurants :** une ancre par variante. Tests prévus : mêmes exercices structurants d'une semaine à l'autre pour chaque variante, progression des charges par variante, accessoires distincts et stables, jamais aléatoires.

**F8 n'est pas implémenté.**

---

## 4. Décisions demandées

| # | Question | Recommandation |
|---|---|---|
| F6-V | Versionnement du contenu par la provenance persistée (§2.2) | Oui : seule solution mesurée qui garde 48 démarrages sur 48 identiques |
| F6-5 | « Modifier » une semaine non commencée après F6 : nouvelle planification avec le contenu F6 | Oui |
| F8-I | Identité de variante par l'index `k`, attribuée une fois, persistée, jamais recalculée | Oui |
| F8-E | Encodage par suffixe `.vB` / `.vC` (A sans suffixe) | Oui (relecture repli et TEST démontrée) |
| F8-G | Changement des graines Strength dans les semaines où l'ordre des dates diffère de l'ordre `k` | Accepter, avec des différences de banc attribuées |
| C-D4 | Avertissement affiché sur les séances planifiées allégées par une voisine (D4) | Lot séparé, si vous le souhaitez |

Aucune fusion, aucun déploiement. En attente de votre accord.
