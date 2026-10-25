# RC5.3 — Lot R4 : séances modifiées (variante souple)

> Branche de développement `claude/kairo-rc4-dev` uniquement. Aucun déploiement (ni BÊTA `e2cdcc5`, ni production).
> Décision du 2026-10-25 : variante souple S ; recalcul de charge R4.4 vérifié séparément, **non activé**.

## 1. Ce qui est implémenté

| Élément | Détail |
|---|---|
| Contenu versionné | Ruleset `0.9.0-strength-rc53-r4`, surcouche de RC5.1 `0.8.0` (qui reste au registre, relu et régénéré à l'identique). Paramètre facultatif `strength.progression.policy` = `{ modifiedExposure: { mode: 'soft', recalculateLoad: false } }`, provenance déclarée au registre scientifique. Sans ce paramètre : sémantique antérieure, reproductible. |
| Dose de référence (moteur) | Chaque dose porte son **RIR de référence** (RIR de base + modificateurs durables : niveau, phase) et un indicateur « transitoire ». Une dose est transitoire quand un modificateur **du jour** (état du jour, interférence, interférence modérée) la change réellement : RIR relevé ou séries retirées au-delà de la référence. Un modificateur couvert par un autre (ex. débutant +1 RIR et prudence +1 RIR, politique max) ne marque rien. |
| Marquage des items | Item à dose transitoire : `refs.doseModified` et `refs.referenceRir` dans la séance planifiée (contenu 0.9.0 seulement ; jamais dans les séances antérieures). |
| Séances adaptées au démarrage | Items dont les séries de travail ou le RIR diffèrent de la séance planifiée : modifiés, RIR de référence = celui de la séance planifiée (`adaptedItemsOf`). Exercice remplacé ou retiré : règles communes (substitution). |
| Classement | Exposition modifiée classée contre le **RIR de référence**, jamais contre le RIR relevé (correction du décalage RIR de base / prescrit / déclaré, constat C4). |
| Lecture souple (progression) | « En dessous » ou « partielle » modifiée : maintien `below_modified`, **aucun compteur**, aucune régression. Réussite modifiée avec effort **observé** et exploitable : une réussite comptée, estimation e1RM mise à jour (médiane du ruleset), charge et répétitions inchangées (`modified_prescription`). Réussite sans RIR saisi ou hors domaine de l'estimation : maintien sans aucun compteur. Douleur, substitution, données absentes, interruption, charge non portée : règles communes inchangées. |
| Hausse | Jamais décidée sur une exposition modifiée. Une réussite modifiée peut compléter la preuve ; la hausse n'intervient qu'à une exposition **non modifiée** réussie. |
| R4.4 (option) | Recalcul de la charge de la track depuis son e1RM pour le RIR relevé (jamais au-dessus, trace `DOSE.LOAD.RECALCULATED`). **Désactivé** (`recalculateLoad: false`). |

### Écart à la conception R4.1 (à valider)

La conception listait aussi le modificateur **temps** (séries ramenées au plancher faute de temps). Il n'est **pas** marqué :
la réduction est structurelle (même créneau, chaque semaine) et ne change pas l'effort par série ; la marquer priverait
durablement l'exercice de toute progression. Effet mesuré sur le banc : **nul** (aucune exposition concernée dans les
216 simulations) — le choix est préventif. Il peut être inversé par une version de contenu si vous le souhaitez.

## 2. R4.4 — vérification séparée

Cas test (ancre développé couché 90 kg × 5 à RIR 2, e1RM cohérent 108 kg, état « prudence » : RIR 2 → 3) :
- désactivé (contenu courant) : 90 kg × 5 à RIR 3 prescrit — incohérent (90 kg correspond à RIR 2) ;
- activé : 85 kg × 5 ; RIR attendu = 30 × (108 / 85 − 1) − 5 ≈ **3,1** : cohérent ; jamais au-dessus de la charge de la
  track ; aucun recalcul sans modificateur du jour.

