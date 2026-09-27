# RUNNING-5E-G1-SAFETY-PACK — décisions de sécurité G1

> **Phase 5E.** **4 politiques, 7 paramètres, aucun orphelin.** Statut de chaque politique : **UNSIGNED**. Claude prépare, ne signe pas. Langage produit neutre, **aucun diagnostic**. Historique : [`RUNNING-G1-REVIEW-PACK.md`](RUNNING-G1-REVIEW-PACK.md).

| Politique | Paramètres (7) |
|---|---|
| G1-PAIN | `running.safety.painActionPolicy`, `running.safety.painWording` |
| G1-RETURN | `running.return.stateBoundaries`, `running.return.protocol`, `running.return.unknownStateHandling` |
| G1-NOVICE | `running.safety.noviceEntryProtocol` |
| G1-SCOPE | `running.safety.outOfScopeTriggers` |

---

## G1-PAIN

| Champ | Contenu |
|---|---|
| policyId | `R-G1-PAIN-STOP` |
| parameterIds | `painActionPolicy`, `painWording` |
| Population | Toutes |
| Déclencheur | Signal déclaratif de douleur ou de gêne (avant, pendant ou après une séance) |
| Comportement produit proposé | (1) **Suspendre la progression** ; (2) **réduire ou arrêter la séance en cours** si le signal survient pendant l’effort ; (3) **demander une réévaluation ou une information** à l’utilisateur avant la séance suivante ; (4) **signaler une situation hors périmètre** et renvoyer vers un professionnel si le signal est récurrent ou associé à d’autres symptômes |
| Formulations candidates | « Une douleur modifie-t-elle votre façon de courir ? » ; « La gêne augmente-t-elle pendant l’effort ? » ; « Le signal revient-il d’une séance à l’autre ? » |
| Preuve | Aucune (comportement produit) |
| Limites | Compréhension des formulations ; **aucune correspondance universelle « score de douleur X = blessure »** |
| Mode d’échec | Poursuite malgré un signal (permissif) ; arrêts pour des gênes bénignes (conservateur) |
| Alternative prudente | Tout signal de douleur ⇒ arrêt de la progression et de la séance + demande d’information |
| Effet sur les goldens | Aucun scénario R1–R12 ne déclare de douleur ; bloquant pour la **production** de tous |
| Question de signature | « Le comportement (1) à (4) et ces formulations sont-ils acceptés pour V1, sans échelle chiffrée ? » |
| Signature | Nom : ________ · Date : ________ · **Statut : UNSIGNED** |

## G1-RETURN

| Champ | Contenu |
|---|---|
| policyId | `R-G1-RETURN-PROTOCOL` |
| parameterIds | `stateBoundaries`, `protocol` (dont V34), `unknownStateHandling` |
| Population | Toutes |
| Déclencheur | Interruption détectée ou déclarée |

**Distinction obligatoire**

| Cas | Comportement proposé |
|---|---|
| Interruption connue, non médicale | Frontières V24 (SHORT ≤ 7 j ; MODERATE 8–27 ; LONG ≥ 28) ; LONG : EASY seulement ; dose ≤ réalisé post-retour ; **premier départ sans séance post-retour : V34, vide** ⇒ NO_VALID |
| Raison inconnue | UNKNOWN, jamais converti : structure conservatrice, demande d’information ; sans séance post-retour ⇒ NO_VALID |
| Interruption liée à une douleur | G1-PAIN d’abord ; pas de reprise programmée sans information |
| Situation médicale ou hors périmètre | G1-SCOPE |

| Champ | Contenu |
|---|---|
| Ce que V1 prescrit quand l’historique est incomplet, la raison inconnue et la tolérance antérieure indisponible | **Rien de nouveau** : NO_VALID_RUNNING_PROPOSAL + demande d’information, **ou** (si des séances post-retour existent) des doses ≤ réalisé, en RPE seul, sans séance HD. **C’est acceptable.** |
| Preuve | Mujika 2000 (SS) ; revue 2023 sur le désentraînement (identité seulement) ; étude de cas (n = 1) |
| Limites | Aucune dose de reprise défendable ; frontière de 28 jours conventionnelle |
| Mode d’échec | Reprise trop rapide (permissif) ; reprise interminable (conservateur) |
| Alternative prudente | Tout état autre que SHORT ⇒ NO_VALID jusqu’à ce que des séances post-retour existent |
| Effet sur les goldens | R8 : BLOCKED_G1 (V34) ; C6 |
| Questions de signature | (1) Frontières V24 acceptées ? (2) Traitement d’UNKNOWN accepté ? (3) Le premier départ reste-t-il NO_VALID (V34 vide), ou une dose est-elle signée (DECISION_REQUIRED) ? (4) La falaise à 28 jours est-elle acceptée ? |
| Signature | Nom : ________ · Date : ________ · **Statut : UNSIGNED** |

