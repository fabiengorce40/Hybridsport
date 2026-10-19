# REKKA — RC4.5 lot F8 : variantes stables A / B / C — arrêté (régression sportive)

| | |
|---|---|
| **Base** | F6 `0475973`, branche `claude/kairo-rc4-dev` |
| **Statut** | **Implémenté, mesuré puis arrêté** : votre condition F8-G (« sans régression sportive ») n'est pas satisfaite. **Aucun code F8 n'est commité.** Le code est archivé (`rc45-etudes/F8-variantes-k.patch`), ainsi que les mesures (`rc45-etudes/F8-variantes-mesures.txt`). |
| **Inchangé** | Running ; branches TEST, production et repli ; aucune fusion, aucun déploiement. |

---

## 1. Ce qui a été implémenté (archivé)

**Conforme à F8-I et F8-E, sans modification du moteur Strength.**

**Identité de variante :**
- Rang de l'index de demande `k` parmi les demandes du même archétype, A, B ou C (planificateur, `weekArg`).
- Les archétypes composés sont connus de toutes les séances avant la régénération : jamais l'ordre des dates.

**Port Musculation :**
- Il ne présente au moteur que les progressions de la variante, sous les identifiants d'emplacement de l'archétype.
- Les expositions des autres variantes restent disponibles pour la connaissance des charges, sans leur emplacement.
- La variante est écrite dans la séance produite (`.vB`, `.vC`) ; la graine est le rang de la variante.
- Règle d'environnement TEST_ONLY `planner.strength.variants.test-0`.

**Persistance, sans champ nouveau ni changement de `planningVersion`** (un tel changement aurait replanifié automatiquement des semaines existantes) :
- La variante est relue au démarrage dans la séance persistée : suffixe, ou graine de rang 1 pour A.
- Une séance antérieure (sans suffixe, graine de rang par date) se régénère avec sa règle d'origine.

**Exécution (app-core) :** les progressions sont créées et mises à jour sur l'identifiant suffixé. Chaque variante progresse séparément.

**Planning :** la lettre affichée est relue dans la séance (une séance déplacée garde sa lettre).

---

## 2. Mesures : banc RC4, 6 profils × 6 semaines, comparaison avec F6

Volume moyen par semaine (séries) et nombre de couples (semaine, groupe) sous le plancher :

| Profil | Piste | Quadriceps | Ischio-jambiers | Fessiers | Épaules | Sous le plancher |
|---|---|---|---|---|---|---|
| P1 | F6 (référence) | 7,2 | **8,5** | 11,5 | 15,4 | 17 |
| P1 | F8-G seule (graine par variante) | 7,2 | 8,5 | 11,5 | 15,4 | 17 |
| P1 | **F8 complet** | 7,5 | **5,5** | 9,7 | 15,1 | **20** |
| P1 | F8 + héritage de l'exercice en place | 6,2 | 7,0 | 10,0 | 14,6 | 19 |
| P1 | Ancres seules par variante | 5,7 | 6,5 | 9,5 | 15,6 | 21 |
| P2 | F6 (référence) | 10,8 | **11,2** | 14,8 | 15,5 | 9 |
| P2 | F8-G seule | 10,8 | 11,2 | 14,8 | 14,3 | 10 |
| P2 | **F8 complet** | 13,8 | 10,2 | 14,8 | 14,3 | **12** |
| P2 | Ancres seules par variante | 17,3 | **5,2** | 14,8 | 13,8 | 13 |
| P3 | F6 (référence) | 9,3 | **9,3** | 12,5 | 15,4 | 16 |
| P3 | F8-G seule | 9,3 | 9,3 | 12,5 | 14,2 | 16 |
| P3 | **F8 complet** | 11,0 | **6,7** | 11,3 | 14,3 | **18** |
| P3 | Ancres seules par variante | 13,7 | 4,2 | 12,2 | 13,5 | 19 |
| P1b (Haut / Bas) | F6 → F8 complet | 9,2 → 9,2 | 8,2 → 8,2 | 12,3 → 12,3 | 15,2 → 14,3 | 3 → 3 |
| P5 | F6 → F8 complet | 4,3 → 4,3 | 4,3 → 4,5 | 7,5 → 7,7 | 16,6 → 14,3 | 22 → 22 |

**Autres constats :**
- Mollets : 2,7 → 0 (P2) et 0,7 → 0 (P3) avec F8 complet.
- Durées : aucun dépassement.
- Dates : certaines séances changent de jour (P1 semaine 2 : 13, 16 et 18 → 12, 15 et 14). Le contenu des variantes change la demande des séances, donc les choix de G5 et M3.