La cohérence n'est démontrée que si l'e1RM de la track est lui-même cohérent avec sa charge (track autorégulée avec effort
observé). Pour une track linéaire (débutants) ou une estimation par borne, l'e1RM peut être absent ou décalé : **non
activé**, à réexaminer après R1 (historique partagé) et R3 (réévaluation).

## 3. Résultats comparés (24 semaines, 216 simulations par variante)

Référence : code d'avant RC5.3 (`ca99bdd`, contenu RC5.1). Lot : R4 seul. Même banc, même athlète à capacité cachée
(`packages/app-core/tests/rc53/rc53-bench.ts`) ; tableau complet : `rc53-etudes/lot-r4-vs-reference.md`.

### Ce que R4 corrige

| Cas | Régressions de charge | Gain principaux 24 sem. (réel) |
|---|---|---|
| Fatigué intermédiaire, tous profils | **176 → 50** | +9,0 → **+11,6 %** (+17,2 %) |
| Fatigué avancé, tous profils | **221 → 98** | +3,7 → **+7,8 %** (+9,2 %) |
| Fatigué intermédiaire, multisport | **63 → 10** | +6,2 → +8,6 % |
| Fatigué avancé, multisport | **77 → 31** | 0,0 → +4,7 % |
| Stable (tous niveaux), tous profils | 675 → 628 | inchangé |

Exemple S4 avancé fatigué : régressions 44 → 19, principaux 40 kg (charge de départ) → 42,5 kg en semaine 24.

### Régressions restantes ou introduites

1. **Débutant et intermédiaire multisport : squat et soulevé roumain bloqués** (P1b, Musculation + Course). Toutes leurs
   expositions tombent sur des jours allégés par la course : aucune hausse possible avec R4 seul (40 kg sur 24 semaines,
   contre 45 kg avec la référence). Gain moyen des principaux : +12,5 → +9,4 % (réel +34,5 % débutant, +17,2 %
   intermédiaire). Le signal de capacité est bien collecté (réussites, e1RM pour les tracks autorégulées), mais seule la
   réévaluation de fin de cycle (lot R3) peut le transformer en charge. **À corriger en R3** : la réévaluation doit couvrir
   les tracks linéaires des débutants (e1RM observé à conserver aussi pour elles). Critère ajouté à la validation finale :
   progression des principaux du bas du corps chez le débutant multisport progressant.
   - Le prototype S avait le même blocage, masqué par la moyenne (haut du corps au-delà de 45 kg grâce au plafond par cycle).
2. **Débutant fatigué** : inchangé (régressions 111 → 103). Pour un débutant, le niveau (+1 RIR) couvre déjà la prudence :
   la séance n'est pas modifiée, la baisse de performance de 8 % est lue comme un échec. Hors champ de R4 ; à suivre.
3. **Pas de répétitions** (double progression) en baisse sur les profils concernés (ex. fatigué intermédiaire 1 161 → 829) :
   voulu, les séances adaptées ne font plus avancer les répétitions ; à surveiller avec R1 (expositions partagées).
4. **Hausses injustifiées** : 26 → 23 au total (stable intermédiaire 0 → 2, fatigué intermédiaire 1 → 2, fatigué avancé 6 → 1).
5. **Sous le plancher de volume** : 2 401 → 2 410 groupes × semaines (+0,4 %) : effet des charges différentes sur le temps
   restant (mollets à temps résiduel) ; aucune séance supplémentaire sous le plancher hors de ces créneaux.

### Contrôles transverses

