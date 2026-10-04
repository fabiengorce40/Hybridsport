# Cross-training C2 : implémentation (amorçage + rejeu strict)

Baseline `98cb7be`. Corridor unique : `firstExposure` ou rejeu strict → `continuous` → un item `timed` → un mouvement.

## Évolution CORE (liste fermée)

| Fichier | Changement |
|---|---|
| `domain/src/duplicate.ts` | `stimulus` et `energy` : valeur connue (forme historique) **ou** `{ status: 'not_applicable' }`. Une clé absente reste une erreur. Empreinte historique conservée (`zSessionFingerprintV1`) |
| `domain/src/serialization.ts` | `session_record` v5 (courante). Les v2 à v4 gardent l'empreinte historique |
| `engine/src/migration/migrations.ts` | v4 → v5 identité. Une donnée v4 portant `not_applicable` est refusée (combinaison malformée) |
| `engine/src/duplicate/fingerprint.ts` | `not_applicable` conservé sans normalisation. Diagnostic de schéma précis restitué (branche « connue » d'une union) |
| `engine/src/duplicate/analysis.ts` | toute paire contenant `not_applicable` ⇒ composante `null`, exclue du dénominateur |

Compatibilité :
- Strength et Running fournissent toujours des valeurs connues : la formule known ↔ known est inchangée.
- **Vérification avant / après**, sur un parcours applicatif réel de 5 semaines (Strength seul, Running seul), avec séances terminées et anti-doublon :
  - 30 séances, empreintes, historiques et journaux identiques octet par octet ;
  - 30 rapports anti-doublon identiques ;
  - seule différence : l'emplacement vide `fingerprints.crosstraining`.
- Goldens Strength F1 et F2 identiques. Empreinte de sources F20 mise à jour : seuls les 5 fichiers ci-dessus changent.
- Running exige `session_record` ≥ 4 : inchangé.
- Le test d'architecture Cross-training n'autorise que la liste fermée ci-dessus ; Running et Strength `src` restent inchangés.

## Dimensions constantes du bootstrap : STOP documenté

- `stimulus`, `energy` : `not_applicable` (non comparables).
- `format` (empreinte) : **non déclaré** par C2, donc null et exclu, au lieu d'une constante.
- **`structure.kind` et `structure.format`** (sous-indicateurs de la composante `structure`) sont constants dans le corridor (`conditioning` / `continuous`) et donnent un plancher de 2/3. Les neutraliser exigerait une règle de comparaison dépendante du contexte, c'est-à-dire une refonte de `structureSimilarity`. **Non introduit.** L'impact est limité, car l'anti-doublon C2 est un diagnostic : une seule proposition, aucune influence sur la sélection.

## Identité d'occurrence (`sessionId`)

- Une séance n'est jamais comparée à elle-même : l'historique de même `sessionId` est exclu (CORE, inchangé).
- Nouvelle occurrence et rejeu : identifiant dérivé de l'**intention courante** (`<intent.id>.ct`), jamais de la séance rejouée (testé).
- Même occurrence éditée ou régénérée : même intention, donc même identifiant possible.
- L'application refuse d'enregistrer deux fois le même identifiant (`DUPLICATE_CT_SESSION`).
- **Limite** : aucun système d'import ni de déduplication. Une copie importée qui conserverait l'identifiant d'une séance existante ne serait pas comparée à l'original.

## Ce qui reste fail-closed (production)

Avec la gouvernance réelle, C2 refuse toujours (testé en CANDIDATE et en PRODUCTION). Pour passer en production, il faut :
1. signer formellement les 4 politiques CT-G1 (le contenu qualitatif est arbitré ; les tests utilisent une signature TEST) ;
2. résoudre `ct.safety.novicePolicy`, `ct.return.protocol` et `ct.safety.novelEccentricVolume` (formalisation des décisions arbitrées) ;
3. remplir `ct.bootstrap.movementAllowlist` : mouvements approuvés, durée fixe approuvée par mouvement par un expert (CT-D4), approbation tracée ;
4. pour le rejeu : `ct.history.recencyBand` (`maxReplayAge`, jours) et les trois paramètres de règle CT-D15 (formalisation des décisions validées) ;
5. satisfaire `CT_CONTENT` (catalogue relu) ; maturité `PRODUCTION_ELIGIBLE` et ruleset verrouillé ;
6. poids et seuils anti-doublon `crosstraining` gouvernés. Sans eux, un historique comparable rend l'analyse **techniquement** impossible et la séance est refusée (fail-closed du CORE, non modifié) ;
7. raccorder l'application : planificateur et génération Cross-training, interface d'enregistrement. L'état applicatif et `recordCrossTrainingSession` existent ; app-core ne dépend pas du paquet Cross-training, donc la validation se fait à la frontière du moteur.
