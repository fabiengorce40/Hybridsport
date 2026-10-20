# REKKA — RC4.5 lot F6 : mollets à temps résiduel et contenu versionné

| | |
|---|---|
| **Base** | `6419a1d` (lot C validé) → lot F6, branche `claude/kairo-rc4-dev` |
| **Décisions appliquées** | F6-1, F6-2 (R1, R2, R3), F6-3 (aucune version au poids du corps), F6-V (contenu versionné), F6-5 (« Modifier » ⇒ contenu courant) |
| **Inchangé** | Running (aucun fichier) ; branches TEST, production et repli ; aucune fusion, aucun déploiement |
| **Validation** | `pnpm check` ✅ (2 914 tests, 0 échec) ; build ✅ ; E2E ✅ (229 vérifications) |

---

## 1. Ce qui est livré

| Zone | Changement |
|---|---|
| Moteur Strength (`params.ts`, `engine.ts`) | Deux attributs d'emplacement gouvernés, **facultatifs** (absents : comportement inchangé) : `fill: 'residual_time'` (R1) et `untilWeeklyTarget` (R2). |
| Contenu F6 (`strength/tests/fixtures/f6.ts`) | **Surcouche** du ruleset verrouillé 4F et du catalogue de test, qui restent inchangés. Ruleset `0.5.0-strength-f6`, catalogue `0.3.0-strength-test-f6`. Schéma `calf_raise` pour les deux exercices de mollets ; besoin `calves` ; emplacements `fb.calves` et `lo.calves` (accessoire facultatif, suivi, R1, R2) ; retirés sous interférence genou / hanche ; derniers de `optionalOrder` et `needPriority`. |
| Registre versionné (`app-core/provisional-content.ts`) | `strengthContent()` = contenu courant F6 ; `strengthContentFor(ruleset, catalogue)` renvoie aussi le contenu 4F conservé ; version inconnue ⇒ aucun contenu. |
| Régénération (`app-core/start-check.ts`, `beta0-app.ts`) | `sessionEnvironment` : une séance existante est régénérée avec le contenu de **sa provenance persistée**. S'applique aux quatre chemins (régénération au démarrage, adaptation de la séance persistée, état du jour persisté, récupération après course libre) et au catalogue des zones sensibles. |
| Planificateur (`planner/ports.ts`) | **R3** : les éléments à temps résiduel ne comptent ni dans la mesure par groupe de la garde G5, ni dans la signature et le volume des séances jumelles (variation intra-semaine). |
| Gouvernance | Liste fermée « Strength RC4.5 F6 » dans la garde d'architecture (4 fichiers Strength). |

### Règles telles qu'implémentées

- **R1 — temps résiduel.**
  - L'emplacement est traité **après** toute la composition : optionnels ordinaires, instances supplémentaires, préservation du stimulus, puis mobilité (échauffement supplémentaire, retour au calme).
  - Il est ajouté seulement si la séance tient encore dans la durée.
  - Il ne prend jamais la place d'un autre exercice et n'entre pas dans la préservation du stimulus.
  - Il n'est jamais varié en alternative, et n'entre ni dans le vecteur d'optimisation (B1, B3, B5, B6) ni dans les signaux d'interférence.
  - Le regroupement et les leviers d'un bloc sont décidés sur ses seuls éléments ordinaires.
- **R2 — jusqu'à la cible.** L'emplacement est omis, cause `weekly_target_met`, si la projection hebdomadaire de ses groupes atteint déjà le plancher. Cette projection additionne le réalisé sur 7 jours, les séances de la semaine planifiées et non faites, et la séance en cours.
- **Autres omissions, toutes tracées :** `interference`, `no_candidate` (sans machine à mollets ni haltères), `volume` (au-delà du haut), `duration`.

---

## 2. Aucune modification rétroactive (F6-V), démontrée

**Références produites par le code d'avant F6** (`6419a1d`, copie jetable) :
- 3 états réels :
  - profil de consolidation, semaine 1 ;
  - profil de consolidation, semaine 2 (semaine 1 réalisée) ;
  - P2, semaine 1.
- **31 démarrages** de séances de Musculation, avec quatre contrôles chacun : inconnu, fatigue, douleur genou P2, course libre la veille.

**Résultat :** le code F6 donne **exactement** le même résultat sur les 31 démarrages (empreinte du journal et du contrôle).
- Aucun mollet n'est ajouté.
- Les quatre chemins sont exercés :
  - régénération adaptée : 17 ;
  - état du jour sur la séance persistée : 2 ;
  - adaptation de la séance persistée : 1 ;
  - recomposition signalée : 1 ;
  - course libre appliquée ou sans changement : 4.
- Test : `app-core/tests/rc45/f6-versioned-content.test.ts`, avec la sonde `probe-starts.ts`.

**Preuve que le registre est nécessaire :** la même séance, régénérée avec le contenu courant, diffère (test dédié).

