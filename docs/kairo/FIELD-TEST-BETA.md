# KAIRO FIELD TEST — Beta expérimentale

Version destinée au test terrain sur téléphone. Elle expose ce qui existe déjà, **sans modifier aucun moteur** (Strength, Running, Cross-training, HYROX, M3, Q1 gelés). Aucune prescription ne change : `pnpm check` passe sans qu'aucun rapport de prescription soit régénéré.

## Ce que la version ajoute

| Élément | Où | Contrat |
|---|---|---|
| Retour terrain après chaque séance terminée | Écran de la séance (les 4 sports) | `recordFieldFeedback` (app-core) : difficulté (5 choix), tolérance (3 choix), durée ressentie (3 choix), commentaire facultatif ; provenance `USER_REPORTED_FIELD_FEEDBACK` ; une seule fois ; stocké dans le journal de la séance (`programmeLogs[id].field`) |
| Historique terrain | Historique | `selectFieldHistory` : durée réelle, ressenti, commentaire, séance faite hors planning |
| Journal Beta | Réglages → Journal Beta | `selectBetaJournal` : par séance, prescription, placement / provenance, exécution, retour, qualité Q1, refus, M3 |
| Export du journal | Journal Beta | `exportBetaJournal` (JSON, `kind: kairo.field_journal`, schéma 1) et `betaJournalText` (texte lisible) ; profil sans prénom |
| Version testée | Réglages → KAIRO FIELD TEST | commit, date de build, version de planification (`beta0-m31`) |
| Séance supplémentaire | Accueil | « 1 séance supplémentaire disponible » (composée mais non placée), sans remplacer la séance prévue |
| HYROX Équilibré | Programme | « KAIRO alterne différents types de séances HYROX au fil des semaines. » + types de la semaine |
| Qualité Q1 | Cartes : « Séance expérimentale » ; séance : explication courte | aucun code ; `UNRESOLVED` n'est jamais présenté comme une erreur |

## Règles

- **Le retour terrain n'est jamais lu par un moteur** : aucune progression, aucun seuil, aucune valeur déduite. Test FT-A9 : la semaine suivante est identique avec ou sans retour.
- **Qualité** : `BLOCKED` ⇒ non réalisable (« Faire maintenant » compris). `UNRESOLVED` ⇒ réalisable **dans cette Beta expérimentale seulement**, avec la mention « Séance expérimentale ». Cette règle n'est pas généralisée à la production.
- Garde-fous inchangés : douleur (pause centrale), semaine commencée (`WEEK_NOT_REPLACEABLE`), double soumission, fail-closed, aucune écriture par seconde (chronos horodatés).

## Transmettre les données

Réglages → Journal Beta → « Exporter le journal Beta (JSON) », et si possible « (texte) ». Indiquer la version affichée dans Réglages → KAIRO FIELD TEST.

## P0 — un bloc n'est pas une séance complète

Audit du contrat réel (prescriptions inchangées) :

| Moteur | Structure déclarée (gouvernance TEST_ONLY) | Généré | Portée |
|---|---|---|---|
| C3 (continuous, intervals, EMOM, AMRAP, for time) | `warmup` + `conditioning` (stimuli « strength/skill + conditioning » : refus) | le bloc de conditioning seul ; échauffement tracé `C3_BLOCK_NOT_GENERATED` (`ARCHITECTURAL_PLACE_ONLY_CONTENT_UNGOVERNED`) | `TRAINING_BLOCK` |
| H2 (les cinq rôles) | `warmup` + `main` + `cooldown` | le bloc principal seul ; échauffement et retour au calme tracés `H2_BLOCK_NOT_GENERATED` | `TRAINING_BLOCK` |

- Portée lue dans le contrat persisté (`compositionScopeOf`), fail-closed : sans trace de structure, jamais « séance complète ». Journal Beta et export : `FULL_SESSION_COMPOSITION_UNRESOLVED`.
- Aucune séance complète n'est assemblée : aucune brique existante gouvernée ne compose un échauffement ou un retour au calme Cross-training / HYROX (C3 refuse lui-même la délégation au moteur Strength : `STRENGTH_ENGINE_DELEGATION_UNAVAILABLE`), et une seule séance par jour est planifiée.
- Durée disponible : **plafond** (refus `EXCEEDS_AVAILABLE_TIME` si le bloc dépasse le temps disponible moins la marge du profil de tolérance du CORE) et contrainte de placement ; **jamais une cible**. La durée du bloc C3 vient de `ct.dose.construction[stimulus][niveau][format]` (ex. AMRAP intermédiaire mixte : 720 s), bornée par `ct.stimulus.timeDomains` (mixte : 480–900 s) ; H2 : time cap = estimation lente × (1 + marge), volume `hybrid_race.h2.structureVolume`. Toutes ces valeurs sont TEST_ONLY.
- Interface : « Bloc principal » / « Bloc HYROX », durée du bloc seulement (jamais la durée cible du créneau), mention « Bloc principal uniquement » dans la séance, retour terrain « Ce contenu vous a semblé » (5 choix) et « Pour une séance complète, le contenu vous a semblé » (4 choix).
