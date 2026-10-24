# RC5.1 — Intégration contrôlée Haut A/B et Bas A/B (variante C)

Branche de développement uniquement (`claude/kairo-rc4-dev`). **Aucun déploiement** : ni production, ni BÊTA.

## 1. Ce qui est intégré

| Élément | Détail |
|---|---|
| Groupes de choix | Nouveau champ `preferred` sur un membre d'un groupe : membre préféré choisi en priorité (après une ancre existante), **repli** sur un autre membre faisable si le préféré ne l'est pas (douleur, matériel). Cause tracée `preferred`. |
| Ancres | `declarableAnchors` déclare d'abord l'ancre de l'emplacement préféré : un repli ponctuel ne fait pas basculer durablement la séance. |
| Archétypes | `str_upper_a` (principal poussée horizontale, tirage vertical), `str_upper_b` (miroir : poussée verticale, tirage horizontal), `str_lower_a` (principal genou, secondaire hanche), `str_lower_b` (miroir). |
| Contenu versionné | Ruleset `0.8.0-strength-rc51` (surcouche de L1b-4). **L1b-4 0.7.0, L1-V3, F6 et 4F restent au registre** : les semaines existantes sont relues et régénérées avec leur contenu d'origine. |
| Composition | Règle `weeklyComposition@0.2.0-candidate` : à 4 séances, objectif **hypertrophie** → Haut A, Bas A, Haut B, Bas B. Force et forme générale : rotation commune inchangée. Contenu sans archétypes A/B → repli sur la rotation commune (aucun refus). |
| Rotation des semaines | Ordre A les semaines calendaires ISO paires, ordre B (Haut B, Bas B, Haut A, Bas A) les impaires. Déterministe (date du lundi, aucun état), trace `weekOrder` sur chaque séance. |
| Interface | Libellés « Haut du corps A / B », « Bas du corps A / B ». Les anciennes semaines restent « Haut du corps » / « Bas du corps ». |
| Version de planification | Inchangée (`beta0-m31`) : aucune semaine existante n'est replanifiée par la mise à jour. |

### Objectifs

| Objectif | Décision |
|---|---|
| Hypertrophie (« Masse musculaire ») | Variante C **activée**. |
| Force | Programmation existante **conservée** (vérifié identique, profil S4F). |
| Mixte (« Forme générale ») | **Non activé**. L'étude (activation temporaire, puis retrait) ne confirme pas une progression cohérente : ischios 7,8 → 7,2 séries, semaines au-dessus du haut 13 → 17, tronc 6,3 → 5,5, charges principales plates sur 6 semaines dans les deux cas. |

La fréquence n'est pas imposée à l'identique : seul l'objectif hypertrophie à 4 séances change.

## 2. Banc avant / après (13 profils, 6 semaines, chemin réel)

Référence figée produite par le code d'avant RC5.1 : `packages/app-core/tests/rc51/fixtures/pre-rc51-bench.json`.

**Profils inchangés, octet pour octet** (séances, charges, durées, démarrages) : P1, P2, P3, P4, P5, S3, S4F (force), S4G (forme générale). Aucune régression Full Body.