| Cas | Comportement vérifié |
|---|---|
| Semaine planifiée après F6 | Provenance F6, régénérée avec le contenu F6. Les séances des semaines antérieures ne sont pas réécrites. |
| Version inconnue du registre | Environnement inchangé : chemin existant « non reproductible », séance gardée. |
| F6-5 « Modifier » une semaine non commencée | Replanifiée avec le contenu F6. |
| Planification sur le contenu 4F (registre) | **Strictement identique à RC1** (31 tests de migration RC1 ; preuve que le code F6 est neutre à contenu égal). |
| Moteur Strength sans emplacement résiduel | 328 tests et goldens S1–S7 inchangés. |

---

## 3. Banc RC4 (6 profils × 6 semaines) : identique hors mollets

**Comparaison avec le lot C (`49f7479`) :** **aucun écart hors mollets** sur les éléments suivants :
- exercices, séries par groupe, ordre ;
- dates, placement G5 et M3 ;
- courses, contenu Cross-training / HYROX, allègements ;
- erreurs ;
- volumes des autres groupes.

**Seul autre changement :** le statut de 7 semaines passe de « partiellement satisfaite » à « satisfaite » (P1b S2–S6, P2 S3 et S5). C'est l'effet direct des mollets à la cible.

| Profil | Séances avec mollets | Mollets / semaine (S1–S6) | Moyenne (avant : 0) | Durée ajoutée par séance concernée |
|---|---|---|---|---|
| P1 | 2 / 18 | 0, 0, 0, 4, 0, 4 | 1,3 | +8 min |
| P1b | 5 / 24 | 0, 4, 4, 4, 4, 4 | 3,3 | +7 à +8 min |
| P2 | 4 / 18 | 0, 0, 4, 4, 4, 4 | 2,7 | +8 à +9 min |
| P3 | 1 / 18 | 0, 0, 4, 0, 0, 0 | 0,7 | +8 min |
| P4 | — | sans Musculation | 0 | — |
| P5 | 1 / 18 | 4, 0, 0, 0, 0, 0 | 0,7 | +8 min |

**Contrôles :**
- **Durée :** aucune séance au-delà du temps disponible.
- **Volume :** aucune semaine au-delà du haut (10).
- **Fréquence :** au plus une séance de mollets par semaine (R2), avec 4 séries à chaque fois.
- **Leg curl :** même nombre d'occurrences. Les progressions et les charges de tous les autres exercices sont identiques.

**Causes d'omission des mollets (banc, séances Full Body et Bas) :**

| Profil | Ajoutés | Interférence | Durée | Cible atteinte (R2) |
|---|---|---|---|---|
| P1 | 2 | 8 | 6 | 2 |
| P1b | 5 | 7 | 0 | 0 |
| P2 | 4 | 0 | 6 | 8 |
| P3 | 1 | 4 | 11 | 2 |
| P5 | 1 | 16 | 1 | 0 |

**R3 vérifié :** la mesure G5 d'une séance avec mollets est sans mollets, et ses autres groupes sont identiques (test dédié). Aucune décision G5 ou M3 ne change.

---

## 4. Différences hors banc : expliquées, avec une régression des mollets à signaler

Elles viennent toutes du schéma `calf_raise` (F6-1). **Avant F6**, un emplacement `isolation_lower` pouvait retenir un exercice de mollets **à la place** du leg curl ou du leg extension. Ce n'est plus possible. Le banc RC4 n'en est pas affecté, car aucun de ses profils n'avait de mollets.

| Rapport (régénéré) | Effet |
|---|---|
| Configurations multiples (consolidation) | Les ischio-jambiers passent de **5,3 à 10,5** séries par semaine (configurations A et E) : **le leg curl n'est plus évincé**. Mollets : 5,5 → 2. |
| Scénario longitudinal B (Haut / Bas) | Identique. |
| **Scénario longitudinal A** (Haut / Bas, Musculation seule) | ⚠️ **Mollets : 22 → 0 séries sur 4 semaines.** Les séances n'ont pas de temps résiduel (R1), et le leg extension reprend l'emplacement `isolation_lower`. Quadriceps 45 → 62, épaules 59 → 64, autres groupes identiques. **Semaine 1 : quadriceps 15 → 14**, toujours au-dessus du plancher (10). |
| Matrice RC4 | Mollets 0 → 1,3 à 3,3. Douleur genou P2 (P1, S4) : l'adaptation n'ajoute plus de mollet de substitution (leg curl retiré, rien ajouté). |
| Taille d'état (52 semaines) | 3 195 → 3 216 Ko (**+0,7 %**) : raisons des mollets. |

### Reproductibilité des séances nouvellement planifiées

Sur le profil de consolidation, les séances F6 se régénèrent fidèlement **4 fois sur 12**, contre **8 sur 12** avant F6.

**Mesure isolée :** le **seul** changement de schéma, sans emplacement de mollets, donne le même 4 sur 12. R1 et R2 n'y sont donc pour rien.

**Cause :** une limite déjà documentée (« historique propre au planificateur »). La régénération reçoit un historique et des progressions différents de ceux de la planification, et la composition change de séances concernées.

**Conséquences :**
- Les séances concernées passent par le chemin sûr existant : séance persistée adaptée, tracée.
- Le test d'équivalence RC3.1 (état du jour) porte désormais explicitement sur le contenu 4F, où l'équivalence reste démontrée. F6 n'ajoute aucune règle d'état du jour.