## G1-NOVICE

| Champ | Contenu |
|---|---|
| policyId | `R-G1-NOVICE-ENTRY` |
| parameterIds | `noviceEntryProtocol` (lié : V33, EXPERT_DESIGN_REVIEW, vide) |
| Population | P-R0 |
| Déclencheur | Aucun historique fiable |
| Comportement proposé (invariant) | **Aucun test maximal** ; aucune séance HD ; cible RPE plafond ou talk test ; questions d’éligibilité (renvoi à G1-SCOPE) |
| Preuve | GRONORUN (Buist 2008, EXT-A) : les deux bras partaient de « 10 min de course alternée avec de la marche » ; environ 20 % de blessés dans chaque bras ; **aucun effet du programme gradué** |
| Limites | **Ce protocole n’est démontré ni optimal ni sûr** : c’est un précédent de protocole d’essai |

**Structures de décision**

| Option | Structure | Paramètre encore à approuver |
|---|---|---|
| **A** | Entrée en alternance course / marche, à la **durée** | Durée totale, durées course / marche, nombre de répétitions, fréquence de départ (DECISION_REQUIRED) |
| **B** | Course continue easy **seulement après** une capacité démontrée (par exemple une durée de course continue déclarée tolérée) | Définition de la capacité démontrée (DECISION_REQUIRED) |
| **C** | Séance d’observation ou de calibration d’abord (sous-maximale, à l’effort) | Protocole et durée de la séance d’observation (DECISION_REQUIRED) |
| **D** | Rester bloqué (P-R0 hors V1) | — |

| Champ | Contenu |
|---|---|
| Mode d’échec | Exposition initiale inadaptée (permissif) ; abandon par un programme trop faible (conservateur) |
| Alternative prudente | D |
| Effet sur les goldens | R1 : reste BLOCKED_G1 avec D ; avec A, B ou C, le déblocage exige **aussi** la valeur listée, signée |
| Question de signature | « Quelle structure (A, B, C ou D) ? Si A, B ou C : quelles valeurs, signées ? » |
| Signature | Nom : ________ · Date : ________ · **Statut : UNSIGNED** |

## G1-SCOPE

| Champ | Contenu |
|---|---|
| policyId | `R-G1-OUT-OF-SCOPE` |
| parameterIds | `outOfScopeTriggers` |
| Population | Toutes |
| Déclencheurs candidats (langage neutre) | Symptômes aigus préoccupants déclarés (malaise, douleur dans la poitrine, essoufflement inhabituel) ; retour après blessure **sans contexte ou autorisation appropriés** déclarés ; incapacité à tolérer une exposition de course de base (échecs répétés d’une séance EASY minimale) ; demande hors populations prises en charge (moins de 18 ans, grossesse ou post-partum déclarés, pathologie déclarée) ; demande de rééducation médicale |
| Comportement proposé | Arrêt de la génération ; message neutre de réorientation vers un professionnel ; aucun diagnostic ; possibilité de reprendre après une information nouvelle |
| Preuve | Sans objet (périmètre produit) |
| Limites | Exhaustivité de la liste ; faux positifs |
| Mode d’échec | Plan généré dans une situation médicale (permissif) ; exclusion de personnes sans contre-indication (conservateur) |
| Alternative prudente | Liste élargie + confirmation de l’utilisateur |
| Effet sur les goldens | Aucun R n’est hors périmètre ; bloquant pour la **production** de tous |
| Question de signature | « La liste et le message sont-ils acceptés ? » |
| Signature | Nom : ________ · Date : ________ · **Statut : UNSIGNED** |

**Signatures : 0 sur 4.**
