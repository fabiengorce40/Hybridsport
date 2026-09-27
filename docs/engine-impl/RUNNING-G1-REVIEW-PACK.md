# RUNNING-G1-REVIEW-PACK — dossier de revue des G1 Running

> **Phase 5C (corrections B1 et AH), mis à jour en 5D (section W).** **Aucun G1 n’est signé automatiquement** : chaque champ de signature est vide. Les G1 Strength ne sont pas modifiés. Les valeurs candidates sont utilisables en mode CANDIDATE (goldens) et **bloquées en PRODUCTION** tant qu’elles ne sont pas signées.

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

---

## 4. Mise à jour 5D (aucune signature)

### 4.1 Les 7 paramètres G1 (inchangés)

| Politique | Paramètres |
|---|---|
| PAIN_STOP | `running.safety.painActionPolicy`, `running.safety.painWording` |
| RETURN_PROTOCOL | `running.return.stateBoundaries`, `running.return.protocol`, `running.return.unknownStateHandling` |
| NOVICE_ENTRY | `running.safety.noviceEntryProtocol` |
| OUT_OF_SCOPE | `running.safety.outOfScopeTriggers` |

### 4.2 V33 : dose d’entrée novice (NOVICE_ENTRY), **reste vide**

- **Structure admissible** (proposée, non signée) : alternance course / marche en EASY_LOW, dose à la **durée**, cible RPE plafond 3 ou talk test (descripteur), **aucun test maximal**, fréquence donnée par le planificateur (≥ 2, périmètre V1), progression seulement par restauration ou HOLD (V23 vide).
- **Options présentées au référent** (aucune retenue par Claude) :
  1. le précédent de protocole GRONORUN, qui partait de « 10 min de course alternée avec de la marche » dans les deux bras. Ce n’est **pas** une démonstration de sécurité (environ 20 % de blessés dans chaque bras) ;
  2. une dose ancrée sur une durée de marche ou de course **déclarée tolérée** par l’athlète ;
  3. un maintien du blocage en V1.
- **Question** : « Chez des P-R0, une dose d’entrée de type 1 ou 2 permet-elle à la majorité de terminer les premières séances sans douleur déclarée ? »
- **Signature** : ☐ ________

### 4.3 V34 : dose de départ en reprise longue (RETURN_PROTOCOL), **reste vide**

- **Distinction obligatoire**, sans diagnostic :

| Situation | Traitement |
|---|---|
| Interruption non médicale (voyage, emploi du temps) | RETURN_PROTOCOL |
| Raison inconnue | UNKNOWN, **jamais converti**, structure conservatrice |
| Douleur ou blessure déclarée | PAIN_STOP d’abord ; OUT_OF_SCOPE si suivi médical |
| Hors périmètre | OUT_OF_SCOPE |

- **Preuves** : Mujika 2000 (dégradation) ; revue 2023 sur le désentraînement (identité seulement) ; étude de cas (n = 1). **Aucune dose défendable.**
- **Règle déjà prévue** : dès que des séances post-retour existent, dose ≤ réalisé (sous G1). V34 ne concerne que le tout premier départ.
- **Signature** : ☐ ________

### 4.4 V24 : falaise à 28 jours (question ajoutée)

« Le passage MODERATE → LONG à 28 jours change brutalement la dose, dans le sens le plus prudent. Le référent accepte-t-il cette frontière nette, ou demande-t-il un traitement progressif près de la frontière (FUTURE_RFC) ? »

- **Signature** : ☐ ________

### 4.5 Doctrine précisée en 5D

- Les **doses** sous G1 (V33, V34) ne sont **pas utilisées**, même en mode CANDIDATE, sans signature ⇒ R1 et R8 sont `BLOCKED_G1`.
- Les frontières de classement (V24) servent à classer, jamais à doser.

**État des signatures : 0 sur 4. Production bloquée.**