| Profil | Version | Pecto | Dos | Épaules | Bras | Tronc | Sous plancher | Au-dessus haut | Poussée / tirage | Durée moy / max | Dépass. | R-A |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S4 (4× seule) | avant | 12,3 | 10,2 | 15,2 | 18,3 | 9,0 | 6 | 12 | 19,5 / 10,2 (1,9) | 48 / 60 | 0 | 24/24 |
| S4 | **après** | 11,3 | 10,7 | 15,0 | 18,0 | 7,8 | 6 | 13 | 19,5 / 10,7 (1,8) | 49 / 60 | 0 | 24/24 |
| P1b (4× + course) | avant | 12,3 | 10,2 | 15,2 | 18,3 | 9,4 | 3 | 8 | 19,5 / 10,2 (1,9) | 44 / 60 | 0 | 24/24 |
| P1b | **après** | 11,3 | 10,7 | 15,0 | 18,0 | 9,0 | 3 | 8 | 19,5 / 10,7 (1,8) | 45 / 60 | 0 | 24/24 |
| S4H (+ HYROX) | avant | 12,3 | 10,2 | 15,3 | 18,2 | 9,7 | 1 | 12 | 19,5 / 10,2 (1,9) | 49 / 60 | 0 | 24/24 |
| S4H | **après** | 11,3 | 10,7 | 14,1 | 17,6 | 8,1 | 1 | 12 | 18,7 / 10,7 (1,8) | 48 / 60 | 0 | 24/24 |
| S4C (+ Cross-training) | avant | 12,3 | 10,2 | 15,2 | 18,3 | 9,5 | 0 | 13 | 19,5 / 10,2 (1,9) | 51 / 60 | 0 | 24/24 |
| S4C | **après** | 11,3 | 10,7 | 15,0 | 18,0 | 8,8 | 0 | 15 | 19,5 / 10,7 (1,8) | 51 / 60 | 0 | 24/24 |
| S4D (haltères seuls) | avant | 6,2 | 7,0 | 13,3 | 14,2 | 8,1 | 19 | 7 | 16,3 / 7,5 (2,2) | 40 / 55 | 0 | 24/24 |
| S4D | **après** | 5,2 | 7,0 | 13,8 | 14,2 | 7,8 | 18 | 7 | 16,3 / 7,5 (2,2) | 39 / 55 | 0 | 24/24 |

Quadriceps, ischios, fessiers et mollets : inchangés sur tous les profils. Séries par semaine (moyenne 6 semaines) ; « sous plancher » et « au-dessus haut » : nombre de (groupe × semaine).

### Mouvements principaux et progression

| Profil | Avant | Après |
|---|---|---|
| S4, S4C | développé couché ×12, squat ×12 | développé couché ×6, développé militaire ×6, squat ×6, soulevé roumain ×6 |
| S4D | développé haltères ×12, goblet squat ×12 | développé haltères ×6, développé épaules haltères ×6, goblet squat ×6, soulevé roumain unilatéral ×6 |
| P1b | squat 40 → 42,5 (exp. 5) → 45 (exp. 11) | squat 40 → 42,5 (exp. 4) ; soulevé roumain 40 → 42,5 (exp. 4) |
| S4H | squat 40 → 42,5 (exp. 5) | squat 40 sur 6 expositions (**risque**, voir § 5) |

Continuité des charges à la migration (état S4 réel après 3 semaines, semaine 4 planifiée par L1b-4) : la semaine 4 est conservée telle quelle (Haut / Bas, provenance 0.7.0) ; la semaine suivante passe en A/B avec développé couché et squat **repris de l'historique** (40 kg), soulevé roumain repris (42,5 kg). Seul le développé militaire barre, jamais réalisé, démarre en calibration (aucune charge inventée).

### Adaptations douleur et fatigue au démarrage (sonde semaine 2)

Douleur genou P2, course libre la veille, contrôle inconnu : décisions **identiques** avant / après sur tous les profils. Fatigue : identique sauf S4H (4 adaptées → 3 adaptées + 1 inchangée ; cause non analysée dans ce lot, à examiner).

### Interférence multisport (jours contraints)

P1b, séances réduites (≤ 32 min, course la veille ou le lendemain) : avant, 7 sur 7 étaient un « Bas du corps » identique ; variante C sans alternance (étude) : Bas A 6 / Bas B 1 ; **après (alternance hebdomadaire) : Bas A 3 / Bas B 4**. S4H : 2 séances réduites (Bas B). L'alternance répartit la réduction entre les deux variantes.

## 3. Rotation des semaines — vérifications