**Stabilité des variantes :**
- Bonne pour P3 : chaque variante garde ses mouvements structurants d'une semaine à l'autre (B : squat, développé couché, tirage vertical ; C : soulevé roumain, rowing machine, développé épaules), avec leurs progressions.
- Pour P1, la variante A passe du squat au soulevé roumain en semaine 4. La cause n'a pas été établie avant l'arrêt.

---

## 3. Cause de la régression

1. **La graine (F8-G) n'est pas en cause.** Seule, elle laisse le volume quasi inchangé (épaules −1,2 pour P2 et P3, mollets −0,7 pour P2).
2. **L'équilibre genou / hanche de la semaine est perdu.**
   - Aujourd'hui, les trois Full Body de la semaine **alternent** l'exercice principal (squat ou soulevé roumain) selon l'exposition la plus ancienne. L'équilibre se fait sur la semaine et d'une semaine à l'autre (semaine 1 : genou, hanche, genou ; semaine 2 : hanche, genou, hanche).
   - Une variante à mouvements structurants **figés** reproduit chaque semaine le choix initial (par exemple A genou, B hanche, C genou) : le genou domine durablement, et les ischio-jambiers et les fessiers baissent.
   - C'est ce que montre la piste « ancres seules par variante » : quadriceps jusqu'à 17,3, ischio-jambiers jusqu'à 4,2.
3. **La continuité des accessoires est diluée.**
   - Aujourd'hui, le leg curl est l'exercice en place de `fb.iso_lower` pour **toutes** les séances Full Body.
   - Avec des progressions séparées, B et C repartent sans exercice en place, et le leg curl apparaît dans moins de séances.
   - L'héritage de l'exercice en place corrige partiellement : P1, ischio-jambiers 5,5 → 7,0, pour 8,5 avant F8.

**Le rollback et les tests « Modifier », G5, M3, douleur et matériel n'ont pas été conduits jusqu'au bout.** L'arrêt intervient sur le critère sportif, avant ces vérifications. La faisabilité de la relecture des progressions `.vB` par le repli et par TEST reste celle démontrée en conception (9 progressions B intactes).

---

## 4. Nouvelle solution proposée (à valider avant tout code)

**F8-bis : identité persistante par variante, avec équilibre hebdomadaire garanti par construction.**

| Élément | Proposition |
|---|---|
| Identité | Inchangée (validée) : variante A, B ou C par l'index `k`, persistée (`.vB`, `.vC`), relue au démarrage. |
| Mouvements structurants | Ce n'est plus la variante qui les fige, mais le **couple (variante, schéma principal)**. Chaque variante a une ancre par schéma (genou, hanche), stable et progressive. Le **choix du schéma** reste réglé par l'alternance actuelle de la semaine, qui garde l'équilibre. Un squat de la variante A progresse uniquement avec les autres squats de la variante A. |
| Accessoires suivis | Propres à chaque variante, **sauf les accessoires prioritaires** (leg curl et, plus largement, les besoins d'un groupe sous son plancher). Pour ceux-là, la continuité est **commune** à la semaine, avec une seule progression. |
| Variation | Elle porte sur les accessoires non prioritaires (différents entre variantes, stables dans une variante). |
| Critère d'acceptation | Banc RC4 : aucun groupe en baisse de plus de 0,5 série par semaine, aucun couple (semaine, groupe) supplémentaire sous le plancher, durées dans le temps disponible. **Puis** les tests « Modifier », G5, M3, douleur, matériel, sauvegarde, rechargement, rollback et fréquence 2 → 3 → 2. |

**Alternative plus simple : F8-c.** Garder la continuité actuelle (une seule progression par emplacement). Ajouter seulement l'identité persistante (affichage A / B / C stable) et la graine par variante, dont la neutralité est mesurée (F8-G seule). Pas de progressions séparées.

---

## 5. Décisions demandées

| # | Question | Recommandation |
|---|---|---|
| F8-1 | Abandonner les progressions entièrement séparées par variante (F8 tel que validé) | Oui (régression mesurée) |
| F8-2 | Étudier F8-bis : ancre par (variante, schéma), alternance hebdomadaire conservée, accessoires prioritaires communs | Oui, d'abord en mesure sur le banc, sans commit |
| F8-3 | Ou livrer F8-c : identité persistante et graine par variante seulement | Possible immédiatement, effet neutre mesuré |

Aucune intégration avant votre accord.
