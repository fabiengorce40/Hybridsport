# RUNNING-G1-REVIEW-PACK — dossier de revue des G1 Running

> **Phase 5C (corrections B1 et AH).** **Aucun G1 n’est signé automatiquement** : chaque champ de signature est vide. Les G1 Strength ne sont pas modifiés. Les valeurs candidates sont utilisables en mode CANDIDATE (goldens) et **bloquées en PRODUCTION** tant qu’elles ne sont pas signées.

## 1. Correspondance exacte : 4 politiques ↔ 7 paramètres G1

| Politique G1 | parameterId (G1) | Rôle | Conséquence de sécurité | Visa requis |
|---|---|---|---|---|
| **PAIN_STOP** | `running.safety.painActionPolicy` | Actions CONTINUE / REDUCE / STOP_SESSION / PAUSE_PROGRESSION / OUT_OF_SCOPE selon le signal déclaré | Poursuite malgré un signal de lésion possible | Oui |
| PAIN_STOP | `running.safety.painWording` | Formulations déclaratives présentées à l’utilisateur | Mauvaise compréhension ⇒ signal manqué ou excessif | Oui |
| **RETURN_PROTOCOL** | `running.return.stateBoundaries` | Frontières SHORT / MODERATE / LONG (la frontière LONG est G1) ; UNKNOWN jamais converti | Une interruption longue classée courte ⇒ reprise trop rapide | Oui (frontière LONG) |
| RETURN_PROTOCOL | `running.return.protocol` | Protocole LONG : dose et fréquence de départ (V34), archétypes interdits, levée (V25) | Exposition brutale après une longue coupure | Oui |
| RETURN_PROTOCOL | `running.return.unknownStateHandling` | UNKNOWN reste UNKNOWN : structure conservatrice, demande d’information, limitation de périmètre | Programmation sur une hypothèse fausse | Oui |
| **NOVICE_ENTRY** | `running.safety.noviceEntryProtocol` | P-R0 : pas de test maximal, conditions d’arrêt, questions d’éligibilité | Exposition initiale inadaptée à une tolérance inconnue | Oui |
| **OUT_OF_SCOPE** | `running.safety.outOfScopeTriggers` | Liste des situations hors périmètre | Plan généré pour une situation médicale | Oui |

**Paramètres liés, non G1, soumis à la précédence G1** (`running.safety.g1Precedence` : un paramètre non G1 ne relâche jamais une contrainte G1) :

| Paramètre | Statut | Politique G1 qui prévaut |
|---|---|---|
| `running.safety.noviceEntryDose` (V33, vide) | EXPERT_DESIGN_REVIEW | NOVICE_ENTRY |
| `running.load.changeCategoryBounds` en P-R0 (V22) | PRODUCT_GUARDRAIL | NOVICE_ENTRY (la borne la plus stricte s’applique) |
| `running.return.resumeCondition` (V25) | PROGRAMMING_HEURISTIC | RETURN_PROTOCOL pour LONG / UNKNOWN |
| `running.hi.densityPolicy` P-R0 = 0 (V10) | PRODUCT_GUARDRAIL | NOVICE_ENTRY |

**Aucun paramètre G1 orphelin** : les 7 paramètres G1 du registre 5B sont rattachés à exactement une politique.

## 2. Fiches

### 2.1 PAIN_STOP

| Champ | Contenu |
|---|---|
| policyId | `R-G1-PAIN-STOP` |
| parameterIds | `running.safety.painActionPolicy`, `running.safety.painWording` |
| Risque | Poursuivre ou progresser malgré une douleur déclarée |
| Population | Toutes |
| Décision candidate | Signal déclaratif ⇒ action ; aucun diagnostic ; aucune échelle chiffrée supposée universelle |
| Comportement candidat | Gêne légère sans modification de la foulée ⇒ REDUCE + suivi ; douleur qui modifie la foulée ou augmente pendant l’effort ⇒ STOP_SESSION + PAUSE_PROGRESSION ; douleur récurrente sur plusieurs séances ⇒ PAUSE_PROGRESSION + recommandation de consulter ; symptômes non locomoteurs ⇒ OUT_OF_SCOPE |
| Preuve | Aucune (comportement produit) |
| Incertitude | Compréhension des formulations ; seuil de récurrence (« plusieurs » : valeur à signer) |
| Question d’expert (falsifiable) | « Chez des coureurs loisirs qui déclarent une douleur modifiant la foulée, STOP_SESSION + PAUSE_PROGRESSION réduit-il, par rapport à REDUCE, la proportion qui déclare la même douleur à la séance suivante ? » ; « L’accord entre répondants sur la formulation “douleur qui augmente pendant l’effort” est-il suffisant ? » |
| Signature | ☐ Référent sécurité : ________ Date : ________ Décision : ________ |

### 2.2 RETURN_PROTOCOL