| Cas | Résultat |
|---|---|
| Stabilité après redémarrage | Sauvegarde puis relecture : état identique ; semaine replanifiée identique ; séances identiques. |
| Régénération | Deux planifications du même état : semaine identique (R-A 24/24 sur tous les profils). |
| Semaine décalée / incomplète | Programme créé un jeudi : séances A/B distinctes sur les jours restants ; semaine suivante à l'ordre de sa parité. |
| Semaine déjà planifiée | Conservée (Haut / Bas, contenu L1b-4), réécrite octet pour octet. |
| Continuité des charges | Voir § 2. |
| Migration RC1 | Planification de la semaine suivante identique à RC1 au seul numéro de version de la règle de composition près (0.1.0 → 0.2.0). |

Tests : `packages/app-core/tests/rc51/rc51-ab.test.ts` (24 cas), `packages/strength/tests/unit/rc51-ab.test.ts` (11 cas).

## 4. Poussée / tirage — documenté, non corrigé

Ratio séries poussée / tirage (hypertrophie 4×) : 1,9 → 1,8 (dos +0,5 série, pecto −1). Le déséquilibre **reste** (S4D : 2,2 inchangé). Conformément à la consigne, il n'est pas corrigé dans ce lot ; à reprendre dans une étude dédiée (tirage complémentaire en Haut A/B, attributions du catalogue).

## 5. Régressions et risques

1. **Progression ralentie par exercice** : chaque mouvement n'est plus exposé qu'une fois par semaine. Scénario longitudinal A (4× seule) : la première hausse de charge (double progression) arrive en **semaine 6** (avant : dans les 4 premières semaines) ; le haut de plage aux tractions est atteint en semaine 6. S4H : squat plat sur 6 expositions. Les tests longitudinaux vérifient désormais ces mécanismes sur 6 semaines (au lieu de 4) ; les rapports 4 semaines sont régénérés.
2. **Tronc** : −0,4 à −1,6 série selon le profil (reste dans les bornes).
3. **Au-dessus du haut** : S4 12 → 13, S4C 13 → 15 (groupe × semaine).
4. **Pecto** : −1 série (S4D : 5,2, sous le plancher comme avant).
5. **Libellés** : « Haut du corps B » désignait déjà la variante F8 d'une séance répétée dans les anciennes semaines ; il désigne maintenant l'archétype Haut B (même intention : seconde variante).

Aucune régression Full Body, force, forme générale, Course, HYROX, Cross-training (banc identique, 3 055 tests verts, E2E verts).

## 6. Tests ajustés (justification)

| Test | Ajustement |
|---|---|
| Composition hypertrophie 4× (`strength-week`, `beta0-*`, `journey`, DOM) | Archétypes A/B, ordre selon la parité, version de règle 0.2.0, origine `fixtures:strength-rc51-0.8.0`. |
| Registre versionné (`f6`, `l1v3`, `l1b4`) | Contenu courant 0.8.0 ; L1b-4 conservé et relu. |
| `l1b4-control` | P1b et S4 exclus (changés par conception) ; contrôlés par `rc51-ab`. Tous les autres profils inchangés. |
| `rc4-findings` F8 | Constat « variation intra-semaine perdue » **résolu** par RC5.1. |
| `rc1-migration` | Seule la version de la règle de composition est normalisée ; tout le reste identique à RC1. |
| Longitudinaux S3/S4/S5 | Graines comparées en ensemble (ordre alterné) ; progression de charge et plafond poids du corps vérifiés sur 6 semaines ; comparaison « avec / sans RIR » sur les exercices de travail (le retour au calme sort du temps disponible quand la charge connue ajoute une série d'approche). |
| `programming` #5 | Quatre archétypes distincts par semaine : la variation F8 n'a plus lieu d'être. |
| `substitution-dom` | Séance Haut A (le rowing machine est en Haut B). |
| Fixtures `lotc-*`, `r51-*` | Régénérées : seules les versions de traces changent (vérifié). |