| Contrôle | Résultat |
|---|---|
| Profils sans multisport ni fatigue (S4, S3, S4D, S4F) | Charges et répétitions **identiques** à la référence (40 simulations sur 48 ; seules diffèrent les 8 « fatigué » intermédiaire et avancé). |
| Décisions de démarrage (douleur, fatigue, course libre, inconnu) | **72 / 72** identiques. |
| Séances planifiées ; dépassements de durée | 6 624 → 6 624 ; 0 → 0 (maximum 65 → 64 min). |
| Reproductibilité R-A | 6 624 / 6 624 dans les deux variantes. |
| Données existantes (TA-18) | 5 états (BÊTA `e2cdcc5` : séance en cours, course réalisée, Musculation + Course, S4 semaine 4 planifiée ; RC5.1 : S4) relus sans migration, réécrits octet pour octet ; semaines existantes, historique, tracks et expositions **identiques à la référence** après planification de la semaine suivante. |

## 4. Tests

| Fichier | Contenu |
|---|---|
| `packages/strength/tests/unit/rc53-r4.test.ts` (18) | Contenu et politique ; dose de référence / transitoire (prudence, modificateur couvert, temps) ; marquage (RC5.3 oui, RC5.1 non, séance non modifiée identique) ; lecture souple (en dessous, partielle, réussite observée, effort inexploitable, sans RIR, aucune hausse sur modifiées seules pour les 3 modèles, règles communes, sans politique) ; R4.4 désactivé / activé. |
| `packages/app-core/tests/rc53/rc53-r4.test.ts` (8) | TA-11 (P1b, S4H : aucune hausse ni régression décidée sur une exposition modifiée, progression continue sur les autres), TA-12 (fatigué : séances adaptées lues comme modifiées, aucune décision sur elles), TA-13 (démarrages identiques), registre. |
| `packages/app-core/tests/rc53/rc53-conservation.test.ts` (5) | TA-18 contre les empreintes du code de référence. |
| `packages/app-core/tests/rc53/rc53-bench.test.ts` | Banc 12/24 semaines (exécuté sur demande : `RC53_BENCH=<dossier>`). |

### Tests existants ajustés (justification)

| Test | Ajustement |
|---|---|
| Registre versionné (`f6`, `l1v3`, `l1b4`), `journey` | Contenu courant 0.9.0 ; RC5.1 0.8.0 conservé et relu. |
| `rc51-ab` P2 / P3 / P5 | Composition, séries, démarrages et volumes identiques ; durée à ± 1 min ; une charge principale n'est jamais au-dessus de la référence. P5 : squat et soulevé roumain ne passent plus à 42,5 kg — hausse décidée sur une séance allégée par l'interférence (effet de bord RC5.2 § 2.3). |
| `reproducibility-diagnostic` | Deux séances passent de « progression depuis la planification » à « identique » : expositions modifiées réalisées sans RIR saisi, plus lues comme une progression. |
| `science-lock` F18 | Paramètre facultatif postérieur au verrou 4F : provenance exigée, usage hors du ruleset 4F (qui reste reproductible). |
| Rapports régénérés (`strength-scenario-b`, `quality-bench`, `state-size`, consolidation, M3, documents du registre scientifique, empreinte du CORE) | Séances allégées lues contre le RIR de référence ; nouveaux champs facultatifs `doseModified` / `referenceRir` du schéma d'item. |
| Fixtures E2E (`lotc-*`, `r51-*`) | Régénérées : version de contenu, marquage des items, décisions sur séances modifiées. |
| Architecture (liste fermée) | Listes RC5.1 (absentes depuis RC5.1 : le test échouait sur la branche) et RC5.3 R4 ajoutées. |

## 5. Hypothèses et limites

- Athlète simulé : gains hebdomadaires supposés (1,5 / 0,75 / 0,4 %), fatigue −8 %, relation d'Epley, RIR arrondi à
  l'inférieur. Résultats **simulés** : ils comparent des règles, ils ne valident pas scientifiquement une progression.
- Sondes de démarrage en semaine 2 seulement ; profils à disponibilité fixe.
- Les écarts de charge sont mesurés au pas de charge de l'exercice (2,5 kg barre) : un pas = 5 à 6 % à 40–45 kg.