---

## 5. Repli et TEST

Un état réel F6 (P2, semaine 3 planifiée, séance avec `ex.machine_calf_raise` dans `fb.calves`) a été traité par des copies jetables des deux branches :

| Code | Lecture | Séance affichée | Exécution complète | Progression créée pour les mollets | Semaine suivante | Relecture après écriture |
|---|---|---|---|---|---|---|
| Repli `0cf2ceb` | ✅ (sans copie illisible) | ✅ avec mollets | ✅ (exposition enregistrée) | Aucune (emplacement inconnu, ignoré) | ✅ planifiée, sans mollets | ✅ |
| TEST `a7c1e51` | ✅ | ✅ | ✅ | Aucune | ✅ | ✅ |

**Aucune mise à jour de la branche de repli n'est nécessaire.**

---

## 6. Performances

**Node, banc complet sur 6 semaines :**

| Profil | Avant F6 | Avec F6 |
|---|---|---|
| P2 | 5,2 s | 6,2 s |
| P1 | 3,3 s | 3,9 s |

**Mobile, processeur ×4, planification d'une semaine :** mesuré sur la même machine, dans la même session, pour la base `6419a1d` et pour F6.

| Profil | Base `6419a1d` | F6 | Écart |
|---|---|---|---|
| P1 | 3,95 s | 4,25 s | +8 % |
| P2 | 5,43 s | 6,19 s | +14 % |
| P3 | 4,00 s | 4,97 s | +24 % |

Le surcoût vient de la sélection et de l'assemblage supplémentaires de l'emplacement résiduel dans chaque séance Full Body ou Bas, candidats G5 compris. L'objectif de 3 s n'était déjà pas atteint ; l'écart s'accroît.

---

## 7. Limites et décisions possibles

1. **Scénario A (Haut / Bas, séances pleines) : mollets 22 → 0.** R1 ne laisse jamais de temps. Options, **non implémentées** :
   - **(a)** accepter : cohérent avec R1 et avec la priorité donnée au leg curl et au leg extension ;
   - **(b)** « R1-bis » : l'emplacement résiduel peut prendre la place d'une **instance supplémentaire** d'un emplacement dont tous les groupes sont déjà à la cible (par exemple le second `isolation_lower`), jamais d'un exercice prioritaire ni d'un leg curl ;
   - **(c)** dernière séance de la semaine seulement, si la cible des mollets n'est pas atteinte.
2. **Reproductibilité des séances nouvelles :** 8 → 4 sur 12 sur le profil de consolidation (cause : le schéma `calf_raise`, limite existante). Un correctif possible serait de fournir à la régénération l'historique et les progressions **tels qu'à la planification**. Il sort du périmètre F6.
3. **Coût mobile : +8 à +24 %.**
4. **Alternatives proposées sur le leg curl et le leg extension :** elles ne contiennent plus de mollets (même cause, schéma).

Aucune intégration avant votre accord.

---

## 8. Limite connue retenue : mollets en Haut / Bas (décision du 2026-10-20)

**F6 est conservé tel quel.** Les pistes R1-bis, R1-bis-2, R1-bis-3 et R1-bis-4 sont **abandonnées pour le moment**. Études : `RC4.5-DECISION-R1BIS-REPRO-F8BIS-PERF.md` § 1 et `RC4.5-RAPPORT-D1-D4.md` § 3, code d'étude archivé dans `rc45-etudes/`.

| | |
|---|---|
| **Limite** | Quand les séances **Bas du corps** sont pleines (temps disponible entièrement utilisé par les emplacements ordinaires), l'emplacement `lo.calves` est omis faute de temps (`SLOT_OMITTED … duration`). Les mollets peuvent alors rester à **0 série par semaine**, comme au scénario A (Haut / Bas 4×, hypertrophie, 4 semaines : 22 séries avant F6, 0 avec F6). |
| **Pourquoi elle est acceptée** | R1 garantit que l'ajout résiduel ne remplace jamais un exercice, ne touche aucune progression et ne change ni la durée ni les autres groupes. Les échanges étudiés rendaient les mollets (0 → 16 séries au scénario A), mais déplaçaient dans un cas mixte la progression suivie d'un emplacement (leg extension → leg curl). Votre critère « ne jamais modifier les exercices suivis » n'était donc pas tenu partout. |
| **Ce qui reste vrai** | Dès qu'il reste du temps, les mollets sont ajoutés en dernier jusqu'à la cible hebdomadaire (R1, R2) : banc RC4, P1b 3,3 séries par semaine, P2 2,7. L'omission est tracée dans la séance et le bilan de volume signale les mollets sous le plancher (`reduced_by_constraint`). |
| **Ce que l'utilisateur peut faire** | Augmenter le temps disponible des jours Bas du corps, ou ajouter les mollets lui-même ; rien n'est automatisé. |
| **Réouverture** | À reprendre avec un mécanisme qui ne déplace aucune progression suivie, par exemple : échange interdit tant que l'emplacement de la victime n'a aucune progression suivie, ou cible hebdomadaire répartie par le planificateur. À mesurer avant toute intégration. |