| Champ | Contenu |
|---|---|
| policyId | `R-G1-RETURN-PROTOCOL` |
| parameterIds | `running.return.stateBoundaries`, `running.return.protocol`, `running.return.unknownStateHandling` |
| Risque | Reprise trop rapide après une interruption longue ou de durée inconnue |
| Population | Toutes |
| Décision candidate | SHORT ≤ 7 j ; MODERATE 8–27 j ; LONG ≥ 28 j (V24) ; UNKNOWN jamais converti |
| Comportement candidat | **LONG** : références STALE ; EASY seulement ; dose ≤ réalisé depuis le retour, sinon V34 (vide ⇒ BLOCKED) ; HOLD jusqu’à V25. **UNKNOWN** : aucune séance HD ; fréquence et durées ≤ réalisées depuis le retour (sinon BLOCKED) ; RPE seul ; demande d’information ; HOLD tant que l’état n’est pas résolu. |
| Preuve | Mujika & Padilla 2000 (SEARCH_SUMMARY) : la convention « court terme < 4 semaines » justifie une catégorie opérationnelle, pas une frontière physiologique |
| Incertitude | Frontière LONG ; dose de départ ; traitement des athlètes qui ne déclarent jamais la durée |
| Questions d’expert | « Après une interruption ≥ 28 jours, une dose de départ plafonnée au réalisé post-retour, avec levée après 2 séances sans signal, produit-elle moins d’arrêts pour douleur, dans les 4 semaines suivantes, qu’une reprise au niveau antérieur ? » ; « Quelle proportion des états UNKNOWN est résolue après une demande d’information, et la structure conservatrice est-elle acceptée (adhérence) ? » |
| Signature | ☐ Référent sécurité : ________ Date : ________ Décision : ________ |

### 2.3 NOVICE_ENTRY

| Champ | Contenu |
|---|---|
| policyId | `R-G1-NOVICE-ENTRY` |
| parameterIds | `running.safety.noviceEntryProtocol` (lié : `noviceEntryDose`, EXPERT_DESIGN_REVIEW, vide) |
| Risque | Exposition initiale inadaptée (tolérance inconnue) |
| Population | P-R0 |
| Décision candidate | Pas de test maximal ; alternance course / marche autorisée ; aucune séance HD (V10 = 0) ; garde-fou V22 ; questions d’éligibilité (renvoi à OUT_OF_SCOPE) |
| Comportement candidat | R1 : structure valide, **doses bloquées** (V33) ⇒ NO_VALID tant que la dose n’est pas définie et signée |
| Preuve | Buist 2008 (programme gradué sans effet), Nielsen 2014 (association des fortes hausses chez des débutants) : aucune dose d’entrée vérifiée |
| Incertitude | Dose d’entrée ; alternance course / marche |
| Question d’expert | « Chez des débutants sans historique, l’absence de test maximal pendant les premières semaines change-t-elle le taux d’abandon précoce ? » ; « La dose d’entrée proposée est-elle réalisable sans douleur déclarée par la majorité des P-R0 lors des premières séances ? » |
| Signature | ☐ Référent sécurité : ________ Date : ________ Décision : ________ |

### 2.4 OUT_OF_SCOPE

| Champ | Contenu |
|---|---|
| policyId | `R-G1-OUT-OF-SCOPE` |
| parameterIds | `running.safety.outOfScopeTriggers` |
| Risque | Programmer pour une personne hors périmètre |
| Population | Toutes |
| Décision candidate | Déclencheurs candidats : grossesse ou post-partum déclarés ; pathologie déclarée ; moins de 18 ans ; symptômes non locomoteurs (malaise, douleur thoracique, essoufflement anormal) ; suivi médical en cours pour une blessure liée à la course |
| Comportement candidat | Arrêt de la génération ; message de réorientation ; aucun diagnostic |
| Preuve | Sans objet (périmètre produit) |
| Incertitude | Exhaustivité de la liste ; faux positifs |
| Question d’expert | « Sur un échantillon de cas revus par le référent, la liste couvre-t-elle toutes les situations jugées incompatibles avec un plan non supervisé, sans exclure les cas sans contre-indication ? » |
| Signature | ☐ Référent sécurité : ________ Date : ________ Décision : ________ |

## 3. Candidats reclassés hors G1 en 5B (rappel)

| Candidat | Gouvernance | Paramètre 5C |
|---|---|---|
| LONGRUN_BOUND | EXPERT_DESIGN_REVIEW | `running.longRun.boundPolicy` (vide) ; V32 (vide) |
| HI_DENSITY | PRODUCT_GUARDRAIL + EXPERT_DESIGN_REVIEW | V10 |
| LOAD_INCREASE_BOUND | PRODUCT_GUARDRAIL + EXPERT_DESIGN_REVIEW | V22 (P-R0–1), vide pour P-R2+ |

**État des signatures** : 0 sur 4 politiques signées. Production bloquée.
